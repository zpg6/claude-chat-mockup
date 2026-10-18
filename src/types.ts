/** A rendered tool-call line: `[logo]  name  ·  call  |  title`. */
export interface ToolCall {
    /** Provider name, shown in bold. e.g. `"gerbers.ai"`. */
    name: string;
    /** The tool/method, shown as a `<code>` chip. e.g. `"board_render"`. */
    call: string;
    /** Optional trailing title after a divider. e.g. `"Molex CAN Node"`. */
    title?: string;
    /**
     * Optional logo for the leading chip. Pass raw inline SVG/HTML markup, or a
     * short string (1–2 chars) to render as a monogram. Omit for a blank chip.
     */
    logo?: string;
}

/** The loading stage that hosts an iframe (or any element) with a fade-in. */
export interface StageOptions {
    /** iframe `src`. When set, the builder wires `load` → `ready` for you. */
    src?: string;
    /** iframe `title` (accessibility). */
    title?: string;
    /** Stage height. Number → px; string → used verbatim. Default `300px`. */
    height?: number | string;
    /** Start already revealed (skip the loader). Default `false`. */
    ready?: boolean;
    /**
     * Custom stage content instead of the built-in iframe. When provided, `src`
     * is ignored and you own reveal timing via the handle's `setReady`.
     * Vanilla: an `HTMLElement`. React: pass `children` instead.
     */
    content?: HTMLElement;
}

/** Colour scheme for the window surface. `"auto"` follows `prefers-color-scheme`. */
export type ClaudeTheme = "auto" | "light" | "dark";

/** One action in the assistant's illustrative workflow. */
export interface ConversationStep {
    label: string;
    /** Optional SVG/HTML or monogram, with the same convention as a tool logo. */
    logo?: string;
}

/** Opt-in prompt, send and response playback. Durations are milliseconds. */
export interface ConversationAnimationOptions {
    autoplay?: boolean;
    controls?: boolean;
    typingDuration?: number;
    sendDelay?: number;
    /** Applied only when thinking text is present. Default 500ms. */
    thinkingDuration?: number;
    /** Applied per nonblank action step. Default 400ms. */
    stepDuration?: number;
    responseDelay?: number;
}

export interface ConversationPlaybackState {
    readonly phase: "typing" | "sending" | "thinking" | "steps" | "responding" | "waiting" | "complete";
    readonly typedPrompt: string;
    readonly paused: boolean;
    readonly elapsedMs: number;
    /** The presentation finished its timeline, independently of host readiness. */
    readonly timelineComplete: boolean;
    /** Zero-based active step, or null outside the steps phase. */
    readonly activeStep: number | null;
    readonly completedSteps: number;
    /** Both the presentation and the actual host content are ready. */
    readonly stageReady: boolean;
}

export interface ConversationPlayback {
    readonly state: ConversationPlaybackState;
    play(): void;
    pause(): void;
    /** Replay the presentation without reloading its content or calling the host. */
    replay(): void;
}

/** Options accepted by the vanilla {@link ClaudeWindow} factory. */
export interface ClaudeWindowOptions {
    /** The user's prompt bubble text. */
    prompt: string;
    /** A short intention shown before the action steps and final response. */
    thinking?: string;
    /** Concrete actions shown in order. Blank labels are ignored. */
    steps?: readonly ConversationStep[];
    /** Claude's reply copy shown above the tool line / stage. */
    response?: string;
    /** A tool-call line to render under the response. */
    tool?: ToolCall;
    /** The loading stage. Omit to render chrome only (no board area). */
    stage?: StageOptions;
    /** Rail avatar monogram (bottom of the left rail). Default `"You"`. */
    avatar?: string;
    /** Composer model label. Default `"Opus 4.8"`. */
    model?: string;
    /** Composer effort/mode label next to the model. Default `"High"`. */
    effort?: string;
    /** Composer placeholder text. Default `"Reply to Claude…"`. */
    placeholder?: string;
    /** Footnote under the composer. Default Claude's standard disclaimer. */
    footnote?: string;
    /** Colour scheme. Default `"auto"`. */
    theme?: ClaudeTheme;
    /** Extra class names appended to the root `.claude-window`. */
    className?: string;
    /** Document to build in (for SSR/testing). Default `globalThis.document`. */
    document?: Document;
    /** Animate the prompt before showing the conversation. Omitted by default. */
    animation?: boolean | ConversationAnimationOptions;
}

/** Live handle returned by the vanilla {@link ClaudeWindow} factory. */
export interface ClaudeWindowHandle {
    /** The root `.claude-window` element. */
    readonly el: HTMLElement;
    /** The `.board-stage` element, or `null` when no stage was rendered. */
    readonly stage: HTMLElement | null;
    /** The built-in `.mcp-frame` iframe, or `null` (no stage / custom content). */
    readonly frame: HTMLIFrameElement | null;
    /** Presentation controls, or null when animation is disabled. */
    readonly playback: ConversationPlayback | null;
    /** Replace the user prompt text. */
    setPrompt(text: string): void;
    /** Update the intention. Changed content restarts presentation playback. */
    setThinking(text?: string): void;
    /** Update the actions. Semantically equal arrays preserve playback. */
    setSteps(steps?: readonly ConversationStep[]): void;
    /** Replace Claude's response copy. */
    setResponse(text: string): void;
    /** Replace the tool-line trailing title. */
    setToolTitle(text: string): void;
    /** Reveal (or re-hide) the stage: cross-fades the loader out/in. */
    setReady(ready?: boolean): void;
    /** Set the colour scheme after construction. */
    setTheme(theme: ClaudeTheme): void;
    /**
     * Append the window to a parent and return the handle (chainable). Accepts
     * the result of `querySelector`/`getElementById` directly; throws a clear
     * error if the parent is `null` (e.g. the selector matched nothing).
     */
    mount(parent: Element | null): ClaudeWindowHandle;
    /** Remove the window from the DOM. */
    destroy(): void;
}
