// Spec: docs/specs/artifacts-manager-core.md
export const MERMAID_INIT = {
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'dark',
  flowchart: {
    htmlLabels: false,
    useMaxWidth: false,
    wrappingWidth: 240,
    nodeSpacing: 40,
    rankSpacing: 56,
    padding: 12
  },
  sequence: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
  class: { useMaxWidth: false },
  state: { useMaxWidth: false },
  er: { useMaxWidth: false }
} as const;
