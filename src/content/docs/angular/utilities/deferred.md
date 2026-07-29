---
title: Deferred Loading
description: Optimize Angular performance with deferred view rendering. Learn to use @defer blocks and lazy-load components for better user experience.
sidebar.order: 2
---

## Overview

Deferred loading in Angular allows you to **defer the rendering and initialization of components and content** until they're actually needed. Rather than rendering everything when a page loads, Angular can render high-priority content first and load lower-priority content progressively.

The `@defer` block (introduced in Angular v17) is a built-in control flow feature that makes deferred loading easier and more powerful than ever before.

---

## Why Deferred Loading Matters

### Faster Initial Load
Only render what users see immediately. Defer everything below the fold, reducing initial rendering time and bundle size.

### Better Core Web Vitals
Deferred loading improves:
- **Largest Contentful Paint (LCP)** — Less content to render initially
- **Cumulative Layout Shift (CLS)** — Content loads progressively
- **Total Blocking Time (TBT)** — Less JavaScript to parse and execute

### Improved User Experience
Users see content faster. Pages feel snappier because critical content renders first.

### Progressive Enhancement
Content loads as users scroll or interact, creating a seamless experience.

---

## Understanding Deferred Loading

### The @defer Block

The `@defer` block is Angular's built-in way to defer rendering of a template section. It's part of the new control flow syntax (alongside `@if`, `@for`, `@switch`).

```typescript
@defer {
  <app-heavy-component></app-heavy-component>
} @placeholder {
  <p>Loading...</p>
}
```

### How It Works

1. Component loads without the deferred content
2. When trigger condition is met (e.g., user scrolls to it), Angular starts loading
3. While loading, Angular renders the placeholder
4. Once loaded, the actual component replaces the placeholder

---

## Implementation Guide

### Basic Deferred Rendering

**Defer Below the Fold:**
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-hero">
      <img [src]="product.image" alt="Product">
      <h1>{{ product.name }}</h1>
      <button (click)="addToCart()">Add to Cart</button>
    </div>

    <!-- Defer reviews section below the fold -->
    @defer {
      <app-reviews [productId]="product.id"></app-reviews>
    } @placeholder {
      <div class="reviews-skeleton">
        <p>Loading reviews...</p>
      </div>
    }
  `
})
export class ProductPageComponent {
  product = {
    id: 1,
    name: 'Product Name',
    image: '/image.jpg'
  };

  addToCart(): void {
  }
}
```

### Deferred with Triggers

**Trigger on Interaction:**
```typescript
@defer (on interaction) {
  <app-chat-widget></app-chat-widget>
} @placeholder {
  <button class="chat-button">Open Chat</button>
}
```

**Trigger on Viewport (when scrolled into view):**
```typescript
@defer (on viewport) {
  <app-recommendations></app-recommendations>
} @placeholder {
  <div class="recommendations-skeleton">
    <p>Loading recommendations...</p>
  </div>
}
```

**Trigger Immediately (on timer):**
```typescript
@defer (on timer(2000)) {
  <app-analytics-dashboard></app-analytics-dashboard>
} @placeholder {
  <p>Loading dashboard...</p>
}
```

### Multiple Triggers

```typescript
@defer (on viewport; on interaction; on timer(5000)) {
  <app-premium-content></app-premium-content>
} @placeholder {
  <div class="premium-skeleton">Premium content loading...</div>
}
```

### Complete Example with Error Handling

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ])
    ])
  ],
  template: `
    <div class="dashboard">
      <!-- Critical content - render immediately -->
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome, {{ userName }}</p>
      </div>

      <!-- Secondary content - defer on viewport -->
      @defer (on viewport) {
        <div class="analytics-section" [@fadeIn]>
          <app-analytics></app-analytics>
        </div>
      } @placeholder {
        <div class="skeleton">
          <div class="skeleton-item"></div>
          <div class="skeleton-item"></div>
        </div>
      } @error {
        <div class="error-message">
          <p>Failed to load analytics. Please try again.</p>
          <button (click)="retryAnalytics()">Retry</button>
        </div>
      }

      <!-- Heavy components - defer on interaction -->
      @defer (on interaction) {
        <div [@fadeIn]>
          <app-advanced-filters></app-advanced-filters>
        </div>
      } @placeholder {
        <button class="filters-button">Show Advanced Filters</button>
      } @error {
        <p>Could not load filters</p>
      }

      <!-- Minimal priority content - defer on timer -->
      @defer (on timer(3000)) {
        <div [@fadeIn]>
          <app-promotions></app-promotions>
        </div>
      } @placeholder {
        <div class="skeleton"></div>
      }
    </div>
  `,
  styles: [`
    .skeleton {
      height: 200px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }

    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class DashboardComponent {
  userName = 'John Doe';

  retryAnalytics(): void {
  }
}
```

---

## Trigger Types

### 1. On Interaction

```typescript
@defer (on interaction) {
  <app-modal></app-modal>
} @placeholder {
  <button>Open Modal</button>
}
```

Waits for user interaction (click, focus, keyboard) on the placeholder.

### 2. On Viewport

```typescript
@defer (on viewport) {
  <app-heavy-list></app-heavy-list>
} @placeholder {
  <p>Loading list...</p>
}
```

Loads when the placeholder enters the viewport.

**With Margin (preload before it's visible):**
```typescript
@defer (on viewport(200px)) {
  <app-images></app-images>
} @placeholder {
  <p>Loading images...</p>
}
```

### 3. On Timer

```typescript
@defer (on timer(2500)) {
  <app-background-task></app-background-task>
} @placeholder {
  <p>Processing in background...</p>
}
```

Loads after specified milliseconds.

### 4. On Hover

```typescript
@defer (on hover) {
  <app-preview></app-preview>
} @placeholder {
  <button>Hover to Preview</button>
}
```

Loads when user hovers over the placeholder.

### 5. Combined Triggers

Load on ANY condition:
```typescript
@defer (on viewport; on interaction; on timer(5000)) {
  <app-card></app-card>
} @placeholder {
  <div class="loading">Loading...</div>
}
```

Load on ALL conditions (use comma):
```typescript
@defer (on viewport, on idle) {
  <app-expensive-content></app-expensive-content>
} @placeholder {
  <p>Waiting to load...</p>
}
```

---

## States and Templates

### Placeholder Block

Shows while content is loading:

```typescript
@defer (on viewport) {
  <app-product-reviews></app-product-reviews>
} @placeholder {
  <div class="skeleton">
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
  </div>
}
```

### Loading Block

Explicit loading state (if needed):

```typescript
@defer (on viewport) {
  <app-comments></app-comments>
} @loading (after 200ms; minimum 1s) {
  <p>Loading comments...</p>
} @placeholder {
  <!-- Initial skeleton -->
  <div class="comment-skeleton"></div>
}
```

### Error Block

Handle loading failures:

```typescript
@defer (on viewport) {
  <app-recommendations></app-recommendations>
} @error {
  <div class="error">
    <p>Could not load recommendations</p>
    <button (click)="retry()">Retry</button>
  </div>
} @placeholder {
  <p>Loading...</p>
}
```

---

## Advanced Patterns

### Prefetching

Prefetch content before user interactions:

```typescript
@defer (on interaction; on timer(5000)) {
  <app-checkout></app-checkout>
} @placeholder {
  <button>Proceed to Checkout</button>
}
```

This loads on either interaction OR after 5 seconds.

### Conditional Deferred Content

```typescript
@if (showPremium) {
  @defer (on viewport) {
    <app-premium-features></app-premium-features>
  } @placeholder {
    <p>Loading premium...</p>
  }
}
```

### Deferred with Standalone Components

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-section',
  standalone: true,
  template: `
    <h2>Section Title</h2>
    
    @defer (on viewport) {
      <app-heavy-component></app-heavy-component>
    } @placeholder {
      <p>Loading...</p>
    }
  `
})
export class SectionComponent {}
```

### Custom Defer Configuration

```typescript
@defer (on viewport; minimum 500ms) {
  <app-data></app-data>
} @placeholder {
  <div class="loader">Loading...</div>
}
```

---

## Performance Best Practices

### ✅ DO's

**Do defer components below the fold:**
```typescript
<app-hero></app-hero>

@defer (on viewport) {
  <app-features></app-features>
}
```

**Do use meaningful placeholders:**
```typescript
@defer (on viewport) {
  <app-user-card></app-user-card>
} @placeholder {
  <div class="user-card-skeleton">
    <div class="avatar-skeleton"></div>
    <div class="name-skeleton"></div>
  </div>
}
```

**Do combine triggers strategically:**
```typescript
@defer (on viewport; on timer(3000)) {
  <app-testimonials></app-testimonials>
}
```

### ❌ DON'ts

**Don't defer critical content:**
```typescript
@defer (on viewport) {
  <app-main-content></app-main-content>
}

<app-main-content></app-main-content>
```

**Don't create janky placeholders:**
```typescript
@defer (on viewport) {
  <div class="card" style="height: 400px">...</div>
} @placeholder {
  <p>Loading...</p>
}

@defer (on viewport) {
  <div class="card" style="height: 400px">...</div>
} @placeholder {
  <div class="card-skeleton" style="height: 400px"></div>
}
```

**Don't overuse deferred loading:**
```typescript
@defer (on viewport) { <app-nav></app-nav> }
@defer (on viewport) { <app-header></app-header> }
@defer (on viewport) { <app-main></app-main> }

<app-nav></app-nav>
<app-header></app-header>
<app-main></app-main>

@defer (on viewport) { <app-sidebar></app-sidebar> }
```

---

## Use Cases

### E-commerce Product Page

```typescript
@Component({
  template: `
    <!-- Immediate: Hero and CTA -->
    <app-product-hero [product]="product"></app-product-hero>
    <button>Buy Now</button>

    <!-- Deferred: Secondary info -->
    @defer (on viewport) {
      <app-product-reviews></app-product-reviews>
    } @placeholder {
      <div class="skeleton"></div>
    }

    @defer (on viewport) {
      <app-related-products></app-related-products>
    } @placeholder {
      <div class="skeleton"></div>
    }
  `
})
export class ProductComponent {}
```

### Dashboard with Multiple Widgets

```typescript
@Component({
  template: `
    <!-- Critical metrics -->
    <app-key-metrics></app-key-metrics>

    <!-- Secondary charts -->
    @defer (on viewport) {
      <app-sales-chart></app-sales-chart>
    } @placeholder {
      <div class="chart-skeleton"></div>
    }

    <!-- Optional content -->
    @defer (on interaction) {
      <app-advanced-analytics></app-advanced-analytics>
    } @placeholder {
      <button>View Analytics</button>
    }
  `
})
export class DashboardComponent {}
```

### Content-Heavy Blog Post

```typescript
@Component({
  template: `
    <!-- Post header and intro -->
    <app-post-header></app-post-header>

    <!-- Main content -->
    <app-post-content></app-post-content>

    <!-- Below fold content -->
    @defer (on viewport) {
      <app-comments></app-comments>
    }

    @defer (on viewport) {
      <app-related-posts></app-related-posts>
    }
  `
})
export class PostComponent {}
```

---

## Comparing with Other Strategies

### @defer vs. Lazy Loading Routes

| Aspect | @defer | Lazy Routes |
|--------|--------|---|
| **Scope** | Component content | Entire route |
| **Trigger** | Scroll, interaction, timer | Route navigation |
| **Best For** | In-page content | Feature modules |
| **Performance** | Faster LCP | Independent chunks |

### @defer vs. Async Pipe

```typescript
@defer (on viewport) {
  <app-heavy></app-heavy>
} @placeholder {
  <p>Loading...</p>
}

@if (data$ | async as data) {
  <app-component [data]="data"></app-component>
}
```

**When to use each:**
- `@defer`: Defer rendering based on viewport/interaction
- `async pipe`: Unwrap observable values in template

---

## Conclusion

Deferred loading with `@defer` blocks is a powerful way to optimize Angular applications. By loading content progressively, you can:

✅ Improve Core Web Vitals and search ranking  
✅ Reduce initial load time  
✅ Create snappier user experiences  
✅ Reduce initial bundle size  

**Key Takeaways:**
- Load critical content immediately
- Defer secondary and below-fold content
- Use appropriate triggers for your use case
- Create meaningful placeholders
- Test Core Web Vitals improvements

The `@defer` block makes progressive loading easier than ever in Angular.

---

## References

This guide is based on and inspired by:
- **[Deferred Loading in Angular: @defer—The Game Changer for Performance](https://medium.com/@rohitjsingh16/deferred-loading-in-angular-defer-the-game-changer-for-performance-1aed4cdd99fe)**
- [Angular Official Documentation: Deferrable Views](https://angular.io/guide/defer)
- [Angular Official Documentation: Control Flow](https://angular.io/guide/control-flow)
- [Web Vitals: Core Web Vitals](https://web.dev/vitals/)
