# Changelog

Preserve published release entries here, grouped by actual version and release date.
Earlier unrecorded history remains in Git; do not invent releases or dates.

## [Unreleased]

### Fixed

- Make `artman add` and `artman validate` accept `-h`/`--help` before argument validation, without writing state.

### Changed

- Route artifact skills to durable storage outside source worktrees; preserve existing registrations behind explicit migration and private pending-publication gates.

- Allow `CHANGELOG.md` to retain release history while keeping specs and other non-ADR docs current-state only.
