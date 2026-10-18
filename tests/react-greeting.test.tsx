import { StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeWindow } from "../src/react";

const animation = { typingDuration: 100, sendDelay: 50, thinkingDuration: 50, responseDelay: 50 };
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
const advance = (ms: number) =>
    act(() => {
        vi.advanceTimersByTime(ms);
    });

describe("React home greeting", () => {
    it("updates greeting copy without restarting the clock or remounting content", () => {
        const window = (greeting: string) => (
            <StrictMode>
                <ClaudeWindow prompt="hello" greeting={greeting} thinking="Checking." animation={animation} ready>
                    <iframe title="result" src="/real.html" />
                </ClaudeWindow>
            </StrictMode>
        );
        const { container, rerender, getByRole, unmount } = render(window("Hello, night owl"));
        const frame = container.querySelector("iframe");
        advance(64);
        rerender(window("<img src=x>"));
        const greeting = container.querySelector<HTMLElement>(".claude-greeting")!;
        expect(greeting.hidden).toBe(false);
        expect(greeting.textContent).toBe("<img src=x>");
        expect(greeting.querySelector("img")).toBeNull();
        expect(container.querySelector("[data-ccp-typed]")?.textContent).toBe("hel");
        advance(36);
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).toBe("sending");
        expect(greeting.hidden).toBe(false);
        advance(50);
        expect(greeting.hidden).toBe(true);
        expect(greeting.getAttribute("aria-hidden")).toBe("true");
        advance(100);
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
        fireEvent.click(getByRole("button", { name: "Replay" }));
        expect(greeting.hidden).toBe(false);
        expect(container.querySelector("iframe")).toBe(frame);
        expect(container.querySelector(".claude-compose-row button, .claude-compose-row [tabindex]")).toBeNull();
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it("omits the greeting in static mode and hides it immediately for reduced motion", () => {
        const { container, rerender } = render(<ClaudeWindow prompt="hello" greeting="Hi" />);
        expect(container.querySelector(".claude-greeting")).toBeNull();
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        rerender(
            <ClaudeWindow prompt="hello" greeting="Hi" animation={animation}>
                <div>real content</div>
            </ClaudeWindow>
        );
        expect(container.querySelector<HTMLElement>(".claude-greeting")!.hidden).toBe(true);
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).toBe("waiting");
        expect(container.querySelector(".viewer-ready")).toBeNull();
    });
});
