// Spec: docs/specs/artifacts-manager-core.md
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export const MERMAID_RENDER_ERROR = 'Diagram unavailable. The Mermaid source is shown below.';

const ALLOWED_TAGS = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
  'img', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul'
];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Sanitizes marked output at the server boundary. Markdown is deliberately a
 * small HTML subset: SVG, raw HTML event handlers, and non-web URLs never
 * reach {@html}; Mermaid SVG is only created later by the client renderer.
 */
export function sanitizeMarkdownHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': ['class', 'data-*'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'title']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    nonTextTags: ['script', 'style', 'textarea', 'option', 'svg', 'math']
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
    return '<p class="markdown-error" role="alert">Unable to render this Markdown artifact.</p>';
  }
}
