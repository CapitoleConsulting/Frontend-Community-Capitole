---
title: RxJS
description: RxJS in modern Angular - when to use it, when to use signals, and how to avoid the classic pitfalls.
sidebar.order: 0
---

## RxJS in the signals era

Signals did not kill RxJS. They took over one of its jobs — **synchronous derived state** — and left RxJS with the one it is actually good at: **asynchronous event streams over time**.

| Use case | Recommended tool |
| --- | --- |
| Component state, derived values | `signal()` / `computed()` |
| Inputs and outputs | `input()` / `output()` |
| A single HTTP call | `httpResource()` / `resource()` or `toSignal()` |
| Typeahead, debounce, cancellation | **RxJS** |
| WebSockets, SSE, polling | **RxJS** |
| Combining several event sources over time | **RxJS** |
| Retry with backoff, race conditions | **RxJS** |
| Router events, form `valueChanges` | **RxJS** (then `toSignal`) |

Practical rule: **RxJS at the edges, signals in the middle.** Streams enter through RxJS, get converted with `toSignal()`, and the rest of the component works with signals.

---

## The three questions before writing a pipe

1. **Does time matter?** If not, you want `computed()`, not `combineLatest`.
2. **Can a newer value make an older one irrelevant?** If yes, you need `switchMap`, not `mergeMap`.
3. **Who unsubscribes?** If you cannot answer in one sentence, use the `async` pipe or `takeUntilDestroyed()`.

---

## Minimum viable operator set

Most application code only needs these:

- **Transform:** `map`, `switchMap`, `concatMap`, `mergeMap`, `exhaustMap`
- **Filter:** `filter`, `distinctUntilChanged`, `debounceTime`, `take`, `takeUntilDestroyed`
- **Combine:** `combineLatest`, `forkJoin`, `merge`, `startWith`, `withLatestFrom`
- **Errors:** `catchError`, `retry`, `finalize`
- **Sharing:** `shareReplay`

Everything else is a specialisation you can look up when you need it.

---

## Pages in this section

- [Operators reference](/angular/rxjs/operators-reference/) — the flattening operators, side by side.
- [Patterns & pitfalls](/angular/rxjs/patterns/) — reload, race conditions, `shareReplay` leaks.
- [RxJS interop with signals](/angular/rxjs/rxjs-interop/) — `toSignal`, `toObservable`, `rxResource`.

---

## Related

- [Signals and reactivity](/angular/components/signals-and-reactivity/)
- [Reactive programming and forms](/angular/guidelines/reactive-programming-and-forms/)
- [Preventing memory leaks](/angular/utilities/memory-leaks/)
