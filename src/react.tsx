/**
 * React entry for claude-chat-mockup. Renders the same chrome as the vanilla
 * core with the same CSS classes — import `claude-chat-mockup/style.css` once.
 *
 * ```tsx
 * import { ClaudeWindow } from "claude-chat-mockup/react";
 * import "claude-chat-mockup/style.css";
 *
 * <ClaudeWindow
 *     prompt="Design a CAN controller reference board."
 *     response="Here's the manifest-verified result and its fab export."
 *     tool={{ name: "gerbers.ai", call: "board_render", title: "Molex CAN Node" }}
 *     ready={loaded}
 * >
 *     <iframe title="viewer" src="/viewer.html" onLoad={() => setLoaded(true)} />
 * </ClaudeWindow>
 * ```
 */

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { CLAUDE_SYMBOLS, SYMBOLS_ID, injectSymbols } from "./symbols";
import type { ClaudeTheme, ToolCall } from "./types";

export type { ClaudeTheme, ToolCall } from "./types";

export interface ClaudeWindowProps {
    /** The user's prompt bubble text. */
    prompt: string;
    /** Claude's reply copy shown above the tool line / stage. */
    response?: ReactNode;
    /** A tool-call line to render under the response. */
    tool?: ToolCall;
    /** Rail avatar monogram. Default `"You"`. */
    avatar?: string;
    /** Composer model label. Default `"Opus 4.8"`. */
    model?: string;
    /** Composer effort/mode label. Default `"High"`. */
    effort?: string;
    /** Composer placeholder. Default `"Reply to Claude…"`. */
    placeholder?: string;
    /** Footnote under the composer. Default Claude's standard disclaimer. */
    footnote?: ReactNode;
    /** Colour scheme. Default `"auto"` (follows `prefers-color-scheme`). */
    theme?: ClaudeTheme;
    /**
     * Stage content — typically an `<iframe>`. When present, a loading stage is
     * rendered and revealed once `ready` is `true`. Omit for chrome only.
     */
    children?: ReactNode;
    /** Reveal the stage (cross-fade the loader out). Default `false`. */
    ready?: boolean;
    /** Stage height. Number → px; string verbatim. Default `300px`. */
    stageHeight?: number | string;
    /** Extra class names on the root `.claude-window`. */
    className?: string;
    /** Inline style on the root. */
    style?: CSSProperties;
}

/**
 * Renders the Anthropic glyph sprite. Mount once near your app root if you
 * prefer explicit control; otherwise `ClaudeWindow` injects it on the client.
 */
export function ClaudeSymbols(): React.JSX.Element {
    return (
        <svg
            id={SYMBOLS_ID}
            aria-hidden="true"
            focusable="false"
            style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
            dangerouslySetInnerHTML={{ __html: CLAUDE_SYMBOLS }}
        />
    );
}

const Icon = ({ id, className }: { id: string; className?: string }) => (
    <svg className={className}>
        <use href={`#${id}`} />
    </svg>
);

export function ClaudeWindow({
    prompt,
    response,
    tool,
    avatar = "You",
    model = "Opus 4.8",
    effort = "High",
    placeholder = "Reply to Claude…",
    footnote = "Claude can make mistakes. Please double-check responses.",
    theme = "auto",
    children,
    ready = false,
    stageHeight,
    className,
    style,
}: ClaudeWindowProps): React.JSX.Element {
    // Fallback injection for consumers who don't render <ClaudeSymbols /> themselves.
    useEffect(() => {
        injectSymbols();
    }, []);

    const stageStyle: CSSProperties | undefined =
        stageHeight != null
            ? { height: typeof stageHeight === "number" ? `${stageHeight}px` : stageHeight }
            : undefined;

    return (
        <div
            className={["claude-window", className].filter(Boolean).join(" ")}
            aria-label="Claude conversation"
            data-theme={theme === "auto" ? undefined : theme}
            style={style}
        >
            <aside className="claude-rail" aria-hidden="true">
                <span className="claude-rail-toggle">
                    <Icon id="anthropic-sidebar" />
                </span>
                <span className="claude-rail-glyph">
                    <Icon id="anthropic-search" />
                </span>
                <span className="claude-rail-glyph">
                    <Icon id="anthropic-plus" />
                </span>
                <span className="claude-rail-spacer" />
                <span className="claude-rail-avatar">{avatar}</span>
            </aside>
            <div className="claude-app">
                <div className="claude-top">
                    <span className="claude-corner sidebar" aria-hidden="true">
                        <Icon id="anthropic-sidebar" />
                    </span>
                    <span className="claude-context" role="img" aria-label="Claude">
                        <Icon id="claude-svg" />
                        <span className="claude-wordmark" aria-hidden="true" />
                    </span>
                    <span className="claude-corner incognito" aria-hidden="true">
                        <Icon id="anthropic-incognito" />
                    </span>
                </div>
                <div className="claude-conversation">
                    <div className="claude-user" data-ccp-prompt>
                        {prompt}
                    </div>
                    <div className="claude-response">
                        <div className="claude-avatar" aria-hidden="true">
                            <Icon id="claude-svg" />
                        </div>
                        <div className="claude-response-main">
                            {response != null && <div className="claude-response-copy">{response}</div>}
                            {tool && (
                                <div className="claude-tool-line">
                                    <span className="claude-tool-logo" aria-label={tool.name}>
                                        {tool.logo ? <ToolLogo logo={tool.logo} /> : null}
                                    </span>
                                    <b>{tool.name}</b>
                                    <code>{tool.call}</code>
                                    {tool.title != null && <span className="showcase-title">{tool.title}</span>}
                                </div>
                            )}
                            {children != null && (
                                <div
                                    className={["board-stage", ready ? "viewer-ready" : ""].join(" ").trim()}
                                    style={stageStyle}
                                >
                                    <div className="board-loader" aria-hidden="true" />
                                    <div className="board-stage-content">{children}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="claude-composer">
                    <span className="claude-placeholder">{placeholder}</span>
                    <div className="claude-compose-row" aria-hidden="true">
                        <Icon id="anthropic-plus" className="claude-plus" />
                        <span className="claude-model">
                            {model}{" "}
                            <em>
                                {effort} <Icon id="anthropic-chevron" />
                            </em>
                        </span>
                        <Icon id="anthropic-mic" className="claude-mic" />
                        <Icon id="anthropic-voice" className="claude-wave" />
                    </div>
                </div>
                <div className="claude-footnote">{footnote}</div>
            </div>
        </div>
    );
}

/** Renders a tool logo: raw SVG/HTML markup, or a short monogram string. */
function ToolLogo({ logo }: { logo: string }): React.JSX.Element {
    const trimmed = logo.trim();
    return trimmed.startsWith("<") ? (
        <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: trimmed }} />
    ) : (
        <>{trimmed}</>
    );
}
