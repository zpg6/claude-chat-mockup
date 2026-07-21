/**
 * claude-chat-mockup — a portable rendering of the claude.ai chat UI
 * used as a marketing hero: the left rail, top bar, a user prompt bubble,
 * Claude's response with a tool-call line, a loading "stage" that fades in an
 * iframe (or any content), the composer, and the footnote.
 *
 * This is the framework-free core. For React, import from
 * `claude-chat-mockup/react`. Styles ship separately — import
 * `claude-chat-mockup/style.css` once.
 */

import { injectSymbols } from "./symbols";
import type { ClaudeTheme, ClaudeWindowHandle, ClaudeWindowOptions, StageOptions, ToolCall } from "./types";

export type { ClaudeTheme, ClaudeWindowHandle, ClaudeWindowOptions, StageOptions, ToolCall } from "./types";
export { CLAUDE_SYMBOLS, CLAUDE_SYMBOLS_SVG, SYMBOLS_ID, injectSymbols } from "./symbols";

const DEFAULTS = {
    avatar: "You",
    model: "Opus 4.8",
    effort: "High",
    placeholder: "Reply to Claude…",
    footnote: "Claude can make mistakes. Please double-check responses.",
} as const;

function esc(value: string): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Render the tool-line logo chip: raw SVG/HTML markup, a monogram, or blank. */
function toolLogo(logo?: string): string {
    if (!logo) return "";
    const trimmed = logo.trim();
    return trimmed.startsWith("<") ? trimmed : esc(trimmed);
}

function toolLine(tool: ToolCall): string {
    return `<div class="claude-tool-line">
        <span class="claude-tool-logo" aria-label="${esc(tool.name)}">${toolLogo(tool.logo)}</span
        ><b>${esc(tool.name)}</b><code>${esc(tool.call)}</code
        >${tool.title != null ? `<span class="showcase-title">${esc(tool.title)}</span>` : ""}
    </div>`;
}

function stageMarkup(stage: StageOptions): string {
    const inner = stage.content
        ? `<div class="board-stage-content"></div>`
        : `<iframe class="mcp-frame" title="${esc(stage.title ?? "Interactive preview")}" loading="eager"></iframe>`;
    return `<div class="board-stage">
        <div class="board-loader" aria-hidden="true"></div>
        ${inner}
    </div>`;
}

function windowMarkup(opts: ClaudeWindowOptions): string {
    const avatar = opts.avatar ?? DEFAULTS.avatar;
    const model = opts.model ?? DEFAULTS.model;
    const effort = opts.effort ?? DEFAULTS.effort;
    const placeholder = opts.placeholder ?? DEFAULTS.placeholder;
    const footnote = opts.footnote ?? DEFAULTS.footnote;

    const responseBits = [
        opts.response != null ? `<div class="claude-response-copy">${esc(opts.response)}</div>` : "",
        opts.tool ? toolLine(opts.tool) : "",
        opts.stage ? stageMarkup(opts.stage) : "",
    ].join("\n");

    return `<aside class="claude-rail" aria-hidden="true">
        <span class="claude-rail-toggle"><svg><use href="#anthropic-sidebar"></use></svg></span>
        <span class="claude-rail-glyph"><svg><use href="#anthropic-search"></use></svg></span>
        <span class="claude-rail-glyph"><svg><use href="#anthropic-plus"></use></svg></span>
        <span class="claude-rail-spacer"></span>
        <span class="claude-rail-avatar">${esc(avatar)}</span>
    </aside>
    <div class="claude-app">
        <div class="claude-top">
            <span class="claude-corner sidebar" aria-hidden="true"><svg><use href="#anthropic-sidebar"></use></svg></span>
            <span class="claude-context" role="img" aria-label="Claude"><svg aria-hidden="true"><use href="#claude-svg"></use></svg><span class="claude-wordmark" aria-hidden="true"></span></span>
            <span class="claude-corner incognito" aria-hidden="true"><svg><use href="#anthropic-incognito"></use></svg></span>
        </div>
        <div class="claude-conversation">
            <div class="claude-user" data-ccp-prompt>${esc(opts.prompt)}</div>
            <div class="claude-response">
                <div class="claude-avatar" aria-hidden="true"><svg><use href="#claude-svg"></use></svg></div>
                <div class="claude-response-main">
                    ${responseBits}
                </div>
            </div>
        </div>
        <div class="claude-composer">
            <span class="claude-placeholder">${esc(placeholder)}</span>
            <div class="claude-compose-row" aria-hidden="true">
                <svg class="claude-plus"><use href="#anthropic-plus"></use></svg>
                <span class="claude-model">${esc(model)} <em>${esc(effort)} <svg><use href="#anthropic-chevron"></use></svg></em></span>
                <svg class="claude-mic"><use href="#anthropic-mic"></use></svg>
                <svg class="claude-wave"><use href="#anthropic-voice"></use></svg>
            </div>
        </div>
        <div class="claude-footnote">${esc(footnote)}</div>
    </div>`;
}

function resolveTheme(el: HTMLElement, theme: ClaudeTheme | undefined): void {
    if (theme && theme !== "auto") el.setAttribute("data-theme", theme);
    else el.removeAttribute("data-theme");
}

/**
 * Build a Claude window element and return a live handle. Injects the glyph
 * sprite on first use. Call `.mount(parent)` to place it, or read `.el`.
 *
 * ```ts
 * import { ClaudeWindow } from "claude-chat-mockup";
 * import "claude-chat-mockup/style.css";
 *
 * const chat = ClaudeWindow({
 *     prompt: "Design a pricing section for my SaaS landing page.",
 *     response: "Here's a responsive pricing section with Pro highlighted.",
 *     tool: { name: "claude", call: "create_artifact", title: "Pricing Section" },
 *     stage: { src: "/preview.html", height: 300 },
 * }).mount(document.querySelector("#hero"));
 *
 * // later, when your own iframe finishes loading:
 * chat.setReady();
 * ```
 */
export function ClaudeWindow(options: ClaudeWindowOptions): ClaudeWindowHandle {
    const doc = options.document ?? globalThis.document;
    if (!doc) throw new Error("ClaudeWindow requires a DOM document (pass `document` for SSR).");
    injectSymbols(doc);

    const el = doc.createElement("div");
    el.className = ["claude-window", options.className].filter(Boolean).join(" ");
    el.setAttribute("aria-label", "Claude conversation");
    el.innerHTML = windowMarkup(options);
    resolveTheme(el, options.theme);

    const promptEl = el.querySelector<HTMLElement>("[data-ccp-prompt]");
    const responseEl = el.querySelector<HTMLElement>(".claude-response-copy");
    const titleEl = el.querySelector<HTMLElement>(".showcase-title");
    const stage = el.querySelector<HTMLElement>(".board-stage");
    const frame = stage?.querySelector<HTMLIFrameElement>(".mcp-frame") ?? null;

    const setReady = (ready = true): void => {
        stage?.classList.toggle("viewer-ready", ready);
    };

    // Wire up the stage: custom content, or an auto-revealing iframe.
    if (stage && options.stage) {
        const content = options.stage.content;
        if (content) {
            stage.querySelector(".board-stage-content")?.append(content);
        }
        if (options.stage.height != null) {
            stage.style.height =
                typeof options.stage.height === "number" ? `${options.stage.height}px` : options.stage.height;
        }
        if (frame && options.stage.src) {
            frame.addEventListener(
                "load",
                () => (globalThis.requestAnimationFrame ?? ((cb: FrameRequestCallback) => cb(0)))(() => setReady(true)),
                { once: true }
            );
            frame.src = options.stage.src;
        }
        if (options.stage.ready) setReady(true);
    }

    const handle: ClaudeWindowHandle = {
        el,
        stage,
        frame,
        setPrompt(text) {
            if (promptEl) promptEl.textContent = text;
        },
        setResponse(text) {
            if (responseEl) responseEl.textContent = text;
        },
        setToolTitle(text) {
            if (titleEl) titleEl.textContent = text;
        },
        setReady,
        setTheme(theme) {
            resolveTheme(el, theme);
        },
        mount(parent) {
            if (!parent) {
                throw new Error(
                    "ClaudeWindow.mount() received a null/undefined parent. Check your selector — e.g. document.querySelector('#hero') returns null when the element isn't found."
                );
            }
            parent.append(el);
            return handle;
        },
        destroy() {
            el.remove();
        },
    };
    return handle;
}
