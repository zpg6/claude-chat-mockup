import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeWindow, type ClaudeWindowHandle } from "../src/index";

const animation = { typingDuration: 100, sendDelay: 50, thinkingDuration: 50, responseDelay: 50 };
let chats: ClaudeWindowHandle[] = [];
beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
});
afterEach(() => {
    chats.forEach(chat => chat.destroy());
    chats = [];
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
const create = (options: Parameters<typeof ClaudeWindow>[0]) => {
    const chat = ClaudeWindow(options).mount(document.body);
    chats.push(chat);
    return chat;
};

describe("home greeting", () => {
    it("is opt-in, escaped, and absent from static windows", () => {
        expect(create({ prompt: "hello", animation }).el.querySelector(".claude-greeting")).toBeNull();
        expect(create({ prompt: "hello", greeting: "Hi" }).el.querySelector(".claude-greeting")).toBeNull();
        const chat = create({ prompt: "hello", greeting: "<img src=x>", animation });
        const greeting = chat.el.querySelector<HTMLElement>(".claude-greeting")!;
        expect(greeting.textContent).toBe("<img src=x>");
        expect(greeting.querySelector("img")).toBeNull();
        expect(greeting.hidden).toBe(false);
        expect(greeting.getAttribute("aria-hidden")).toBe("false");
    });

    it("follows home phases and Replay without adding time or replacing the iframe", () => {
        const chat = create({
            prompt: "hello",
            greeting: "Hello, night owl",
            thinking: "Checking.",
            animation,
            stage: { src: "/real.html", ready: true },
        });
        const plain = create({ prompt: "hello", thinking: "Checking.", animation, stage: { ready: true } });
        const greeting = chat.el.querySelector<HTMLElement>(".claude-greeting")!;
        const frame = chat.frame;
        const sourceWrites = vi.spyOn(frame!, "src", "set");
        vi.advanceTimersByTime(100);
        expect(chat.playback?.state.phase).toBe("sending");
        expect(greeting.hidden).toBe(false);
        vi.advanceTimersByTime(50);
        expect(chat.playback?.state.phase).toBe("thinking");
        expect(greeting.hidden).toBe(true);
        expect(greeting.getAttribute("aria-hidden")).toBe("true");
        vi.advanceTimersByTime(100);
        expect(chat.playback?.state).toEqual(plain.playback?.state);
        expect(chat.playback?.state.phase).toBe("complete");
        chat.playback?.replay();
        expect(greeting.hidden).toBe(false);
        expect(chat.frame).toBe(frame);
        expect(sourceWrites).not.toHaveBeenCalled();
        const decorative = chat.el.querySelector(".claude-compose-row")!;
        expect(decorative.getAttribute("aria-hidden")).toBe("true");
        expect(decorative.querySelector("button, [tabindex], [role=button]")).toBeNull();
    });

    it("skips the home greeting under reduced motion and keeps actual readiness", () => {
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        const chat = create({ prompt: "hello", greeting: "Hello, night owl", animation, stage: {} });
        expect(chat.el.querySelector<HTMLElement>(".claude-greeting")!.hidden).toBe(true);
        expect(chat.playback?.state.phase).toBe("waiting");
        expect(chat.stage?.classList.contains("viewer-ready")).toBe(false);
        chat.setReady();
        chat.playback?.replay();
        expect(chat.playback?.state.phase).toBe("complete");
        expect(chat.el.querySelector<HTMLElement>(".claude-greeting")!.hidden).toBe(true);
    });
});
