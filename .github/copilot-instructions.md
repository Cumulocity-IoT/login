## Project Identity

**Cumulocity IoT Web Application** — custom web frontend built with the Cumulocity Web SDK. Extends the Cumulocity IoT platform with custom features and integrations.

- **Stack:** Angular 20, TypeScript 5.9.3, RxJS 7.8, Jest 30, Cypress 15, ESLint (airbnb-base + angular-eslint)
- **Core Libraries:** `@c8y/ngx-components`, `@c8y/client`, `@c8y/toolkit`, `@c8y/devkit`, `@c8y/bootstrap`
- **Structure:** Standard Angular CLI application scaffolded with `ng add @c8y/websdk`

---

## 🛑 MANDATORY WORKFLOW: UI Planning & Implementation

**STOP: Before analyzing, planning, designing, OR implementing ANY UI feature/component, you MUST complete this workflow. No exceptions.**

### Step 1: Fetch Codex Documentation (REQUIRED BEFORE PLANNING)

When the user requests ANY UI work (planning, design, implementation), your **FIRST ACTION** must be:

1. **Fetch** https://cumulocity.com/codex/llms.txt
2. **Search** the content for relevant component keywords (modal, button, form, table, etc.)
3. **If found:** Read the specific `.md` documentation file like `https://cumulocity.com/codex/components/forms/editor.md`
4. **Read and analyze** the documentation content
5. **Locate examples** in the public tutorial repository: 
e.g. for file path './packages/tutorial/src/selector/asset-selector-example/tree-options/asset-selector-tree-example.component.ts' get file from 
'https://github.com/Cumulocity-IoT/tutorial/tree/main/src/selector/asset-selector-example/tree-options/asset-selector-tree-example.component.ts'
6. **Read example code** to understand the official pattern

**⛔ INVALID:** 
- ❌ "I'll list the Codex URL as a resource to review later"
- ❌ "The plan should include fetching the documentation"
- ❌ "Before implementation, we need to review the Codex"
- ❌ Making a plan without actually fetching and reading documentation

**✅ VALID:**
- ✓ Fetch llms.txt → Find modal docs → Read content → Find tutorial examples → Read example code → Then create plan

### Step 2: Check for Existing Components

After reviewing documentation:

1. Search `@c8y/ngx-components` for existing implementations
2. Use a matching Cumulocity component if one exists — **never build custom equivalents**
3. Only proceed with custom solution if nothing suitable exists

### Step 3: Plan or Implement

Only after completing Steps 1-2, proceed with planning or implementation.

---

## Universal Rules — TypeScript

- Target is ES2022; do not use syntax unavailable in ES2022
- Enable strict mode where possible; use explicit types or `unknown` with narrowing guards
- Avoid `any`; prefer explicit types
- Use path aliases for imports: `@c8y/ngx-components`, `@c8y/client`, `@c8y/devkit`, `@c8y/options`
- `experimentalDecorators: true` is set globally; Angular decorator syntax is valid as-is

## Universal Rules — Cumulocity Platform

### Other rules

- Use `@c8y/client` services for all Cumulocity REST calls — do **not** use `HttpClient` directly for platform endpoints
- Check `@c8y/ngx-components` before building custom UI components — it exports a large shared library. Search by visual functionality in [Codex](https://cumulocity.com/codex)
- Wrap every user-facing string with `C8yTranslatePipe` (`| translate`) or `TranslateService`:
  - ✅ `{{ 'Save' | translate }}`  ❌ `Save`

## Angular Patterns

- All new components must be **standalone** (`standalone: true`) — do not create NgModule-based components
- Prefer `ChangeDetectionStrategy.OnPush` for new components (no project-wide enforcement, but scale demands it)
- Constructor injection and `inject()` function are both present; either is acceptable
- Manage subscriptions with `async` pipe or `takeUntilDestroyed()` — avoid bare `unsubscribe()` without `ngOnDestroy`
- Use signals for local component state
- Consider extracting child components when template exceeds ~150 lines or class exceeds ~200 lines

## Code Quality (PR Review Focus)

- Remove `console.log` / `console.debug` before commit; `console.error` acceptable in caught exceptions
- Flag methods exceeding ~40 lines — consider decomposition
- Remove commented-out code; use git history for recovery
- New features should have `*.spec.ts` unit tests; new user flows should have Cypress coverage
- Document types, methods and properties that are not self-explanatory; don't explain ones that are obvious
- Test use cases that are truly worth testing, do not create test cases just for the sake of tests volume or coverate 

## Security Checks

- Flag hardcoded tenant IDs, device IDs, credentials, or API tokens — use `Cypress.env()` in tests, env config in production
- Review components rendering dynamic device/asset data for XSS: prefer `{{ }}` over `[innerHTML]` with unescaped values
- Treat IoT payload data as untrusted — validate and sanitize before display
- Do not expose internal hostnames or credentials in client-side code

## What NOT to Flag

- **Import order** — managed by ESLint
- **Quote style / semicolons** — ESLint enforces single quotes and required semicolons
- **Trailing commas on function parameters** — ESLint explicitly disallows them
- **`skipLibCheck: true`** in tsconfig — intentional project setting
