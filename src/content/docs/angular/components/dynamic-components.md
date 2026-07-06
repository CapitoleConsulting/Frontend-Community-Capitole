---
title: Dynamic Components
description: Rendering components at runtime using ViewContainerRef, NgComponentOutlet, lazy-loading, and CDK Portals.
sidebar:
  order: 6
---

## Dynamic Components

For scenarios where you need to render components at runtime (modals, dashboards, plug-ins), Angular provides multiple approaches.

---

## Using `ViewContainerRef` (Full Control)

```ts
import {
  Component,
  ViewChild,
  ViewContainerRef,
  EnvironmentInjector,
  inject
} from '@angular/core';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
  selector: 'app-host',
  template: `
    <ng-template #host />
    <button (click)="openDialog()">Open Dialog</button>
  `
})
export class HostComponent {
  @ViewChild('host', { read: ViewContainerRef, static: true })
  host!: ViewContainerRef;

  private envInjector = inject(EnvironmentInjector);

  openDialog(): void {
    this.host.clear();

    const ref = this.host.createComponent(ConfirmDialogComponent, {
      environmentInjector: this.envInjector
    });

    // Pass inputs — type-safe
    ref.setInput('title', 'Delete file?');
    ref.setInput('message', 'This action cannot be undone.');

    // Wire outputs
    ref.instance.confirmed.subscribe(() => {
      console.log('Confirmed!');
      ref.destroy();
    });
  }
}
```

**Why this pattern?**

- Works with standalone components (no `NgModule` ceremony).
- `EnvironmentInjector` ensures proper DI scope (services/pipes/providers resolve as expected).
- `setInput` avoids manual `instance.prop = value` and runs input change detection correctly.

---

## Using `NgComponentOutlet` (Template-First Simplicity)

When you only need to choose a component type at runtime:

```ts
import { Component, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { UserDashboardComponent } from './user-dashboard.component';

@Component({
  selector: 'app-dashboard-host',
  imports: [NgComponentOutlet],
  template: `
    <ng-container [ngComponentOutlet]="activeComponent" />
  `
})
export class DashboardHostComponent {
  activeComponent: Type<unknown> = UserDashboardComponent;

  switchToAdmin(): void {
    this.activeComponent = AdminDashboardComponent;
  }
}
```

---

## Lazy-Loading Dynamic Components (Performance)

Avoid loading heavy components until needed:

```ts
async openChart(): Promise<void> {
  this.host.clear();

  const { HeavyChartComponent } = await import('./heavy-chart.component');
  const ref = this.host.createComponent(HeavyChartComponent, {
    environmentInjector: this.envInjector
  });

  ref.setInput('data', this.dataset);
}
```

- Great for large dashboards, editors, or charts.
- Keeps initial bundle size lean.

---

## CDK Portals (Overlays & Reusable Anchors)

For overlays/modals/toasts, CDK portals provide clean separation:

```ts
import { Component, ViewChild } from '@angular/core';
import { CdkPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import { TooltipComponent } from './tooltip.component';

@Component({
  selector: 'app-portal-host',
  template: `<ng-template cdkPortalOutlet></ng-template>`
})
export class PortalHostComponent {
  @ViewChild(CdkPortalOutlet, { static: true }) outlet!: CdkPortalOutlet;

  openTooltip(): void {
    const portal = new ComponentPortal(TooltipComponent);
    const ref = this.outlet.attachComponentPortal(portal);
    ref.setInput('text', 'Hello from a portal!');
  }

  close(): void {
    this.outlet.detach();
  }
}
```

---

## Reusable ModalService Pattern

Centralize creation logic so feature components just call a service:

```ts
import { Injectable, ViewContainerRef, EnvironmentInjector } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private host?: ViewContainerRef;

  constructor(private envInjector: EnvironmentInjector) {}

  registerHost(host: ViewContainerRef): void {
    this.host = host;
  }

  open<T>(component: any, inputs?: Partial<T>) {
    if (!this.host) throw new Error('Modal host not registered');
    this.host.clear();

    const ref = this.host.createComponent<T>(component, {
      environmentInjector: this.envInjector
    });

    Object.entries(inputs ?? {}).forEach(([k, v]) =>
      (ref as any).setInput?.(k, v)
    );

    return ref;
  }

  closeAll(): void {
    this.host?.clear();
  }
}
```

Place a single `<ng-template #modalHost>` in your root layout and call `modalService.open(...)` anywhere.

---

## When to Choose Which Approach

| Use Case | Approach |
|----------|----------|
| Dialogs, toasts, dashboards | `ViewContainerRef.createComponent` (full control) |
| Simple "render this type" | `NgComponentOutlet` |
| Overlays & cross-cutting anchors | CDK `ComponentPortal` + `CdkPortalOutlet` |
| Large bundles | Lazy `import()` before `createComponent` |

---

## Change Detection & Lifecycle Tips

- **OnPush components:** After `setInput`, Angular schedules change detection automatically; for manual property sets use `ref.changeDetectorRef.markForCheck()`.
- **Destroying:** Call `ref.destroy()` or `viewContainerRef.clear()` to avoid leaks. Clean up `EventEmitter` subscriptions.
- **DI scopes:** Prefer `EnvironmentInjector` to ensure providers resolve in the correct app context.
- **SSR/Hydration:** Dynamic content is client-only; don't rely on it for SEO-critical markup.

---

## References

- [How to Create Components Dynamically in Angular — 2026 Guide](https://acharyaks90.medium.com/how-to-create-components-dynamically-in-angular-2026-guide-975745090eef) — Anil Kumar (2026)
- [Mastering Angular Components in 2025](https://medium.com/@gitesh08/mastering-angular-components-in-2025-01a8bdf4e0ce) — Gitesh Mahadik (2025)
- [Angular Official Documentation — Dynamic Components](https://angular.dev/guide/components/programmatic-rendering)
