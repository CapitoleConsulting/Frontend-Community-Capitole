---
title: SSR Common Issues
description: Troubleshooting guide for Angular SSR - window is not defined, double fetching, cookies, third-party libraries and deployment problems.
sidebar.order: 3
---

Each issue follows the same structure: **symptom → cause → fix → prevention**.

---

## `window is not defined` / `document is not defined`

**Symptom**
```
ReferenceError: window is not defined
    at UserComponent.ngOnInit (main.server.mjs:1:2345)
```

**Cause**
Node.js has no DOM. `window`, `document`, `localStorage`, `sessionStorage`, `navigator` and `location` are browser globals.

**Fix 1 — Move the code to `afterNextRender`** (preferred)

```typescript
import { afterNextRender } from '@angular/core';

export class ThemeComponent {
  constructor() {
    afterNextRender(() => {
      this.theme = localStorage.getItem('theme') ?? 'light';
    });
  }
}
```

**Fix 2 — Platform guard** when you genuinely need a branch

```typescript
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export class GeoService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Returns null on the server, where the Geolocation API is unavailable.
   */
  getPosition(): Promise<GeolocationPosition> | null {
    return this.isBrowser ? this.requestPosition() : null;
  }
}
```

**Fix 3 — Inject `DOCUMENT` instead of using the global**

```typescript
import { DOCUMENT } from '@angular/common';

private readonly doc = inject(DOCUMENT);
// Works on both platforms: on the server it is a Domino document.
```

**Prevention**
Add an ESLint rule banning direct use of browser globals, and always run `ng build && node dist/.../server.mjs` in CI, not only `ng serve`.

---

## Every API call happens twice

**Symptom**
The Network tab shows the same `GET /api/products` executed on the server and again in the browser. The list flickers.

**Cause**
`TransferState` deduplication is not active.

**Fix**

```typescript
providers: [
  provideClientHydration(),
  provideHttpClient(withFetch()), // ← mandatory
]
```

Only `GET` and `HEAD` are cached automatically. For `POST` you must opt in per request:

```typescript
this.http.post<Result>('/api/search', body, {
  transferCache: { includeHeaders: [] },
});
```

**Prevention**
Add an assertion in your smoke tests: after loading a page, no request should be repeated.

---

## Hydration mismatch `NG0500` / `NG0505`

See the dedicated section in [Hydration](/angular/ssr/hydration/#hydration-mismatches).

Quick triage:

| Warning | Most likely cause |
| --- | --- |
| `NG0500` | Node count differs — invalid HTML nesting or manual DOM insertion |
| `NG0501` | Text content differs — non-deterministic value (date, random) |
| `NG0502` | Node type differs — conditional rendering based on browser API |
| `NG0505` | Hydration enabled but no server-rendered markup found |

---

## Authentication and cookies do not work on the server

**Symptom**
Server-rendered pages always show the logged-out state, then flip to logged-in after hydration.

**Cause**
The server-side `fetch` has no browser cookie jar. The incoming request cookies are never forwarded to your API.

**Fix**
Forward the request headers using the `REQUEST` token and a functional interceptor:

```typescript
import { REQUEST } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Without this, authenticated pages render logged-out on the server.
 */
export const serverAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const request = inject(REQUEST, { optional: true });
  const cookie = request?.headers.get('cookie');

  return cookie
    ? next(req.clone({ setHeaders: { cookie } }))
    : next(req);
};
```

Register it only in `app.config.server.ts`.

:::danger
Never forward cookies to third-party domains. Restrict the interceptor to your own API origin, otherwise you are leaking session tokens.
:::

**Prevention**
For highly personalised routes, consider `RenderMode.Client` instead: SSR adds complexity with no SEO benefit behind a login.

---

## Third-party library crashes on the server

**Symptom**
```
TypeError: Cannot read properties of undefined (reading 'documentElement')
```
from a charting, map or editor library.

**Cause**
The library touches the DOM at import time.

**Fix — Lazy import inside `afterNextRender`**

```typescript
constructor() {
  afterNextRender(async () => {
    const { Chart } = await import('chart.js/auto');
    new Chart(this.canvas.nativeElement, this.config);
  });
}
```

Combine with `@defer` so the chunk never reaches the server bundle:

```html
@defer (on viewport) {
  <app-sales-chart [data]="data()" />
} @placeholder {
  <div class="chart-skeleton"></div>
}
```

**Prevention**
Prefer libraries that declare SSR support. Check that they do not access `window` at module scope.

---

## Node.js native addons break the SSR build

**Symptom**
The `server` build fails with `Cannot find module './build/Release/xxx.node'`, or the bundle tries to inline a `.node` binary.

**Cause**
The esbuild-based builder tries to bundle a native dependency.

**Fix**
Mark it as external in `angular.json`:

```json
{
  "server": "src/main.server.ts",
  "externalDependencies": ["sharp", "better-sqlite3"]
}
```

**Prevention**
Keep native dependencies out of the Angular server bundle entirely: put them behind a separate API process whenever possible.

---

## Memory grows on every request

**Symptom**
The Node process memory climbs steadily under load and eventually OOMs.

**Cause**
Module-level mutable state. On the server, module scope is shared between **all** requests — it is not per-user.

```typescript
// ❌ Shared by every visitor, leaks and cross-contaminates data
let currentUser: User | null = null;
```

**Fix**
Keep all state inside Angular services scoped to the request injector. Never store per-user data in module-level variables or static fields.

**Prevention**
Code review rule: no `let` or mutable `export const` at module scope in code reachable from the server bundle.

---

## Routes return 404 after deployment

**Symptom**
`/` works, `/products/42` returns 404 from the reverse proxy.

**Cause**
The proxy is serving static files only and never reaches the Node server.

**Fix**
Route all non-asset traffic to the SSR process:

```nginx
location / {
  try_files $uri @ssr;
}

location @ssr {
  proxy_pass http://127.0.0.1:4000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Prevention**
Include a deep-link smoke test (`curl /products/42`) in the deployment pipeline.

---

## SSR is slower than CSR

**Symptom**
TTFB jumps from 50 ms to 900 ms.

**Cause (in order of likelihood)**
1. Slow upstream API calls executed synchronously during rendering.
2. No caching layer in front of the SSR server.
3. Rendering routes that should be prerendered.
4. Zone.js waiting for a never-completing pending task (long-poll, `setInterval`).

**Fix**
- Move eligible routes to `RenderMode.Prerender`.
- Put a CDN or reverse-proxy cache in front for anonymous traffic.
- Set explicit timeouts on server-side HTTP calls.
- Never start `setInterval` or WebSocket connections outside `afterNextRender`.

**Prevention**
Track TTFB as an SLO, not only Lighthouse scores.

---

## Diagnostic commands

```bash
# Is the server actually rendering content?
curl -s http://localhost:4000/products/42 | grep -c 'app-root'

# Inspect meta tags in the raw response
curl -s http://localhost:4000/ | grep -E 'og:|<title>'

# Check for a memory leak under load
node --inspect dist/my-app/server/server.mjs
```

---

## Related

- [SSR & Rendering](/angular/ssr/)
- [Hydration](/angular/ssr/hydration/)
- [Troubleshooting](/angular/troubleshooting/)
