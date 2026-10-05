import { defineConfig } from "@playwright/test";

export const DEFAULT_API_BASE_URL = "http://localhost:3000";

const isCI = process.env["CI"] === "true";

export default defineConfig({
    testDir: "./tests",
    globalSetup: "./tests/global-setup.ts",
    fullyParallel: true,
    forbidOnly: isCI,
    retries: 0,
    reporter: [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
    ],
    use: {
        baseURL: process.env["API_BASE_URL"] ?? DEFAULT_API_BASE_URL,
        extraHTTPHeaders: { Accept: "application/json" },
    },
});
