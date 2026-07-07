---
title: Angular 20 Features
description: New features, advantages, and trade-offs of the Angular 20 component model — signals, zoneless, resource API, and more.
sidebar:
  order: 9
---

## Angular 20 — New Features and the Modern Component Model

Angular 20 represents a paradigm shift in how we architect applications. The combination of **standalone components by default**, **signals as the reactive primitive**, and a host of new APIs makes Angular leaner, faster, and easier to learn than ever before.

---

## Key Features in Angular 20

### 1. Standalone Is the Only Default

In Angular 20, standalone components are the **only** way to create new components via the CLI. The `standalone: true` flag is implicit and no longer appears in the decorator. If you need a module-based component (rare), you must explicitly opt out with `standalone: false`.

```ts
import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  template: `
    <article class="card">
      <h3>{{ name() }}</h3>
      <p>{{ price() | currency }}</p>
      <button (click)="addToCart.emit(name())">Add to Cart</button>
    </article>
  `
})
export class ProductCardComponent {
  name = input.required<string>();
  price = input.required<number>();
  addToCart = output<string>();
}
```

### 2. Signals as the Core Reactive Model

Signals replace many traditional RxJS patterns for component-level state. They offer **fine-grained reactivity** — only the parts of the UI that depend on a signal will re-render when its value changes.

```ts
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-product-list',
  template: `
    <h2>Products ({{ count() }})</h2>
    @for (product of products(); track product) {
      <p>{{ product }}</p>
    }
    <button (click)="addProduct()">Add Product</button>
  `
})
export class ProductListComponent {
  products = signal<string[]>(['Laptop', 'Phone']);
  count = computed(() => this.products().length);

  addProduct(): void {
    this.products.update(list => [...list, `Product ${list.length + 1}`]);
  }
}
```

### 3. Signal-Based Inputs and Outputs

All new component APIs are built around signals:

```ts
import { Component, input, output, model, computed } from '@angular/core';

@Component({
  selector: 'app-quantity-selector',
  template: `
    <div class="quantity">
      <button (click)="decrement()" [disabled]="isMin()">-</button>
      <span>{{ quantity() }}</span>
      <button (click)="increment()" [disabled]="isMax()">+</button>
    </div>
  `
})
export class QuantitySelectorComponent {
  quantity = model.required<number>();
  max = input<number>(99);
  min = input<number>(1);

  quantityChanged = output<number>();

  isMin = computed(() => this.quantity() <= this.min());
  isMax = computed(() => this.quantity() >= this.max());

  increment(): void {
    this.quantity.update(q => q + 1);
    this.quantityChanged.emit(this.quantity());
  }

  decrement(): void {
    this.quantity.update(q => q - 1);
    this.quantityChanged.emit(this.quantity());
  }
}
```

### 4. Zoneless Change Detection (Experimental → Stable)

Angular 20 stabilizes **zoneless mode**, eliminating `zone.js` entirely for smaller bundles and faster startup:

```ts
import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient()
  ]
};
```

When zoneless is enabled, Angular relies exclusively on signals and `markForCheck()` to know when to re-render — no more patching of `setTimeout`, `Promise`, or event listeners.

### 5. `resource()` and `rxResource()` for Async Data

Angular 20 introduces the `resource()` API to handle async data fetching declaratively with signals:

```ts
import { Component, resource, input } from '@angular/core';

@Component({
  selector: 'app-user-details',
  template: `
    @if (userResource.isLoading()) {
      <p>Loading...</p>
    } @else if (userResource.error()) {
      <p>Error loading user.</p>
    } @else {
      <h2>{{ userResource.value()?.name }}</h2>
      <p>{{ userResource.value()?.email }}</p>
    }
  `
})
export class UserDetailsComponent {
  userId = input.required<number>();

  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: async ({ request }) => {
      const response = await fetch(`/api/users/${request.id}`);
      return response.json();
    }
  });
}
```

### 6. Built-in Control Flow (Fully Mature)

The `@if`, `@for`, `@switch` syntax (introduced in Angular 17) is now the only recommended approach. The legacy structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`) are deprecated:

```html
@for (item of items(); track item.id) {
  @if (item.visible()) {
    <app-item-card [item]="item" />
  }
} @empty {
  <p>No items to display.</p>
}
```

---

## Advantages of Angular 20's Component Model

| Advantage | Description |
|-----------|-------------|
| **Reduced boilerplate** | No modules, no declarations arrays — components are self-describing |
| **Faster onboarding** | New developers learn components without the NgModule mental model |
| **Better tree-shaking** | Only imported dependencies are bundled — unused code is eliminated |
| **Fine-grained reactivity** | Signals update only the affected DOM nodes, not the entire component tree |
| **Smaller bundles** | Zoneless mode removes `zone.js` (~30KB) from the bundle |
| **Improved SSR/SEO** | Faster rendering improves Core Web Vitals for Angular Universal apps |
| **Predictable state** | Signals are synchronous and easy to debug — no subscription management |
| **Lazy loading made trivial** | `loadComponent` per route — no module ceremony |
| **Better DX** | Signals + standalone = shorter, cleaner, more readable code |

---

## Disadvantages and Trade-offs

| Disadvantage | Description |
|--------------|-------------|
| **Learning curve for existing teams** | Developers familiar with NgModules + RxJS must adapt to the new patterns |
| **RxJS still needed for complex scenarios** | Signals don't replace `switchMap`, `debounceTime`, WebSocket streams, or complex async orchestration |
| **Zoneless is not yet universal** | Some third-party libraries still depend on `zone.js` — test compatibility |
| **Migration cost** | Large legacy codebases require incremental effort to convert modules to standalone |
| **Ecosystem maturity** | Some older tutorials, Stack Overflow answers, and libraries still reference the module-based pattern |
| **Potential over-granularity** | Without modules to group related code, large apps need clear folder conventions to stay organized |
| **Signal debugging tools** | DevTools support for signals is improving but not yet as mature as RxJS operators |

---

## When to Adopt Angular 20 Features

| Scenario | Recommendation |
|----------|----------------|
| **New (greenfield) projects** | Use standalone + signals + zoneless from day one |
| **Existing projects (Angular 16+)** | Migrate incrementally — new components as standalone, convert old ones gradually |
| **Existing projects (Angular < 16)** | Upgrade Angular version first, then follow the migration schematic |
| **Micro-frontend architectures** | Standalone components are ideal — self-contained and bundle-friendly |
| **Libraries / shared packages** | Standalone components simplify consumers' imports |
| **Performance-critical apps** | Enable zoneless + OnPush + signals for maximum efficiency |

---

## Real-World Example: Feature Component in Angular 20

```ts
import { Component, signal, computed, inject, resource } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-product-catalog',
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section class="catalog">
      <h1>Product Catalog</h1>
      <p>{{ itemCount() }} items | Cart total: {{ cartTotal() | currency }}</p>

      @if (productsResource.isLoading()) {
        <div class="skeleton-grid">Loading...</div>
      } @else {
        @for (product of productsResource.value(); track product.id) {
          <article class="product-card">
            <h3>
              <a [routerLink]="['/products', product.id]">{{ product.name }}</a>
            </h3>
            <p>{{ product.price | currency }}</p>
            <button (click)="addToCart(product)">Add to Cart</button>
          </article>
        } @empty {
          <p>No products available.</p>
        }
      }
    </section>
  `
})
export class ProductCatalogComponent {
  private cartService = inject(CartService);

  productsResource = resource({
    loader: async () => {
      const res = await fetch('/api/products');
      return res.json();
    }
  });

  itemCount = computed(() => this.productsResource.value()?.length ?? 0);
  cartTotal = this.cartService.total;

  addToCart(product: { id: number; name: string; price: number }): void {
    this.cartService.add(product);
  }
}
```

---

## Best Practices for Angular 20

1. **Use standalone components for feature isolation** — especially in lazy-loaded routes.
2. **Prefer signals for local state** — keep global state in a store (e.g., NgRx SignalStore) if needed.
3. **Combine with Angular Universal for SSR** when SEO is a priority.
4. **Organize imports smartly** — keep component imports minimal for better performance.
5. **Enable zoneless mode** for new projects to maximize performance benefits.
6. **Use `resource()` for data fetching** — declarative and signal-integrated.
7. **Always use `OnPush` change detection** — signals make this seamless.

---

## References

- [Angular Standalone Components: Simplifying Modern Angular Development](https://medium.com/@mayurchakalasiya1990/angular-standalone-components-simplifying-modern-angular-development-b65c87ae81ec)
- [The Power of Standalone Components and Signals in Angular 20](https://medium.com/@antonyandrus/the-power-of-standalone-components-and-signals-in-angular-20-c2fa6c5dca3d)
- [Angular Official Documentation — Components](https://angular.dev/guide/components)
- [Angular Signals Guide](https://angular.dev/guide/signals)
