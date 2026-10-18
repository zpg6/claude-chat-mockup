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
- [Conversation playback](#conversation-playback)
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

## Conversation playback

Pass `animation: true` to type the prompt in the composer, show the send transition, then reveal the conversation. Static rendering remains the default.

```ts
const chat = ClaudeWindow({
    prompt: "Design a pricing section with a highlighted Pro plan.",
    response: "Here's the pricing section.",
    tool: { name: "claude", call: "create_artifact", title: "Pricing section" },
    stage: { src: "/preview.html" },
    animation: true,
}).mount(document.querySelector("#hero"));

chat.playback?.pause();
chat.playback?.play();
chat.playback?.replay();
```

React accepts the same `animation` prop and renders Replay and Pause/Play controls. Keep `ready` tied to your actual content, such as an iframe's `onLoad`:

```tsx
<ClaudeWindow prompt="Design a pricing section." animation ready={ready}>
    <iframe title="Pricing preview" src="/preview.html" onLoad={() => setReady(true)} />
</ClaudeWindow>
```

The default timeline types for 2,200 ms, holds the send state for 300 ms, then waits 450 ms before showing the response. To change it, pass an options object:

```ts
animation: {
    autoplay: true,
    controls: true,
    typingDuration: 2200,
    sendDelay: 300,
    responseDelay: 450,
}
```

Durations are milliseconds. Negative durations become zero; nonfinite values use the defaults. Pause preserves the time left in the current phase. A hidden browser tab pauses the timeline automatically. `autoplay: false` waits for Play. `controls: false` hides the built-in buttons; vanilla callers can still use `chat.playback`. In React, manual start needs the built-in controls or a change to `autoplay: true`. Changing React timing options creates a fresh timeline.

The timeline and host readiness are separate. `chat.playback.state.timelineComplete` means the presentation has finished. `stageReady` becomes true only when the timeline has finished and the real content is ready. If the host takes longer, the response shows its loading stage and the phase stays `waiting`. React uses the same rules with its `ready` prop. The state also includes `typedPrompt`, `paused` and `elapsedMs`. Its phases are `typing`, `sending`, `responding`, `waiting` and `complete`.

The built-in vanilla iframe treats its document's `load` event as readiness. For an app that loads its result after that event, mount an iframe as `stage.content` and call `chat.setReady()` when the result is actually usable. React callers own that signal through `ready`.

Replay reuses the existing iframe or content node. It never reloads the result or starts a backend request. Updating a prompt to the same text leaves playback alone; a changed prompt restarts the presentation. Response and tool-title updates do not restart it. Call `destroy()` when removing a vanilla window. React cleans up on unmount.

With `prefers-reduced-motion: reduce`, the final conversation appears immediately and still waits for actual content readiness. Label a compressed marketing replay as an example workflow so viewers do not read its duration as measured generation speed. See [the runnable conversation example](examples/conversation.html).

## API

### `<ClaudeWindow />` — React

| Prop          | Type                                      | Default              | Notes                                                   |
| ------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------- |
| `animation`   | `boolean \| ConversationAnimationOptions` | `false`              | Opt-in conversation playback and controls.              |
| `prompt`      | `string`                                  | —                    | The user's prompt bubble (required).                    |
| `response`    | `ReactNode`                               | —                    | Claude's reply copy.                                    |
| `tool`        | `ToolCall`                                | —                    | `{ name, call, title?, logo? }` tool-call line.         |
| `children`    | `ReactNode`                               | —                    | Stage content (typically an `<iframe>`). Omit for none. |
| `ready`       | `boolean`                                 | `false`              | Reveal the stage (cross-fade the loader out).           |
| `stageHeight` | `number \| string`                        | `300`                | Number → px; string verbatim.                           |
| `avatar`      | `string`                                  | `"You"`              | Rail monogram.                                          |
| `model`       | `string`                                  | `"Opus 4.8"`         | Composer model label.                                   |
| `effort`      | `string`                                  | `"High"`             | Composer mode label.                                    |
| `placeholder` | `string`                                  | `"Reply to Claude…"` | Composer placeholder.                                   |
| `footnote`    | `ReactNode`                               | Claude's disclaimer  | Text under the composer.                                |
| `theme`       | `"auto" \| "light" \| "dark"`             | `"auto"`             | `"auto"` follows `prefers-color-scheme`.                |

Also exported: `<ClaudeSymbols />` to mount the glyph sprite explicitly (useful for SSR).

### `ClaudeWindow(options)` — vanilla

Same fields as options, with `stage: { src?, title?, height?, ready?, content? }` in place of `children`/`ready`/`stageHeight`. Returns a live handle:

| Member                   | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| `el` / `stage` / `frame` | The root, the `.board-stage`, and the built-in iframe.                       |
| `playback`               | Playback state and `play()`, `pause()`, `replay()`, or `null` when disabled. |
| `setPrompt(text)`        | Replace the user prompt.                                                     |
| `setResponse(text)`      | Replace Claude's response copy.                                              |
| `setToolTitle(text)`     | Replace the tool-line title.                                                 |
| `setReady(ready?)`       | Reveal (or re-hide) the stage.                                               |
| `setTheme(theme)`        | Set the colour scheme.                                                       |
| `mount(parent)`          | Append to a parent (chainable).                                              |
| `destroy()`              | Remove from the DOM.                                                         |

## Theming

The window follows the viewer's `prefers-color-scheme` by default. Force a scheme with the `theme` prop/option, or set `data-theme="light" | "dark"` on `.claude-window` yourself. Every surface colour is a `--cl-*` CSS variable, so you can retheme in plain CSS:

```css
.claude-window {
    --cl-accent: #7c5cff;
}
```

> **Inverting against your page?** Pass `theme` computed from your own `matchMedia("(prefers-color-scheme: dark)")` to make the Claude surface the _opposite_ of your site — a common landing-page look.

## Examples

- [`examples/conversation.html`](examples/conversation.html) types a request, sends it and reveals a loaded iframe. It includes Replay/Pause controls, theme selection and a readiness hold for testing a late result. Run `pnpm build`, serve the repository, then open the file.

- [`examples/vanilla.html`](examples/vanilla.html) — a standalone page with theme toggles and a live `setReady` / `setPrompt` demo. Run `npm run build`, then serve the folder and open it.

## License

[MIT](./LICENSE)

## Contributing

Contributions are welcome! Whether it's bug fixes, feature additions, or documentation improvements, we appreciate your help in making this project better. For major changes or new features, please open an issue first to discuss what you would like to change.
