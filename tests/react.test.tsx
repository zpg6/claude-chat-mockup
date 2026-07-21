import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClaudeWindow } from "../src/react";

describe("<ClaudeWindow /> (React)", () => {
    it("renders chrome, prompt, tool line, and revealed stage children", () => {
        const { container, getByText } = render(
            <ClaudeWindow
                prompt="Hello Claude"
                response="Hi there"
                tool={{ name: "claude", call: "create_artifact", title: "Pricing" }}
                ready
            >
                <div>result body</div>
            </ClaudeWindow>
        );
        expect(container.querySelector(".claude-window")).toBeTruthy();
        getByText("Hello Claude");
        expect(container.querySelector(".claude-tool-line b")?.textContent).toBe("claude");
        expect(container.querySelector(".board-stage.viewer-ready")).toBeTruthy();
        expect(container.querySelector(".board-stage-content")?.textContent).toContain("result body");
    });

    it("omits the stage when there are no children", () => {
        const { container } = render(<ClaudeWindow prompt="p" />);
        expect(container.querySelector(".board-stage")).toBeNull();
    });

    it("applies theme via data-theme (auto ⇒ none)", () => {
        const { container, rerender } = render(<ClaudeWindow prompt="p" />);
        expect(container.querySelector(".claude-window")?.getAttribute("data-theme")).toBeNull();
        rerender(<ClaudeWindow prompt="p" theme="dark" />);
        expect(container.querySelector(".claude-window")?.getAttribute("data-theme")).toBe("dark");
    });
});
