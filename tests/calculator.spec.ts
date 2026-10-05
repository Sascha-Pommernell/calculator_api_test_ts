import { expect, test } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";

type Operation = "add" | "subtract" | "multiply" | "divide";

const OPERATIONS: readonly Operation[] = ["add", "subtract", "multiply", "divide"];

const VALIDATION_ERROR =
    "Body must contain an array numbers with at least two finite numbers within the decimal range";
const OVERFLOW_ERROR = "Arithmetic overflow: result exceeds the decimal range";
const DIVISION_BY_ZERO_ERROR = "Division by zero is not allowed";
const INVALID_JSON_ERROR = "Invalid JSON body";
const PAYLOAD_TOO_LARGE_ERROR = "Request rejected";
const NOT_FOUND_ERROR = "Not found";

const endpoint = (op: Operation) => `/api/calculate/${op}`;

const calculate = (request: APIRequestContext, op: Operation, numbers: number[]) =>
    request.post(endpoint(op), { data: { numbers } });

async function expectError(response: APIResponse, status: number, error: string): Promise<void> {
    expect(response.status()).toBe(status);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toEqual({ error });
}

test.describe("4.1 Happy Path – Grundrechenarten (200 OK)", { tag: "@prio-hoch" }, () => {
    const cases: { id: string; op: Operation; numbers: number[]; result: number }[] = [
        { id: "TC-ADD-01", op: "add", numbers: [1, 2], result: 3 },
        { id: "TC-ADD-02", op: "add", numbers: [1, 2, 3, 4], result: 10 },
        { id: "TC-ADD-03", op: "add", numbers: [-5, 2.5], result: -2.5 },
        { id: "TC-SUB-01", op: "subtract", numbers: [10, 4], result: 6 },
        { id: "TC-SUB-02", op: "subtract", numbers: [10, 4, 3], result: 3 },
        { id: "TC-SUB-03", op: "subtract", numbers: [-1, -1], result: 0 },
        { id: "TC-MUL-01", op: "multiply", numbers: [3, 4], result: 12 },
        { id: "TC-MUL-02", op: "multiply", numbers: [2, 3, 4], result: 24 },
        { id: "TC-MUL-03", op: "multiply", numbers: [5, 0], result: 0 },
        { id: "TC-MUL-04", op: "multiply", numbers: [-2, 2.5], result: -5 },
        { id: "TC-DIV-01", op: "divide", numbers: [10, 4], result: 2.5 },
        { id: "TC-DIV-02", op: "divide", numbers: [100, 5, 2], result: 10 },
        { id: "TC-DIV-03", op: "divide", numbers: [-9, 3], result: -3 },
        { id: "TC-DIV-04", op: "divide", numbers: [0, 5], result: 0 },
    ];

    for (const { id, op, numbers, result } of cases) {
        test(`${id}: ${op}(${numbers.join(", ")}) = ${result}`, async ({ request }) => {
            const response = await calculate(request, op, numbers);
            expect(response.status()).toBe(200);
            expect(await response.json()).toEqual({ operation: op, numbers, result });
        });
    }
});

test.describe("4.2 Dezimal-Randfälle – Präzision (200 OK, exakter Vergleich)", { tag: "@prio-mittel" }, () => {
    const cases: { id: string; op: Operation; numbers: number[]; expected: string }[] = [
        { id: "TC-DEC-01", op: "add", numbers: [0.1, 0.2], expected: "0.3" },
        { id: "TC-DEC-02", op: "subtract", numbers: [1, 0.9], expected: "0.1" },
        { id: "TC-DEC-03", op: "multiply", numbers: [1.1, 1.1], expected: "1.21" },
        { id: "TC-DEC-04", op: "divide", numbers: [1, 3], expected: "0.3333333333333333333333333333" },
        { id: "TC-DEC-09", op: "divide", numbers: [2, 3], expected: "0.6666666666666666666666666667" },
    ];

    for (const { id, op, numbers, expected } of cases) {
        test(`${id}: ${op}(${numbers.join(", ")}) = exactly ${expected}`, async ({ request }) => {
            const response = await calculate(request, op, numbers);
            expect(response.status()).toBe(200);
            // Raw body: response.json() would round the 28-digit result to double precision.
            expect(await response.text()).toBe(
                `{"operation":"${op}","numbers":${JSON.stringify(numbers)},"result":${expected}}`,
            );
        });
    }
});

test.describe("4.2 Dezimal-Randfälle – Überlauf (400 Bad Request)", { tag: "@prio-mittel" }, () => {
    // Operands lie inside the decimal range so the overflow happens in the calculation itself.
    const cases: { id: string; op: Operation; numbers: number[] }[] = [
        { id: "TC-DEC-05", op: "add", numbers: [7e28, 1e28] },
        { id: "TC-DEC-06", op: "subtract", numbers: [-7e28, 1e28] },
        { id: "TC-DEC-07", op: "multiply", numbers: [1e15, 1e15] },
        { id: "TC-DEC-08", op: "divide", numbers: [7e28, 0.5] },
        { id: "TC-DEC-11", op: "multiply", numbers: [1e14, 1e14, 10] },
    ];

    for (const { id, op, numbers } of cases) {
        test(`${id}: ${op}(${numbers.join(", ")}) overflows`, async ({ request }) => {
            const response = await calculate(request, op, numbers);
            await expectError(response, 400, OVERFLOW_ERROR);
        });
    }
});

test.describe("4.3 Division durch null (400 Bad Request)", { tag: "@prio-hoch" }, () => {
    const cases: { id: string; numbers: number[] }[] = [
        { id: "TC-DIV0-01", numbers: [10, 0] },
        { id: "TC-DIV0-02", numbers: [10, -0] },
        { id: "TC-DIV0-03", numbers: [10, 2, 0] },
    ];

    for (const { id, numbers } of cases) {
        test(`${id}: divide(${numbers.join(", ")})`, async ({ request }) => {
            const response = await calculate(request, "divide", numbers);
            await expectError(response, 400, DIVISION_BY_ZERO_ERROR);
        });
    }
});

test.describe("4.4 Eingabevalidierung (400 Bad Request, alle Endpunkte)", { tag: "@prio-hoch" }, () => {
    for (const op of OPERATIONS) {
        test.describe(`Endpunkt ${op}`, () => {
            const url = endpoint(op);

            const invalidBodies: { id: string; label: string; body: unknown }[] = [
                { id: "TC-VAL-01", label: "only one operand", body: { numbers: [42] } },
                { id: "TC-VAL-02", label: "array instead of object", body: [1, 2] },
                { id: "TC-VAL-03", label: "empty object", body: {} },
                { id: "TC-VAL-05", label: "string operand", body: { numbers: [1, "abc"] } },
                { id: "TC-VAL-07", label: "null operand", body: { numbers: [1, null] } },
                { id: "TC-VAL-10", label: "1e308 exceeds decimal range", body: { numbers: [1e308, 1] } },
                {
                    id: "TC-VAL-11",
                    label: "decimal.MaxValue + 1 as literal",
                    body: { numbers: [79228162514264337593543950336, 1] },
                },
                { id: "TC-VAL-12", label: "numbers is not an array", body: { numbers: 5 } },
                { id: "TC-VAL-13", label: "legacy two-operand body { a, b }", body: { a: 1, b: 2 } },
                { id: "TC-VAL-14", label: "empty numbers array", body: { numbers: [] } },
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
                    data: JSON.stringify({ numbers: [1, 2] }),
                });
                // Non-JSON bodies are not parsed, so the request fails validation (400, not 415).
                await expectError(response, 400, VALIDATION_ERROR);
            });

            test("TC-VAL-09: payload above the 10kb body limit", async ({ request }) => {
                const response = await request.post(url, {
                    data: { numbers: [1, 2], padding: "x".repeat(11_000) },
                });
                await expectError(response, 413, PAYLOAD_TOO_LARGE_ERROR);
            });
        });
    }
});

test.describe("4.5 API-Vertrag / Robustheit", { tag: "@prio-mittel" }, () => {
    test("TC-CON-01: response contains exactly operation, numbers, result", async ({ request }) => {
        const response = await calculate(request, "add", [1, 2]);
        expect(response.status()).toBe(200);
        const body: Record<string, unknown> = await response.json();
        expect(Object.keys(body).sort()).toEqual(["numbers", "operation", "result"]);
    });

    test("TC-CON-02: responds with Content-Type application/json", async ({ request }) => {
        const ok = await calculate(request, "add", [1, 2]);
        expect(ok.headers()["content-type"]).toContain("application/json");

        const error = await calculate(request, "divide", [1, 0]);
        expect(error.headers()["content-type"]).toContain("application/json");
    });

    test("TC-CON-03: GET on a POST endpoint returns 404", async ({ request }) => {
        const response = await request.get(endpoint("add"));
        // Express routes per method; there is no 405 handling.
        await expectError(response, 404, NOT_FOUND_ERROR);
    });

    test("TC-CON-04: unknown operation returns 404", async ({ request }) => {
        const response = await request.post("/api/calculate/modulo", { data: { numbers: [1, 2] } });
        await expectError(response, 404, NOT_FOUND_ERROR);
    });

    test("TC-CON-05: unknown extra fields are tolerated", async ({ request }) => {
        const response = await request.post(endpoint("add"), { data: { numbers: [1, 2], extra: true } });
        expect(response.status()).toBe(200);
        expect(await response.json()).toEqual({ operation: "add", numbers: [1, 2], result: 3 });
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

    test("TC-CON-08: operands are echoed unchanged, including order and count", async ({ request }) => {
        const numbers = [3, -1.5, 2, 0.25];
        const response = await calculate(request, "add", numbers);
        expect(response.status()).toBe(200);
        const body: { numbers: number[] } = await response.json();
        expect(body.numbers).toEqual(numbers);
    });
});
