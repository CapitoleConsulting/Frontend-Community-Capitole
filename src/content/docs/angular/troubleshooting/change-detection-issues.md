---
title: Change Detection Issues
description: The view does not update, OnPush pitfalls, zoneless migration problems and performance diagnosis.
sidebar.order: 3
---

## "The view does not update"

This is the single most reported Angular problem. Work through the causes in this order.

### Cause 1 — Mutating instead of replacing (with `OnPush`)

**Symptom**
You push into an array or set a property and nothing changes on screen.

```typescript
// ❌ Same reference → OnPush sees no change
addItem(item: Item): void {
  this.items.push(item);
}
```

**Fix**

```typescript
// ✅ New reference
addItem(item: Item): void {
  this.items = [...this.items, item];
}

// ✅ Better: signals
readonly items = signal<Item[]>([]);
addItem(item: Item): void {
  this.items.update((current) => [...current, item]);
}
```

**Prevention**
Type your state as `readonly Item[]` and `Readonly<T>` so the compiler rejects mutations.

---

### Cause 2 — The update happens outside Angular's knowledge

**Symptom**
Data arrives from a WebSocket, a third-party SDK, `setTimeout` inside a library, or a browser event registered outside Angular. Nothing re-renders.

**Diagnosis**
Clicking anywhere on the page makes the value appear — that confirms change detection was simply not triggered.

**Fix (modern)** — write to a signal. Signals notify Angular regardless of zones:

```typescript
export class TickerComponent {
  readonly price = signal(0);

  constructor() {
    afterNextRender(() => {
      socket.on('price', (value: number) => this.price.set(value));
    });
  }
}
```

**Fix (legacy, Zone.js only)**

```typescript
private readonly zone = inject(NgZone);

socket.on('price', (value) => {
  this.zone.run(() => (this.price = value));
});
```

**Prevention**
Any integration boundary (SDK, socket, worker) should write into signals, never into plain fields.

---

### Cause 3 — `OnPush` parent blocking a child

**Symptom**
The child has its own state but only refreshes when you interact with it.

**Cause**
With `OnPush`, a component is checked only when: an input reference changes, an event fires inside it, an `async` pipe emits, a signal it reads changes, or it is marked dirty.

**Fix**

```typescript
private readonly cdr = inject(ChangeDetectorRef);
this.cdr.markForCheck(); // marks this component and its ancestors dirty
```

:::caution
`markForCheck()` schedules a check; `detectChanges()` runs one synchronously. Using `detectChanges()` in a loop or in `afterRender` is a common performance killer.
:::

**Prevention**
Prefer signals over `markForCheck()`. A signal read in a template marks the component automatically.

---

### Cause 4 — Reading a signal outside the template

```typescript
// ❌ Reads the value once, never reacts
readonly total = this.cart().length;

// ✅ Reactive
readonly total = computed(() => this.cart().length);
```

---

## `async` pipe vs manual subscription

**Symptom**
Data loads but the view only updates on the first emission, or the component leaks.

**Cause**
`.subscribe()` with a field assignment does not mark an `OnPush` component dirty.

**Fix**

```html
<!-- ✅ The async pipe calls markForCheck() for you and unsubscribes -->
@if (user$ | async; as user) {
  <app-user-card [user]="user" />
}
```

Or convert to a signal:

```typescript
readonly user = toSignal(this.userService.user$, { initialValue: null });
```

See [RxJS interop](/angular/rxjs/rxjs-interop/).

---

## Zoneless migration issues

### Symptom: everything stops updating after removing Zone.js

**Cause**
Zoneless mode only triggers change detection on: signal writes, template event listeners, `markForCheck()`, `async` pipe emissions and router navigation. Plain field mutations no longer work.

**Diagnosis**
Enable zoneless gradually with the hybrid scheduler first:

```typescript
provideZoneChangeDetection({ eventCoalescing: true })
```

Then move to:

```typescript
provideZonelessChangeDetection()
```

**Fix checklist**

- [ ] All component state is expressed with signals.
- [ ] No `setTimeout`/`setInterval` mutating fields directly.
- [ ] Third-party callbacks write to signals.
- [ ] All templates use `async` pipe or signals, never raw fields updated in `subscribe`.
- [ ] Tests use `await fixture.whenStable()` instead of `fixture.detectChanges()` where possible.
- [ ] `NgZone.onStable` / `NgZone.isStable` usages removed.

**Prevention**
Write new code as if zoneless were already enabled, even if it is not. It costs nothing and makes the migration a configuration change.

---

## Performance: too many change detection cycles

**Symptom**
The Angular DevTools Profiler shows hundreds of cycles per second or very long bars.

**Common causes**

| Cause | Fix |
| --- | --- |
| Method calls in templates | Replace with `computed()` |
| Pipes that are not `pure` | Make them pure or precompute |
| `mousemove` / `scroll` listeners | `@HostListener` with throttling, or run outside Angular |
| Missing `OnPush` | Enable it everywhere |
| Large `@for` without `track` | Add a stable `track` |
| `afterRender` doing layout reads | Move to `afterNextRender` |

Running noisy listeners outside Angular:

```typescript
private readonly zone = inject(NgZone);

constructor() {
  afterNextRender(() => {
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    });
  });
}
```

---

## Diagnosing with the Profiler

1. Open Angular DevTools → **Profiler** → Record.
2. Reproduce the interaction.
3. Look at the flame chart:
   - **Wide bars** → an expensive component. Check for getters and heavy pipes.
   - **Many bars** → too many triggers. Check event listeners and timers.
   - **Bars for components that should not change** → missing `OnPush`.
4. Click a bar to see *why* the component was checked.

---

## Related

- [Change detection strategy](/angular/guidelines/change-detection-strategy/)
- [Signals and reactivity](/angular/components/signals-and-reactivity/)
- [Performance optimization](/angular/guidelines/performance-optimization/)
