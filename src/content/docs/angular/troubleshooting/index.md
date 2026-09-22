---
title: Troubleshooting
description: Index of the most common Angular errors with symptom, cause, diagnosis, fix and prevention.
sidebar.order: 0
---

## How to use this section

Every entry follows the same structure so you can scan it quickly during an incident:

1. **Symptom** — the exact message or observable behaviour.
2. **Cause** — what Angular is actually complaining about.
3. **Diagnosis** — how to confirm it in your own code.
4. **Fix** — the concrete change.
5. **Prevention** — how to stop it from coming back.

---

## Quick error index

| Code | Message | Page |
| --- | --- | --- |
| `NG0100` | ExpressionChangedAfterItHasBeenCheckedError | [Runtime errors](/angular/troubleshooting/runtime-errors/) |
| `NG0200` | Circular dependency in DI | [DI errors](/angular/troubleshooting/di-errors/) |
| `NG0201` | No provider for X | [DI errors](/angular/troubleshooting/di-errors/) |
| `NG0203` | `inject()` must be called from an injection context | [DI errors](/angular/troubleshooting/di-errors/) |
| `NG0301` | Export not found | [Runtime errors](/angular/troubleshooting/runtime-errors/) |
| `NG0500`–`NG0505` | Hydration mismatch | [SSR common issues](/angular/ssr/common-issues/) |
| `NG0750` | `@defer` requires standalone dependencies | [Runtime errors](/angular/troubleshooting/runtime-errors/) |
| `NG0912` | Component ID generation collision | [Build & tooling](/angular/troubleshooting/build-and-tooling/) |
| `NG0955` | Duplicate keys in `@for` track | [Runtime errors](/angular/troubleshooting/runtime-errors/) |
| `NG0956` | Tracking expression caused re-creation of the entire collection | [Runtime errors](/angular/troubleshooting/runtime-errors/) |
| `NG02200` | Cannot find a differ | [Runtime errors](/angular/troubleshooting/runtime-errors/) |
| `NG04002` | Cannot match any routes | [Runtime errors](/angular/troubleshooting/runtime-errors/) |
| `NG05104` | Root element was not found | [Build & tooling](/angular/troubleshooting/build-and-tooling/) |

---

## Symptom index (no error code)

| What you observe | Likely area |
| --- | --- |
| The view does not update after data changes | [Change detection](/angular/troubleshooting/change-detection-issues/) |
| The app becomes slower the longer it runs | [Memory leaks](/angular/utilities/memory-leaks/) |
| The list re-renders completely on every update | [Runtime errors](/angular/troubleshooting/runtime-errors/) — `track` |
| API calls fire twice | [SSR common issues](/angular/ssr/common-issues/) |
| A stale HTTP response overwrites a newer one | [RxJS patterns](/angular/rxjs/patterns/) |
| Build succeeds locally but fails in CI | [Build & tooling](/angular/troubleshooting/build-and-tooling/) |
| Bundle size exploded after a small change | [Build & tooling](/angular/troubleshooting/build-and-tooling/) |

---

## General debugging toolkit

### Enable detailed errors in development

Angular error codes link to `angular.dev/errors/NGxxxx`. Always read that page first — it is short and precise.

### Angular DevTools

The browser extension gives you:
- **Component tree** with current inputs, outputs and signal values.
- **Profiler** showing which component triggered each change detection cycle and how long it took.
- **Injector tree**, invaluable for `NG0201` and `NG0200`.

### Runtime introspection from the console

```javascript
// Select a DOM node in the Elements panel, then:
ng.getComponent($0);          // Component instance
ng.getContext($0);            // Template context (e.g. @for item)
ng.getOwningComponent($0);    // Parent component
ng.applyChanges(ng.getComponent($0)); // Force change detection
```

### Narrow the surface

When the cause is unclear, bisect:

1. Comment out half of the template.
2. Replace real data with a hardcoded literal.
3. Remove `OnPush` temporarily — if the problem disappears, it is a change detection issue.
4. Remove `provideClientHydration()` temporarily — if it disappears, it is a hydration issue.

---

## Pages in this section

- [Runtime errors](/angular/troubleshooting/runtime-errors/)
- [Dependency Injection errors](/angular/troubleshooting/di-errors/)
- [Change detection issues](/angular/troubleshooting/change-detection-issues/)
- [Build & tooling issues](/angular/troubleshooting/build-and-tooling/)
