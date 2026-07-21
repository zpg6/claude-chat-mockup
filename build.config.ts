import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
    entries: ["./src/index", "./src/react"],
    declaration: true,
    clean: true,
    failOnWarn: false,
    rollup: {
        emitCJS: true,
        esbuild: {
            jsx: "automatic",
            jsxImportSource: "react",
            treeShaking: true,
        },
    },
    externals: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    hooks: {
        // The stylesheet ships as-is; copy it next to the built entries so
        // consumers can `import "claude-chat-mockup/style.css"`.
        "build:done"() {
            copyFileSync(resolve("src/style.css"), resolve("dist/style.css"));
        },
    },
});
