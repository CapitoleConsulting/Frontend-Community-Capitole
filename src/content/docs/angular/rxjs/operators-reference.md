---
title: Operators Reference
description: switchMap vs mergeMap vs concatMap vs exhaustMap, combination operators and error handling, with real Angular use cases.
sidebar.order: 1
---

## The flattening operators

This is the decision that causes the most production bugs in Angular applications. All four take an inner observable; the difference is what they do when a **new** value arrives while a previous inner observable is still running.

| Operator | On a new value | Use when |
| --- | --- | --- |
| `switchMap` | **Cancels** the previous | Only the latest result matters |
| `mergeMap` | Runs **in parallel** | Order is irrelevant, all must complete |
| `concatMap` | **Queues** it | Order matters, all must complete |
| `exhaustMap` | **Ignores** it until the current finishes | Prevent duplicate submissions |

### Visual model

Source emits `A`, then `B` before `A`'s request finishes:

```
switchMap   A──✗(cancelled)   B─────►result(B)
mergeMap    A─────►result(A)  B───►result(B)   // order not guaranteed
concatMap   A─────►result(A)  then B─────►result(B)
exhaustMap  A─────►result(A)  B ignored
```

---

### `switchMap` — search, filters, route params

The default choice for anything driven by user input where only the latest value is relevant.

```typescript
readonly results$ = this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((term) => this.api.search(term)),
);
```

Without `switchMap` you get a classic race condition: the user types `ang`, then `angular`; if the `ang` response is slower, it arrives last and overwrites the correct results.

:::danger
Never use `switchMap` for write operations (`POST`, `PUT`, `DELETE`). Cancelling an HTTP request does not cancel the work already started on the server, leaving inconsistent state.
:::

Also ideal for route parameters:

```typescript
readonly product$ = this.route.paramMap.pipe(
  map((params) => params.get('id')!),
  switchMap((id) => this.api.getProduct(id)),
);
```

---

### `concatMap` — ordered writes

Use it when every emission must be processed, in order.

```typescript
readonly saveOrder$ = this.reorder$.pipe(
  concatMap((positions) => this.api.savePositions(positions)),
);
```

:::caution
`concatMap` builds an unbounded queue. If the source emits faster than the inner observable completes, memory grows indefinitely. Add `debounceTime` or `throttleTime` upstream.
:::

---

### `mergeMap` — independent parallel work

```typescript
// Max 3 concurrent uploads
readonly uploads$ = from(files).pipe(
  mergeMap((file) => this.api.upload(file), 3),
);
```

The second argument is the concurrency limit — use it. Unlimited `mergeMap` over a large source will open hundreds of connections.

---

### `exhaustMap` — the anti double-click operator

```typescript
readonly login$ = this.submit$.pipe(
  exhaustMap(() => this.auth.login(this.form.getRawValue())),
);
```

This removes the need for a `isSubmitting` boolean flag in most forms.

---

## Combination operators

### `combineLatest` — "when any of these change"

```typescript
readonly filteredUsers$ = combineLatest([
  this.users$,
  this.searchTerm$.pipe(startWith('')),
  this.onlyActive$.pipe(startWith(false)),
]).pipe(
  map(([users, term, onlyActive]) => filterUsers(users, term, onlyActive)),
);
```

:::caution
`combineLatest` emits nothing until **every** source has emitted at least once. A single silent source blocks the whole stream. Add `startWith()` to sources that may not emit immediately.
:::

In modern Angular, when all sources are synchronous state, `computed()` is simpler and cheaper:

```typescript
readonly filteredUsers = computed(() =>
  filterUsers(this.users(), this.searchTerm(), this.onlyActive()),
);
```

### `forkJoin` — "wait for all to finish"

```typescript
readonly pageData$ = forkJoin({
  user: this.api.getUser(id),
  orders: this.api.getOrders(id),
  preferences: this.api.getPreferences(id),
});
```

:::danger
`forkJoin` emits only when **all** sources complete, and errors if **any** of them errors. Always add a per-source `catchError` if partial data is acceptable.
:::

```typescript
forkJoin({
  user: this.api.getUser(id),
  orders: this.api.getOrders(id).pipe(catchError(() => of([]))),
});
```

### `withLatestFrom` — "when A changes, read the current B"

```typescript
readonly save$ = this.saveClick$.pipe(
  withLatestFrom(this.filters$),
  switchMap(([, filters]) => this.api.saveView(filters)),
);
```

The difference with `combineLatest` is crucial: only the **first** source triggers the emission.

### `merge` — several triggers, one handler

```typescript
readonly refresh$ = merge(
  this.manualRefresh$,
  this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
  interval(60_000),
);
```

---

## Filtering and rate-limiting

| Operator | Behaviour |
| --- | --- |
| `debounceTime(300)` | Emits after 300 ms of silence — user typing |
| `throttleTime(300)` | Emits at most once per 300 ms — scroll, resize |
| `auditTime(300)` | Emits the **last** value of each window — smoother than throttle |
| `distinctUntilChanged()` | Skips consecutive duplicates |
| `filter(Boolean)` | Removes null/undefined (use with a type guard) |

Type-safe null filtering:

```typescript
import { filter, OperatorFunction } from 'rxjs';

export function isNotNull<T>(): OperatorFunction<T | null | undefined, T> {
  return filter((value): value is T => value !== null && value !== undefined);
}
```

---

## Error handling

### `catchError` — position matters

```typescript
// ❌ The error kills the outer stream: valueChanges stops working forever
this.searchControl.valueChanges.pipe(
  switchMap((term) => this.api.search(term)),
  catchError(() => of([])),
);

// ✅ The error is contained inside the inner observable
this.searchControl.valueChanges.pipe(
  switchMap((term) =>
    this.api.search(term).pipe(catchError(() => of([]))),
  ),
);
```

This is the number one RxJS bug in Angular applications: a single failed request silently disables a search box for the rest of the session.

### `retry` with exponential backoff

```typescript
this.api.getData().pipe(
  retry({
    count: 3,
    delay: (error, retryCount) => {
      if (error.status < 500) {
        throw error; // do not retry client errors
      }
      return timer(Math.pow(2, retryCount) * 1000);
    },
  }),
);
```

### `finalize` — cleanup that always runs

```typescript
this.loading.set(true);

this.api.save(data).pipe(
  finalize(() => this.loading.set(false)),
).subscribe();
```

`finalize` runs on complete, error **and** unsubscription — unlike putting the cleanup in both `next` and `error`.

---

## Quick decision flowchart

```
Do I need the previous request's result?
├─ No, only the latest matters ............ switchMap
└─ Yes
   ├─ Order matters ....................... concatMap
   ├─ Order does not matter ............... mergeMap (with concurrency)
   └─ Ignore new while busy ............... exhaustMap
```

```
Am I combining values?
├─ React to any change ................... combineLatest (or computed)
├─ Wait for all to complete once ......... forkJoin
├─ React to one, read the others .......... withLatestFrom
└─ Many triggers, one output ............. merge
```

---

## Related

- [RxJS patterns & pitfalls](/angular/rxjs/patterns/)
- [RxJS interop with signals](/angular/rxjs/rxjs-interop/)
