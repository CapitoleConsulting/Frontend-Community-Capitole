---
title: Runtime Errors
description: NG0100, NG0955, NG0956, NG04002 and other common Angular runtime errors explained with fixes.
sidebar.order: 1
---

## NG0100 — ExpressionChangedAfterItHasBeenCheckedError

**Symptom**
```
NG0100: ExpressionChangedAfterItHasBeenCheckedError:
Expression has changed after it was checked.
Previous value: 'false'. Current value: 'true'.
```
Only appears in development mode.

**Cause**
Angular runs a second verification pass in dev mode. If a binding produces a different value in that second pass, the template and the model are out of sync. Typical triggers:

- A child component mutates a parent property in `ngOnInit` / `ngAfterViewInit`.
- A getter in the template returns a new object or a computed value with side effects.
- A shared service is updated during the rendering phase.

**Diagnosis**
The error message shows the previous and current values. Search the template for that binding. If the value is produced by a getter, that getter is almost always the culprit.

**Fix 1 — Move the mutation out of the render phase**

```typescript
// ❌ Mutates the parent while the parent is being checked
ngAfterViewInit(): void {
  this.parent.isLoading = false;
}

// ✅ Defer to the next microtask / render
constructor() {
  afterNextRender(() => this.parent.isLoading = false);
}
```

**Fix 2 — Replace getters with signals**

```typescript
// ❌ New array on every check → always "changed"
get visibleItems(): Item[] {
  return this.items.filter(i => i.visible);
}

// ✅ Memoised, stable reference
readonly visibleItems = computed(() => this.items().filter(i => i.visible));
```

**Fix 3 — Last resort**

```typescript
private readonly cdr = inject(ChangeDetectorRef);
this.cdr.detectChanges();
```

:::caution
`detectChanges()` hides the symptom without fixing the design. Use it only when integrating with third-party code you cannot restructure, and document why.
:::

**Prevention**
- Never call methods or getters that allocate in templates — use `computed()`.
- Treat inputs as read-only; communicate upwards with outputs.

---

## NG0955 — Duplicate keys in `@for` track

**Symptom**
```
NG0955: The provided track expression resulted in duplicated keys
for a given collection.
```

**Cause**
`track` must return a **unique and stable** value per item. Duplicates make Angular unable to map DOM nodes to items.

**Diagnosis**
```typescript
const keys = items.map(i => i.id);
console.assert(new Set(keys).size === keys.length, 'duplicate track keys');
```

**Fix**

```html
<!-- ❌ $index is not stable when the list is sorted or filtered -->
@for (item of items(); track $index) { ... }

<!-- ❌ Not unique if the same product appears twice in a cart -->
@for (line of cart(); track line.productId) { ... }

<!-- ✅ Unique per row -->
@for (line of cart(); track line.lineId) { ... }
```

If the data has no natural id, compose one:

```html
@for (row of rows(); track row.userId + '-' + row.date) { ... }
```

**Prevention**
Make ids part of the DTO contract. Only fall back to `$index` for static lists that never reorder.

---

## NG0956 — Tracking expression caused re-creation of the entire collection

**Symptom**
The whole list flashes / loses scroll position and focus on every refresh, plus a console warning.

**Cause**
`track` returns a value that changes on every emission — typically the object reference itself when the API response is re-mapped.

**Fix**

```html
<!-- ❌ New object references on every HTTP response -->
@for (user of users(); track user) { ... }

<!-- ✅ Stable primitive -->
@for (user of users(); track user.id) { ... }
```

**Prevention**
Never track by object reference unless the objects are genuinely immutable and reused.

---

## NG0301 — Export not found

**Symptom**
```
NG0301: Export of name 'ngModel' not found!
```

**Cause**
You used a template reference to a directive export (`#ref="ngModel"`, `#f="ngForm"`, `#tooltip="matTooltip"`) without importing the directive in the standalone component.

**Fix**

```typescript
@Component({
  imports: [FormsModule], // provides ngModel / ngForm
})
```

**Prevention**
In standalone components, every directive used in the template must appear in `imports`. Rely on the Angular Language Service quick-fix.

---

## NG0750 — `@defer` requires standalone dependencies

**Symptom**
```
NG0750: @defer block requires all dependencies to be standalone.
```

**Cause**
A component used inside a `@defer` block is declared in an `NgModule` instead of being standalone. Deferred blocks can only lazy-load standalone artefacts.

**Fix**
Convert the component to standalone:

```bash
ng generate @angular/core:standalone
```

**Prevention**
New code should always be standalone. Track remaining `NgModule` declarations as technical debt.

---

## NG02200 — Cannot find a differ

**Symptom**
```
NG02200: Cannot find a differ supporting object '[object Object]' of type 'object'.
NgFor only supports binding to Iterables such as Arrays.
```

**Cause**
You bound an object, `null`, `undefined` or a `Map` where an array was expected.

**Fix**

```html
<!-- ✅ Guard against null while loading -->
@for (item of items() ?? []; track item.id) { ... }

<!-- ✅ Iterate an object explicitly -->
@for (entry of dictionary() | keyvalue; track entry.key) { ... }
```

**Prevention**
Initialise collection signals with `signal<Item[]>([])`, never with `undefined`.

---

## NG04002 — Cannot match any routes

**Symptom**
```
NG04002: Cannot match any routes. URL Segment: 'products/42'
```

**Cause (in order of likelihood)**
1. The route is declared in a lazy `Routes` array that is never loaded.
2. Route order — a `**` or a broader path matches first.
3. A missing leading/trailing segment after a redirect.
4. A `canMatch` guard rejected every candidate silently.

**Diagnosis**
Enable router tracing:

```typescript
provideRouter(routes, withDebugTracing())
```

**Fix**
- Put specific routes before generic ones; `{ path: '**' }` must always be last.
- Check `redirectTo` uses `pathMatch: 'full'` when redirecting from `''`.

**Prevention**
Add a routing smoke test that navigates to every top-level route and asserts no `NavigationError`.

---

## Infinite change detection loop

**Symptom**
The tab freezes; the Profiler shows endless change detection cycles; in zoneless mode you may see `ASSERTION ERROR: Infinite loop`.

**Cause**
An `effect()` writes to a signal that it also reads, directly or through a chain.

```typescript
// ❌ Reads and writes the same signal
effect(() => {
  this.count.set(this.count() + 1);
});
```

**Fix**
Use `computed()` for derived state. Reserve `effect()` for genuine side effects (logging, DOM, storage) and never write signals that the effect reads.

```typescript
readonly doubled = computed(() => this.count() * 2);
```

If you truly need to write, isolate the read:

```typescript
effect(() => {
  const value = this.source();
  untracked(() => this.target.set(transform(value)));
});
```

**Prevention**
Treat `effect()` as a code smell in business logic. See [Signals and reactivity](/angular/components/signals-and-reactivity/).

---

## Related

- [Troubleshooting index](/angular/troubleshooting/)
- [DI errors](/angular/troubleshooting/di-errors/)
- [Change detection issues](/angular/troubleshooting/change-detection-issues/)
