---
title: Lifecycle Hooks
description: Understanding component lifecycle hooks and modern render callbacks in Angular 18+.
sidebar:
  order: 4
---

## Component Lifecycle Hooks

Components have a lifecycle from creation to destruction. Angular provides hooks to execute logic at key moments:

| Hook | Purpose |
|------|---------|
| `ngOnInit` | Runs once after the component is initialized. Ideal for setup tasks. |
| `ngOnChanges` | Runs when `@Input` properties change (before `ngOnInit` and on updates). |
| `ngAfterViewInit` | Runs after the component's view is fully initialized. |
| `ngAfterContentInit` | Runs after projected content is initialized. |
| `ngDoCheck` | Runs during every change detection cycle. Use carefully. |
| `ngOnDestroy` | Runs just before the component is destroyed. Clean up subscriptions here. |

---

## Basic Lifecycle Example

```ts
import { Component, OnInit, OnDestroy, input, DestroyRef, inject } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `<p>{{ name() }}</p>`
})
export class UserCardComponent implements OnInit, OnDestroy {
  name = input.required<string>();

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    console.log('Component initialized!');

    this.destroyRef.onDestroy(() => {
      console.log('Cleaning up resources...');
    });
  }

  ngOnDestroy(): void {
    console.log('Component destroyed!');
  }
}
```

---

## Modern Cleanup with `DestroyRef`

Instead of implementing `OnDestroy` manually, use `DestroyRef` for a more composable approach:

```ts
import { Component, inject, DestroyRef, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-timer',
  template: `<p>Elapsed: {{ seconds() }}s</p>`
})
export class TimerComponent implements OnInit {
  seconds = signal(0);

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.seconds.update(s => s + 1));
  }
}
```

---

## Modern Alternative — `afterNextRender` and `afterRender`

For DOM-dependent initialization, Angular 18+ provides render hooks. These are especially useful for SSR compatibility since they only run in the browser:

```ts
import { Component, afterNextRender, afterRender, ElementRef } from '@angular/core';

@Component({
  selector: 'app-chart',
  template: `<canvas #chart></canvas>`
})
export class ChartComponent {
  constructor() {
    afterNextRender(() => {
      console.log('First render complete — initialize chart library here');
    });

    afterRender(() => {
      console.log('Re-render complete');
    });
  }
}
```

**When to use render hooks vs lifecycle hooks:**

| Scenario | Use |
|----------|-----|
| Fetch data on init | `ngOnInit` |
| React to input changes (legacy) | `ngOnChanges` |
| Access DOM after first paint | `afterNextRender` |
| Sync DOM state every render | `afterRender` |
| Cleanup subscriptions/timers | `DestroyRef.onDestroy()` or `ngOnDestroy` |
| SSR-safe DOM access | `afterNextRender` (skipped on server) |

---

## Lifecycle Execution Order

```
constructor()
  → ngOnChanges() (if inputs exist)
    → ngOnInit()
      → ngDoCheck()
        → ngAfterContentInit()
          → ngAfterContentChecked()
            → ngAfterViewInit()
              → afterNextRender() [browser only]
              → afterRender() [browser only]
                → ngAfterViewChecked()
                  ... (change detection cycles) ...
                    → ngOnDestroy()
```

---

## References

- [Mastering Angular Components in 2025](https://medium.com/@gitesh08/mastering-angular-components-in-2025-01a8bdf4e0ce)
- [Angular Official Documentation — Lifecycle](https://angular.dev/guide/components/lifecycle)
