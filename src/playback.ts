import type {
    ConversationAnimationOptions,
    ConversationPlayback,
    ConversationPlaybackState,
    ConversationStep,
} from "./types";

interface PlaybackOptions {
    prompt: string;
    thinking?: string;
    steps?: readonly ConversationStep[];
    ready: boolean;
    hasStage: boolean;
    document: Document;
    animation: ConversationAnimationOptions;
    onChange(state: ConversationPlaybackState): void;
}

export interface PlaybackController extends ConversationPlayback {
    setPrompt(prompt: string): void;
    setThinking(thinking?: string): void;
    setSteps(steps?: readonly ConversationStep[]): void;
    setReady(ready: boolean): void;
    destroy(): void;
}

export function normalizeSteps(steps: readonly ConversationStep[] = []): ConversationStep[] {
    return steps
        .map(({ label, logo }) => ({ label: label.trim(), logo: logo?.trim() || undefined }))
        .filter(({ label }) => label.length > 0);
}
export function sameSteps(a: readonly ConversationStep[], b: readonly ConversationStep[]): boolean {
    return a.length === b.length && a.every((step, i) => step.label === b[i].label && step.logo === b[i].logo);
}
export function playbackAnnouncement(
    state: ConversationPlaybackState,
    thinking: string,
    steps: readonly ConversationStep[]
) {
    switch (state.phase) {
        case "typing":
            return "Typing the example request.";
        case "sending":
            return "Sending the example request.";
        case "thinking":
            return thinking;
        case "steps":
            return steps[state.activeStep ?? 0]?.label ?? "Working through the example actions.";
        case "responding":
            return thinking || steps.length ? "Preparing the example response." : "Request sent.";
        case "waiting":
            return "Waiting for the result to be ready.";
        case "complete":
            return "Example conversation complete.";
    }
}

const duration = (value: number | undefined, fallback: number) =>
    value != null && Number.isFinite(value) ? Math.max(0, value) : fallback;

/** One clock for vanilla and React; host readiness never advances that clock. */
export function createPlayback(options: PlaybackOptions): PlaybackController {
    const typing = duration(options.animation.typingDuration, 2200);
    const send = typing + duration(options.animation.sendDelay, 300);
    const thinkingDuration = duration(options.animation.thinkingDuration, 500);
    const stepDuration = duration(options.animation.stepDuration, 400);
    const responseDuration = duration(options.animation.responseDelay, 450);
    const doc = options.document;
    const motion = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduced = motion?.matches === true;
    let prompt = options.prompt;
    let thinking = options.thinking?.trim() ?? "";
    let steps = normalizeSteps(options.steps);
    let characters = Array.from(prompt);
    let ready = options.ready;
    let paused = options.animation.autoplay === false;
    const thinkingEnd = () => send + (thinking ? thinkingDuration : 0);
    const stepsEnd = () => thinkingEnd() + steps.length * stepDuration;
    const total = () => stepsEnd() + responseDuration;
    let elapsed = reduced ? total() : 0;
    let started = 0;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let destroyed = false;
    let state: ConversationPlaybackState;

    function capture() {
        if (running) elapsed = Math.min(total(), elapsed + Math.max(0, Date.now() - started));
        running = false;
        clearTimeout(timer);
        timer = undefined;
    }

    function update() {
        if (destroyed) return;
        const timelineComplete = reduced || elapsed >= total();
        const phase = timelineComplete
            ? options.hasStage && !ready
                ? "waiting"
                : "complete"
            : elapsed < typing
              ? "typing"
              : elapsed < send
                ? "sending"
                : elapsed < thinkingEnd()
                  ? "thinking"
                  : elapsed < stepsEnd()
                    ? "steps"
                    : "responding";
        const completedSteps =
            elapsed >= stepsEnd() ? steps.length : Math.max(0, Math.floor((elapsed - thinkingEnd()) / stepDuration));
        const activeStep = phase === "steps" ? completedSteps : null;
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
            activeStep,
            completedSteps,
            stageReady: timelineComplete && ready,
        };
        options.onChange(state);
        if (!timelineComplete && !paused && !doc.hidden) {
            running = true;
            started = Date.now();
            const boundary =
                phase === "typing"
                    ? typing
                    : phase === "sending"
                      ? send
                      : phase === "thinking"
                        ? thinkingEnd()
                        : phase === "steps"
                          ? thinkingEnd() + (completedSteps + 1) * stepDuration
                          : total();
            timer = setTimeout(
                () => {
                    capture();
                    update();
                },
                Math.min(32, boundary - elapsed)
            );
        }
    }

    function reset() {
        elapsed = reduced ? total() : 0;
        update();
    }
    function visibility() {
        capture();
        update();
    }
    function motionChange() {
        capture();
        reduced = motion?.matches === true;
        if (reduced) elapsed = total();
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
                paused = false;
                reset();
            }
        },
        setPrompt(value) {
            if (destroyed || value === prompt) return;
            capture();
            prompt = value;
            characters = Array.from(value);
            reset();
        },
        setThinking(value) {
            const next = value?.trim() ?? "";
            if (destroyed || next === thinking) return;
            capture();
            thinking = next;
            reset();
        },
        setSteps(value) {
            const next = normalizeSteps(value);
            if (destroyed || sameSteps(next, steps)) return;
            capture();
            steps = next;
            reset();
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
