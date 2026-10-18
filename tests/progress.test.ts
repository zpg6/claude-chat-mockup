import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeWindow, type ClaudeWindowHandle } from "../src/index";
import { createPlayback, type PlaybackController } from "../src/playback";

const animation = { typingDuration: 100, sendDelay: 50, thinkingDuration: 80, stepDuration: 60, responseDelay: 50 };
const steps = [{ label: "Choose parts", logo: "P" }, { label: "Place and route" }, { label: "Prepare files" }];
// 150ms prompt/send + 80ms thinking + 180ms steps + 50ms response = 460ms.
let controllers: PlaybackController[];
let chats: ClaudeWindowHandle[];
beforeEach(() => {
    vi.useFakeTimers();
    controllers = [];
    chats = [];
    document.body.innerHTML = "";
});
afterEach(() => {
    controllers.forEach(c => c.destroy());
    chats.forEach(c => c.destroy());
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
function controller(overrides: Partial<Parameters<typeof createPlayback>[0]> = {}) {
    const c = createPlayback({
        prompt: "hello",
        thinking: "I'll prepare the design.",
        steps,
        ready: false,
        hasStage: true,
        document,
        animation,
        onChange() {},
        ...overrides,
    });
    controllers.push(c);
    return c;
}
function chat(overrides: Partial<Parameters<typeof ClaudeWindow>[0]> = {}) {
    const c = ClaudeWindow({
        prompt: "hello",
        thinking: "I'll prepare the design.",
        steps,
        response: "The result",
        tool: { name: "example", call: "render" },
        stage: {},
        animation,
        ...overrides,
    }).mount(document.body);
    chats.push(c);
    return c;
}

describe("thinking and action playback", () => {
    it("orders thinking, each active step, then the response and real readiness gate", () => {
        const c = controller();
        vi.advanceTimersByTime(150);
        expect(c.state).toMatchObject({
            phase: "thinking",
            activeStep: null,
            completedSteps: 0,
            timelineComplete: false,
        });
        vi.advanceTimersByTime(80);
        expect(c.state).toMatchObject({ phase: "steps", activeStep: 0, completedSteps: 0 });
        vi.advanceTimersByTime(60);
        expect(c.state).toMatchObject({ phase: "steps", activeStep: 1, completedSteps: 1 });
        vi.advanceTimersByTime(60);
        expect(c.state).toMatchObject({ phase: "steps", activeStep: 2, completedSteps: 2 });
        vi.advanceTimersByTime(60);
        expect(c.state).toMatchObject({ phase: "responding", activeStep: null, completedSteps: 3, stageReady: false });
        vi.advanceTimersByTime(50);
        expect(c.state).toMatchObject({
            phase: "waiting",
            timelineComplete: true,
            completedSteps: 3,
            stageReady: false,
        });
        c.setReady(true);
        expect(c.state).toMatchObject({ phase: "complete", stageReady: true });
    });

    it("keeps the exact original default timeline when optional content is absent or blank", () => {
        const c = controller({ thinking: "  ", steps: [{ label: " " }], animation: {} });
        vi.advanceTimersByTime(2500);
        expect(c.state).toMatchObject({ phase: "responding", activeStep: null, completedSteps: 0 });
        vi.advanceTimersByTime(449);
        expect(c.state.timelineComplete).toBe(false);
        vi.advanceTimersByTime(1);
        expect(c.state).toMatchObject({ elapsedMs: 2950, timelineComplete: true });
    });

    it("skips only the optional phase that has no content", () => {
        const actionsOnly = controller({ thinking: undefined });
        const thinkingOnly = controller({ steps: [] });
        vi.advanceTimersByTime(150);
        expect(actionsOnly.state).toMatchObject({ phase: "steps", activeStep: 0 });
        expect(thinkingOnly.state.phase).toBe("thinking");
        vi.advanceTimersByTime(80);
        expect(thinkingOnly.state).toMatchObject({ phase: "responding", completedSteps: 0 });
    });

    it.each([190, 250, 310, 370])("pauses at %ims without losing time when readiness changes", elapsed => {
        const c = controller();
        vi.advanceTimersByTime(elapsed);
        c.pause();
        c.setReady(true);
        expect(c.state.elapsedMs).toBe(elapsed);
        expect(c.state.stageReady).toBe(false);
        const paused = c.state;
        vi.advanceTimersByTime(1000);
        expect(c.state).toEqual(paused);
        c.play();
        vi.advanceTimersByTime(460 - elapsed - 1);
        expect(c.state.timelineComplete).toBe(false);
        vi.advanceTimersByTime(1);
        expect(c.state).toMatchObject({ timelineComplete: true, completedSteps: 3, stageReady: true });
    });

    it("retains progress for equal content and resets changed thinking or steps", () => {
        const c = controller({ ready: true });
        vi.advanceTimersByTime(300);
        c.pause();
        c.setThinking("  I'll prepare the design.  ");
        c.setSteps(steps.map(step => ({ ...step })));
        expect(c.state).toMatchObject({ elapsedMs: 300, activeStep: 1, completedSteps: 1, paused: true });
        c.setThinking("I'll prepare a different design.");
        expect(c.state).toMatchObject({ elapsedMs: 0, completedSteps: 0, paused: true });
        c.play();
        vi.advanceTimersByTime(460);
        c.setSteps([{ label: "New action" }]);
        expect(c.state).toMatchObject({ elapsedMs: 0, completedSteps: 0, stageReady: false });
        vi.advanceTimersByTime(340);
        expect(c.state.stageReady).toBe(true);
    });

    it("skips zero-duration progress without an invalid active index", () => {
        const c = controller({ animation: { ...animation, thinkingDuration: 0, stepDuration: 0 } });
        vi.advanceTimersByTime(150);
        expect(c.state).toMatchObject({ phase: "responding", activeStep: null, completedSteps: 3 });
        vi.advanceTimersByTime(50);
        expect(c.state.phase).toBe("waiting");
    });

    it("completes all reduced-motion actions but waits for actual content", () => {
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        const c = controller();
        expect(c.state).toMatchObject({ phase: "waiting", completedSteps: 3, activeStep: null, stageReady: false });
        c.replay();
        expect(vi.getTimerCount()).toBe(0);
        c.setReady(true);
        expect(c.state.stageReady).toBe(true);
    });
});

describe("vanilla progress content", () => {
    it("shows static explicit thinking and completed actions without adding playback", () => {
        const c = chat({
            animation: false,
            thinking: "<intent>",
            steps: [{ label: "<action>", logo: "P" }, { label: " " }],
        });
        expect(c.playback).toBeNull();
        expect(c.el.querySelector(".claude-thinking")?.textContent).toBe("<intent>");
        expect(c.el.querySelector(".claude-thinking intent")).toBeNull();
        expect(c.el.querySelectorAll(".claude-step")).toHaveLength(1);
        expect(c.el.querySelector(".claude-step")?.getAttribute("data-status")).toBe("completed");
        expect(c.el.querySelector(".claude-step-label")?.textContent).toBe("<action>");
    });

    it("reveals progress before final response, tool and stage become accessible", () => {
        const c = chat();
        vi.advanceTimersByTime(150);
        expect(c.el.querySelector(".claude-response")?.getAttribute("aria-hidden")).toBe("false");
        expect(c.el.querySelector(".claude-thinking")?.getAttribute("aria-hidden")).toBe("false");
        expect(c.el.querySelector(".claude-steps")?.getAttribute("aria-hidden")).toBe("true");
        for (const selector of [".claude-response-copy", ".claude-tool-line", ".board-stage"]) {
            expect(c.el.querySelector(selector)?.getAttribute("aria-hidden")).toBe("true");
        }
        vi.advanceTimersByTime(140);
        expect(c.el.querySelector(".claude-steps")?.getAttribute("aria-hidden")).toBe("false");
        expect(Array.from(c.el.querySelectorAll(".claude-step")).map(n => n.getAttribute("data-status"))).toEqual([
            "completed",
            "active",
            "pending",
        ]);
        expect(c.el.querySelector(".claude-playback-status")?.textContent).toBe("Place and route");
        vi.advanceTimersByTime(170);
        expect(c.el.querySelector(".claude-response-copy")?.getAttribute("aria-hidden")).toBe("false");
        expect(c.stage?.classList.contains("viewer-ready")).toBe(false);
        c.setReady();
        expect(c.stage?.classList.contains("viewer-ready")).toBe(true);
    });

    it("changes progress in place and preserves frame, readiness and equal step nodes", () => {
        const c = chat({ stage: { src: "/preview.html", ready: true } });
        const frame = c.frame;
        vi.advanceTimersByTime(300);
        const step = c.el.querySelector(".claude-step");
        const elapsed = c.playback?.state.elapsedMs;
        c.setSteps(steps.map(s => ({ ...s })));
        expect(c.el.querySelector(".claude-step")).toBe(step);
        expect(c.playback?.state.elapsedMs).toBe(elapsed);
        c.setThinking("New intention");
        c.setSteps([{ label: "One new action", logo: '<svg viewBox="0 0 10 10"><path d="M0 0h10"/></svg>' }]);
        expect(c.playback?.state.elapsedMs).toBe(0);
        expect(c.el.querySelector(".claude-step-marker svg")).toBeTruthy();
        expect(c.frame).toBe(frame);
        vi.advanceTimersByTime(340);
        expect(c.playback?.state.stageReady).toBe(true);
        c.playback?.replay();
        expect(c.frame).toBe(frame);
        expect(c.el.querySelector(".claude-step")?.getAttribute("data-status")).toBe("pending");
    });

    it("can add or remove progress without replacing custom content", () => {
        const content = document.createElement("button");
        const c = chat({ thinking: undefined, steps: undefined, stage: { content, ready: true } });
        c.setThinking("A new intention");
        c.setSteps(steps);
        expect(c.el.querySelector(".claude-thinking")?.textContent).toBe("A new intention");
        c.setThinking();
        c.setSteps();
        expect(c.el.querySelector(".claude-thinking")).toBeNull();
        expect(c.el.querySelector(".claude-steps")).toBeNull();
        expect(c.el.hasAttribute("data-ccp-progress")).toBe(false);
        expect(c.el.querySelector(".board-stage-content")?.firstChild).toBe(content);
        vi.advanceTimersByTime(200);
        expect(c.playback?.state.stageReady).toBe(true);
    });
});
