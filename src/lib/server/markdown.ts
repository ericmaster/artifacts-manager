import { marked } from 'marked';

export const MERMAID_RENDER_ERROR = 'Diagram unavailable. The Mermaid source is shown below.';

const ALLOWED_TAGS = new Set([
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul'
]);
const VOID_TAGS = new Set(['br', 'hr']);
const URL_ATTRIBUTES = new Set(['href']);
const GLOBAL_ATTRIBUTES = new Set(['class', 'title']);

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('http://') || normalized.startsWith('https://') ||
    normalized.startsWith('mailto:') || normalized.startsWith('/') ||
    normalized.startsWith('./') || normalized.startsWith('../') || !normalized.includes(':');
}

/**
 * Sanitizes marked output at the server boundary. Markdown is deliberately a
 * small HTML subset: SVG, raw HTML event handlers, and non-web URLs never
 * reach {@html}; Mermaid SVG is only created later by the client renderer.
 */
export function sanitizeMarkdownHtml(html: string): string {
  return html
    .replace(/<(?:script|style|svg|math|iframe|object|embed)\b[^>]*>[\s\S]*?<\/(?:script|style|svg|math|iframe|object|embed)>/gi, '')
    .replace(/<\/?(?:script|style|svg|math|iframe|object|embed)\b[^>]*>/gi, '')
    .replace(/<\/??([a-zA-Z][\w:-]*)([^>]*)>/g, (match, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();
      const closing = match.startsWith('</');
      if (!ALLOWED_TAGS.has(tag)) return '';
      if (closing) return `</${tag}>`;
      if (VOID_TAGS.has(tag)) return `<${tag}>`;

      const attributes: string[] = [];
      for (const attribute of rawAttributes.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
        const name = attribute[1].toLowerCase();
        const value = decodeHtmlEntities(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
        if (name.startsWith('on')) continue;
        if (name === 'data-mermaid-source' && tag === 'pre') {
          attributes.push(`data-mermaid-source="${escapeHtml(value)}"`);
        } else if (URL_ATTRIBUTES.has(name) && isSafeUrl(value)) {
          attributes.push(`${name}="${escapeHtml(value)}"`);
        } else if (GLOBAL_ATTRIBUTES.has(name)) {
          attributes.push(`${name}="${escapeHtml(value)}"`);
        }
      }
      return `<${tag}${attributes.length ? ` ${attributes.join(' ')}` : ''}>`;
    });
}

export async function renderMarkdown(source: string): Promise<string> {
  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    if (lang?.trim().toLowerCase() === 'mermaid') {
      const escaped = escapeHtml(text);
      return `<pre class="mermaid" data-mermaid-source="${escaped}"><code>${escaped}</code></pre>`;
    }
    const language = lang?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') ?? '';
    return `<pre><code${language ? ` class="language-${language}"` : ''}>${escapeHtml(text)}</code></pre>`;
  };

  try {
    return sanitizeMarkdownHtml(await marked.parse(source, { gfm: true, breaks: true, renderer }));
  } catch {
    return `<p class="markdown-error" role="alert">Unable to render this Markdown artifact.</p>`;
  }
}
