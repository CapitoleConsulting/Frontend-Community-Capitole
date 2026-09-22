---
title: Hydration
description: Full hydration, incremental hydration, event replay and how to avoid hydration mismatches in Angular.
sidebar.order: 1
---

## What hydration is

Hydration is the process where Angular **reuses** the DOM rendered on the server instead of destroying it and rendering it again.

Without hydration Angular performs a *destructive* bootstrap: it wipes the server HTML and re-creates every node. The user sees a visible flicker and the LCP measurement resets. With hydration Angular walks the existing DOM, attaches listeners and internal structures, and keeps the nodes.

```typescript
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(
      withEventReplay(),
      withIncrementalHydration(),
    ),
  ],
};
```

---

## Event replay

Between the moment the HTML is painted and the moment Angular finishes bootstrapping, the page looks interactive but is not. Clicks in that window are lost.

`withEventReplay()` installs a tiny script that records user events during that gap and replays them once the component is hydrated. It is cheap and should be enabled in virtually every SSR application.

```typescript
provideClientHydration(withEventReplay())
```

---

## Incremental hydration

Full hydration still downloads and bootstraps the whole component tree. Incremental hydration lets you defer hydration of parts of the page until they are actually needed, while still keeping the server-rendered HTML visible.

It is expressed with `@defer` plus a `hydrate` trigger:

```html
@defer (hydrate on viewport) {
  <app-product-reviews [productId]="productId()" />
} @placeholder {
  <div class="skeleton"></div>
}
```

### Available hydrate triggers

| Trigger | Hydrates when |
| --- | --- |
| `hydrate on viewport` | The block scrolls into view |
| `hydrate on interaction` | The user clicks or focuses inside the block |
| `hydrate on hover` | The pointer enters the block |
| `hydrate on immediate` | As soon as the app is idle-free |
| `hydrate on idle` | The browser is idle |
| `hydrate on timer(2s)` | After a delay |
| `hydrate when condition` | A signal/expression becomes `true` |
| `hydrate never` | Never — static HTML forever |

### `hydrate never` is the hidden gem

For purely static regions (footers, legal text, rendered markdown) you can ship **zero JavaScript**:

```html
@defer (hydrate never) {
  <app-site-footer />
}
```

The HTML is rendered on the server and stays in the page, but the component is never instantiated on the client.

:::caution
`hydrate never` blocks are inert. Do not use them for anything with bindings, listeners or signals that must update.
:::

### Difference between `@defer` and `@defer (hydrate ...)`

| | Classic `@defer` | `@defer (hydrate ...)` |
| --- | --- | --- |
| Server output | Renders the `@placeholder` | Renders the **real content** |
| Client | Downloads chunk on trigger | Content already visible, only hydrates on trigger |
| SEO | Placeholder gets indexed | Real content gets indexed |

For SSR applications you almost always want the `hydrate` variant.

---

## Hydration mismatches

A mismatch happens when the DOM produced on the server differs from what the client expects. Angular reports it as `NG0500`–`NG0505` and falls back to destructive rendering for that subtree, silently killing your SSR benefit.

### Cause 1 — Direct DOM manipulation

```typescript
// Breaks hydration: Angular does not know these nodes exist
ngOnInit(): void {
  const el = document.createElement('div');
  this.host.nativeElement.appendChild(el);
}
```

**Fix:** move DOM work to `afterNextRender`, which only runs in the browser and after hydration completed.

```typescript
import { afterNextRender, ElementRef, inject, Injector } from '@angular/core';

export class ChartComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      renderThirdPartyChart(this.host.nativeElement);
    });
  }
}
```

### Cause 2 — Non-deterministic rendering

```html
<!-- Server and client produce different values -->
<p>Generated at {{ now }}</p>
<p>{{ Math.random() }}</p>
```

**Fix:** compute the value once on the server and transfer it, or render it only after hydration.

### Cause 3 — Invalid HTML nesting

The browser silently *repairs* invalid HTML while parsing, so the DOM no longer matches what Angular rendered.

```html
<!-- The browser will hoist the div out of the p -->
<p><div>Content</div></p>

<!-- Same with tables -->
<table><app-row /></table>
```

**Fix:** produce valid HTML; use `<ng-container>` or correct host elements (`tr[appRow]`).

### Cause 4 — Browser-only APIs during rendering

`window`, `document`, `localStorage`, `navigator` do not exist on the server. See [SSR Common Issues](/angular/ssr/common-issues/).

### Escape hatch: `ngSkipHydration`

```html
<div ngSkipHydration>
  <app-legacy-jquery-widget />
</div>
```

This tells Angular to render that subtree destructively on the client.

:::caution
`ngSkipHydration` is a **last resort**, not a fix. It disables all hydration benefits for that subtree. Use it only for third-party widgets you do not control, and leave a comment explaining why.
:::

---

## `afterRender` vs `afterNextRender` vs lifecycle hooks

| API | Runs on server | Runs on client | Frequency |
| --- | --- | --- | --- |
| `constructor` | Yes | Yes | Once |
| `ngOnInit` | Yes | Yes | Once |
| `ngAfterViewInit` | **No** | Yes | Once |
| `afterNextRender` | **No** | Yes | Once, after next render |
| `afterRender` | **No** | Yes | After every render |

Practical rule: **any code touching the DOM, measuring layout or using browser APIs goes into `afterNextRender`**.

```typescript
import { afterNextRender, afterRender } from '@angular/core';

constructor() {
  // One-off initialisation (third-party libs, focus, measurements)
  afterNextRender(() => this.initEditor());

  // Recurring work — keep it extremely cheap
  afterRender(() => this.syncScrollPosition());
}
```

:::danger
`afterRender` runs after **every** change detection cycle. Doing layout reads/writes there is the fastest way to build a janky application.
:::

---

## Debugging checklist

1. Open DevTools console and filter by `NG05`.
2. Angular prints the exact node where the mismatch happened — expand it.
3. Compare `view-source:` (server HTML) with the live DOM in the Elements panel.
4. Temporarily add `ngSkipHydration` to narrow down the offending subtree, then remove it once fixed.
5. In tests, assert that no hydration warnings were logged.

---

## Related

- [SSR & Rendering](/angular/ssr/)
- [SSR Common Issues](/angular/ssr/common-issues/)
- [Deferred views](/angular/utilities/deferred/)
