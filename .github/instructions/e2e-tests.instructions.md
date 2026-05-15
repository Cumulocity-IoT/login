---
name: "Cypress E2E & Component Testing Guide"
description: "Instructions for Cypress end-to-end and component tests in Cumulocity applications"
applyTo: "**/*.cy.ts"
paths: ["**/*.cy.ts"]
---

# Cypress Testing Guide

## Test Types and Locations

- **E2E tests** — `cypress/e2e/` — run against a real or intercepted Cumulocity tenant
- **Component tests** — `cypress/component/` — mount Angular components in isolation via `cy.mount()`
- **Fixtures** — `cypress/fixtures/` — mocked BE responses for component tests
- **Support** — `cypress/support/` — custom commands (`cy.login()`, `cy.createDevice()`, etc.) and global configuration; auto-imported before every test
- **Snapshots** — `cypress/snapshots/` — baseline, actual, and diff images for visual regression tests (see Visual Testing)

## E2E Tests

### Authentication and navigation

```typescript
beforeEach(() => {
  cy.login(Cypress.env('username'), Cypress.env('password'));
});

cy.visit('/apps/cockpit/index.html#/group/123');
```

Always use `Cypress.env('username')` / `Cypress.env('password')` — never hardcode credentials.

### API interception

```typescript
cy.intercept('GET', '/inventory/managedObjects/123', mockedObject).as('getMO');
cy.wait('@getMO');

// Query-parameter matching
cy.intercept(
  { pathname: '/inventory/managedObjects', query: { pageSize: '5' } },
  { managedObjects: [] }
);
```

Use `cy.intercept()` to stub slow or unpredictable backend calls; never use fixed `cy.wait(number)`.

### Creating and cleaning up test data

Use `cy.request()` for setup. Always clean up in `afterEach`:

```typescript
afterEach(() => {
  createdIds.forEach(id => {
    cy.request({ 
      url: `/inventory/managedObjects/${id}?cascade=true`, 
      method: 'DELETE', 
      failOnStatusCode: false 
    });
  });
});
```

Use `Cypress._.now()` to generate unique names: `e2eDevice${Cypress._.now()}`.

## Component Tests

### Mounting

```typescript
cy.mount(MyComponent, {
  imports: [CoreModule.forRoot(), CommonModule, ...],
  providers: [
    { provide: MyService, useValue: stubService }
  ],
  componentProperties: { myInput: value }
});
```

All components should be standalone — import them directly, no NgModule wrapping needed.

### Mocked backend with fixtures

Component tests that need BE responses can use recorded fixtures:

```typescript
it('should load data', () => {
  cy.intercept('GET', '/inventory/managedObjects/*', { 
    fixture: 'device.json' 
  }).as('getDevice');
  
  cy.mount(MyComponent, { ... });
  cy.wait('@getDevice');
  cy.get('[data-cy="result"]').should('be.visible');
});
```

Store fixture files in `cypress/fixtures/`.

## Selectors

Prefer `data-cy` attributes, then role/title attributes. Avoid CSS class selectors unless the class is part of the component's public contract (e.g. icon class names from the design system).

Use consistent `data-cy` selectors with pattern: `<component-selector>--<element>-<details>`

- Double hyphens (`--`) separate component selector from element
- Single hyphens connect element type with descriptive details
- Don't hesitate to use longer names for precision

**Example:**
```html
<!-- In component template -->
<button data-cy="c8y-custom-element-example--reset-button">Reset</button>
<button data-cy="c8y-custom-element-example--submit">Submit</button>
```

**Usage:**
```typescript
cy.get('[data-cy="c8y-custom-element-example--reset-button"]').click();         // preferred
cy.get('[title="Save"]').should('be.visible');        // acceptable for titled elements
cy.get('c8y-ui-empty-state').should('be.visible');   // OK for component element selectors
cy.get('.my-layout-class').should(...)               // avoid unless class is stable/intentional
```

## Assertions

```typescript
.should('be.visible')
.should('contain.text', 'expected')
.should('have.attr', 'href', '#/group/123')
.should('not.exist')
.should('be.disabled')
.should('be.enabled')
```

Use `.should()` for all assertions (auto-retries). Avoid `.then()` for assertions.

## Helper functions

Extract repeated selection and assertion logic into named helper functions at the top of the spec or in a describe-level scope:

```typescript
function assertBreadcrumb(index: number, text: string) {
  cy.get('[data-cy="breadcrumb-item"]').eq(index).should('contain.text', text);
}
```

For component tests with multiple mounting configurations, create a named `mount*` function per variant.

## Visual Testing

```typescript
cy.compareSnapshot('my-identifier'); // strict
cy.compareSnapshot('my-identifier', 0.05); // with threshold
```

Run component tests in the dev container for snapshot consistency with CI:

```bash
yarn dc:up
yarn dc:run:spec "cypress/component/path/to/spec.cy.ts"
yarn dc:base:spec "cypress/component/path/to/spec.cy.ts"  # regenerate baseline
```

Snapshots: `cypress/snapshots/{base,actual,diff}/`

To regenerate baseline snapshots, use your project's snapshot regeneration command or manually replace files in `cypress/snapshots/base/`.

## Running Tests

```bash
# Open Cypress runner
npx cypress open --config baseUrl=https://<tenant>.cumulocity.com --env username=<u>,password=<p>

# Run headless
npx cypress run --config baseUrl=https://<tenant>.cumulocity.com --e2e --env username=<u>,password=<p> --browser chrome

# Filter by title substring (with cypress-grep plugin)
npx cypress run --env grep=breadcrumb
```

## What NOT to Do

- No `cy.wait(number)` — use `cy.wait('@alias')` or `.should()` retry
- No hardcoded tenant IDs, credentials, or device IDs — use `Cypress.env()` (except cases related to e.g. password changes; make sure to document these exceptions clearly in the code and not use credentials of real users)
- No `it.only` / `describe.only` / `context.only` committed to the repo
- Use `cy.visit()` for navigation; add custom wait utilities if needed
- Don't test trivial things just for coverage — test meaningful user-facing behavior
