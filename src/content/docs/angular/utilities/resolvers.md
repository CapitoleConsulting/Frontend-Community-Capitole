---
title: Route Resolvers
description: Master Angular route resolvers for loading data before route activation. Learn when to use them, best practices, and modern alternatives.
sidebar.order: 1
---

## Overview

Route resolvers are a powerful Angular feature that allows you to **load data before a route is activated**. Rather than loading data inside a component's `ngOnInit`, resolvers fetch required data first, ensuring that components only render when all their dependencies are satisfied.

This guide explores route resolvers comprehensively, covering when they're valuable, how to implement them correctly, and when modern alternatives might be better suited.

---

## Why Resolvers Matter

### Guaranteed Data Availability
When a resolver completes, the component is guaranteed to have the data it needs. No need for loading states in the component—the data is already there.

### Better User Experience
Users don't navigate to a route and see a loading spinner. Instead, they wait for the data to load and then navigate to a fully-rendered component.

### Cleaner Components
Components can be simpler because they don't need to handle initial data loading logic. Data flows directly from the resolver.

### Centralized Logic
Data loading logic lives in one place (the resolver) rather than scattered across multiple components.

---

## Understanding Resolvers

### What is a Resolver?

A resolver is a service that implements the `Resolve` interface. It fetches data and returns an Observable, Promise, or value that Angular waits for before activating the route.

```typescript
export interface Resolve<T> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): 
    Observable<T> | Promise<T> | T;
}
```

### How Resolvers Work

1. User attempts to navigate to a route with a resolver
2. Resolver's `resolve()` method is called
3. Angular waits for the Observable/Promise to complete
4. Data is passed to the component via `ActivatedRoute`
5. Component renders with data already loaded

---

## Implementation Guide

### Basic Resolver Example

```typescript
// user.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from './user.service';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserResolver implements Resolve<User> {
  constructor(private userService: UserService) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<User> {
    const userId = route.paramMap.get('id');
    return this.userService.getUserById(userId!);
  }
}
```

### Registering Resolvers in Routes

**Module-Based Approach (NgModules):**
```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserDetailComponent } from './user-detail.component';
import { UserResolver } from './user.resolver';

const routes: Routes = [
  {
    path: ':id',
    component: UserDetailComponent,
    resolve: {
      user: UserResolver
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
```

**Standalone Components Approach:**
```typescript
import { Routes } from '@angular/router';
import { UserDetailComponent } from './user-detail.component';
import { UserResolver } from './user.resolver';

export const USER_ROUTES: Routes = [
  {
    path: ':id',
    component: UserDetailComponent,
    resolve: {
      user: UserResolver
    }
  }
];
```

### Accessing Resolved Data in Components

```typescript
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-user-detail',
  template: `
    <div class="user-detail">
      <h1>{{ user.name }}</h1>
      <p>Email: {{ user.email }}</p>
      <p>ID: {{ user.id }}</p>
    </div>
  `
})
export class UserDetailComponent implements OnInit {
  user: User | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.user = data['user'];
    });
  }
}
```

**With Signals (Modern Approach):**
```typescript
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  template: `
    <div class="user-detail">
      <h1>{{ user().name }}</h1>
      <p>Email: {{ user().email }}</p>
      <p>ID: {{ user().id }}</p>
    </div>
  `
})
export class UserDetailComponent implements OnInit {
  user = signal<User | null>(null);

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.user.set(data['user']);
    });
  }
}
```

### Multiple Resolvers

```typescript
export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    resolve: {
      user: UserResolver,
      stats: StatsResolver,
      notifications: NotificationsResolver
    }
  }
];
```

Accessing multiple resolved values:
```typescript
ngOnInit(): void {
  this.route.data.subscribe(data => {
    this.user = data['user'];
    this.stats = data['stats'];
    this.notifications = data['notifications'];
  });
}
```

---

## Error Handling

### Handling Resolver Errors

```typescript
// user.resolver.ts with error handling
@Injectable({
  providedIn: 'root'
})
export class UserResolver implements Resolve<User> {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<User> {
    const userId = route.paramMap.get('id');
    
    return this.userService.getUserById(userId!).pipe(
      catchError(() => {
        this.router.navigate(['/404']);
        return EMPTY;
      })
    );
  }
}
```

### Using Route Guards with Resolvers

```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      tap(isAuth => {
        if (!isAuth) {
          this.router.navigate(['/login']);
        }
      })
    );
  }
}
```

```typescript
{
  path: 'profile',
  component: ProfileComponent,
  canActivate: [AuthGuard],
  resolve: {
    profile: ProfileResolver
  }
}
```

---

## Best Practices

### ✅ DO's

**Do use resolvers for critical data**
```typescript
{
  path: ':id',
  component: UserDetailComponent,
  resolve: { user: UserResolver }
}
```

**Do handle resolver errors gracefully**
```typescript
resolve(): Observable<User> {
  return this.userService.getUser().pipe(
    catchError(() => {
      this.router.navigate(['/404']);
      return EMPTY;
    })
  );
}
```

**Do keep resolvers focused**
```typescript
@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<User> {
  constructor(private userService: UserService) {}
  
  resolve(route: ActivatedRouteSnapshot): Observable<User> {
    return this.userService.getUserById(route.paramMap.get('id')!);
  }
}
```

### ❌ DON'Ts

**Don't use resolvers for optional data**
```typescript
{
  path: 'product/:id',
  component: ProductComponent,
  resolve: {
    recommendations: RecommendationsResolver
  }
}
```

**Don't create slow resolvers**
```typescript
resolve(): Observable<Data> {
  return this.api.getData1().pipe(
    mergeMap(data1 => 
      this.api.getData2(data1.id).pipe(
        mergeMap(data2 => this.api.getData3(data2.id))
      )
    )
  );
}

resolve(): Observable<Data> {
  return forkJoin([
    this.api.getData1(),
    this.api.getData2(),
    this.api.getData3()
  ]);
}
```

**Don't forget to unsubscribe when using Observables**
```typescript
export class Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.route.data.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.user = data['user'];
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## Resolvers vs. Other Approaches

### Resolvers vs. Direct Component Loading

**Resolver Approach:**
```typescript
{
  path: 'user/:id',
  component: UserComponent,
  resolve: { user: UserResolver }
}

ngOnInit(): void {
  this.route.data.subscribe(data => this.user = data['user']);
}
```

**Direct Loading in Component:**
```typescript
{
  path: 'user/:id',
  component: UserComponent
}

ngOnInit(): void {
  this.userService.getUser(id).subscribe(user => this.user = user);
}
```

**Trade-offs:**
| Aspect | Resolver | Direct Loading |
|--------|----------|---|
| User Experience | Wait, then view fully loaded | Immediate navigation, loading spinner |
| Complexity | Routing config | Component logic |
| Testing | Easier to mock data | Requires more mocking |
| Performance | Delays navigation | Faster perceived performance |

### Resolvers vs. Signals

Modern Angular with signals offers an alternative:

```typescript
{
  path: ':id',
  component: UserComponent,
  resolve: { user: UserResolver }
}

export class UserComponent implements OnInit {
  userId = signal<string | null>(null);
  user = signal<User | null>(null);

  constructor(private route: ActivatedRoute, private userService: UserService) {
    effect(() => {
      const id = this.userId();
      if (id) {
        this.userService.getUserById(id).subscribe(
          user => this.user.set(user)
        );
      }
    });
  }

  ngOnInit(): void {
    this.userId.set(this.route.snapshot.paramMap.get('id'));
  }
}
```

---

## Modern Alternatives

### Using RxJS in Components

```typescript
export class UserComponent implements OnInit {
  user$ = new Observable<User>();

  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.user$ = this.route.paramMap.pipe(
      switchMap(params => 
        this.userService.getUserById(params.get('id')!)
      )
    );
  }
}

@if (user$ | async as user) {
  <h1>{{ user.name }}</h1>
}
```

### Using Async Pipe

```typescript
export class UserComponent {
  user$: Observable<User>;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {
    this.user$ = this.route.paramMap.pipe(
      switchMap(params => 
        this.userService.getUserById(params.get('id')!)
      )
    );
  }
}

<div *ngIf="user$ | async as user">
  <h1>{{ user.name }}</h1>
</div>
```

---

## When to Use Resolvers (Decision Guide)

### ✅ Use Resolvers When:
- **Data is required** for component to render meaningfully
- **User must have the data** to interact with the page (e.g., user details page)
- **Better UX with waiting** than showing loading spinners
- **Multiple routes** need the same data
- **Want to keep components simple** and data-focused

### ❌ Don't Use Resolvers When:
- **Data is optional** (recommendations, related items, etc.)
- **Data loads quickly** (< 100ms)
- **You need perceived performance** (fast route transitions)
- **Data frequently changes** (live updates, real-time data)
- **Component has complex loading logic** (pagination, filters)

---

## Conclusion

Route resolvers are a powerful tool for managing data loading in Angular applications. They work best for critical data that must be available before a route activates. However, they're not always the right choice.

**Key Takeaways:**
- Use resolvers for **essential data** that makes sense to load before navigation
- Combine with **error handling** to gracefully manage failures
- Consider **modern alternatives** like signals and async pipes
- Keep resolvers **simple and focused**
- Measure and optimize based on **actual user experience**

The best approach depends on your specific use case, data requirements, and desired user experience.

---

## References

This guide is based on and inspired by:
- **[Angular Router Resolvers — Everything You Need to Know](https://medium.com/@hammadch09/angular-router-resolvers-everything-you-need-to-know-9453c63075e6)**
- **[Are Angular Resolvers Still Worth It? A Comprehensive Guide](https://medium.com/@vigenhovhannisiano/are-angular-resolvers-still-worth-it-a-comprehensive-guide-e03789446318)**
- [Angular Official Documentation: Resolvers](https://angular.io/guide/router#resolving-data-before-activation)
- [Angular Official Documentation: Router API](https://angular.io/api/router)
