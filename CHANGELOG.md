# Changelog

## v0.1.0 (2026-07-20)

### Added

- Initial release, extracted from the gerbers.ai landing hero.
- **Vanilla entry** (`claude-chat-mockup`): `ClaudeWindow(options)` factory returning a live handle (`setPrompt`, `setResponse`, `setToolTitle`, `setReady`, `setTheme`, `mount`, `destroy`).
- **React entry** (`claude-chat-mockup/react`): `<ClaudeWindow>` component plus `<ClaudeSymbols>` for explicit sprite mounting.
- Self-contained stylesheet (`claude-chat-mockup/style.css`): Claude wordmark inlined as a data URI, no shipped fonts, `prefers-color-scheme`-aware with a `data-theme` override.
- Loading **stage** with a loader → `viewer-ready` cross-fade, auto-wired to iframe `load` in the vanilla entry; `prefers-reduced-motion` respected.
