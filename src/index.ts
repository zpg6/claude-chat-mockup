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
import { createPlayback, normalizeSteps, sameSteps, playbackAnnouncement, type PlaybackController } from "./playback";
import type {
    ClaudeTheme,
    ClaudeWindowHandle,
    ClaudeWindowOptions,
    StageOptions,
    ToolCall,
    ConversationPlaybackState,
} from "./types";

export type {
    ClaudeTheme,
    ClaudeWindowHandle,
    ClaudeWindowOptions,
    StageOptions,
    ToolCall,
    ConversationStep,
    ConversationAnimationOptions,
    ConversationPlayback,
    ConversationPlaybackState,
} from "./types";
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
            ${opts.animation ? '<span class="claude-typed-prompt" aria-hidden="true"><span data-ccp-typed></span><span class="claude-typing-caret"></span></span>' : ""}
            <span class="claude-placeholder">${esc(placeholder)}</span>
            <div class="claude-compose-row" aria-hidden="true">
                <svg class="claude-plus"><use href="#anthropic-plus"></use></svg>
                <span class="claude-model">${esc(model)} <em>${esc(effort)} <svg><use href="#anthropic-chevron"></use></svg></em></span>
                <svg class="claude-mic"><use href="#anthropic-mic"></use></svg>
                <svg class="claude-wave"><use href="#anthropic-voice"></use></svg>
                ${opts.animation ? '<span class="claude-send" aria-hidden="true">↑</span>' : ""}
            </div>
        </div>
        <div class="claude-footnote">${esc(footnote)}</div>
        ${opts.animation ? `<div class="claude-playback-status" role="status" aria-live="polite"></div>${typeof opts.animation === "object" && opts.animation.controls === false ? "" : '<div class="claude-playback-controls"><button type="button" data-ccp-replay>Replay</button><button type="button" data-ccp-toggle>Pause</button></div>'}` : ""}
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
    let playback: PlaybackController | null = null;
    let destroyed = false;
    let loadFrame: number | undefined;

    const setReady = (ready = true): void => {
        if (destroyed) return;
        if (playback) playback.setReady(ready);
        else stage?.classList.toggle("viewer-ready", ready);
    };
    const onFrameLoad = () => {
        const view = doc.defaultView;
        if (view?.requestAnimationFrame) loadFrame = view.requestAnimationFrame(() => setReady(true));
        else setReady(true);
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
            frame.addEventListener("load", onFrameLoad, { once: true });
            frame.src = options.stage.src;
        }
        if (options.stage.ready) setReady(true);
    }

    let thinking = options.thinking?.trim() ?? "";
    let steps = normalizeSteps(options.steps);
    const response = el.querySelector<HTMLElement>(".claude-response")!;
    const responseMain = el.querySelector<HTMLElement>(".claude-response-main")!;
    const finalNodes = Array.from(responseMain.children) as HTMLElement[];
    let thinkingEl: HTMLElement | null = null;
    let stepsEl: HTMLOListElement | null = null;
    function renderProgress(state?: ConversationPlaybackState) {
        const hasProgress = !!thinking || steps.length > 0;
        if (hasProgress) el.dataset.ccpProgress = "";
        else delete el.dataset.ccpProgress;
        if (state) {
            const progressVisible = hasProgress && state.phase !== "typing" && state.phase !== "sending";
            response.setAttribute("aria-hidden", String(!progressVisible && !state.timelineComplete));
            finalNodes.forEach(node => node.setAttribute("aria-hidden", String(!state.timelineComplete)));
            thinkingEl?.setAttribute("aria-hidden", String(!progressVisible));
            stepsEl?.setAttribute("aria-hidden", String(!progressVisible || state.phase === "thinking"));
        }
        stepsEl?.querySelectorAll<HTMLElement>(".claude-step").forEach((node, index) => {
            const status =
                !state || index < state.completedSteps
                    ? "completed"
                    : index === state.activeStep
                      ? "active"
                      : "pending";
            node.dataset.status = status;
            node.querySelector<HTMLElement>(".claude-step-status")!.textContent =
                status === "active" ? "In progress" : status === "completed" ? "Completed" : "Pending";
        });
    }
    function syncProgress() {
        if (thinking && !thinkingEl) {
            thinkingEl = doc.createElement("div");
            thinkingEl.className = "claude-thinking";
            responseMain.prepend(thinkingEl);
        }
        if (thinkingEl) {
            if (thinking) thinkingEl.textContent = thinking;
            else {
                thinkingEl.remove();
                thinkingEl = null;
            }
        }
        if (stepsEl) {
            stepsEl.remove();
            stepsEl = null;
        }
        if (steps.length) {
            stepsEl = doc.createElement("ol");
            stepsEl.className = "claude-steps";
            stepsEl.setAttribute("aria-label", "Example actions");
            stepsEl.innerHTML = steps
                .map(
                    (step, index) =>
                        `<li class="claude-step"><span class="claude-step-marker" aria-hidden="true">${step.logo ? toolLogo(step.logo) : index + 1}</span><span class="claude-step-label">${esc(step.label)}</span><span class="claude-step-status"></span></li>`
                )
                .join("");
            responseMain.insertBefore(stepsEl, thinkingEl ? thinkingEl.nextSibling : responseMain.firstChild);
        }
        renderProgress(playback?.state);
    }
    syncProgress();

    const toggle = el.querySelector<HTMLButtonElement>("[data-ccp-toggle]");
    const replay = el.querySelector<HTMLButtonElement>("[data-ccp-replay]");
    const togglePlayback = () => (playback?.state.paused ? playback.play() : playback?.pause());
    const replayPlayback = () => playback?.replay();
    if (options.animation) {
        const typed = el.querySelector<HTMLElement>("[data-ccp-typed]")!;
        const status = el.querySelector<HTMLElement>(".claude-playback-status")!;
        el.dataset.ccpAnimation = "";
        playback = createPlayback({
            prompt: options.prompt,
            thinking,
            steps,
            ready: options.stage?.ready === true,
            hasStage: stage !== null,
            document: doc,
            animation: typeof options.animation === "object" ? options.animation : {},
            onChange(state) {
                el.dataset.ccpPhase = state.phase;
                el.dataset.ccpPaused = String(state.paused);
                typed.textContent = state.typedPrompt;
                promptEl?.setAttribute("aria-hidden", String(state.phase === "typing" || state.phase === "sending"));
                renderProgress(state);
                stage?.classList.toggle("viewer-ready", state.stageReady);
                if (toggle) {
                    toggle.textContent = state.paused ? "Play" : "Pause";
                    toggle.disabled = state.timelineComplete;
                }
                const message = playbackAnnouncement(state, thinking, steps);
                if (status.textContent !== message) status.textContent = message;
            },
        });
        toggle?.addEventListener("click", togglePlayback);
        replay?.addEventListener("click", replayPlayback);
    }

    const handle: ClaudeWindowHandle = {
        el,
        stage,
        frame,
        get playback() {
            return playback;
        },
        setPrompt(text) {
            if (promptEl) promptEl.textContent = text;
            playback?.setPrompt(text);
        },
        setThinking(text) {
            const next = text?.trim() ?? "";
            if (destroyed || next === thinking) return;
            thinking = next;
            syncProgress();
            playback?.setThinking(thinking);
        },
        setSteps(value) {
            const next = normalizeSteps(value);
            if (destroyed || sameSteps(next, steps)) return;
            steps = next;
            syncProgress();
            playback?.setSteps(steps);
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
            destroyed = true;
            playback?.destroy();
            frame?.removeEventListener("load", onFrameLoad);
            if (loadFrame !== undefined) doc.defaultView?.cancelAnimationFrame(loadFrame);
            toggle?.removeEventListener("click", togglePlayback);
            replay?.removeEventListener("click", replayPlayback);
            el.remove();
        },
    };
    return handle;
}
