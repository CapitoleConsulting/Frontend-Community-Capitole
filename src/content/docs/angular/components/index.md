---
title: Components
description: Complete guide to Angular components — from fundamentals to advanced patterns using modern Angular 18+ syntax.
---

## Overview

Components are the fundamental building blocks of Angular applications. Each component encapsulates its own template, logic, and styles into a self-contained, reusable unit. This section covers everything from basic component creation to advanced patterns in Angular 18+.

---

## Available Pages

- [**Fundamentals**](fundamentals/) — Anatomy of a component, creating with CLI, selectors, and styling
- [**Inputs, Outputs & Two-Way Binding**](inputs-outputs/) — Signal inputs, function-based outputs, and model inputs
- [**Templates & Control Flow**](templates-and-control-flow/) — Built-in `@if`, `@for`, `@switch` syntax
- [**Lifecycle Hooks**](lifecycle-hooks/) — `ngOnInit`, `ngOnDestroy`, `DestroyRef`, `afterNextRender`
- [**Content Projection**](content-projection/) — Single-slot and multi-slot `<ng-content />` patterns
- [**Dynamic Components**](dynamic-components/) — `ViewContainerRef`, `NgComponentOutlet`, lazy-loading, CDK Portals
- [**Signals & Reactivity**](signals-and-reactivity/) — Signals, computed, effects, view queries, and OnPush
- [**Standalone vs NgModules**](standalone-vs-modules/) — Architecture comparison, migration, and interoperability
- [**Angular 20 Features**](angular-20-features/) — New APIs, advantages, disadvantages, and adoption guide

---

## Quick Summary — Legacy vs Modern Syntax

| Feature | Legacy Syntax | Modern Syntax (Angular 18+) |
|---------|---------------|----------------------------|
| Inputs | `@Input() name: string` | `name = input<string>()` |
| Required inputs | `@Input({ required: true })` | `name = input.required<string>()` |
| Outputs | `@Output() event = new EventEmitter()` | `event = output<T>()` |
| Two-way binding | `@Input()` + `@Output()` pair | `value = model<T>()` |
| View queries | `@ViewChild()` / `@ViewChildren()` | `viewChild()` / `viewChildren()` |
| Content queries | `@ContentChild()` / `@ContentChildren()` | `contentChild()` / `contentChildren()` |
| Conditionals | `*ngIf` | `@if` |
| Loops | `*ngFor` | `@for (item of items; track item.id)` |
| Switch | `[ngSwitch]` | `@switch` |
| Standalone | `standalone: true` | Default (flag not needed) |
| Bootstrapping | `bootstrapModule(AppModule)` | `bootstrapApplication(AppComponent, appConfig)` |
| Lazy loading | `loadChildren: () => Module` | `loadComponent: () => Component` |
| Async data | Manual HTTP + subscribe | `resource()` / `rxResource()` |
| Zone | `zone.js` (implicit) | Zoneless with `provideExperimentalZonelessChangeDetection()` |

---

## Best Practices

1. **Keep components focused** — Each component should have a single responsibility.
2. **Use signal inputs/outputs** — Prefer `input()`, `output()`, and `model()` over decorators.
3. **Always use `OnPush`** — Better performance and predictable change detection.
4. **Use descriptive selectors** — Prefer `app-user-card` over `app-uc`.
5. **Prefer external templates and styles** — Better maintainability for larger components.
6. **Clean up resources** — Use `DestroyRef` or `ngOnDestroy` to free subscriptions/timers.
7. **Leverage the CLI** — Always use `ng generate component` for consistent file structure.
8. **Use `track` in `@for` loops** — Always provide a tracking expression for performance.
9. **Test dynamic components** — Verify dynamically loaded components render correctly.
10. **Use content projection** — Build flexible, reusable container components.

---

## References

- [How to Build Your Own Angular Components: From Beginner to Advanced](https://medium.com/@n.wocke/how-to-build-your-own-angular-components-from-beginner-to-advanced-974fa8784383)
- [Mastering Angular Components in 2025](https://medium.com/@gitesh08/mastering-angular-components-in-2025-01a8bdf4e0ce)
- [How to Create Components Dynamically in Angular — 2026 Guide](https://acharyaks90.medium.com/how-to-create-components-dynamically-in-angular-2026-guide-975745090eef)
- [Angular Standalone Components vs Modules](https://medium.com/@jaouadirabeb/angular-standalone-components-vs-modules-851fc2819b03)
- [Angular Standalone Components: Simplifying Modern Angular Development](https://medium.com/@mayurchakalasiya1990/angular-standalone-components-simplifying-modern-angular-development-b65c87ae81ec)
- [The Power of Standalone Components and Signals in Angular 20](https://medium.com/@antonyandrus/the-power-of-standalone-components-and-signals-in-angular-20-c2fa6c5dca3d)
- [Angular Official Documentation — Components](https://angular.dev/guide/components)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular Migration to Standalone](https://angular.dev/reference/migrations/standalone)
