---
title: Dependency Injection Errors
description: NG0200, NG0201 and NG0203 explained - circular dependencies, missing providers and injection context.
sidebar.order: 2
---

## NG0201 — No provider for X

**Symptom**
```
NG0201: No provider for UserService found in NodeInjector.
```

**Cause**
The requested token is not reachable from the injector of the component that asked for it.

**Diagnosis**
Open Angular DevTools → **Injector Tree**, select the failing component and check which injectors are in the chain.

**Fix by scenario**

| Scenario | Fix |
| --- | --- |
| Application-wide singleton | `@Injectable({ providedIn: 'root' })` |
| Service only used by a lazy feature | Add it to the route's `providers` array |
| Service must be per-component instance | Add it to the component's `providers` |
| Token is an `InjectionToken` | Provide it in `bootstrapApplication` providers |
| Fails only in tests | Add the provider (or a mock) to `TestBed.configureTestingModule` |

```typescript
// Route-scoped provider: one instance per activated feature
export const routes: Routes = [
  {
    path: 'orders',
    providers: [OrdersFacade, provideOrdersApi()],
    loadChildren: () => import('./orders/orders.routes'),
  },
];
```

**Special case: the service exists but the error persists**
You probably have two copies of the same class in the bundle — usually from a library imported through two different paths, or a duplicated `node_modules` entry in a monorepo.

```bash
npm ls @my-org/shared
```

**Prevention**
Prefer `providedIn: 'root'` for stateless services; use explicit route providers when the state must die with the feature.

---

## NG0200 — Circular dependency in DI

**Symptom**
```
NG0200: Circular dependency in DI detected for ServiceA.
```

**Cause**
`ServiceA` injects `ServiceB`, which injects `ServiceA` (possibly through several hops).

**Diagnosis**
Follow the chain printed in the error. In a monorepo, a circular *file* import often causes it too — check with `madge --circular src/`.

**Fix 1 — Extract the shared concern** (best)

```
Before:  AuthService ⇄ HttpErrorService
After:   AuthService → SessionStore ← HttpErrorService
```

The cycle disappears because both depend on a third, dependency-free unit.

**Fix 2 — Invert with an event/signal**
Instead of `A` calling `B` directly, have `B` observe a signal exposed by a store both know about.

**Fix 3 — Lazy injection** (escape hatch)

```typescript
import { Injector, inject } from '@angular/core';

export class AuthService {
  private readonly injector = inject(Injector);

  /**
   * Only acceptable when the dependency is genuinely optional at construction.
   */
  private get logger(): LoggerService {
    return this.injector.get(LoggerService);
  }
}
```

**Prevention**
Enforce layering rules: `domain` must never import from `presentation`; `infrastructure` must never import from `presentation`. In Nx, use module boundary tags.

---

## NG0203 — `inject()` must be called from an injection context

**Symptom**
```
NG0203: inject() must be called from an injection context
such as a constructor, a factory function, a field initializer,
or a function used with runInInjectionContext.
```

**Cause**
`inject()` only works synchronously during construction. It fails when called:

- Inside `ngOnInit` or any lifecycle hook.
- Inside a callback (`subscribe`, `setTimeout`, `then`).
- After an `await`.
- Inside a plain function invoked at runtime.

**Fix 1 — Move to a field initializer**

```typescript
// ❌
export class UserComponent implements OnInit {
  private http!: HttpClient;
  ngOnInit(): void {
    this.http = inject(HttpClient);
  }
}

// ✅
export class UserComponent {
  private readonly http = inject(HttpClient);
}
```

**Fix 2 — Capture the injector for deferred use**

```typescript
export class ReportComponent {
  private readonly injector = inject(Injector);

  startTracking(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => this.analytics.track(this.filters()));
    });
  }
}
```

**Fix 3 — Inject before the `await`**

```typescript
// ❌ Injection context is lost after the first await
async load(): Promise<void> {
  const data = await fetchData();
  const store = inject(Store);
}

// ✅
private readonly store = inject(Store);
```

**Prevention**
Rule of thumb: **all `inject()` calls at the top of the class as `readonly` fields**. If you need one later, you needed the injector, not the service.

---

## Injection in resolvers, guards and interceptors

Functional guards, resolvers and interceptors **do** run in an injection context, so `inject()` is valid at their top level — but not inside their RxJS callbacks.

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);   // ✅ injection context
  const router = inject(Router);      // ✅

  return auth.isLoggedIn$.pipe(
    map((loggedIn) => {
      // ❌ inject() here would throw NG0203
      return loggedIn || router.createUrlTree(['/login']);
    }),
  );
};
```

---

## Multi-providers and `InjectionToken` pitfalls

**Symptom**
Your token resolves to `undefined` or only the last provider survives.

**Cause**
Missing `multi: true`, or a token declared without a factory being used before it is provided.

```typescript
export const FEATURE_INITIALIZER = new InjectionToken<(() => void)[]>(
  'FEATURE_INITIALIZER',
);

providers: [
  { provide: FEATURE_INITIALIZER, useValue: initA, multi: true },
  { provide: FEATURE_INITIALIZER, useValue: initB, multi: true },
]
```

Without `multi: true`, `initB` silently replaces `initA`.

**Prevention**
Always give `InjectionToken` a description and, when possible, a `factory` default:

```typescript
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
```

See [Injection tokens patterns](/angular/advanced/injection-tokens-patterns/).

---

## Related

- [Troubleshooting index](/angular/troubleshooting/)
- [Dependency injection guidelines](/angular/guidelines/dependency-injection/)
- [Injection tokens](/angular/advanced/injection-tokens/)
