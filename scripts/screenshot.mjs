// Renders examples/preview.html and writes assets/preview.png (the README hero).
// Requires Playwright, e.g. `npx playwright install chromium` then `node scripts/screenshot.mjs`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve } from "node:path";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = resolve(root, "assets/preview.png");

const MIME = {
    ".html": "text/html",
    ".mjs": "text/javascript",
    ".js": "text/javascript",
    ".css": "text/css",
};

const server = createServer(async (req, res) => {
    try {
        const path = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://x").pathname));
        const body = await readFile(path);
        res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
        res.end(body);
    } catch {
        res.writeHead(404).end();
    }
});
await new Promise(r => server.listen(0, r));
const { port } = server.address();

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(`http://localhost:${port}/examples/preview.html`);
await page.waitForFunction(() => window.__ready === true);
await page.waitForTimeout(300);

const body = await page.locator("body").boundingBox();
await page.screenshot({
    path: out,
    clip: { x: 0, y: 0, width: Math.ceil(body.width), height: Math.ceil(body.height) },
});

await browser.close();
server.close();
console.log("wrote", out);
