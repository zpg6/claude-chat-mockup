import { StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeWindow } from "../src/react";

const animation = { typingDuration: 100, sendDelay: 50, thinkingDuration: 80, stepDuration: 60, responseDelay: 50 };
const steps = [{ label: "Choose parts", logo: "P" }, { label: "Place and route" }];
const advance = (ms: number) =>
    act(() => {
        vi.advanceTimersByTime(ms);
    });
beforeEach(() => {
    vi.useFakeTimers();
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("React thinking and action progress", () => {
    it("shows static explicit progress as completed and ignores blank labels", () => {
        const { container } = render(
            <ClaudeWindow prompt="hello" thinking="An intention" steps={[...steps, { label: " " }]} />
        );
        expect(container.querySelector(".claude-thinking")?.textContent).toBe("An intention");
        expect(container.querySelectorAll('.claude-step[data-status="completed"]')).toHaveLength(2);
        expect(container.querySelector("[data-ccp-animation]")).toBeNull();
    });

    it("shows thinking and active/completed actions before final content", () => {
        const { container, getByRole } = render(
            <ClaudeWindow
                prompt="hello"
                thinking="I'll prepare the design."
                steps={steps}
                response="Final reply"
                tool={{ name: "example", call: "render" }}
                animation={animation}
                ready
            >
                <button>Real result</button>
            </ClaudeWindow>
        );
        advance(150);
        expect(container.querySelector(".claude-thinking")?.getAttribute("aria-hidden")).toBe("false");
        expect(container.querySelector(".claude-response")?.getAttribute("aria-hidden")).toBe("false");
        expect(container.querySelector(".claude-response-copy")?.getAttribute("aria-hidden")).toBe("true");
        expect(container.querySelector(".claude-tool-line")?.getAttribute("aria-hidden")).toBe("true");
        expect(container.querySelector(".board-stage")?.getAttribute("aria-hidden")).toBe("true");
        advance(80);
        expect(container.querySelector('.claude-step[data-status="active"] .claude-step-label')?.textContent).toBe(
            "Choose parts"
        );
        getByRole("list", { name: "Example actions" });
        advance(60);
        expect(container.querySelectorAll('.claude-step[data-status="completed"]')).toHaveLength(1);
        expect(container.querySelector('.claude-step[data-status="active"] .claude-step-label')?.textContent).toBe(
            "Place and route"
        );
        advance(110);
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
        expect(container.querySelector(".board-stage")?.getAttribute("aria-hidden")).toBe("false");
    });

    it("preserves a paused action and its remaining time when readiness changes", () => {
        const { container, getByRole, rerender } = render(
            <ClaudeWindow prompt="hello" thinking="Intent" steps={steps} animation={animation}>
                <div>result</div>
            </ClaudeWindow>
        );
        advance(250);
        fireEvent.click(getByRole("button", { name: "Pause" }));
        rerender(
            <ClaudeWindow
                prompt="hello"
                thinking="Intent"
                steps={steps.map(s => ({ ...s }))}
                animation={{ ...animation }}
                ready
            >
                <div>result</div>
            </ClaudeWindow>
        );
        advance(1000);
        expect(container.querySelector('.claude-step[data-status="active"] .claude-step-label')?.textContent).toBe(
            "Choose parts"
        );
        expect(container.querySelector(".viewer-ready")).toBeNull();
        fireEvent.click(getByRole("button", { name: "Play" }));
        advance(149);
        expect(container.querySelector(".viewer-ready")).toBeNull();
        advance(1);
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
    });

    it("does not restart equal recreated content and retains an iframe across changed progress and replay", () => {
        const content = <iframe title="real result" src="/preview.html" />;
        const { container, getByRole, rerender } = render(
            <ClaudeWindow prompt="hello" thinking="Intent" steps={steps} animation={animation} ready>
                {content}
            </ClaudeWindow>
        );
        const frame = container.querySelector("iframe");
        advance(290);
        rerender(
            <ClaudeWindow
                prompt="hello"
                thinking=" Intent "
                steps={steps.map(s => ({ ...s }))}
                animation={{ ...animation }}
                ready
            >
                {content}
            </ClaudeWindow>
        );
        expect(container.querySelector('.claude-step[data-status="active"] .claude-step-label')?.textContent).toBe(
            "Place and route"
        );
        rerender(
            <ClaudeWindow
                prompt="hello"
                thinking="New intention"
                steps={[{ label: "One new action" }]}
                animation={animation}
                ready
            >
                {content}
            </ClaudeWindow>
        );
        expect(container.querySelector<HTMLElement>(".claude-window")?.dataset.ccpPhase).toBe("typing");
        expect(container.querySelector("iframe")).toBe(frame);
        advance(340);
        fireEvent.click(getByRole("button", { name: "Replay" }));
        expect(container.querySelector("iframe")).toBe(frame);
        expect(container.querySelector('.claude-step[data-status="pending"]')).toBeTruthy();
        advance(340);
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
    });

    it("completes reduced-motion steps immediately and waits for a late result", () => {
        vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
        const { container, rerender } = render(
            <ClaudeWindow prompt="hello" thinking="Intent" steps={steps} animation={animation}>
                <div>result</div>
            </ClaudeWindow>
        );
        expect(container.querySelectorAll('.claude-step[data-status="completed"]')).toHaveLength(2);
        expect(container.querySelector(".viewer-ready")).toBeNull();
        rerender(
            <ClaudeWindow prompt="hello" thinking="Intent" steps={steps} animation={animation} ready>
                <div>result</div>
            </ClaudeWindow>
        );
        expect(container.querySelector(".viewer-ready")).toBeTruthy();
        expect(vi.getTimerCount()).toBe(0);
    });

    it("cleans up in StrictMode when unmounted during thinking", () => {
        const { unmount } = render(
            <StrictMode>
                <ClaudeWindow prompt="hello" thinking="Intent" steps={steps} animation={animation} />
            </StrictMode>
        );
        advance(170);
        expect(vi.getTimerCount()).toBe(1);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});
