import { expect, test } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";

type Operation = "add" | "subtract" | "multiply" | "divide";

const OPERATIONS: readonly Operation[] = ["add", "subtract", "multiply", "divide"];

const VALIDATION_ERROR = "Body must contain finite numbers a and b within the decimal range";
const OVERFLOW_ERROR = "Arithmetic overflow: result exceeds the decimal range";
const DIVISION_BY_ZERO_ERROR = "Division by zero is not allowed";
const INVALID_JSON_ERROR = "Invalid JSON body";
const PAYLOAD_TOO_LARGE_ERROR = "Request rejected";
const NOT_FOUND_ERROR = "Not found";

const endpoint = (op: Operation) => `/api/calculate/${op}`;

const calculate = (request: APIRequestContext, op: Operation, a: number, b: number) =>
    request.post(endpoint(op), { data: { a, b } });

async function expectError(response: APIResponse, status: number, error: string): Promise<void> {
    expect(response.status()).toBe(status);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual({ error });
}

test.describe("4.1 Happy Path – Grundrechenarten (200 OK)", { tag: "@prio-hoch" }, () => {
    const cases: { id: string; op: Operation; a: number; b: number; result: number }[] = [
        { id: "TC-ADD-01", op: "add", a: 1, b: 2, result: 3 },
        { id: "TC-ADD-03", op: "add", a: -5, b: 2.5, result: -2.5 },
        { id: "TC-SUB-01", op: "subtract", a: 10, b: 4, result: 6 },
        { id: "TC-SUB-03", op: "subtract", a: -1, b: -1, result: 0 },
        { id: "TC-MUL-01", op: "multiply", a: 3, b: 4, result: 12 },
        { id: "TC-MUL-03", op: "multiply", a: 5, b: 0, result: 0 },
        { id: "TC-MUL-04", op: "multiply", a: -2, b: 2.5, result: -5 },
        { id: "TC-DIV-01", op: "divide", a: 10, b: 4, result: 2.5 },
        { id: "TC-DIV-03", op: "divide", a: -9, b: 3, result: -3 },
        { id: "TC-DIV-04", op: "divide", a: 0, b: 5, result: 0 },
    ];

    for (const { id, op, a, b, result } of cases) {
        test(`${id}: ${op}(${a}, ${b}) = ${result}`, async ({ request }) => {
            const response = await calculate(request, op, a, b);
            expect(response.status()).toBe(200);
            expect(await response.json()).toEqual({ operation: op, a, b, result });
        });
    }
});

test.describe("4.2 Dezimal-Randfälle – Präzision (200 OK, exakter Vergleich)", { tag: "@prio-mittel" }, () => {
    const cases: { id: string; op: Operation; a: number; b: number; expected: string }[] = [
        { id: "TC-DEC-01", op: "add", a: 0.1, b: 0.2, expected: "0.3" },
        { id: "TC-DEC-02", op: "subtract", a: 1, b: 0.9, expected: "0.1" },
        { id: "TC-DEC-03", op: "multiply", a: 1.1, b: 1.1, expected: "1.21" },
        { id: "TC-DEC-04", op: "divide", a: 1, b: 3, expected: "0.3333333333333333333333333333" },
        { id: "TC-DEC-09", op: "divide", a: 2, b: 3, expected: "0.6666666666666666666666666667" },
    ];

    for (const { id, op, a, b, expected } of cases) {
        test(`${id}: ${op}(${a}, ${b}) = exactly ${expected}`, async ({ request }) => {
            const response = await calculate(request, op, a, b);
            expect(response.status()).toBe(200);
            // Raw body: response.json() would round the 28-digit result to double precision.
            expect(await response.text()).toBe(`{"operation":"${op}","a":${a},"b":${b},"result":${expected}}`);
        });
    }
});

test.describe("4.2 Dezimal-Randfälle – Überlauf (400 Bad Request)", { tag: "@prio-mittel" }, () => {
    // Operands lie inside the decimal range so the overflow happens in the calculation itself.
    const cases: { id: string; op: Operation; a: number; b: number }[] = [
        { id: "TC-DEC-05", op: "add", a: 7e28, b: 1e28 },
        { id: "TC-DEC-06", op: "subtract", a: -7e28, b: 1e28 },
        { id: "TC-DEC-07", op: "multiply", a: 1e15, b: 1e15 },
        { id: "TC-DEC-08", op: "divide", a: 7e28, b: 0.5 },
    ];

    for (const { id, op, a, b } of cases) {
        test(`${id}: ${op}(${a}, ${b}) overflows`, async ({ request }) => {
            const response = await calculate(request, op, a, b);
            await expectError(response, 400, OVERFLOW_ERROR);
        });
    }
});

test.describe("4.3 Division durch null (400 Bad Request)", { tag: "@prio-hoch" }, () => {
    test("TC-DIV0-01: divide(10, 0)", async ({ request }) => {
        const response = await calculate(request, "divide", 10, 0);
        await expectError(response, 400, DIVISION_BY_ZERO_ERROR);
    });

    test("TC-DIV0-02: divide(10, -0)", async ({ request }) => {
        const response = await calculate(request, "divide", 10, -0);
        await expectError(response, 400, DIVISION_BY_ZERO_ERROR);
    });
});

test.describe("4.4 Eingabevalidierung (400 Bad Request, alle Endpunkte)", { tag: "@prio-hoch" }, () => {
    for (const op of OPERATIONS) {
        test.describe(`Endpunkt ${op}`, () => {
            const url = endpoint(op);

            const invalidBodies: { id: string; label: string; body: unknown }[] = [
                { id: "TC-VAL-01", label: "only one operand", body: { a: 42 } },
                { id: "TC-VAL-02", label: "array instead of object", body: [1, 2] },
                { id: "TC-VAL-03", label: "empty object", body: {} },
                { id: "TC-VAL-05", label: "string operand", body: { a: 1, b: "abc" } },
                { id: "TC-VAL-07", label: "null operand", body: { a: 1, b: null } },
                { id: "TC-VAL-10", label: "1e308 exceeds decimal range", body: { a: 1e308, b: 1 } },
                {
                    id: "TC-VAL-11",
                    label: "decimal.MaxValue + 1 as literal",
                    body: { a: 79228162514264337593543950336, b: 1 },
                },
            ];

            for (const { id, label, body } of invalidBodies) {
                test(`${id}: ${label}`, async ({ request }) => {
                    const response = await request.post(url, { data: body });
                    await expectError(response, 400, VALIDATION_ERROR);
                });
            }

            test("TC-VAL-04: empty body", async ({ request }) => {
                // No `data` at all: Playwright would serialise "" as the JSON string literal `""`.
                const response = await request.post(url, { headers: { "Content-Type": "application/json" } });
                await expectError(response, 400, VALIDATION_ERROR);
            });

            test("TC-VAL-06: malformed JSON", async ({ request }) => {
                const response = await request.post(url, {
                    headers: { "Content-Type": "application/json" },
                    data: "{ not json",
                });
                await expectError(response, 400, INVALID_JSON_ERROR);
            });

            test("TC-VAL-08: valid body with Content-Type text/plain is rejected", async ({ request }) => {
                const response = await request.post(url, {
                    headers: { "Content-Type": "text/plain" },
                    data: JSON.stringify({ a: 1, b: 2 }),
                });
                // Non-JSON bodies are not parsed, so the request fails validation (400, not 415).
                await expectError(response, 400, VALIDATION_ERROR);
            });

            test("TC-VAL-09: payload above the 10kb body limit", async ({ request }) => {
                const response = await request.post(url, { data: { a: 1, b: 2, padding: "x".repeat(11_000) } });
                await expectError(response, 413, PAYLOAD_TOO_LARGE_ERROR);
            });
        });
    }
});

test.describe("4.5 API-Vertrag / Robustheit", { tag: "@prio-mittel" }, () => {
    test("TC-CON-01: response contains exactly operation, a, b, result", async ({ request }) => {
        const response = await calculate(request, "add", 1, 2);
        expect(response.status()).toBe(200);
        const body: Record<string, unknown> = await response.json();
        expect(Object.keys(body).sort()).toEqual(["a", "b", "operation", "result"]);
    });

    test("TC-CON-02: responds with Content-Type application/json", async ({ request }) => {
        const ok = await calculate(request, "add", 1, 2);
        expect(ok.headers()["content-type"]).toContain("application/json");

        const error = await calculate(request, "divide", 1, 0);
        expect(error.headers()["content-type"]).toContain("application/json");
    });

    test("TC-CON-03: GET on a POST endpoint returns 404", async ({ request }) => {
        const response = await request.get(endpoint("add"));
        // Express routes per method; there is no 405 handling.
        await expectError(response, 404, NOT_FOUND_ERROR);
    });

    test("TC-CON-04: unknown operation returns 404", async ({ request }) => {
        const response = await request.post("/api/calculate/modulo", { data: { a: 1, b: 2 } });
        await expectError(response, 404, NOT_FOUND_ERROR);
    });

    test("TC-CON-05: unknown extra fields are tolerated", async ({ request }) => {
        const response = await request.post(endpoint("add"), { data: { a: 1, b: 2, extra: true } });
        expect(response.status()).toBe(200);
        expect(await response.json()).toEqual({ operation: "add", a: 1, b: 2, result: 3 });
    });

    test("TC-CON-06: GET /health returns ok", async ({ request }) => {
        const response = await request.get("/health");
        expect(response.status()).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
    });

    test("TC-CON-07: does not expose the x-powered-by header", async ({ request }) => {
        const response = await request.get("/health");
        expect(response.headers()["x-powered-by"]).toBeUndefined();
    });
});
