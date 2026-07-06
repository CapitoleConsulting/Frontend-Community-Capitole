---
title: Templates & Control Flow
description: Angular 18+ built-in control flow syntax — @if, @for, and @switch replacing structural directives.
sidebar:
  order: 3
---

## Templates and Control Flow (Angular 18+)

Angular 18 introduced **built-in control flow** syntax that replaces structural directives. This is now the only recommended approach — the legacy `*ngIf`, `*ngFor`, and `*ngSwitch` directives are deprecated.

---

## Conditional Rendering with `@if`

```html
@if (user()) {
  <app-user-card [name]="user().name" />
} @else {
  <p>No user found.</p>
}
```

Multiple conditions:

```html
@if (items().length > 10) {
  <p>Showing first 10 results.</p>
} @else if (items().length > 0) {
  <p>{{ items().length }} results found.</p>
} @else {
  <p>No results.</p>
}
```

---

## Iteration with `@for`

```html
@for (user of users(); track user.id) {
  <app-user-card [name]="user.name" [email]="user.email" />
} @empty {
  <p>No users available.</p>
}
```

**Important:** The `track` expression is **required**. It helps Angular efficiently identify and update items in the list.

Common track patterns:

```html
<!-- Track by unique identifier (preferred) -->
@for (item of items(); track item.id) { ... }

<!-- Track by index (when no unique ID exists) -->
@for (item of items(); track $index) { ... }

<!-- Track by the item itself (for primitives) -->
@for (name of names(); track name) { ... }
```

Available implicit variables inside `@for`:

| Variable | Description |
|----------|-------------|
| `$index` | Current index (0-based) |
| `$first` | `true` if this is the first item |
| `$last` | `true` if this is the last item |
| `$even` | `true` if the index is even |
| `$odd` | `true` if the index is odd |
| `$count` | Total number of items in the collection |

Example using implicit variables:

```html
@for (user of users(); track user.id) {
  <div [class.first]="$first" [class.last]="$last">
    <span>{{ $index + 1 }}.</span> {{ user.name }}
  </div>
} @empty {
  <p>No users to display.</p>
}
```

---

## Switch with `@switch`

```html
@switch (user().role) {
  @case ('admin') {
    <app-admin-badge />
  }
  @case ('editor') {
    <app-editor-badge />
  }
  @default {
    <app-user-badge />
  }
}
```

---

## Comparison with Legacy Syntax

| Legacy Directive | Modern Syntax |
|-----------------|---------------|
| `*ngIf="condition"` | `@if (condition) { ... }` |
| `*ngIf="condition; else elseRef"` | `@if (condition) { ... } @else { ... }` |
| `*ngFor="let item of items; trackBy: trackFn"` | `@for (item of items; track item.id) { ... }` |
| `[ngSwitch]="value"` / `*ngSwitchCase` | `@switch (value) { @case (...) { ... } }` |

---

## References

- [Mastering Angular Components in 2025](https://medium.com/@gitesh08/mastering-angular-components-in-2025-01a8bdf4e0ce) — Gitesh Mahadik (2025)
- [Angular Official Documentation — Control Flow](https://angular.dev/guide/templates/control-flow)
