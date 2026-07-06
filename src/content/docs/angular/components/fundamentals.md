---
title: Component Fundamentals
description: Understanding the anatomy of Angular components — creation, selectors, and styling with modern Angular 18+ syntax.
sidebar:
  order: 1
---

## What is a Component?

A component is a self-contained, reusable unit that powers a specific part of your application's user interface. It elegantly combines a **template** (HTML for the UI), **logic** (TypeScript for behavior), and **styles** (CSS/SCSS for visuals) into a cohesive module. Components are the cornerstone of Angular's modular architecture, enabling you to build scalable, maintainable apps.

In Angular 18+, **all components are standalone by default** — the `standalone: true` flag is no longer needed in the `@Component` decorator.

---

## Anatomy of a Component

A component is composed of four essential parts:

1. **Decorator** — The `@Component` decorator flags a class as a component, providing Angular with instructions on how to process it.
2. **Metadata** — Properties like `selector`, `template`, and `styles` define the component's structure, behavior, and appearance.
3. **Template** — The HTML that renders the UI, either inline or in a separate `.html` file.
4. **Styles** — The CSS or SCSS that styles the component, either inline or in a separate file.

```ts
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-greeting',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>Hello, {{ name() }}!</h2>`,
  styles: [`h2 { color: teal; }`]
})
export class GreetingComponent {
  name = signal('Angular');
}
```

> In Angular 18, `standalone: true` must be explicitly declared. From Angular 19+, it becomes the default and can be omitted. In both cases, the component directly manages its own `imports` for any dependencies it uses (pipes, directives, other components).

---

## Creating a Component

### Using the Angular CLI

The Angular CLI generates all necessary files and boilerplate:

```bash
ng generate component user-card
# Or shorthand:
ng g c user-card
```

This creates a folder with:

- `user-card.component.ts` — Component logic and metadata
- `user-card.component.html` — Template
- `user-card.component.scss` — Styles
- `user-card.component.spec.ts` — Unit tests

> In Angular 18+, the CLI generates standalone components by default. No module declaration is required.

### Generated Component (Angular 18+)

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  templateUrl: './user-card.component.html',
  styleUrl: './user-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: []  // Add pipes, directives, or components used in the template
})
export class UserCardComponent {}
```

**Key differences from legacy (pre-Angular 14):**

- `standalone: true` marks the component as self-contained (explicit in Angular 18, implicit from Angular 19+).
- No NgModule declaration needed — the component manages its own dependencies.
- `imports` array lives in the component itself — not in a module.
- `styleUrl` (singular) replaces the old `styleUrls` (array) for single stylesheet.
- `ChangeDetectionStrategy.OnPush` is the recommended default for all components.

### Useful CLI Flags

```bash
# Generate with inline template and styles
ng g c user-card --inline-template --inline-style

# Generate inside a specific folder
ng g c features/dashboard/widgets/stats-card

# Generate without test file
ng g c user-card --skip-tests

# Generate with a specific prefix
ng g c user-card --prefix=ui
```

---

## Selectors

The `selector` property defines the custom HTML tag for your component:

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-user-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>User Card works!</p>`
})
export class UserCardComponent {}
```

**Best practices for selectors:**

- Use a consistent prefix (e.g., `app-`, `ui-`, `shared-`) to avoid conflicts with native HTML elements.
- Use kebab-case (e.g., `app-user-card`).
- Tag selectors are the most common pattern.

Attribute and class selectors are also possible for specific use cases:

```ts
// Attribute selector
selector: '[appHighlight]'

// Class selector (rare)
selector: '.app-tooltip'
```

---

## Styling Components

### Style Encapsulation

Angular scopes styles to the component by default using `ViewEncapsulation.Emulated`:

```ts
import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="card">Content</div>`,
  styles: [`.card { border: 1px solid #ccc; padding: 16px; }`],
  encapsulation: ViewEncapsulation.Emulated // default
})
export class CardComponent {}
```

**Encapsulation options:**

| Mode | Behavior |
|------|----------|
| `Emulated` (default) | Scopes styles with unique attributes — styles don't leak out. |
| `ShadowDom` | Uses native Shadow DOM for strict browser-level isolation. |
| `None` | No encapsulation — styles become global. Use with caution. |

### External vs Inline Styles

```ts
// External — single file (Angular 17+)
@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'  // singular — one file
})
export class CardComponent {}

// Inline (for small, self-contained components)
@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge">{{ label() }}</span>`,
  styles: [`.badge { padding: 4px 8px; border-radius: 4px; }`]
})
export class BadgeComponent {
  label = input.required<string>();
}
```

> **Note:** `styleUrl` (singular) was introduced in Angular 17. The legacy `styleUrls: [...]` (array) is still supported but no longer generated by the CLI.

---

## References

- [How to Build Your Own Angular Components: From Beginner to Advanced](https://medium.com/@n.wocke/how-to-build-your-own-angular-components-from-beginner-to-advanced-974fa8784383) — Niklas Wockenfuß (2025)
- [Mastering Angular Components in 2025](https://medium.com/@gitesh08/mastering-angular-components-in-2025-01a8bdf4e0ce) — Gitesh Mahadik (2025)
- [Angular Official Documentation — Components](https://angular.dev/guide/components)
