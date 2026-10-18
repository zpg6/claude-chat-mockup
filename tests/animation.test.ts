import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeWindow, type ClaudeWindowHandle } from "../src/index";

const animation = { typingDuration: 100, sendDelay: 50, responseDelay: 50 };
let chats: ClaudeWindowHandle[];
beforeEach(() => {
    vi.useFakeTimers();
    chats = [];
    document.body.innerHTML = "";
});
afterEach(() => {
    chats.forEach(chat => chat.destroy());
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
const create = (options: Parameters<typeof ClaudeWindow>[0]) => {
    const chat = ClaudeWindow(options).mount(document.body);
    chats.push(chat);
    return chat;
};

describe("vanilla conversation animation", () => {
    it("preserves static defaults and leaves the opt-in markup out", () => {
        const chat = create({ prompt: "hello", stage: { ready: true } });
        expect(chat.playback).toBeNull();
        expect(chat.el.hasAttribute("data-ccp-animation")).toBe(false);
        expect(chat.el.querySelector(".claude-playback-controls")).toBeNull();
        expect(chat.stage?.classList.contains("viewer-ready")).toBe(true);
    });

    it("types in the composer, sends, reveals the response and waits for real readiness", () => {
        const chat = create({ prompt: "hello", response: "result", animation, stage: {} });
        expect(chat.el.dataset.ccpPhase).toBe("typing");
        expect(chat.el.querySelector("[data-ccp-prompt]")?.getAttribute("aria-hidden")).toBe("true");
        vi.advanceTimersByTime(64);
        expect(chat.el.querySelector("[data-ccp-typed]")?.textContent).toBe("hel");
        vi.advanceTimersByTime(36);
        expect(chat.el.dataset.ccpPhase).toBe("sending");
        vi.advanceTimersByTime(50);
        expect(chat.el.dataset.ccpPhase).toBe("responding");
        expect(chat.el.querySelector("[data-ccp-prompt]")?.getAttribute("aria-hidden")).toBe("false");
        vi.advanceTimersByTime(50);
        expect(chat.el.dataset.ccpPhase).toBe("waiting");
        expect(chat.el.querySelector(".claude-response")?.getAttribute("aria-hidden")).toBe("false");
        expect(chat.stage?.classList.contains("viewer-ready")).toBe(false);
        chat.setReady();
        expect(chat.el.dataset.ccpPhase).toBe("complete");
        expect(chat.stage?.classList.contains("viewer-ready")).toBe(true);
    });

    it("pause controls preserve progress and replay reuses the iframe and its src", () => {
        const chat = create({ prompt: "hello", animation, stage: { src: "/preview.html" } });
        const frame = chat.frame;
        const source = frame?.getAttribute("src");
        chat.setReady();
        vi.advanceTimersByTime(40);
        chat.el.querySelector<HTMLButtonElement>("[data-ccp-toggle]")!.click();
        expect(chat.playback?.state.elapsedMs).toBe(40);
        vi.advanceTimersByTime(1000);
        expect(chat.playback?.state.elapsedMs).toBe(40);
        chat.el.querySelector<HTMLButtonElement>("[data-ccp-toggle]")!.click();
        vi.advanceTimersByTime(160);
        expect(chat.playback?.state.phase).toBe("complete");
        const sourceWrites = vi.spyOn(frame!, "src", "set");
        chat.el.querySelector<HTMLButtonElement>("[data-ccp-replay]")!.click();
        expect(chat.playback?.state.phase).toBe("typing");
        expect(chat.frame).toBe(frame);
        expect(chat.frame?.getAttribute("src")).toBe(source);
        vi.advanceTimersByTime(200);
        expect(chat.playback?.state.stageReady).toBe(true);
        expect(sourceWrites).not.toHaveBeenCalled();
    });

    it("keeps the custom content mounted across replay and prompt changes", () => {
        const content = document.createElement("button");
        content.textContent = "a real result";
        const chat = create({ prompt: "hello", animation, stage: { content, ready: true } });
        vi.advanceTimersByTime(64);
        chat.setPrompt("hello");
        expect(chat.playback?.state.elapsedMs).toBe(64);
        chat.setResponse("different response");
        chat.setToolTitle("different title");
        expect(chat.playback?.state.elapsedMs).toBe(64);
        chat.setPrompt("updated");
        expect(chat.playback?.state.elapsedMs).toBe(0);
        vi.advanceTimersByTime(200);
        chat.playback?.replay();
        expect(chat.el.querySelector(".board-stage-content")?.firstChild).toBe(content);
    });

    it("respects reduced motion and still waits for readiness", () => {
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        const chat = create({ prompt: "hello", animation: true, stage: {} });
        expect(chat.playback?.state).toMatchObject({ timelineComplete: true, stageReady: false, phase: "waiting" });
        chat.setReady();
        expect(chat.stage?.classList.contains("viewer-ready")).toBe(true);
        chat.playback?.replay();
        expect(chat.playback?.state.phase).toBe("complete");
    });

    it("can hide built-in controls without removing the handle controls", () => {
        const chat = create({ prompt: "hello", animation: { ...animation, controls: false, autoplay: false } });
        expect(chat.el.querySelector(".claude-playback-controls")).toBeNull();
        expect(chat.playback?.state.paused).toBe(true);
        chat.playback?.play();
        vi.advanceTimersByTime(200);
        expect(chat.playback?.state.phase).toBe("complete");
    });

    it("cancels pending frame-load work and animation on destroy", () => {
        const chat = create({ prompt: "hello", animation, stage: { src: "/preview.html" } });
        chat.frame?.dispatchEvent(new Event("load"));
        chat.destroy();
        const state = chat.playback?.state;
        vi.advanceTimersByTime(1000);
        chat.frame?.dispatchEvent(new Event("load"));
        chat.setReady();
        expect(chat.playback?.state).toEqual(state);
        expect(vi.getTimerCount()).toBe(0);
    });
});
