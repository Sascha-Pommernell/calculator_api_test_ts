import { test, expect, APIRequestContext } from '@playwright/test';

type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

const endpoint = (op: Operation) => `/calculator/${op}`;

async function calculate(request: APIRequestContext, op: Operation, numbers: number[]){
    return request.post(endpoint(op), {
        data: { numbers }});
}

test.describe('4.1 Happy Path – Grundrechenarten', () => {
    const cases: { id: string, op: Operation, numbers: number[], result: number }[] = [
        { id: 'TC-ADD-01', op: 'add', numbers: [1, 2], result: 3 },
        { id: 'TC-ADD-02', op: 'add', numbers: [1, 2, 3, 4], result: 10 },
        { id: 'TC-ADD-03', op: 'add', numbers: [-5, 2.5], result: -2.5 },
        { id: 'TC-SUB-01', op: 'subtract', numbers: [10, 4], result: 6 },
        { id: 'TC-SUB-02', op: 'subtract', numbers: [10, 4, 3], result: 3 },
        { id: 'TC-SUB-03', op: 'subtract', numbers: [-1, -1], result: 0 },
        { id: 'TC-MUL-01', op: 'multiply', numbers: [3, 4], result: 12 },
        { id: 'TC-MUL-02', op: 'multiply', numbers: [2, 3, 4], result: 24 },
        { id: 'TC-MUL-03', op: 'multiply', numbers: [5, 0], result: 0 },
        { id: 'TC-MUL-04', op: 'multiply', numbers: [-2, 2.5], result: -5 },
        { id: 'TC-DIV-01', op: 'divide', numbers: [10, 4], result: 2.5 },
        { id: 'TC-DIV-02', op: 'divide', numbers: [100, 5, 2], result: 10 },
        { id: 'TC-DIV-03', op: 'divide', numbers: [-9, 3], result: -3 },
        { id: 'TC-DIV-04', op: 'divide', numbers: [0, 5], result: 0 },
    ];

    for (const { id, op, numbers, result } of cases) {
        test(`${id} - ${op} (${numbers.join(', ')})`, async ({ request }) => {
            const response = await calculate(request, op, numbers);
            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body).toEqual({ operation: op, numbers, result });
        });
    }
});
