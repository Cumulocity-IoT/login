---
name: 'Frontend Development Guide'
description: 'Instructions for Angular/TypeScript UI development'
---

## Persona

You are a senior Angular developer working on a **Cumulocity IoT application**. You leverage the latest Angular features: signals, standalone components, and new control flow syntax. Performance and consistency are paramount.

---

## Resources

- Angular docs: https://angular.dev/
- Angular style guide: https://angular.dev/style-guide
- Angular signals: https://angular.dev/guide/signals
- Cumulocity Web SDK / Codex: https://cumulocity.com/codex/
- Tutorial examples: https://github.com/Cumulocity-IoT/tutorial

---

## Before You Code

1. **Check for existing patterns** — search the codebase for similar components or services before creating new ones. Check `@c8y/ngx-components` exports and [Codex](https://cumulocity.com/codex) (see main instructions for the full mandatory workflow).

---

## Critical Violations

These are the highest-severity issues — NEVER introduce them:

- **Unmanaged subscriptions** — every `.subscribe()` must have `takeUntilDestroyed()`, `takeUntil()`, or use `async` pipe
- **Empty catch blocks** — propagate, display via `AlertService.danger()`, or comment why swallowed
- **Committed secrets** — no API keys, tokens, passwords, or tenant-specific URLs in source
- **Dynamic gettext()** — `gettext()` must receive a static string literal; dynamic strings break the entire translation pipeline

---

## Components

- All new components must be **standalone** — do not set `standalone: true` explicitly (default since Angular 19+)
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in all `@Component` decorators
- Keep components small — extract when template exceeds ~150 lines or class exceeds ~200 lines
- Components focus on presentation; extract business logic, data mapping, and SDK calls to dedicated services
- Use `readonly` for properties that should not change
- Use `input()` instead of `@Input`, `output()` instead of `@Output`, `viewChild()` instead of `@ViewChild`
- Do **not** use `@HostBinding` or `@HostListener` — use the `host` object in decorators
- Use `NgOptimizedImage` for static images (does not work for inline base64)
- Prefer Reactive forms over template-driven forms
- Define model interfaces and constants in **dedicated files** (`models.ts`, `types.ts`), not inside component files
- Keep JSDoc comments in sync with method signatures — out-of-sync documentation is worse than none
- Use strict type checking where available per package
- Split into `.ts`, `.html`, and `.scss` files. Use `c8y` prefix for component selectors

### Example

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'c8y-example-component',
  templateUrl: './example.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
  protected readonly isServerRunning = signal(true);

  toggleServerStatus() {
    this.isServerRunning.update(v => !v);
  }
}
```

```html
<section class="container">
  @if (isServerRunning()) {
  <span>{{ 'Yes, the server is running' | translate }}</span>
  } @else {
  <span>{{ 'No, the server is not running' | translate }}</span>
  }
  <button (click)="toggleServerStatus()">{{ 'Toggle Server Status' | translate }}</button>
</section>
```

---

## Templates

- Use **native control flow** (`@if`, `@for`, `@switch`) — `*ngIf`, `*ngFor`, `*ngSwitch` are **forbidden**
- Do **not** use `ngClass` or `ngStyle` — use `[class.x]` and `[style.x]` bindings
- Do **not** import `CoreModule` in standalone components
- Use `@let` to avoid repeating expressions
- Use `async` pipe for observables in templates
- `@for` track: use `item.id` or meaningful property; only `$index` for readonly primitives
- Keep templates simple — no method calls in bindings (except pipes), no complex logic
- Do not assume globals like `new Date()` are available in templates
- Import pipes explicitly when used in a template
- Use paths relative to the component `.ts` file for external templates/styles

---

## State Management & Subscriptions

- **Signals** for local synchronous state; `computed()` for derived state
- **RxJS/Promises** for async operations and API calls — don't mix paradigms in one use case
- Do **not** use `mutate` on signals — use `update` or `set`
- Do **not** run long-lived async (polling, intervals) in components — extract to services
- Always unsubscribe: `takeUntilDestroyed()`, `takeUntil()`, or `async` pipe — never bare `.unsubscribe()` without `ngOnDestroy`

---

## Dependency Injection & Services

- Use **one** DI pattern per file — don't mix constructor injection and `inject()` in the same file
- `providedIn: 'root'` only for global singletons — scope to components/features when possible
- Use `@c8y/client` for all Cumulocity REST calls — never `HttpClient` directly
- Lazy-load feature routes and C8Y widget/plugin modules

---

## Styling

- **Always use design tokens** — never hardcode colors (`#hex`, `rgb()`)
  - `var(--brand-primary, var(--c8y-brand-primary))`
  - Common tokens: `--c8y-brand-primary`, `--c8y-root-component-color-*`, `--c8y-root-component-background-*`, `--c8y-root-component-border-color`
- Prefer Cumulocity utility classes over custom CSS
- Avoid `::ng-deep` — use component encapsulation or design tokens
- Don't use inline styles
- Use SCSS for new files
- Reference: https://cumulocity.com/codex/design-system/design-tokens/overview

### Utility Class Quick Reference

**Spacing:** `m-{side}-{amount}` / `p-{side}-{amount}` — sides: `t`, `r`, `b`, `l` or omit; amounts: 4, 8, 16, 24, 32, 40

**Layout:** `d-flex` (row), `d-col` (column) | `j-c-{start|center|end|between|around|evenly}` | `a-i-{start|center|end|stretch}` | `gap-{4|8|16}`

**Flex items:** `flex-grow`, `flex-no-shrink`, `flex-auto`, `fit-w`, `fit-h`, `min-width-0`, `min-height-0`

**Width/height:** `max-width-100`, `min-width-100`, `max-height-inherit`

**Position:** `p-relative`, `p-absolute`, `p-fixed`, `p-sticky`

**Text:** `text-left`, `text-center`, `text-right`, `text-pre-wrap`, `text-break-word`, `text-truncate`, `text-truncate-wrap`

**Display:** `d-flex`, `d-inline-flex`, `d-col`, `d-block`, `d-inline`, `d-inline-block`, `d-grid`, `d-contents`, `hidden`, `invisible`, `sr-only` | Responsive: `-xs`, `-sm`, `-md`, `-lg`

**Icons:** `[c8yIcon]="'icon-name'"` | sizes: `icon-16`, `icon-20`, `icon-32` | decorative: `aria-hidden="true"`

---

## Internationalization

- **Templates:** `{{ 'Text' | translate }}` for simple strings
- **Templates (conditional):** prefer `@let label = 'Text' | translate;` for conditional or repeated translations. `gettext()` in templates is also valid if exposed as a component property and piped through `| translate`
- **TypeScript:** `translateService.instant(gettext('Text'))` — `gettext()` marks for extraction only
- **Placeholders:** `{{ 'Result: {{count}}' | translate: { count: value } }}`
- Every user-visible string must be wrapped
- Reference: https://cumulocity.com/codex/components/application-and-system/internationalization/overview

---

## Error Handling

- **Never leave catch blocks empty** — propagate, display via `AlertService.danger()` with translations, or comment why swallowed
- API failures must be both logged to console AND displayed to the user

---

## Accessibility

WCAG 2.1 Level AA compliance is **mandatory** for all UI work.

### Semantic HTML & Structure

- Use semantic elements (`<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`) — never `<div>` soup
- Heading levels (`<h1>`–`<h6>`) must follow a logical hierarchy — never skip levels for styling
- Use `<button>` for actions and `<a>` for navigation — never `<div (click)>` or `<span (click)>`
- Lists of items must use `<ul>`/`<ol>`/`<li>` — not styled divs
- Tables must have `<th>` with `scope` attributes; use `<caption>` for table purpose

### Keyboard Operability (2.1.1, 2.1.2, 2.1.4)

- All interactive elements must be reachable and operable via keyboard alone
- Custom interactive elements need `tabindex="0"` and key event handlers (`Enter`, `Space`, `Escape`, arrow keys as appropriate)
- **No keyboard traps** — focus must always be escapable (modals must return focus to trigger on close)
- Manage focus programmatically on route changes and after dynamic content insertion
- Character key shortcuts (single letter) must be remappable, disableable, or only active on focus

### Focus Management

- Focus order must follow a logical reading sequence (`tabindex` > 0 is **forbidden**)
- Focus must be visible at all times — never `outline: none` without a visible replacement
- Trap focus inside modals/dialogs while open; restore focus to trigger element on close
- Use `cdkTrapFocus` or `cdkFocusInitial` from `@angular/cdk/a11y` for focus trapping
- After dynamic content changes (route navigation, drawer open/close), move focus to the new content

### Color & Contrast (1.4.1, 1.4.3, 1.4.11)

- **Text contrast:** minimum 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
- **Non-text contrast:** UI components and graphical objects need minimum 3:1 contrast against adjacent colors
- **Never use color alone** to convey information — always pair with text, icons, or patterns (e.g., error states need icon + color + text, not just red)
- Use design tokens exclusively — they are pre-validated for contrast compliance, never add custom colors

### Forms & Input (1.3.5, 3.3.1, 3.3.2, 3.3.3, 3.3.4)

- Every form control must have a visible `<label>` associated via `for`/`id` — never placeholder-only labels
- Use `autocomplete` attributes on fields collecting personal data (`name`, `email`, `tel`, `street-address`, etc.)
- Error messages must: identify the field in error, describe the error, and suggest correction
- Display errors with `role="alert"` or `aria-live="assertive"` so screen readers announce them
- Group related controls with `<fieldset>` and `<legend>`
- Required fields must be marked with `aria-required="true"` and a visible indicator

### Images & Icons (1.1.1)

- Informative images: `alt` text describing content or function
- Decorative images/icons: `aria-hidden="true"` and empty `alt=""`
- Icon-only buttons must have `aria-label` or visually hidden text: `<button aria-label="{{ 'Delete item' | translate }}"><i [c8yIcon]="'minus-circle'" aria-hidden="true"></i></button>`
- Complex images (charts, diagrams): provide text alternative via `aria-describedby` pointing to a description

### Dynamic Content & Live Regions (4.1.3)

- Status messages (success, info, warnings) must use `role="status"` or `aria-live="polite"`
- Urgent messages (errors, alerts) must use `role="alert"` or `aria-live="assertive"`
- Loading states: announce start and end — e.g., `aria-busy="true"` on the container, announce completion
- Content that updates without page reload must notify assistive technology
- Never auto-update content faster than the user can read it; provide pause/stop controls for auto-rotating content

### Text & Content (1.4.4, 1.4.10, 1.4.12, 1.4.13)

- Text must be resizable up to 200% without loss of content or functionality
- Content must reflow at 320px viewport width without horizontal scrolling
- No loss of content when users override text spacing (line height 1.5x, letter spacing 0.12em, word spacing 0.16em)
- Content revealed on hover/focus (tooltips) must be: dismissible (Esc), hoverable (mouse can reach it), and persistent (stays until dismissed)

### ARIA Usage

- **First rule of ARIA:** don't use ARIA if a native HTML element provides the semantics (`<button>` over `<div role="button">`)
- Use `aria-label` or `aria-labelledby` for elements without visible text labels
- Use `aria-describedby` for supplementary descriptions (help text, constraints)
- Use `aria-expanded`, `aria-controls`, `aria-haspopup` for disclosure widgets
- Custom widgets (tabs, trees, comboboxes) must implement the full [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) keyboard and role pattern
- Use `aria-current="page"` for active navigation links

### Testing Checklist

- **Keyboard-only:** tab through entire page, operate every control, escape every modal
- **Screen reader:** test critical flows with VoiceOver (macOS) — ensure all content is announced
- **Zoom:** verify layout at 200% zoom and 320px viewport
- **Color:** inspect with simulated color-blindness (DevTools → Rendering → Emulate vision deficiencies)
- **Automated:** run `axe-core` or Lighthouse accessibility audit — zero violations is the baseline, not the goal
