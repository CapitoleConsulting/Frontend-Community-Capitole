---
title: SEO & Meta Tags
description: Indexing, titles, canonical URLs, Open Graph and social media previews in Angular SSR applications.
sidebar.order: 2
---

## Why this needs SSR

Search engine crawlers execute JavaScript, but with a delay and a limited budget. **Social media scrapers do not execute JavaScript at all.** Slack, WhatsApp, LinkedIn, X and Facebook read the raw HTML response, look for `<meta property="og:...">` and stop there.

That means:

- A CSR-only Angular app will always show an empty or generic link preview.
- Setting meta tags in `ngOnInit` works for SEO *eventually*, but never for social previews unless the page is server-rendered.

The requirement is therefore: **meta tags must be present in the first HTML response**.

---

## The `Title` and `Meta` services

```typescript
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface PageSeo {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: 'website' | 'article';
}

/**
 * Avoids scattered Meta.updateTag calls and guarantees that every page
 * sets a consistent set of tags.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private static readonly DEFAULT_IMAGE = 'https://example.com/og-default.png';

  /**
   * Existing tags with the same name/property are replaced, not duplicated.
   */
  apply(seo: PageSeo): void {
    const image = seo.image ?? SeoService.DEFAULT_IMAGE;

    this.title.setTitle(seo.title);

    this.meta.updateTag({ name: 'description', content: seo.description });

    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: seo.url });
    this.meta.updateTag({ property: 'og:type', content: seo.type ?? 'website' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }
}
```

:::caution
Always use `updateTag`, never `addTag`. On a client-side navigation `addTag` appends a second tag and crawlers may pick the wrong one.
:::

---

## Where to call it

### Option A — Route `title` for the simple case

```typescript
export const routes: Routes = [
  { path: 'about', component: AboutPage, title: 'About us | Example' },
];
```

For dynamic titles, provide a `TitleStrategy`:

```typescript
import { Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  /**
   * Appends the brand name and provides a fallback when a route
   * does not declare a title.
   */
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const resolved = this.buildTitle(snapshot);
    this.title.setTitle(resolved ? `${resolved} | Example` : 'Example');
  }
}
```

Register it with `{ provide: TitleStrategy, useClass: AppTitleStrategy }`.

### Option B — Resolver, so tags exist before the component renders

This is the reliable option for SSR: the resolver runs **during** server rendering, so the tags are in the first response.

```typescript
export const productSeoResolver: ResolveFn<Product> = (route) => {
  const api = inject(ProductApi);
  const seo = inject(SeoService);
  const id = route.paramMap.get('id')!;

  return api.getById(id).pipe(
    tap((product) =>
      seo.apply({
        title: product.name,
        description: product.shortDescription,
        image: product.imageUrl,
        url: `https://example.com/products/${product.slug}`,
        type: 'article',
      }),
    ),
  );
};
```

:::danger
Calling `seo.apply()` inside `afterNextRender` or `ngAfterViewInit` means it never runs on the server. The tags will be missing from the HTML response and social previews will stay empty.
:::

---

## Canonical URL

Duplicate content across `?utm_source=...` variants damages ranking. Emit a canonical link on every page:

```typescript
import { DOCUMENT } from '@angular/common';

setCanonical(url: string): void {
  const doc = inject(DOCUMENT);
  let link = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    doc.head.appendChild(link);
  }

  link.setAttribute('href', url);
}
```

Always inject `DOCUMENT` instead of using the global `document`, so the code also works on the server.

---

## Structured data (JSON-LD)

Rich results (stars, breadcrumbs, prices) require JSON-LD in the head.

```typescript
/**
 * Replaces any previously injected schema to avoid duplicates on navigation.
 */
setJsonLd(schema: Record<string, unknown>): void {
  const doc = inject(DOCUMENT);
  doc.getElementById('app-jsonld')?.remove();

  const script = doc.createElement('script');
  script.id = 'app-jsonld';
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  doc.head.appendChild(script);
}
```

---

## `robots.txt` and `sitemap.xml`

Put `robots.txt` in `public/` (or `src/assets/` in older setups) so it is copied verbatim:

```
User-agent: *
Allow: /
Disallow: /admin/
Sitemap: https://example.com/sitemap.xml
```

Generate `sitemap.xml` at build time from the same source you use in `getPrerenderParams()`, so both stay in sync automatically.

---

## Blocking indexing of non-production environments

A staging site indexed by Google is a classic and expensive mistake.

```typescript
if (!environment.production) {
  this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
}
```

---

## Verification checklist

- [ ] `curl -s https://example.com/products/1 | grep 'og:'` returns the tags.
- [ ] Facebook Sharing Debugger renders the expected preview.
- [ ] LinkedIn Post Inspector renders the expected preview.
- [ ] Google Rich Results Test validates the JSON-LD.
- [ ] Lighthouse SEO score is 100.
- [ ] Staging environments return `noindex`.

---

## Related

- [SSR & Rendering](/angular/ssr/)
- [SSR Common Issues](/angular/ssr/common-issues/)
- [Resolvers](/angular/utilities/resolvers/)
