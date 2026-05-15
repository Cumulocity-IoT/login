---
name: "Jest Unit Testing Guide"
description: "Instructions for Jest unit tests (TypeScript)"
applyTo: "**/*.spec.ts"
paths: ["**/*.spec.ts"]
---

# Unit Testing Guide

## Overview
Unit tests use Jest with TestBed for Angular component setup and jest.fn() for mocking services.

# Common

## Test File Location
- Unit test files are co-located with the code they test
- Use `.spec.ts` extension for test files
- Example: `my-component.ts` → `my-component.spec.ts`

## Basic Test Structure
```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentName],
      providers: [/* services */]
    }).compileComponents();
    fixture = TestBed.createComponent(ComponentName);
    component = fixture.componentInstance;
  });

  test('should do something specific', () => {
    fixture.detectChanges();
    expect(actual).toBe(expected);
  });
});
```

**Key points:**
- Always use `async` on `beforeEach` and `await` + `.compileComponents()` on `configureTestingModule()` to properly compile components
- Always call `fixture.detectChanges()` before asserting anything about the component (triggers Angular initialization and change detection)

## Angular Testing
- Test component behavior, not implementation details
- Test DOM interactions through the fixture using `fixture.detectChanges()`
- For async operations: use `fixture.whenStable()` to wait for pending async tasks or `async`/`waitForAsync` and `fakeAsync`

## Best Practices
- **Descriptive test names**: Use "should..." pattern in it() names
- **Be concise**: Keep tests to as few lines as possible. Avoid unnecessary variable declarations. Use helper functions for common test data.
- **Structure tests logically**: Group related tests using nested `describe` blocks
- **Mock external dependencies**: Don't test third-party code
- **Test user behavior**: Focus on what users experience, not implementation details
- **Avoid arbitrary sleeps**: Do NOT use `setTimeout` in tests — instead use `fixture.whenStable()` or `await` for async operations
- **Don't duplicate**: Use `beforeEach` for common setup, or extract helper functions
- **Avoid brittleness**: Don't depend on exact backend data structure details that may change
- **Always call `detectChanges()` before assertions**: Angular change detection must run before testing component state or DOM
- **Mock comprehensively**: If a service has 10 public methods and your component calls 8 of them, mock all 8 in the test setup to avoid runtime errors later

## Common Pitfalls to Avoid
- ❌ **Forgetting `async` and `.compileComponents()`**: `beforeEach(() => { ... })` without `async`/`await` leaves components uncompiled
- ❌ **Missing `fixture.detectChanges()`**: Component won't initialize without this; properties will be undefined
- ❌ **Incomplete service mocks**: Mocking only some methods causes "is not a function" errors on unmocked methods
- ❌ **Wrong mock return types**: Returning `[]` when the method returns `{ data: [], paging: {} }` causes destructuring errors
- ❌ **Not providing all dependencies**: Missing providers (e.g., `TranslateService`) causes "No provider found" errors
- ✅ **DO**: Mock all methods, use correct async patterns, always call `detectChanges()`, verify return types match the real service

## Common Test Patterns
```typescript
// Testing component initialization
it('should initialize with default values', () => {
  fixture.detectChanges();
  expect(component.propertyName).toBe(expectedValue);
});

// Testing async operations
it('should load data on init', async () => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(component.data).toBeDefined();
});

// Testing user interactions
it('should emit event when button clicked', () => {
  fixture.detectChanges();
  jest.spyOn(component.outputEvent, 'emit');
  fixture.nativeElement.querySelector('button').click();
  expect(component.outputEvent.emit).toHaveBeenCalled();
});
```

## TypeScript in Tests
- Use proper types, avoid `any`
- Type your test data and mocks
- Use interfaces from the application code
- Enable strict mode for better type safety

# Setup & Mocking

## Mocking

### TestBed Setup with jest.fn()

Use **TestBed.configureTestingModule** for component setup and **jest.fn()** for mock service objects:

```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: [
      {
        provide: MyService,
        useValue: {
          getData: jest.fn().mockResolvedValue(data),
          logout: jest.fn()
        }
      }
    ]
  }).compileComponents();
  fixture = TestBed.createComponent(MyComponent);
  component = fixture.componentInstance;
});
```

**Important mocking guidelines:**
- **Mock all public methods** that the component or its children might call, not just a few
- **Match return types exactly**: If a method returns `Promise<T>`, use `.mockResolvedValue(T)`; if it returns an object with properties, return a properly structured object (e.g., `{ data: [], paging: {} }`)
- **Use `.mockResolvedValue()` for async methods** to return promises correctly
- **Use `.mockReturnValue()` for synchronous methods**
- **Type your mocks** to catch missing methods early: `useValue: {...} as jest.Mocked<MyService>`

### Spying on Component/Service Methods

```typescript
const service = TestBed.inject(MyService);
jest.spyOn(service, 'getData').mockReturnValue(value);

// Or for component methods:
jest.spyOn(component, 'onSubmit');
component.handleForm();
expect(component.onSubmit).toHaveBeenCalled();
```

## Matchers
- `toBe()` - Strict equality (===)
- `toEqual()` - Deep equality
- `toBeTruthy()` / `toBeFalsy()`
- `toContain()` - Array/string contains
- `toHaveBeenCalled()` - Spy was called
- `toHaveBeenCalledWith(args)` - Spy called with specific arguments
- `toHaveLength(n)` - Array/string length
- `toThrow()` / `toThrowError()` - Exception testing
- See [Jest matchers documentation](https://jestjs.io/docs/expect) for complete list

## Running Tests
- Run specific file: `yarn jest my-component.spec.ts`
- Run with watch mode: `yarn jest --watch my-component.spec.ts`
- Run single test suite: `yarn jest my-component.spec.ts -t '^SuiteName(\\s.*)?$'`
- Debug race conditions: `yarn jest my-component.spec.ts --testNamePattern="Test Name" --maxWorkers=1`

## Coverage
- Aim for high coverage but focus on meaningful tests
- Ensure exception cases are covered where possible
- Focus on critical paths and edge cases

## Resources
- Jest documentation: https://jestjs.io/
- Angular testing guide: https://angular.dev/guide/testing
