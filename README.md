# claude-chat-mockup

An illustrative claude.ai chat UI component for landing pages and documentation.

[![NPM Version](https://img.shields.io/npm/v/claude-chat-mockup)](https://www.npmjs.com/package/claude-chat-mockup)
[![NPM Downloads](https://img.shields.io/npm/dt/claude-chat-mockup)](https://www.npmjs.com/package/claude-chat-mockup)
[![License: MIT](https://img.shields.io/npm/l/claude-chat-mockup)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="https://raw.githubusercontent.com/zpg6/claude-chat-mockup/main/assets/preview.png" alt="claude-chat-mockup rendering a Claude chat window in light and dark themes, with a pricing-section result revealed in the stage" width="100%" />
</p>

It renders the "Claude just did a thing" moment — the user's prompt, Claude's reply, a tool-call line (`[logo] provider · tool | title`), and a **stage** that fades your own result — usually an `<iframe>` — in once it loads.

## Features

- 🪟 **Faithful chrome**: the left rail, top bar with the Claude wordmark, prompt bubble, response + starburst avatar, tool-call line, composer, and footnote — pixel-matched to claude.ai.
- 🎬 **Loading stage**: a built-in loader that cross-fades to your iframe (or any element) on `load`, or whenever you say `ready`. Honors `prefers-reduced-motion`.
- 🌗 **Theme-aware**: follows `prefers-color-scheme` out of the box; force it with `theme="light" | "dark"`.
- 📦 **Zero runtime dependencies**: the Claude wordmark is inlined and no fonts are shipped — nothing to host. React is an _optional_ peer; the vanilla core needs no framework.
- 🧩 **Vanilla or React**: `claude-chat-mockup` (a DOM factory with a live handle) and `claude-chat-mockup/react` (a component) render identically from one stylesheet.
- 🧾 **Fully typed**: dual ESM/CJS with hand-checked `.d.ts`, tree-shakeable, ~4 kB gzipped CSS.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
    - [React](#react)
    - [Vanilla](#vanilla)
- [API](#api)
- [Theming](#theming)
- [Examples](#examples)
- [License](#license)
- [Contributing](#contributing)

## Installation

```bash
npm install claude-chat-mockup
# or
pnpm add claude-chat-mockup
# or
yarn add claude-chat-mockup
# or
bun add claude-chat-mockup
```

Import the stylesheet once, anywhere in your app:

```ts
import "claude-chat-mockup/style.css";
```

## Quick Start

### React

```tsx
import { useState } from "react";
import { ClaudeWindow } from "claude-chat-mockup/react";
import "claude-chat-mockup/style.css";

export function Hero() {
    const [ready, setReady] = useState(false);
    return (
        <ClaudeWindow
            prompt="Design a pricing section for my SaaS landing page."
            response="Here's a responsive pricing section with Pro highlighted."
            tool={{ name: "claude", call: "create_artifact", title: "Pricing Section" }}
            ready={ready}
            stageHeight={300}
        >
            <iframe title="Preview" src="/preview.html" onLoad={() => setReady(true)} />
        </ClaudeWindow>
    );
}
```

Anything you pass as `children` renders in the stage. Omit it for the chrome only.

### Vanilla

```ts
import { ClaudeWindow } from "claude-chat-mockup";
import "claude-chat-mockup/style.css";

const chat = ClaudeWindow({
    prompt: "Design a pricing section for my SaaS landing page.",
    response: "Here's a responsive pricing section with Pro highlighted.",
    tool: { name: "claude", call: "create_artifact", title: "Pricing Section" },
    stage: { src: "/preview.html", height: 300 },
}).mount(document.querySelector("#hero"));

// The stage auto-reveals on the iframe's `load`. Drive it by hand, too:
chat.setPrompt("Write a SQL migration for soft-deletes.");
chat.setToolTitle("0007_soft_delete");
chat.setReady(true);
```

The factory injects the glyph sprite on first use — no setup step.

## API

### `<ClaudeWindow />` — React

| Prop          | Type                          | Default              | Notes                                                   |
| ------------- | ----------------------------- | -------------------- | ------------------------------------------------------- |
| `prompt`      | `string`                      | —                    | The user's prompt bubble (required).                    |
| `response`    | `ReactNode`                   | —                    | Claude's reply copy.                                    |
| `tool`        | `ToolCall`                    | —                    | `{ name, call, title?, logo? }` tool-call line.         |
| `children`    | `ReactNode`                   | —                    | Stage content (typically an `<iframe>`). Omit for none. |
| `ready`       | `boolean`                     | `false`              | Reveal the stage (cross-fade the loader out).           |
| `stageHeight` | `number \| string`            | `300`                | Number → px; string verbatim.                           |
| `avatar`      | `string`                      | `"You"`              | Rail monogram.                                          |
| `model`       | `string`                      | `"Opus 4.8"`         | Composer model label.                                   |
| `effort`      | `string`                      | `"High"`             | Composer mode label.                                    |
| `placeholder` | `string`                      | `"Reply to Claude…"` | Composer placeholder.                                   |
| `footnote`    | `ReactNode`                   | Claude's disclaimer  | Text under the composer.                                |
| `theme`       | `"auto" \| "light" \| "dark"` | `"auto"`             | `"auto"` follows `prefers-color-scheme`.                |

Also exported: `<ClaudeSymbols />` to mount the glyph sprite explicitly (useful for SSR).

### `ClaudeWindow(options)` — vanilla

Same fields as options, with `stage: { src?, title?, height?, ready?, content? }` in place of `children`/`ready`/`stageHeight`. Returns a live handle:

| Member                   | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `el` / `stage` / `frame` | The root, the `.board-stage`, and the built-in iframe. |
| `setPrompt(text)`        | Replace the user prompt.                               |
| `setResponse(text)`      | Replace Claude's response copy.                        |
| `setToolTitle(text)`     | Replace the tool-line title.                           |
| `setReady(ready?)`       | Reveal (or re-hide) the stage.                         |
| `setTheme(theme)`        | Set the colour scheme.                                 |
| `mount(parent)`          | Append to a parent (chainable).                        |
| `destroy()`              | Remove from the DOM.                                   |

## Theming

The window follows the viewer's `prefers-color-scheme` by default. Force a scheme with the `theme` prop/option, or set `data-theme="light" | "dark"` on `.claude-window` yourself. Every surface colour is a `--cl-*` CSS variable, so you can retheme in plain CSS:

```css
.claude-window {
    --cl-accent: #7c5cff;
}
```

> **Inverting against your page?** Pass `theme` computed from your own `matchMedia("(prefers-color-scheme: dark)")` to make the Claude surface the _opposite_ of your site — a common landing-page look.

## Examples

- [`examples/vanilla.html`](examples/vanilla.html) — a standalone page with theme toggles and a live `setReady` / `setPrompt` demo. Run `npm run build`, then serve the folder and open it.

## License

[MIT](./LICENSE)

## Contributing

Contributions are welcome! Whether it's bug fixes, feature additions, or documentation improvements, we appreciate your help in making this project better. For major changes or new features, please open an issue first to discuss what you would like to change.
