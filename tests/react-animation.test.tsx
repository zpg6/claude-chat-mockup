import { StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeWindow } from "../src/react";

const animation = { typingDuration: 100, sendDelay: 50, responseDelay: 50 };
beforeEach(() => {
    vi.useFakeTimers();
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
const advance = (ms: number) =>
    act(() => {
        vi.advanceTimersByTime(ms);
    });

describe("React conversation animation", () => {
    it("gates the real result on both timeline completion and the ready prop", () => {
        const { container, rerender } = render(
            <ClaudeWindow prompt="hello" response="result" animation={animation}>
                <div>real content</div>
            </ClaudeWindow>
        );
        const root = container.querySelector<HTMLElement>(".claude-window")!;
        const stage = container.querySelector(".board-stage")!;
        expect(root.dataset.ccpPhase).toBe("typing");
        advance(200);
        expect(root.dataset.ccpPhase).toBe("waiting");
        expect(stage.classList.contains("viewer-ready")).toBe(false);
        rerender(
            <ClaudeWindow prompt="hello" response="result" animation={animation} ready>
                <div>real content</div>
            </ClaudeWindow>
        );
        expect(root.dataset.ccpPhase).toBe("complete");
        expect(stage.classList.contains("viewer-ready")).toBe(true);
    });

    it("does not show an already-ready result before the animation finishes", () => {
        const { container } = render(
            <ClaudeWindow prompt="hello" animation={animation} ready>
                <div>real content</div>
            </ClaudeWindow>
        );
        expect(container.querySelector(".viewer-ready")).toBeNull();
        advance(199);
        expect(container.querySelector(".viewer-ready")).toBeNull();
        advance(1);
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
    });

    it("preserves remaining time through the built-in pause and play controls", () => {
        const { container, getByRole } = render(<ClaudeWindow prompt="hello" animation={animation} />);
        advance(64);
        const typed = container.querySelector("[data-ccp-typed]")!;
        expect(typed.textContent).toBe("hel");
        fireEvent.click(getByRole("button", { name: "Pause" }));
        advance(1000);
        expect(typed.textContent).toBe("hel");
        fireEvent.click(getByRole("button", { name: "Play" }));
        advance(135);
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).not.toBe("complete");
        advance(1);
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).toBe("complete");
    });

    it("replays without remounting an iframe or its surrounding custom content", () => {
        const { container, getByRole } = render(
            <ClaudeWindow prompt="hello" animation={animation} ready>
                <iframe title="result" src="/preview.html" />
            </ClaudeWindow>
        );
        const frame = container.querySelector("iframe");
        advance(200);
        fireEvent.click(getByRole("button", { name: "Replay" }));
        expect(container.querySelector("iframe")).toBe(frame);
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).toBe("typing");
        expect(container.querySelector(".viewer-ready")).toBeNull();
        advance(200);
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
        expect(container.querySelector("iframe")).toBe(frame);
    });

    it("ignores same-value prompt and options updates but restarts a changed prompt", () => {
        const { container, rerender } = render(<ClaudeWindow prompt="hello" animation={{ ...animation }} />);
        advance(64);
        rerender(<ClaudeWindow prompt="hello" response="updated response" animation={{ ...animation }} />);
        expect(container.querySelector("[data-ccp-typed]")?.textContent).toBe("hel");
        advance(36);
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).toBe("sending");
        rerender(<ClaudeWindow prompt="different" animation={{ ...animation }} />);
        expect(container.querySelector("[data-ccp-typed]")?.textContent).toBe("");
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).toBe("typing");
    });

    it("shows the final reduced-motion conversation while waiting on the host", () => {
        const remove = vi.fn();
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener: remove }));
        const { container, getByRole, rerender, unmount } = render(
            <ClaudeWindow prompt="hello" animation={animation}>
                <div>real content</div>
            </ClaudeWindow>
        );
        const root = container.querySelector<HTMLElement>(".claude-window")!;
        expect(root.dataset.ccpPhase).toBe("waiting");
        expect(container.querySelector(".claude-response")?.getAttribute("aria-hidden")).toBe("false");
        expect(container.querySelector(".viewer-ready")).toBeNull();
        fireEvent.click(getByRole("button", { name: "Replay" }));
        expect(root.dataset.ccpPhase).toBe("waiting");
        expect(vi.getTimerCount()).toBe(0);
        rerender(
            <ClaudeWindow prompt="hello" animation={animation} ready>
                <div>real content</div>
            </ClaudeWindow>
        );
        expect(root.dataset.ccpPhase).toBe("complete");
        unmount();
        expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
    });

    it("destroys timers and listeners on unmount, including StrictMode setup", () => {
        const remove = vi.spyOn(document, "removeEventListener");
        const { unmount } = render(
            <StrictMode>
                <ClaudeWindow prompt="hello" animation={animation} />
            </StrictMode>
        );
        expect(vi.getTimerCount()).toBe(1);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
        expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
        advance(1000);
        remove.mockRestore();
    });

    it("returns to static behavior when animation is disabled", () => {
        const { container, rerender } = render(
            <ClaudeWindow prompt="hello" animation={animation} ready>
                <div>content</div>
            </ClaudeWindow>
        );
        expect(container.querySelector(".viewer-ready")).toBeNull();
        rerender(
            <ClaudeWindow prompt="hello" animation={false} ready>
                <div>content</div>
            </ClaudeWindow>
        );
        expect(container.querySelector("[data-ccp-animation]")).toBeNull();
        expect(container.querySelector(".claude-playback-controls")).toBeNull();
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
        expect(vi.getTimerCount()).toBe(0);
    });
});
