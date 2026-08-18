# Artifacts Manager

Multi-project viewer and management hub for agent-generated interactive HTML and Markdown artifacts across all local repositories.

## Quick start

```bash
# Clone and setup
cd ~/tools/artifacts-manager
npm install

# Start local server on port 41820
npm run dev
```

Open `http://localhost:41820` in your browser.

Full setup, commands, and architecture: **[AGENTS.md](AGENTS.md)**.

## CLI Usage

```bash
# Register a repository
./bin/artman register /path/to/project

# List registered projects and artifacts
./bin/artman list
```

## Documentation

* **[AGENTS.md](AGENTS.md)** — canonical architecture, conventions, and operational rules.
* **[CONTEXT.md](CONTEXT.md)** — domain glossary (canonical terminology).
* **[docs/](docs/)** — decisions (`adr/`), specs (`specs/`), runbooks (`runbooks/`).
* **[skills/with-artifact/](skills/with-artifact/)** — agent skill for generating interactive artifacts.

## Deployment

Runs locally as a Node.js process on port `41820`. Details in [AGENTS.md](AGENTS.md).
