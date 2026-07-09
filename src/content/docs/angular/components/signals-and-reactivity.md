---
title: Signals & Reactivity
description: Using signals, computed values, effects, view queries, and OnPush change detection in Angular 18+ components.
sidebar:
  order: 7
---

## Signals in Components (Angular 18+)

Signals are the reactive primitive in modern Angular, replacing many uses of RxJS for component-level state:

```ts
import { Component, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <p>Double: {{ double() }}</p>
    <button (click)="increment()">+1</button>
    <button (click)="reset()">Reset</button>
  `
})
export class CounterComponent {
  count = signal(0);

  double = computed(() => this.count() * 2);

  constructor() {
    effect(() => {
      console.log(`Count changed to: ${this.count()}`);
    });
  }

  increment(): void {
    this.count.update(c => c + 1);
  }

  reset(): void {
    this.count.set(0);
  }
}
```

### Why Signals Matter

- **Reactivity without complexity** — no need to manually subscribe/unsubscribe like with Observables in simple cases.
- **Fine-grained updates** — only the parts of the UI depending on the signal re-render.
- **Better performance** — avoids unnecessary change detection cycles.
- **Predictable state changes** — easy to debug and reason about.

### Signal API Summary

| API | Purpose |
|-----|---------|
| `signal(value)` | Create a writable signal with initial value |
| `signal.set(value)` | Replace the current value |
| `signal.update(fn)` | Update based on current value |
| `computed(() => expr)` | Derived read-only signal (auto-tracks dependencies) |
| `effect(() => { ... })` | Side effect that re-runs when dependencies change |

---

## View Queries (Angular 18+)

### `viewChild` and `viewChildren`

Access child elements or components from the template using signal-based queries:

```ts
import { Component, viewChild, viewChildren, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-gallery',
  template: `
    <input #searchInput placeholder="Search..." />
    @for (item of items(); track item.id) {
      <div #card class="card">{{ item.name }}</div>
    }
  `
})
export class GalleryComponent implements AfterViewInit {
  searchInput = viewChild.required<ElementRef>('searchInput');
  cards = viewChildren<ElementRef>('card');

  items = signal([
    { id: 1, name: 'Item A' },
    { id: 2, name: 'Item B' }
  ]);

  ngAfterViewInit(): void {
    this.searchInput().nativeElement.focus();
    console.log(`Found ${this.cards().length} cards`);
  }
}
```

### `contentChild` and `contentChildren`

Query projected content from a parent:

```ts
import { Component, contentChildren } from '@angular/core';
import { TabComponent } from './tab.component';

@Component({
  selector: 'app-tabs',
  template: `
    <div class="tab-headers">
      @for (tab of tabs(); track tab.label()) {
        <button (click)="selectTab(tab)">{{ tab.label() }}</button>
      }
    </div>
    <ng-content />
  `
})
export class TabsComponent {
  tabs = contentChildren(TabComponent);

  selectTab(tab: TabComponent): void {}
}
```

### Query API Comparison

| Legacy | Modern (Angular 18+) |
|--------|---------------------|
| `@ViewChild('ref')` | `viewChild('ref')` |
| `@ViewChild(Component)` | `viewChild(Component)` |
| `@ViewChildren('ref')` | `viewChildren('ref')` |
| `@ContentChild(Component)` | `contentChild(Component)` |
| `@ContentChildren(Component)` | `contentChildren(Component)` |

---

## ChangeDetection Strategy

For performance optimization, use `OnPush` change detection:

```ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h3>{{ name() }}</h3>
      <p>{{ email() }}</p>
    </div>
  `
})
export class UserCardComponent {
  name = input.required<string>();
  email = input<string>('');
}
```

**When to use `OnPush`:**

- Always — it's the recommended default for all components.
- Signal-based components work seamlessly with `OnPush`.
- The component only re-renders when its inputs change or a signal it reads is updated.

---

## References

- [The Power of Standalone Components and Signals in Angular 20](https://medium.com/@antonyandrus/the-power-of-standalone-components-and-signals-in-angular-20-c2fa6c5dca3d)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular Official Documentation — Components](https://angular.dev/guide/components)
