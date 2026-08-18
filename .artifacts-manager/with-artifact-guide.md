# With-Artifact Skill Guide & Best Practices

> [!NOTE]
> This guide outlines how AI agents generate interactive visualizers and markdown documentation across all Nimblersoft workspaces.

## 1. When to Use `with-artifact`

Whenever explaining complex multi-part systems, prefer generating an interactive HTML artifact over plain text dumps:

- **System Topologies:** Visual mapping of edge routes, origin servers, and background workers.
- **Database Schemas:** Tables, indexes, relations, and dataflow pathways.
- **Refactoring & Ast Transformations:** Visual before-and-after component structures.
- **State Machine Transitions:** Interactive step-through simulations of state lifecycles.

## 2. Directory Layout & Standards

Every project stores its artifacts under:
```
<project-root>/.artifacts-manager/
├── manifest.json
├── <slug>.html
└── <slug>.md
```

## 3. Viewing Artifacts

All registered artifacts can be inspected in the web dashboard at:
`http://localhost:41820`
