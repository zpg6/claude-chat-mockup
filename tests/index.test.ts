import { beforeEach, describe, expect, it } from "vitest";
import { ClaudeWindow, SYMBOLS_ID } from "../src/index";

beforeEach(() => {
    document.body.innerHTML = "";
});

describe("ClaudeWindow", () => {
    it("renders the core chrome and the prompt", () => {
        const chat = ClaudeWindow({ prompt: "Hello Claude" });
        expect(chat.el.classList.contains("claude-window")).toBe(true);
        expect(chat.el.querySelector(".claude-rail")).toBeTruthy();
        expect(chat.el.querySelector(".claude-composer")).toBeTruthy();
        expect(chat.el.querySelector(".claude-footnote")).toBeTruthy();
        expect(chat.el.querySelector("[data-ccp-prompt]")?.textContent).toContain("Hello Claude");
    });

    it("escapes user text (no HTML injection)", () => {
        const chat = ClaudeWindow({ prompt: "<img src=x onerror=alert(1)>" });
        const prompt = chat.el.querySelector("[data-ccp-prompt]")!;
        expect(prompt.querySelector("img")).toBeNull();
        expect(prompt.textContent).toContain("<img");
    });

    it("escapes attribute-context values (quotes) without crashing on odd input", () => {
        const chat = ClaudeWindow({
            prompt: "break\"out'quotes",
            tool: { name: "a\"b'c", call: "run" },
        });
        expect(chat.el.querySelector("[data-ccp-prompt]")?.textContent).toBe("break\"out'quotes");
        expect(chat.el.querySelector(".claude-tool-logo")?.getAttribute("aria-label")).toBe("a\"b'c");
    });

    it("mount() throws a clear error when the parent is null", () => {
        expect(() => ClaudeWindow({ prompt: "p" }).mount(null)).toThrow(/null\/undefined parent/);
    });

    it("renders a tool line only when a tool is given", () => {
        expect(ClaudeWindow({ prompt: "p" }).el.querySelector(".claude-tool-line")).toBeNull();
        const chat = ClaudeWindow({
            prompt: "p",
            tool: { name: "claude", call: "create_artifact", title: "Pricing" },
        });
        const tl = chat.el.querySelector(".claude-tool-line")!;
        expect(tl.querySelector("b")?.textContent).toBe("claude");
        expect(tl.querySelector("code")?.textContent).toBe("create_artifact");
        expect(tl.querySelector(".showcase-title")?.textContent).toBe("Pricing");
    });

    it("renders an iframe stage on request, and none by default", () => {
        expect(ClaudeWindow({ prompt: "p" }).stage).toBeNull();
        const chat = ClaudeWindow({ prompt: "p", stage: {} });
        expect(chat.stage).toBeTruthy();
        expect(chat.frame).toBeTruthy();
        expect(chat.frame?.tagName).toBe("IFRAME");
    });

    it("mounts custom stage content instead of an iframe", () => {
        const content = document.createElement("span");
        content.textContent = "result";
        const chat = ClaudeWindow({ prompt: "p", stage: { content } });
        expect(chat.frame).toBeNull();
        expect(chat.el.querySelector(".board-stage-content")?.textContent).toBe("result");
    });

    it("toggles viewer-ready via setReady and the ready option", () => {
        const chat = ClaudeWindow({ prompt: "p", stage: {} });
        expect(chat.stage!.classList.contains("viewer-ready")).toBe(false);
        chat.setReady();
        expect(chat.stage!.classList.contains("viewer-ready")).toBe(true);
        chat.setReady(false);
        expect(chat.stage!.classList.contains("viewer-ready")).toBe(false);

        const ready = ClaudeWindow({ prompt: "p", stage: { ready: true } });
        expect(ready.stage!.classList.contains("viewer-ready")).toBe(true);
    });

    it("resolves theme: auto ⇒ no attribute, explicit ⇒ data-theme", () => {
        expect(ClaudeWindow({ prompt: "p" }).el.getAttribute("data-theme")).toBeNull();
        expect(ClaudeWindow({ prompt: "p", theme: "auto" }).el.getAttribute("data-theme")).toBeNull();

        const chat = ClaudeWindow({ prompt: "p", theme: "dark" });
        expect(chat.el.getAttribute("data-theme")).toBe("dark");
        chat.setTheme("light");
        expect(chat.el.getAttribute("data-theme")).toBe("light");
        chat.setTheme("auto");
        expect(chat.el.getAttribute("data-theme")).toBeNull();
    });

    it("setPrompt / setResponse / setToolTitle update the DOM in place", () => {
        const chat = ClaudeWindow({
            prompt: "a",
            response: "b",
            tool: { name: "n", call: "c", title: "t" },
        });
        chat.setPrompt("a2");
        chat.setResponse("b2");
        chat.setToolTitle("t2");
        expect(chat.el.querySelector("[data-ccp-prompt]")?.textContent).toBe("a2");
        expect(chat.el.querySelector(".claude-response-copy")?.textContent).toBe("b2");
        expect(chat.el.querySelector(".showcase-title")?.textContent).toBe("t2");
    });

    it("applies stage height and extra class names", () => {
        const chat = ClaudeWindow({ prompt: "p", className: "hero-x", stage: { height: 420 } });
        expect(chat.el.classList.contains("hero-x")).toBe(true);
        expect(chat.stage!.style.height).toBe("420px");
    });

    it("mount appends to a parent and destroy removes it", () => {
        const host = document.createElement("div");
        document.body.append(host);
        const chat = ClaudeWindow({ prompt: "p" }).mount(host);
        expect(host.contains(chat.el)).toBe(true);
        chat.destroy();
        expect(host.contains(chat.el)).toBe(false);
    });

    it("injects the glyph sprite exactly once (idempotent)", () => {
        ClaudeWindow({ prompt: "p" });
        ClaudeWindow({ prompt: "p2" });
        expect(document.querySelectorAll(`#${SYMBOLS_ID}`).length).toBe(1);
        expect(document.querySelector(`#${SYMBOLS_ID} #claude-svg`)).toBeTruthy();
    });
});
