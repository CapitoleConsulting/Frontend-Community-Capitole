---
title: Architecture Patterns
description: Learn scalable Angular architecture patterns and when to use them. Master module-based, feature-based, and micro frontend architectures for growing applications.
sidebar.order: 3
---

## Overview

Architecture patterns define how your Angular application is organized at a high level. While design patterns solve localized problems within your code, architecture patterns address the **structural organization of entire applications**. Choosing the right architecture is crucial when building applications that need to scale—poorly chosen architectures become bottlenecks as your team and codebase grow.

This guide explores the most effective architecture patterns for Angular and helps you understand **when and why** to use each one.

---

## Why Architecture Patterns Matter for Scaling

### Team Scalability
The right architecture allows multiple teams to work independently on different features without constant conflicts and communication overhead.

### Code Organization
A clear architecture makes it easy for new developers to understand where features belong and how components relate to each other.

### Feature Velocity
Good architecture eliminates friction in feature development. Poor architecture creates barriers, requiring developers to understand the entire system before making simple changes.

### Maintainability Over Time
Applications grow and evolve. An architecture that works for 10,000 lines of code may collapse at 100,000 lines. The best architecture adapts as your application grows.

---

## 1. Module-Based Architecture

The Module-Based Architecture organizes your application around **Angular modules**, with each module handling a specific domain or responsibility.

### When to Use
✅ Building medium to large applications (5,000+ lines of code)  
✅ Team size: 3+ developers  
✅ Multiple independent feature sets  
✅ Need for lazy-loaded routes  
✅ Applications expected to grow over time  

### When NOT to Use
❌ Small prototypes or proof-of-concepts  
❌ Single developer, short-term projects  
❌ Simple CRUD applications with minimal complexity  

### Implementation

**Project Structure:**
```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   ├── interceptors/
│   │   └── core.module.ts
│   ├── shared/
│   │   ├── components/
│   │   ├── directives/
│   │   ├── pipes/
│   │   └── shared.module.ts
│   ├── features/
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── pages/
│   │   │   └── components/
│   │   ├── products/
│   │   │   ├── products.module.ts
│   │   │   ├── pages/
│   │   │   └── components/
│   │   └── users/
│   │       ├── users.module.ts
│   │       ├── pages/
│   │       └── components/
│   └── app.module.ts
```

**Core Module Example:**
```typescript
// core/core.module.ts
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  imports: [HttpClientModule],
  providers: [
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import only once in AppModule.');
    }
  }
}
```

**Feature Module Example:**
```typescript
// features/products/products.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsRoutingModule } from './products-routing.module';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { SharedModule } from '@shared/shared.module';

@NgModule({
  declarations: [
    ProductListComponent,
    ProductDetailComponent,
    ProductCardComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    ProductsRoutingModule
  ]
})
export class ProductsModule { }
```

**App Module with Lazy Loading:**
```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CoreModule,
    SharedModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

**Routing with Lazy Loading:**
```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module')
      .then(m => m.DashboardModule)
  },
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.module')
      .then(m => m.ProductsModule)
  },
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.module')
      .then(m => m.UsersModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

### Benefits
✅ Clear separation of concerns  
✅ Enables lazy loading for performance  
✅ Multiple teams can work independently  
✅ Easy to understand module dependencies  
✅ Scales naturally as application grows  
✅ Built-in Angular construct (no extra libraries)  

---

## 2. Feature-Based Architecture (Standalone Components)

Modern Angular embraces standalone components and feature-based architecture, organizing your application around **self-contained features** rather than modules.

### When to Use
✅ New Angular projects (v14+)  
✅ Team comfortable with modern Angular  
✅ Applications expected to evolve and scale  
✅ Want simpler routing and dependency management  
✅ Building microservices or modular monoliths  

### When NOT to Use
❌ Legacy projects tied to module-based architecture  
❌ Teams requiring strict Angular module patterns  
❌ Organizations with strong NgModule preferences  

### Implementation

**Project Structure:**
```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── api.service.ts
│   │   └── providers.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── header.component.ts
│   │   │   └── footer.component.ts
│   │   └── utils/
│   ├── features/
│   │   ├── dashboard/
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── pages/
│   │   │   │   └── dashboard.component.ts
│   │   │   └── services/
│   │   ├── products/
│   │   │   ├── products.routes.ts
│   │   │   ├── pages/
│   │   │   │   ├── product-list.component.ts
│   │   │   │   └── product-detail.component.ts
│   │   │   └── services/
│   │   │       └── product.service.ts
│   │   └── users/
│   │       ├── users.routes.ts
│   │       ├── pages/
│   │       └── services/
│   ├── app.routes.ts
│   └── app.component.ts
```

**Feature Routes:**
```typescript
// features/products/products.routes.ts
import { Routes } from '@angular/router';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    component: ProductListComponent
  },
  {
    path: ':id',
    component: ProductDetailComponent
  }
];
```

**Standalone Component:**
```typescript
// features/products/pages/product-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductCardComponent } from '../components/product-card.component';
import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  template: `
    <div class="products-container">
      <h1>Products</h1>
      @for (product of products(); track product.id) {
        <app-product-card [product]="product"></app-product-card>
      }
    </div>
  `
})
export class ProductListComponent implements OnInit {
  products = signal<Product[]>([]);

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.productService.getProducts()
      .subscribe(products => this.products.set(products));
  }
}
```

**App Routes:**
```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes')
      .then(m => m.DASHBOARD_ROUTES)
  },
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes')
      .then(m => m.PRODUCTS_ROUTES)
  },
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.routes')
      .then(m => m.USERS_ROUTES)
  }
];
```

**App Bootstrap:**
```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { APP_ROUTES } from './app/app.routes';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(APP_ROUTES),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
});
```

### Benefits
✅ Simpler component dependency management  
✅ More explicit about what each component needs  
✅ Easier to tree-shake and optimize bundle size  
✅ Aligns with modern JavaScript practices  
✅ Reduced boilerplate compared to modules  
✅ Native Angular support (no libraries needed)  

---

## 3. Monolithic Architecture

A single application containing all features with all code loaded upfront. This is the simplest approach but suitable only for smaller applications.

### When to Use
✅ Small applications (under 10,000 lines)  
✅ Proof of concepts or prototypes  
✅ Single-page applications with limited features  
✅ Learning Angular basics  

### When NOT to Use
❌ Large applications (100,000+ lines)  
❌ Multiple teams working in parallel  
❌ Applications with complex feature sets  
❌ Performance-critical applications  
❌ Expected significant growth  

### Implementation

```typescript
// Simple monolithic app structure
src/
├── app/
│   ├── components/
│   │   ├── dashboard.component.ts
│   │   ├── products.component.ts
│   │   └── users.component.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   └── user.service.ts
│   ├── app.component.ts
│   └── app.module.ts
```

### Benefits
✅ Simple to understand and set up  
✅ Minimal overhead  
✅ Easy debugging (everything in one place)  
✅ No lazy loading complexity  

### Drawbacks
❌ Becomes unwieldy as application grows  
❌ Difficult for large teams  
❌ Poor initial load time for large apps  
❌ Hard to optimize selectively  

---

## 4. Micro Frontend Architecture

Decompose your application into smaller, semi-independent frontend applications that work together. This is the most advanced pattern.

### When to Use
✅ Very large applications (500,000+ lines)  
✅ Multiple independent teams  
✅ Different parts use different frameworks  
✅ Need to deploy features independently  
✅ Organization-wide frontend platform  

### When NOT to Use
❌ Small to medium applications  
❌ Single team or small teams  
❌ Simpler deployment strategies preferred  
❌ Learning projects  

### Implementation Approaches

**Module Federation (Webpack):**
```typescript
// Host app - app.routes.ts
export const APP_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('dashboard/Module')
      .then(m => m.DashboardModule)
  },
  {
    path: 'products',
    loadChildren: () => import('products/Module')
      .then(m => m.ProductsModule)
  }
];
```

**Shell + Remote Architecture:**
```
Shell Application (Main Container)
├── Core Services
├── Routing
└── Remotes
    ├── Dashboard Remote
    ├── Products Remote
    └── Users Remote
```

### Benefits
✅ Complete independence of teams  
✅ Ability to use different frameworks  
✅ Independent deployment cycles  
✅ Unlimited scalability  
✅ Loose coupling between features  

### Drawbacks
❌ Significant complexity  
❌ Shared state management challenges  
❌ Potential bundle size duplication  
❌ Testing complexity  

---

## 5. Deciding: Which Architecture Should You Choose?

Use this decision matrix to select the right architecture:

| Aspect | Monolithic | Module-Based | Feature-Based | Micro Frontend |
|--------|-----------|--------------|---------------|---|
| **App Size** | Small | Medium-Large | Medium-Large | Very Large |
| **Team Size** | 1-2 | 3-10 | 3-10 | 10+ |
| **Complexity** | Low | Medium | Medium | High |
| **Learning Curve** | Easy | Medium | Medium-Hard | Hard |
| **Deployment** | Single | Versioned | Versioned | Independent |
| **Bundle Size** | Small | Medium | Medium-Small | Varies |
| **Initial Setup** | Quick | Moderate | Quick | Complex |

---

## 6. Best Practices for Scalable Architecture

### Rule 1: Establish Clear Boundaries
Define what belongs in each feature, module, or micro frontend. Enforce these boundaries with code reviews and linting rules.

### Rule 2: Centralize Shared Logic
Use a `shared` or `core` module/directory for utilities, components, and services used across features.

### Rule 3: Version Your API Contracts
When sharing data between features, define clear interfaces and maintain backwards compatibility.

### Rule 4: Plan for Growth
Choose architecture based on where your application will be in 18-24 months, not where it is today.

### Rule 5: Use Lazy Loading Strategically
Lazy load entire features, not individual components. This provides real performance benefits.

### Rule 6: Monitor Your Architecture
Regularly review dependency graphs and module interactions. Use tools like `nx` to enforce architectural rules.

---

## 7. Migration Path

### From Monolithic to Module-Based
1. Create a `core` module with services
2. Create a `shared` module with common components
3. Convert main components to feature modules
4. Add lazy loading routes
5. Move components into appropriate modules

### From Module-Based to Feature-Based
1. Identify all modules
2. Convert declarations to standalone components
3. Replace module routing with feature routes
4. Remove unnecessary `NgModule` declarations
5. Use `providedIn: 'root'` for services

### Adding Micro Frontends
1. Extract largest features as remotes
2. Set up module federation
3. Create shared library for common services
4. Test integration thoroughly
5. Plan deployment strategy

---

## Conclusion

There's no "best" architecture—only the best architecture for your **current situation and future direction**. Start simple with feature-based architecture for new projects. Scale to module-based when teams grow. Consider micro frontends only when you've genuinely outgrown module-based architecture.

Remember: **Good architecture is invisible.** It enables your team to work efficiently without thinking about structural constraints. The best architecture is the one that solves your specific problems and scales with your team.

---

## References

This guide is based on and inspired by:
- **[Angular Architecture Patterns That Actually Scale (And When to Use Them)](https://dev.to/ojasdeshpande/angular-architecture-patterns-that-actually-scale-and-when-to-use-them-k6k)** 
- Angular Official Documentation: [Styleguide](https://angular.io/guide/styleguide)
- Angular Official Documentation: [Lazy Loading Routes](https://angular.io/guide/lazy-loading-ngmodules)
- Angular Official Documentation: [Standalone Components](https://angular.io/guide/standalone-components)
