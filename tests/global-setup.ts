import { request } from "@playwright/test";
import type { FullConfig } from "@playwright/test";
import { DEFAULT_API_BASE_URL } from "../playwright.config.js";

// Entry criterion: the API must be reachable before any test runs (fail fast, never "green without tests").
export default async function globalSetup(config: FullConfig): Promise<void> {
    const baseURL = config.projects[0]?.use.baseURL ?? DEFAULT_API_BASE_URL;
    const context = await request.newContext({ baseURL });

    try {
        const response = await context.get("/health", { timeout: 5_000 });
        if (!response.ok()) {
            throw new Error(`GET /health answered ${response.status()}`);
        }
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(
            `Calculator API is not reachable at ${baseURL} (${reason}). ` +
                "Start the API (e.g. `npm run dev` in calculator_api_ts) or set API_BASE_URL.",
        );
    } finally {
        await context.dispose();
    }
}
