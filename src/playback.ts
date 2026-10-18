import type { ConversationAnimationOptions, ConversationPlayback, ConversationPlaybackState } from "./types";

interface PlaybackOptions {
    prompt: string;
    ready: boolean;
    hasStage: boolean;
    document: Document;
    animation: ConversationAnimationOptions;
    onChange(state: ConversationPlaybackState): void;
}

export interface PlaybackController extends ConversationPlayback {
    setPrompt(prompt: string): void;
    setReady(ready: boolean): void;
    destroy(): void;
}

const duration = (value: number | undefined, fallback: number) =>
    value != null && Number.isFinite(value) ? Math.max(0, value) : fallback;

/** One clock for vanilla and React; host readiness never advances that clock. */
export function createPlayback(options: PlaybackOptions): PlaybackController {
    const typing = duration(options.animation.typingDuration, 2200);
    const send = typing + duration(options.animation.sendDelay, 300);
    const total = send + duration(options.animation.responseDelay, 450);
    const doc = options.document;
    const motion = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = motion?.matches === true;
    let prompt = options.prompt;
    let characters = Array.from(prompt);
    let ready = options.ready;
    let paused = options.animation.autoplay === false;
    let elapsed = reduced ? total : 0;
    let started = 0;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let destroyed = false;
    let state: ConversationPlaybackState;

    function capture() {
        if (running) elapsed = Math.min(total, elapsed + Math.max(0, Date.now() - started));
        running = false;
        clearTimeout(timer);
        timer = undefined;
    }

    function update() {
        if (destroyed) return;
        const timelineComplete = reduced || elapsed >= total;
        const phase = timelineComplete
            ? options.hasStage && !ready
                ? "waiting"
                : "complete"
            : elapsed < typing
              ? "typing"
              : elapsed < send
                ? "sending"
                : "responding";
        state = {
            phase,
            typedPrompt: characters
                .slice(
                    0,
                    typing === 0 ? characters.length : Math.floor(characters.length * Math.min(1, elapsed / typing))
                )
                .join(""),
            paused,
            elapsedMs: elapsed,
            timelineComplete,
            stageReady: timelineComplete && ready,
        };
        options.onChange(state);
        if (!timelineComplete && !paused && !doc.hidden) {
            running = true;
            started = Date.now();
            const boundary = elapsed < typing ? typing : elapsed < send ? send : total;
            timer = setTimeout(
                () => {
                    capture();
                    update();
                },
                Math.min(32, boundary - elapsed)
            );
        }
    }

    function visibility() {
        capture();
        update();
    }
    function motionChange() {
        capture();
        reduced = motion?.matches === true;
        if (reduced) elapsed = total;
        update();
    }

    doc.addEventListener("visibilitychange", visibility);
    motion?.addEventListener("change", motionChange);
    update();

    return {
        get state() {
            return state;
        },
        play() {
            if (!destroyed) {
                capture();
                paused = false;
                update();
            }
        },
        pause() {
            if (!destroyed) {
                capture();
                paused = true;
                update();
            }
        },
        replay() {
            if (!destroyed) {
                capture();
                elapsed = reduced ? total : 0;
                paused = false;
                update();
            }
        },
        setPrompt(value) {
            if (destroyed || value === prompt) return;
            capture();
            prompt = value;
            characters = Array.from(value);
            elapsed = reduced ? total : 0;
            update();
        },
        setReady(value) {
            if (!destroyed) {
                capture();
                ready = value;
                update();
            }
        },
        destroy() {
            capture();
            destroyed = true;
            doc.removeEventListener("visibilitychange", visibility);
            motion?.removeEventListener("change", motionChange);
        },
    };
}
