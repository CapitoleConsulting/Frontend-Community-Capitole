---
title: Patterns & Pitfalls
description: Reloading data, race conditions, shareReplay leaks, subscription management and other real-world RxJS patterns in Angular.
sidebar.order: 2
---

## Pattern: reloading data on demand

The most common real requirement: *"refresh this list when the user clicks refresh, when the filters change, and after a successful save"*.

### The trigger subject pattern

```typescript
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  private readonly api = inject(OrdersApi);
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  readonly filters = signal<OrderFilters>(DEFAULT_FILTERS);

  /**
   * Emits the order list every time the filters change or a reload is
   * requested. Previous in-flight requests are cancelled.
   */
  readonly orders$ = combineLatest([
    toObservable(this.filters),
    this.reload$,
  ]).pipe(
    switchMap(([filters]) => this.api.list(filters)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  reload(): void {
    this.reload$.next();
  }
}
```

### The modern alternative: `rxResource`

```typescript
readonly ordersResource = rxResource({
  params: () => this.filters(),
  stream: ({ params }) => this.api.list(params),
});

// Template: ordersResource.value(), ordersResource.isLoading(), ordersResource.error()
// Reload:   ordersResource.reload()
```

Prefer `rxResource` for new code: it gives you loading and error state for free, cancels previous requests and integrates with signals.

---

## Pitfall: race conditions

**Symptom**
The user changes a filter quickly and the table shows the results of a previous filter.

**Cause**
`mergeMap` (or a manual `subscribe` inside another `subscribe`) lets a stale response arrive last.

```typescript
// ❌ Nested subscribe: no cancellation, impossible to unsubscribe properly
this.filters$.subscribe((filters) => {
  this.api.list(filters).subscribe((orders) => (this.orders = orders));
});

// ✅
this.filters$.pipe(
  switchMap((filters) => this.api.list(filters)),
).subscribe((orders) => this.orders.set(orders));
```

**Prevention**
Ban nested `subscribe` in code review. If you see `.subscribe(` twice in the same expression, it is a bug.

---

## Pitfall: `shareReplay` memory leaks

**Symptom**
Memory grows and a stream keeps running after every consumer unsubscribed. Polling continues in the background forever.

**Cause**
`shareReplay(1)` without `refCount` never unsubscribes from the source.

```typescript
// ❌ The interval runs forever, even with zero subscribers
readonly ticker$ = interval(1000).pipe(shareReplay(1));

// ✅ Unsubscribes from the source when the last subscriber leaves
readonly ticker$ = interval(1000).pipe(
  shareReplay({ bufferSize: 1, refCount: true }),
);
```

**When you actually want `refCount: false`**
Only for values that should be cached for the lifetime of the app, such as a configuration loaded once:

```typescript
readonly config$ = this.http.get<Config>('/api/config').pipe(
  shareReplay({ bufferSize: 1, refCount: false }),
);
```

Here the source completes, so nothing keeps running.

**Rule of thumb**
- Source **completes** (HTTP) → `refCount: false` is safe and useful as a cache.
- Source **never completes** (interval, websocket) → always `refCount: true`.

---

## Pattern: subscription management

### Best: never subscribe manually

```html
@if (orders$ | async; as orders) {
  <app-orders-table [orders]="orders" />
}
```

### Second best: `takeUntilDestroyed()`

```typescript
export class OrdersComponent {
  private readonly facade = inject(OrdersFacade);

  constructor() {
    this.facade.notifications$
      .pipe(takeUntilDestroyed())
      .subscribe((n) => this.toast.show(n));
  }
}
```

Outside the constructor you must pass the `DestroyRef` explicitly:

```typescript
private readonly destroyRef = inject(DestroyRef);

ngOnInit(): void {
  this.stream$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe();
}
```

### Legacy: `takeUntil` + subject

```typescript
private readonly destroy$ = new Subject<void>();

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

:::caution
With `takeUntil`, it must always be the **last** operator in the pipe. Any operator placed after it (especially `shareReplay`) can keep the subscription alive.
:::

---

## Pattern: loading and error state without boilerplate

```typescript
export interface AsyncState<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
}

/**
 * Lets templates render async data without separate loading flags.
 */
export function withAsyncState<T>(): OperatorFunction<T, AsyncState<T>> {
  return (source$) =>
    source$.pipe(
      map((data) => ({ data, loading: false, error: null })),
      startWith({ data: null, loading: true, error: null }),
      catchError((error: unknown) =>
        of({ data: null, loading: false, error: toMessage(error) }),
      ),
    );
}
```

Usage:

```typescript
readonly state$ = this.api.list(filters).pipe(withAsyncState());
```

---

## Pattern: polling that stops when the tab is hidden

```typescript
/**
 * Pausing while the tab is hidden avoids wasting requests and battery.
 */
export function pollWhileVisible<T>(
  factory: () => Observable<T>,
  intervalMs: number,
): Observable<T> {
  const visible$ = fromEvent(document, 'visibilitychange').pipe(
    map(() => document.visibilityState === 'visible'),
    startWith(document.visibilityState === 'visible'),
    distinctUntilChanged(),
  );

  return visible$.pipe(
    switchMap((visible) => (visible ? timer(0, intervalMs) : EMPTY)),
    switchMap(() => factory()),
  );
}
```

---

## Pitfall: cold vs hot observables

**Symptom**
The same HTTP request is executed once per subscriber. Three `async` pipes on the same `users$` produce three network calls.

**Cause**
`HttpClient` observables are **cold**: each subscription re-executes the request.

**Fix**

```typescript
// ✅ Share a single execution
readonly users$ = this.http.get<User[]>('/api/users').pipe(
  shareReplay({ bufferSize: 1, refCount: true }),
);
```

Or subscribe once with `toSignal()` and read the signal everywhere.

---

## Pitfall: `BehaviorSubject` as a state container

It works, but signals are now strictly better for synchronous state:

```typescript
// ❌ Verbose, no type-safe derivation, easy to expose the subject by accident
private readonly countSubject = new BehaviorSubject(0);
readonly count$ = this.countSubject.asObservable();

// ✅
private readonly _count = signal(0);
readonly count = this._count.asReadonly();
readonly doubled = computed(() => this._count() * 2);
```

Keep `Subject` for **events** (a click, a notification), not for **state**.

---

## Testing observables

```typescript
it('should cancel the previous search when a new term arrives', fakeAsync(() => {
  const results: string[][] = [];
  service.search$.subscribe((r) => results.push(r));

  service.setTerm('ang');
  tick(100);
  service.setTerm('angular');
  tick(300);

  httpMock.expectOne('/api/search?q=angular').flush(['Angular']);
  expect(results.at(-1)).toEqual(['Angular']);
}));
```

For complex timing, use the `TestScheduler` marble syntax:

```typescript
const scheduler = new TestScheduler((actual, expected) =>
  expect(actual).toEqual(expected),
);

scheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('a-b-c|');
  expectObservable(source$.pipe(debounceTime(2, scheduler)))
    .toBe('-----c|');
});
```

---

## Review checklist

- [ ] No nested `subscribe`.
- [ ] Every manual `subscribe` has `takeUntilDestroyed()` or an `async` pipe.
- [ ] `catchError` is inside the inner observable of `switchMap`.
- [ ] `shareReplay` uses `refCount: true` for non-completing sources.
- [ ] `switchMap` is never used for write operations.
- [ ] `mergeMap` declares a concurrency limit.
- [ ] `combineLatest` sources all emit an initial value.
- [ ] `forkJoin` handles partial failures.

---

## Related

- [Operators reference](/angular/rxjs/operators-reference/)
- [RxJS interop with signals](/angular/rxjs/rxjs-interop/)
- [Preventing memory leaks](/angular/utilities/memory-leaks/)
