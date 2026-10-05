# calculator_api_test_ts – Black-Box API Tests

[English](#english) | [Deutsch](#deutsch)

---

## English

### 🎯 Overview

Black-box API tests for the [calculator_api_ts](https://github.com/Sascha-Pommernell/calculator_api_ts) REST API.
The tests use Playwright's `request` fixture (`APIRequestContext`) to call a **running** API instance over real
HTTP – no browser is required. Every test carries the test-case ID from the test concept
(`calculator_api_ts/docs/Testkonzept.md`, chapter 4) in its title and a priority tag on its `describe` block.

**Author:** Sascha Pommernell
**Framework:** Playwright v1.63 (API testing only)
**Language:** TypeScript 7 (ESM, strict)
**Node.js:** >=24

### ✨ Features

- 🔌 **Pure HTTP tests**: `request.post()` against `API_BASE_URL`, no browser download needed
- 🧾 **Contract-driven**: request body `{ "numbers": [n1, n2, …] }`, response `{ operation, numbers, result }`, error contract `{ error }`
- 🔢 **Exact decimals**: precision cases compare the **raw response text** (28 decimal places) – `JSON.parse` would round
- 🏷️ **Priority tags**: `@prio-hoch` / `@prio-mittel` (filterable via `--grep` or npm scripts)
- 🚦 **Fail fast**: `globalSetup` probes `GET /health` and aborts the run if the API is unreachable (never "green without tests")
- 📈 **Reports**: list, HTML (`playwright-report/`), JUnit (`test-results/junit.xml`)
- ⚡ **Parallel**: `fullyParallel`, no retries (stateless, deterministic tests)

### 🛠 Prerequisites

- Node.js ≥ 24, npm ≥ 10
- Running `calculator_api_ts` (default `http://localhost:3000`), e.g. `npm run dev` in the API repo

### 📦 Installation

```bash
git clone https://github.com/Sascha-Pommernell/calculator_api_test_ts.git
cd calculator_api_test_ts
npm install
```

No `playwright install` is necessary – the tests do not start a browser.

### ⚙️ Configuration

| Variable | Default | Meaning |
|---|---|---|
| `API_BASE_URL` | `http://localhost:3000` | Base URL of the API under test (`baseURL` of the request context) |
| `CI` | – | `true` enables `forbidOnly` and sets the HTML reporter to `open: never` |

Main settings in `playwright.config.ts`: `testDir: ./tests`, `globalSetup: ./tests/global-setup.ts`,
`fullyParallel: true`, `retries: 0`, reporters `list` + `html` + `junit`, `extraHTTPHeaders: { Accept: application/json }`.

### 📁 Project Structure

```
calculator_api_test_ts/
├── 📁 tests/
│   ├── calculator.spec.ts        # All test cases (4.1–4.5), grouped by describe block
│   └── global-setup.ts           # GET /health probe – aborts the run if the API is down
├── 📁 .github/workflows/
│   └── api-tests.yml             # CI: builds & starts the API, runs the tests
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

### 🚀 Usage

```bash
npm test                  # all tests (API must be running)
npm run test:prio-hoch    # only @prio-hoch
npm run test:prio-mittel  # only @prio-mittel
npm run typecheck         # tsc --noEmit
npm run report            # open the HTML report
```

```bash
# against another API instance
API_BASE_URL=http://localhost:4000 npx playwright test     # bash
$env:API_BASE_URL="http://localhost:4000"; npx playwright test   # PowerShell

# single test case / group
npx playwright test -g "TC-DEC-04"
npx playwright test -g "4.4 Eingabevalidierung"
```

### 📊 Test Scenarios

| Group (`describe`) | Tag | Test cases | What is checked |
|---|---|---|---|
| 4.1 Happy Path | `@prio-hoch` | TC-ADD-01/02/03, TC-SUB-01/02/03, TC-MUL-01/02/03/04, TC-DIV-01/02/03/04 | 200, `{ operation, numbers, result }`; `02` cases use 3–4 operands (left-associative) |
| 4.2 Decimal – precision | `@prio-mittel` | TC-DEC-01/02/03/04/09 | 200, raw body equals `{"operation":…,"numbers":[…],"result":<exact literal>}` |
| 4.2 Decimal – overflow | `@prio-mittel` | TC-DEC-05/06/07/08/11 | 400, `Arithmetic overflow: result exceeds the decimal range` (incl. overflow in a later step) |
| 4.3 Division by zero | `@prio-hoch` | TC-DIV0-01/02/03 | 400, `Division by zero is not allowed` (0, −0, zero at a later divisor position) |
| 4.4 Input validation (per endpoint) | `@prio-hoch` | TC-VAL-01–14 | 400 validation error (one operand, array body, `{}`, string/`null` element, 1e308, 2⁹⁶, `numbers` not an array, legacy `{ a, b }`, empty array), 400 `Invalid JSON body`, 400 for `text/plain`, 413 `Request rejected` above 10 kB |
| 4.5 Contract / robustness | `@prio-mittel` | TC-CON-01–08 | exact response keys, `Content-Type`, 404 for GET and unknown operations, extra fields tolerated, `GET /health`, no `X-Powered-By`, operands echoed unchanged |

**Total:** 91 tests (4.4 runs for each of the four endpoints).

### 🔁 CI (GitHub Actions)

`.github/workflows/api-tests.yml` – on push/PR to `main` and manually (`workflow_dispatch`, API ref selectable via `api_ref`):

1. Checkout this repo and `Sascha-Pommernell/calculator_api_ts` (path `api`)
2. `npm ci` + `npm run build` + `npm start` of the API in the background (`PORT=3000`), wait for `GET /health` (max. 30 s)
3. `npm ci`, `npm run typecheck`, `npm test` in this repo (`API_BASE_URL=http://localhost:3000`)
4. Upload `playwright-report/` and `test-results/` as artifact `playwright-report` (always); `api.log` on failure

The same tests are also executed by the API repository's pipeline (job `api-tests`), so both API and test changes are
gated.

### 🔗 Related Repositories

| Repository | Content |
|---|---|
| [calculator_api_ts](https://github.com/Sascha-Pommernell/calculator_api_ts) | The API, unit/in-process tests, **test concept** (`docs/Testkonzept.md`) |
| [calculator_ui_ts](https://github.com/Sascha-Pommernell/calculator_ui_ts) | React UI for the API |
| [calculator_ui_tests_ts](https://github.com/Sascha-Pommernell/calculator_ui_tests_ts) | Playwright UI (E2E) tests |

---

## Deutsch

### 🎯 Übersicht

Black-Box-API-Tests für die REST-API [calculator_api_ts](https://github.com/Sascha-Pommernell/calculator_api_ts).
Die Tests nutzen die Playwright-`request`-Fixture (`APIRequestContext`) und sprechen eine **laufende** API-Instanz über
echtes HTTP an – ein Browser wird nicht benötigt. Jeder Test trägt die Testfall-ID aus dem Testkonzept
(`calculator_api_ts/docs/Testkonzept.md`, Kapitel 4) im Titel und ein Prioritäts-Tag am `describe`-Block.

**Autor:** Sascha Pommernell
**Framework:** Playwright v1.63 (nur API-Testing)
**Sprache:** TypeScript 7 (ESM, strict)
**Node.js:** >=24

### ✨ Features

- 🔌 **Reine HTTP-Tests**: `request.post()` gegen `API_BASE_URL`, kein Browser-Download nötig
- 🧾 **Vertragsgetrieben**: Request-Body `{ "numbers": [n1, n2, …] }`, Response `{ operation, numbers, result }`, Fehlervertrag `{ error }`
- 🔢 **Exakte Dezimalzahlen**: Präzisionsfälle vergleichen den **rohen Response-Text** (28 Nachkommastellen) – `JSON.parse` würde runden
- 🏷️ **Prioritäts-Tags**: `@prio-hoch` / `@prio-mittel` (filterbar über `--grep` bzw. npm-Scripts)
- 🚦 **Fail fast**: `globalSetup` prüft `GET /health` und bricht den Lauf ab, wenn die API nicht erreichbar ist (kein „grün ohne Tests“)
- 📈 **Reports**: Liste, HTML (`playwright-report/`), JUnit (`test-results/junit.xml`)
- ⚡ **Parallel**: `fullyParallel`, keine Retries (zustandslose, deterministische Tests)

### 🛠 Voraussetzungen

- Node.js ≥ 24, npm ≥ 10
- Laufende `calculator_api_ts` (Standard `http://localhost:3000`), z. B. `npm run dev` im API-Repo

### 📦 Installation

```bash
git clone https://github.com/Sascha-Pommernell/calculator_api_test_ts.git
cd calculator_api_test_ts
npm install
```

Ein `playwright install` ist nicht erforderlich – die Tests starten keinen Browser.

### ⚙️ Konfiguration

| Variable | Standard | Bedeutung |
|---|---|---|
| `API_BASE_URL` | `http://localhost:3000` | Basis-URL der zu testenden API (`baseURL` des Request-Kontexts) |
| `CI` | – | `true` aktiviert `forbidOnly` und setzt den HTML-Reporter auf `open: never` |

Haupteinstellungen in `playwright.config.ts`: `testDir: ./tests`, `globalSetup: ./tests/global-setup.ts`,
`fullyParallel: true`, `retries: 0`, Reporter `list` + `html` + `junit`, `extraHTTPHeaders: { Accept: application/json }`.

### 📁 Projektstruktur

```
calculator_api_test_ts/
├── 📁 tests/
│   ├── calculator.spec.ts        # Alle Testfälle (4.1–4.5), gruppiert nach describe-Block
│   └── global-setup.ts           # GET /health-Probe – bricht den Lauf ab, wenn die API nicht läuft
├── 📁 .github/workflows/
│   └── api-tests.yml             # CI: baut & startet die API, führt die Tests aus
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

### 🚀 Verwendung

```bash
npm test                  # alle Tests (API muss laufen)
npm run test:prio-hoch    # nur @prio-hoch
npm run test:prio-mittel  # nur @prio-mittel
npm run typecheck         # tsc --noEmit
npm run report            # HTML-Report öffnen
```

```bash
# gegen eine andere API-Instanz
API_BASE_URL=http://localhost:4000 npx playwright test             # bash
$env:API_BASE_URL="http://localhost:4000"; npx playwright test     # PowerShell

# einzelner Testfall / Gruppe
npx playwright test -g "TC-DEC-04"
npx playwright test -g "4.4 Eingabevalidierung"
```

### 📊 Testszenarien

| Gruppe (`describe`) | Tag | Testfälle | Prüfung |
|---|---|---|---|
| 4.1 Happy Path | `@prio-hoch` | TC-ADD-01/02/03, TC-SUB-01/02/03, TC-MUL-01/02/03/04, TC-DIV-01/02/03/04 | 200, `{ operation, numbers, result }`; die `02`-Fälle verwenden 3–4 Operanden (links-assoziativ) |
| 4.2 Dezimal – Präzision | `@prio-mittel` | TC-DEC-01/02/03/04/09 | 200, roher Body gleich `{"operation":…,"numbers":[…],"result":<exaktes Literal>}` |
| 4.2 Dezimal – Überlauf | `@prio-mittel` | TC-DEC-05/06/07/08/11 | 400, `Arithmetic overflow: result exceeds the decimal range` (auch Überlauf in einem späteren Schritt) |
| 4.3 Division durch null | `@prio-hoch` | TC-DIV0-01/02/03 | 400, `Division by zero is not allowed` (0, −0, null an späterer Divisor-Position) |
| 4.4 Eingabevalidierung (je Endpunkt) | `@prio-hoch` | TC-VAL-01–14 | 400 Validierungsfehler (ein Operand, Array-Body, `{}`, String-/`null`-Element, 1e308, 2⁹⁶, `numbers` kein Array, Alt-Format `{ a, b }`, leeres Array), 400 `Invalid JSON body`, 400 bei `text/plain`, 413 `Request rejected` über 10 kB |
| 4.5 Vertrag / Robustheit | `@prio-mittel` | TC-CON-01–08 | exakte Response-Felder, `Content-Type`, 404 bei GET und unbekannter Operation, Zusatzfelder toleriert, `GET /health`, kein `X-Powered-By`, Operanden unverändert gespiegelt |

**Gesamt:** 91 Tests (4.4 läuft für jeden der vier Endpunkte).

### 🔁 CI (GitHub Actions)

`.github/workflows/api-tests.yml` – bei Push/PR auf `main` und manuell (`workflow_dispatch`, API-Ref über `api_ref` wählbar):

1. Checkout dieses Repos und von `Sascha-Pommernell/calculator_api_ts` (Pfad `api`)
2. `npm ci` + `npm run build` + `npm start` der API im Hintergrund (`PORT=3000`), Warten auf `GET /health` (max. 30 s)
3. `npm ci`, `npm run typecheck`, `npm test` in diesem Repo (`API_BASE_URL=http://localhost:3000`)
4. Upload von `playwright-report/` und `test-results/` als Artefakt `playwright-report` (immer); `api.log` bei Fehlschlag

Dieselben Tests führt auch die Pipeline des API-Repos aus (Job `api-tests`), sodass API- und Testcode-Änderungen
gleichermaßen abgesichert sind.

### 🔗 Verwandte Repositories

| Repository | Inhalt |
|---|---|
| [calculator_api_ts](https://github.com/Sascha-Pommernell/calculator_api_ts) | Die API, Unit-/In-Process-Tests, **Testkonzept** (`docs/Testkonzept.md`) |
| [calculator_ui_ts](https://github.com/Sascha-Pommernell/calculator_ui_ts) | React-UI für die API |
| [calculator_ui_tests_ts](https://github.com/Sascha-Pommernell/calculator_ui_tests_ts) | Playwright-UI-Tests (E2E) |
