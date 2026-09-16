---
title: RxJS Interop with Signals
description: toSignal, toObservable, rxResource and the migration strategy between RxJS and signals in Angular.
sidebar.order: 3
---

## The bridge

`@angular/core/rxjs-interop` provides the four APIs that connect both worlds:

| API | Direction | Purpose |
| --- | --- | --- |
| `toSignal()` | Observable → Signal | Consume a stream as state |
| `toObservable()` | Signal → Observable | Feed a signal into an RxJS pipeline |
| `takeUntilDestroyed()` | — | Automatic unsubscription |
| `rxResource()` | Observable → Resource | Async data with loading/error state |

---

## `toSignal()`

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

export class UserComponent {
  private readonly api = inject(UserApi);

  readonly user = toSignal(this.api.currentUser$, { initialValue: null });
  readonly displayName = computed(() => this.user()?.name ?? 'Guest');
}
```

### The three initialisation modes

```typescript
// 1. Explicit initial value — the signal type is User | null
toSignal(source$, { initialValue: null });

// 2. Undefined until the first emission — type is User | undefined
toSignal(source$);

// 3. Requires a synchronous first emission — type is User
//    Throws at runtime if the source does not emit immediately
toSignal(source$, { requireSync: true });
```

:::caution
`requireSync: true` only works with sources that emit synchronously on subscription (`BehaviorSubject`, `of`, `startWith`). Using it with an `HttpClient` observable throws `NG0601`.
:::

### Error handling

By default, a source error is **rethrown** the next time the signal is read, which usually crashes the template. Handle errors in the pipeline:

```typescript
readonly user = toSignal(
  this.api.currentUser$.pipe(catchError(() => of(null))),
  { initialValue: null },
);
```

### Subscription lifetime

`toSignal()` subscribes immediately and unsubscribes when the injection context is destroyed. That means:

- Called in a field initializer of a component → tied to the component.
- Called in a `providedIn: 'root'` service → **lives for the whole app**.

```typescript
// Outside an injection context you must pass an injector
toSignal(source$, { injector: this.injector, initialValue: null });
```

---

## `toObservable()`

Converts a signal into an observable so you can apply time-based operators.

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

export class SearchComponent {
  readonly term = signal('');

  readonly results = toSignal(
    toObservable(this.term).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((t) => t.length >= 2),
      switchMap((t) => this.api.search(t).pipe(catchError(() => of([])))),
    ),
    { initialValue: [] },
  );
}
```

This is the canonical typeahead in modern Angular: signal in, signal out, RxJS only for the timing in between.

:::caution
`toObservable()` uses an `effect()` internally, so it emits on the **next** change detection cycle, not synchronously. Do not rely on it for immediate reads; it also means intermediate values can be coalesced.
:::

---

## `rxResource()` — the recommended default for data fetching

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

export class ProductListComponent {
  private readonly api = inject(ProductApi);

  readonly categoryId = signal<string | undefined>(undefined);

  readonly products = rxResource({
    params: () => {
      const id = this.categoryId();
      return id ? { id } : undefined; // undefined ⇒ request is skipped
    },
    stream: ({ params }) => this.api.listByCategory(params.id),
  });
}
```

Template:

```html
@if (products.isLoading()) {
  <app-spinner />
} @else if (products.error(); as error) {
  <app-error [error]="error" (retry)="products.reload()" />
} @else {
  @for (product of products.value() ?? []; track product.id) {
    <app-product-card [product]="product" />
  }
}
```

### What you get for free

- Automatic request cancellation when `params` change.
- `isLoading()`, `error()`, `value()`, `status()` as signals.
- `reload()` to refetch.
- `set()` / `update()` for optimistic local updates.
- Skipping the request when `params` returns `undefined`.

### `httpResource()` for the simple case

```typescript
readonly user = httpResource<User>(() => `/api/users/${this.userId()}`);
```

No service, no pipeline — appropriate for straightforward reads.

:::caution
Resources are for **reading** data. Mutations (`POST`, `PUT`, `DELETE`) still belong in a service method returning an observable or promise.
:::

---

## Migration strategy

You do not need a big-bang rewrite. Migrate by layer, outside-in:

### Step 1 — Templates

Replace `| async` with signals. Zero risk, immediate readability gain.

```typescript
// Before
readonly users$ = this.api.getUsers();

// After
readonly users = toSignal(this.api.getUsers(), { initialValue: [] });
```

### Step 2 — Derived state

Replace `combineLatest` + `map` chains that have no time dimension with `computed()`.

```typescript
// Before
readonly visible$ = combineLatest([this.users$, this.filter$]).pipe(
  map(([users, filter]) => users.filter((u) => u.role === filter)),
);

// After
readonly visible = computed(() =>
  this.users().filter((u) => u.role === this.filter()),
);
```

### Step 3 — Data fetching

Replace trigger-subject + `switchMap` facades with `rxResource`.

### Step 4 — What stays in RxJS

Keep RxJS for:
- Debounce, throttle, retry with backoff.
- WebSockets, SSE, polling.
- Router events, form `valueChanges`.
- Anything where cancellation semantics matter.

---

## Anti-patterns

### Converting back and forth without reason

```typescript
// ❌ Pointless round trip
readonly total = toSignal(
  toObservable(this.items).pipe(map((i) => i.length)),
  { initialValue: 0 },
);

// ✅
readonly total = computed(() => this.items().length);
```

### Using `effect()` to copy one signal into another

```typescript
// ❌ Creates a second source of truth and risks loops
effect(() => this.filtered.set(this.items().filter(Boolean)));

// ✅
readonly filtered = computed(() => this.items().filter(Boolean));
```

### Subscribing inside an effect

```typescript
// ❌ Leaks a subscription on every run
effect(() => {
  this.api.load(this.id()).subscribe((d) => this.data.set(d));
});

// ✅
readonly data = rxResource({
  params: () => ({ id: this.id() }),
  stream: ({ params }) => this.api.load(params.id),
});
```

---

## Testing interop code

```typescript
it('should expose the latest emitted user as a signal', () => {
  const subject = new BehaviorSubject<User | null>(null);
  TestBed.configureTestingModule({
    providers: [{ provide: UserApi, useValue: { currentUser$: subject } }],
  });

  const component = TestBed.createComponent(UserComponent).componentInstance;
  expect(component.displayName()).toBe('Guest');

  subject.next({ id: '1', name: 'Ada' });
  TestBed.tick(); // flush the effect
  expect(component.displayName()).toBe('Ada');
});
```

:::caution
`toObservable()` and `toSignal()` rely on effects, so tests must flush change detection (`TestBed.tick()` or `await fixture.whenStable()`) before asserting.
:::

---

## Related

- [RxJS index](/angular/rxjs/)
- [Operators reference](/angular/rxjs/operators-reference/)
- [Signals and reactivity](/angular/components/signals-and-reactivity/)
