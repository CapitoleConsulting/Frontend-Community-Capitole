---
title: SSR & Rendering
description: Server-Side Rendering, prerendering and hybrid rendering in Angular. Concepts, setup and decision criteria.
sidebar.order: 0
---

## Overview

Angular can render an application in three different places, and modern Angular lets you mix all of them in the same project:

| Mode | When HTML is produced | Best for |
| --- | --- | --- |
| **CSR** (Client-Side Rendering) | In the browser, at runtime | Private dashboards, internal tools, admin panels |
| **SSR** (Server-Side Rendering) | On the server, per request | Content that depends on the user or on fresh data |
| **SSG / Prerender** (Static Site Generation) | At build time | Marketing pages, docs, blogs, catalogues |

Choosing correctly is mostly a business decision, not a technical one. The rule of thumb:

- If the page must be indexed by search engines or shared on social media → **SSR or SSG**.
- If the content is identical for every user and changes rarely → **SSG**.
- If the content is personalised or changes per request → **SSR**.
- If the page is behind a login and SEO is irrelevant → **CSR** (cheaper and simpler).

---

## Why SSR

### Perceived performance
With CSR the browser downloads an almost empty `index.html`, then the JS bundle, then bootstraps Angular, then fetches data. The user stares at a blank screen during the whole chain. With SSR the first HTTP response already contains meaningful HTML, so **FCP** (First Contentful Paint) and **LCP** (Largest Contentful Paint) improve dramatically.

### SEO and social previews
Most crawlers execute JavaScript today, but they do it with a delay and a budget. Social media scrapers (Slack, WhatsApp, LinkedIn, X) **do not execute JavaScript at all**. Without SSR/SSG your Open Graph previews will be empty. See [SEO & Meta Tags](/angular/ssr/seo-meta-tags/).

### What SSR does NOT fix
- It does not make your bundle smaller.
- It does not make **TTI** (Time To Interactive) better by itself — it can even make it worse if hydration is not configured properly.
- It does not remove the need for good change detection and lazy loading.

---

## Setup

### New project

```bash
ng new my-app --ssr
```

### Existing project

```bash
ng add @angular/ssr
```

This adds:

- `server.ts` — the Node/Express entry point.
- `app.config.server.ts` — server-specific providers.
- A `server` build target in `angular.json`.
- `provideClientHydration()` in `app.config.ts`.

Minimal `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
  ],
};
```

:::caution
`withFetch()` is not optional in practice. Without it, `HttpClient` uses `XMLHttpRequest`, which does not exist on the server and breaks `TransferState` deduplication.
:::

---

## Hybrid rendering with route-level rendering modes

Since Angular 19 you can declare the rendering mode **per route** in a `app.routes.server.ts` file. This is the single most useful SSR feature: you no longer have to choose one mode for the whole application.

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static marketing page, generated at build time
  { path: '', renderMode: RenderMode.Prerender },

  // Product pages: prerender a known set of ids
  {
    path: 'products/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const ids = await fetch('https://api.example.com/product-ids').then(r => r.json());
      return ids.map((id: string) => ({ id }));
    },
  },

  // Personalised, rendered per request
  { path: 'account/**', renderMode: RenderMode.Server },

  // Behind login, no SEO value: keep it client-side
  { path: 'admin/**', renderMode: RenderMode.Client },

  // Everything else
  { path: '**', renderMode: RenderMode.Server },
];
```

Register it in `app.config.server.ts`:

```typescript
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

### Decision table

| Route characteristics | Recommended mode |
| --- | --- |
| Same HTML for everyone, changes on deploy | `Prerender` |
| Same HTML for everyone, changes often | `Server` + HTTP cache / CDN |
| Depends on cookies, headers or session | `Server` |
| Requires `localStorage`, geolocation, canvas | `Client` |
| Authenticated area, no SEO | `Client` |

---

## Avoiding double data fetching

Without `TransferState`, every HTTP request executed during server rendering is executed **again** in the browser after hydration. You pay twice and the user may see a flicker.

Angular solves it automatically when you use `provideClientHydration()` + `provideHttpClient(withFetch())`: `GET` and `HEAD` responses are serialised into the HTML and replayed on the client.

For non-HTTP state, use `TransferState` explicitly:

```typescript
import { inject, makeStateKey, TransferState } from '@angular/core';

const CONFIG_KEY = makeStateKey<AppConfig>('app-config');

export function loadConfig(): AppConfig {
  const transferState = inject(TransferState);

  if (transferState.hasKey(CONFIG_KEY)) {
    return transferState.get(CONFIG_KEY, DEFAULT_CONFIG);
  }

  const config = readConfigFromDisk();
  transferState.set(CONFIG_KEY, config);
  return config;
}
```

:::danger
Never put secrets (API keys, internal URLs, tokens) in `TransferState`. Its content is serialised as plain text inside the HTML and is visible to anyone with "View source".
:::

---

## Running and verifying

```bash
# Build browser + server bundles
ng build

# Run the SSR server
node dist/my-app/server/server.mjs
```

Verify that SSR is really working:

```bash
# Should contain your rendered markup, not an empty <app-root></app-root>
curl -s http://localhost:4000/ | head -50
```

Checklist:

- [ ] `curl` returns real content, not just `<app-root></app-root>`.
- [ ] No `NG0500`/`NG0505` hydration warnings in the browser console.
- [ ] The Network tab shows **no duplicated** API calls after load.
- [ ] Meta and Open Graph tags are present in the raw HTML.

---

## Next steps

- [Hydration](/angular/ssr/hydration/) — full, incremental and event replay.
- [SEO & Meta Tags](/angular/ssr/seo-meta-tags/) — indexing and social previews.
- [SSR Common Issues](/angular/ssr/common-issues/) — `window is not defined` and friends.
