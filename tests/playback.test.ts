import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayback, type PlaybackController } from "../src/playback";

const timing = { typingDuration: 100, sendDelay: 50, responseDelay: 50 };
let controllers: PlaybackController[];

beforeEach(() => {
    vi.useFakeTimers();
    controllers = [];
});
afterEach(() => {
    controllers.forEach(controller => controller.destroy());
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
function playback(options: Partial<Parameters<typeof createPlayback>[0]> = {}) {
    const controller = createPlayback({
        prompt: "hello",
        ready: false,
        hasStage: true,
        document,
        animation: timing,
        onChange: () => {},
        ...options,
    });
    controllers.push(controller);
    return controller;
}

export function mockMotion(reduced = false) {
    const listeners = new Set<EventListener>();
    const motion = {
        matches: reduced,
        addEventListener: vi.fn((_name: string, listener: EventListener) => listeners.add(listener)),
        removeEventListener: vi.fn((_name: string, listener: EventListener) => listeners.delete(listener)),
    };
    vi.stubGlobal(
        "matchMedia",
        vi.fn(() => motion)
    );
    return {
        motion,
        change(value: boolean) {
            motion.matches = value;
            listeners.forEach(listener => listener(new Event("change")));
        },
    };
}

describe("shared conversation playback", () => {
    it("finishes its timeline and waits for actual content readiness", () => {
        const controller = playback();
        vi.advanceTimersByTime(200);
        expect(controller.state).toMatchObject({
            phase: "waiting",
            timelineComplete: true,
            stageReady: false,
            typedPrompt: "hello",
        });
        expect(vi.getTimerCount()).toBe(0);
        controller.setReady(true);
        expect(controller.state).toMatchObject({ phase: "complete", timelineComplete: true, stageReady: true });
        controller.setReady(false);
        expect(controller.state.phase).toBe("waiting");
    });

    it("keeps early-ready content hidden until the response finishes", () => {
        const controller = playback({ ready: true });
        vi.advanceTimersByTime(199);
        expect(controller.state.stageReady).toBe(false);
        vi.advanceTimersByTime(1);
        expect(controller.state).toMatchObject({ phase: "complete", stageReady: true });
    });

    it.each([40, 120, 170])("preserves the remaining time when paused at %ims", elapsed => {
        const controller = playback({ ready: true });
        vi.advanceTimersByTime(elapsed);
        controller.pause();
        const paused = controller.state;
        expect(paused.elapsedMs).toBe(elapsed);
        vi.advanceTimersByTime(1000);
        expect(controller.state).toEqual(paused);
        controller.play();
        vi.advanceTimersByTime(200 - elapsed - 1);
        expect(controller.state.timelineComplete).toBe(false);
        vi.advanceTimersByTime(1);
        expect(controller.state).toMatchObject({ timelineComplete: true, stageReady: true });
    });

    it("does not restart for the same prompt and restarts only a changed prompt", () => {
        const controller = playback();
        vi.advanceTimersByTime(60);
        controller.pause();
        controller.setPrompt("hello");
        expect(controller.state).toMatchObject({ elapsedMs: 60, typedPrompt: "hel", paused: true });
        controller.setPrompt("new 👋");
        expect(controller.state).toMatchObject({ elapsedMs: 0, typedPrompt: "", paused: true });
        controller.play();
        vi.advanceTimersByTime(100);
        expect(controller.state.typedPrompt).toBe("new 👋");
    });

    it("replays presentation with readiness retained and without a host callback", () => {
        const controller = playback({ ready: true });
        vi.advanceTimersByTime(200);
        controller.replay();
        expect(controller.state).toMatchObject({ elapsedMs: 0, stageReady: false, phase: "typing" });
        vi.advanceTimersByTime(200);
        expect(controller.state).toMatchObject({ stageReady: true, phase: "complete" });
    });

    it("shows the final reduced-motion conversation while waiting for real content", () => {
        const { motion } = mockMotion(true);
        const controller = playback();
        expect(controller.state).toMatchObject({
            phase: "waiting",
            timelineComplete: true,
            stageReady: false,
            typedPrompt: "hello",
        });
        controller.replay();
        expect(vi.getTimerCount()).toBe(0);
        controller.setReady(true);
        expect(controller.state.stageReady).toBe(true);
        controller.destroy();
        expect(motion.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });

    it("responds to a reduced-motion preference change", () => {
        const { change } = mockMotion();
        const controller = playback();
        vi.advanceTimersByTime(40);
        change(true);
        expect(controller.state).toMatchObject({ timelineComplete: true, stageReady: false, typedPrompt: "hello" });
        expect(vi.getTimerCount()).toBe(0);
    });

    it("freezes in a hidden document and resumes the remaining time", () => {
        const controller = playback({ ready: true });
        vi.advanceTimersByTime(40);
        const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
        document.dispatchEvent(new Event("visibilitychange"));
        vi.advanceTimersByTime(1000);
        expect(controller.state.elapsedMs).toBe(40);
        hidden.mockReturnValue(false);
        document.dispatchEvent(new Event("visibilitychange"));
        vi.advanceTimersByTime(160);
        expect(controller.state.timelineComplete).toBe(true);
        hidden.mockRestore();
    });

    it("supports manual start, zero durations and chrome without a stage", () => {
        const controller = playback({ hasStage: false, animation: { ...timing, autoplay: false } });
        vi.advanceTimersByTime(500);
        expect(controller.state).toMatchObject({ phase: "typing", elapsedMs: 0, paused: true });
        controller.play();
        vi.advanceTimersByTime(200);
        expect(controller.state.phase).toBe("complete");
        const immediate = playback({ animation: { typingDuration: 0, sendDelay: 0, responseDelay: 0 } });
        expect(immediate.state).toMatchObject({ phase: "waiting", timelineComplete: true, typedPrompt: "hello" });
    });

    it("cleans up its timer and listeners on destroy", () => {
        const remove = vi.spyOn(document, "removeEventListener");
        const controller = playback();
        controller.destroy();
        expect(vi.getTimerCount()).toBe(0);
        expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
        const state = controller.state;
        controller.play();
        controller.replay();
        controller.setReady(true);
        vi.advanceTimersByTime(1000);
        expect(controller.state).toEqual(state);
        remove.mockRestore();
    });
});
