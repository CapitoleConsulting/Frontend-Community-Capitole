---
title: Standalone vs NgModules
description: Understanding the architecture shift from NgModules to standalone components — comparison, migration, and interoperability.
sidebar:
  order: 8
---

## Standalone Components vs NgModules — The Architecture Shift

Angular has undergone a major architectural shift. Traditionally, apps were built entirely with **NgModules**, where every component, directive, and pipe had to be declared inside a module. While this ensured consistency, it also added a lot of boilerplate.

Since Angular 14, **standalone components** have simplified this model. From Angular 19 onward, they are the **default** way to create components — you no longer need to specify `standalone: true`.

---

## The Legacy Module-Based Architecture

In the traditional approach, the application was organized through `@NgModule` classes:

```ts
// app.module.ts (legacy approach)
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { UserCardComponent } from './user-card/user-card.component';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [AppComponent, UserCardComponent],  // Register components here
  imports: [BrowserModule, SharedModule],            // Import other modules
  exports: [],                                       // Expose to other modules
  bootstrap: [AppComponent]                          // Root component
})
export class AppModule {}
```

**Bootstrapping with modules:**

```ts
// main.ts (legacy)
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);
```

**Key characteristics of the module-based approach:**

- Every component **must** be declared in exactly one module.
- Shared components required a `SharedModule` that re-exported them.
- `BrowserModule` was imported once in the root module; `CommonModule` in feature modules.
- Lazy loading required a dedicated module per route.
- Added significant boilerplate for small features.

---

## The Modern Standalone Architecture (Angular 18+)

With standalone components, each component is **self-contained** — it imports what it needs directly:

```ts
// user-card.component.ts (modern approach)
import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-user-card',
  imports: [DatePipe],  // Import dependencies directly
  template: `
    <div class="card">
      <h3>{{ name() }}</h3>
      <p>Member since: {{ joinDate() | date:'mediumDate' }}</p>
    </div>
  `
})
export class UserCardComponent {
  name = input.required<string>();
  joinDate = input.required<Date>();
}
```

**Bootstrapping without modules:**

```ts
// main.ts (modern)
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
```

```ts
// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app/app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient()
  ]
};
```

---

## Side-by-Side Comparison

| Aspect | NgModules (Legacy) | Standalone (Modern) |
|--------|-------------------|---------------------|
| **Component declaration** | Must be declared in a module's `declarations` array | Self-contained — no module needed |
| **Dependency management** | Import modules that export the needed directives/pipes | Import dependencies directly in the component's `imports` array |
| **Bootstrapping** | `platformBrowserDynamic().bootstrapModule(AppModule)` | `bootstrapApplication(AppComponent, appConfig)` |
| **Lazy loading** | Requires a dedicated `NgModule` per lazy route | Lazy-load individual components directly with `loadComponent` |
| **Shared components** | Need a `SharedModule` to group and re-export | Import each component directly where needed |
| **Boilerplate** | High — module files, declarations, imports, exports | Minimal — components are self-describing |
| **Tree-shaking** | Modules can prevent effective tree-shaking | Better tree-shaking — only used components are bundled |
| **Default since** | Angular 2 | Angular 19 (available since Angular 14) |

---

## Lazy Loading — Modules vs Standalone

**Legacy (module-based):**

```ts
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module')
      .then(m => m.DashboardModule)
  }
];
```

**Modern (standalone):**

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component')
      .then(c => c.DashboardComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes')
      .then(r => r.ADMIN_ROUTES)
  }
];
```

---

## When Are Modules Still Useful?

Modules haven't disappeared — they remain useful in specific scenarios:

- **Third-party libraries** — Many libraries still expose `NgModule` classes (e.g., `MatButtonModule`). You can import them directly in standalone component `imports`.
- **Large shared feature groups** — If you have 20+ tightly related components that always go together, a module can simplify imports.
- **Legacy codebases** — Migrating gradually is perfectly valid; standalone and module-based components can coexist.

---

## Mixing Both Approaches

Angular allows seamless interoperability between standalone and module-based components:

```ts
// A standalone component importing a module
@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatButtonModule, UserCardComponent],
  template: `
    <mat-card>
      <app-user-card [name]="'Alice'" [joinDate]="today" />
      <button mat-button>Action</button>
    </mat-card>
  `
})
export class DashboardComponent {
  today = new Date();
}
```

```ts
// A module declaring a legacy component and importing a standalone one
@NgModule({
  declarations: [LegacyWidgetComponent],
  imports: [CommonModule, UserCardComponent],  // Standalone components can be imported directly
  exports: [LegacyWidgetComponent]
})
export class WidgetsModule {}
```

---

## Migration Strategy

If you're working on an existing module-based project, consider migrating incrementally:

1. **New components** — Always create as standalone (default in Angular 18+).
2. **Leaf components** — Migrate components that have no dependents first.
3. **Shared components** — Convert shared components to standalone and remove them from `SharedModule` declarations.
4. **Feature modules** — Replace `loadChildren` with `loadComponent` route by route.
5. **Root module** — Finally, replace `AppModule` with `bootstrapApplication` and `appConfig`.

> Angular provides a schematic to assist with migration:
> ```bash
> ng generate @angular/core:standalone
> ```

---

## References

- [Angular Standalone Components vs Modules](https://medium.com/@jaouadirabeb/angular-standalone-components-vs-modules-851fc2819b03) — Jaouadirabeb (2025)
- [Angular Standalone Components: Simplifying Modern Angular Development](https://medium.com/@mayurchakalasiya1990/angular-standalone-components-simplifying-modern-angular-development-b65c87ae81ec) — Mayur Chakalasiya (2025)
- [Angular Migration to Standalone](https://angular.dev/reference/migrations/standalone)
