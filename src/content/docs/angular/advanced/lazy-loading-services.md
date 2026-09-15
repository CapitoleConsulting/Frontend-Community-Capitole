---
title: Lazy Loading Services
description: Master lazy-loaded services in Angular 22 with injectAsync. Load heavy services on-demand, optimize bundle size, and implement smart prefetching strategies.
sidebar.order: 4
---

## Overview

Services registered in the root injector are downloaded with the main bundle, even if they're rarely used. Angular 22 introduces `injectAsync` to solve this: load services on-demand, keeping them out of the initial bundle.

**Perfect for:**
- Heavy services (PDF generators, charting libraries, editors)
- Services rarely used or feature-gated
- Large third-party integrations
- Services triggered by user actions

---

## The Problem

Consider a sales offer page where users spend most time filling forms and saving drafts. At the bottom is a "Download PDF" button that requires an expensive export service with PDF rendering, DOM-to-image, and related dependencies.

With standard `inject()`, every user downloads this heavy service, even those who only save a draft and close the tab. Route-level lazy loading doesn't help—the page itself is already open, so the service travels inside the downloaded chunk anyway.

Before Angular 22, you had to manually inject the `Injector`, write dynamic imports by hand, and extract the instance. Verbose and rarely done.

---

## The New API: injectAsync

`injectAsync` is stable since Angular 22 and signals to your bundler to split the service into its own chunk:

```typescript
import { Component, injectAsync } from '@angular/core';

@Component({
  selector: 'app-offer-page',
  template: `...`
})
export class OfferPageComponent {
  private readonly pdfExport = injectAsync(() =>
    import('@example/util-pdf-export').then((m) => m.PdfExportService)
  );

  protected async onDownloadPdf(): Promise<void> {
    const pdfExport = await this.pdfExport();
    await pdfExport.exportComponentToPdf({
      component: OfferDocument,
      inputs: { data: this.readonlyData() },
      fileName: `offer-${this.offerId}.pdf`
    });
  }
}
```

**What happens:**

1. The dynamic `import()` tells the bundler to split `@example/util-pdf-export` into a separate JavaScript file
2. `this.pdfExport()` is in a field initializer, where the injection context exists (like `inject()`)
3. `await this.pdfExport()` inside the click handler fetches the file and builds the service instance
4. The second call costs no network traffic—Angular caches the promise

---

## Requirement: Service Must Be Auto-Provided

When the chunk lands, Angular needs a provider ready to build the instance. The service must register itself:

**Using @Injectable:**

```typescript
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  constructor(private http: HttpClient) { }

  exportComponentToPdf(options: ExportOptions): Promise<Blob> {
    // Implementation
  }
}
```

**Using @Service (Angular 22 shorthand):**

```typescript
import { Service } from '@angular/core';

@Service()
export class PdfExportService {
  private readonly http = inject(HttpClient);

  exportComponentToPdf(options: ExportOptions): Promise<Blob> {
    // Implementation
  }
}
```

`@Service()` automatically registers in root scope, covering the common case.

**With custom scoping:**

```typescript
@Service({ autoProvided: false })
export class TabRegistry {
  // Provided manually in a route or component
}
```

Services with `autoProvided: false` cannot be used with `injectAsync` since there's no provider waiting on the other side.

---

## Default Exports

When the service is the default export, the `.then()` step is unnecessary:

```typescript
@Service()
export default class PdfExportService {
  // ...
}

// Usage — import directly
private readonly pdfExport = injectAsync(() =>
  import('@example/util-pdf-export')
);
```

---

## Prefetching Strategies

Loading on-demand moves the download to the worst moment: right after the click. Users wait for the network before anything happens.

Start the download earlier with the `prefetch` option:

### Prefetch on Idle

Wait for a quiet moment in the browser:

```typescript
import { Component, injectAsync, onIdle } from '@angular/core';

@Component({ /* ... */ })
export class OfferPageComponent {
  private readonly pdfExport = injectAsync(
    () => import('@example/util-pdf-export').then((m) => m.PdfExportService),
    { prefetch: onIdle }
  );
}
```

Add a timeout for pages that never go quiet:

```typescript
{ prefetch: () => onIdle({ timeout: 1_000 }) }
```

The prefetch is a head start, not a requirement. If a user clicks before the background download begins, the normal on-demand path kicks in.

### Prefetch on Element Hover

Hovering on a button is a strong commitment to use it. Prefetch the service when the pointer approaches:

```typescript
import {
  Component,
  injectAsync,
  ElementRef,
  viewChild
} from '@angular/core';

@Component({
  selector: 'app-offer-page',
  template: `
    <button
      #pdfBtn
      (click)="onDownloadPdf()"
      [disabled]="isExporting()"
    >
      {{ isExporting() ? 'Generating…' : 'Download PDF' }}
    </button>
  `
})
export class OfferPageComponent {
  private readonly pdfButton = viewChild('pdfBtn', {
    read: ElementRef<HTMLElement>
  });

  private readonly pdfExport = injectAsync(
    () => import('@example/util-pdf-export').then((m) => m.PdfExportService),
    { prefetch: onElementEvent(() => this.pdfButton()) }
  );
}
```

The `onElementEvent` helper watches for pointer hover or keyboard focus on the button and starts the download.

### Custom Prefetch Trigger

Triggers are functions that return promises. Implement any signal you can observe:

```typescript
import {
  effect,
  ElementRef,
  inject,
  Injector,
  type EffectRef,
  type PrefetchTrigger
} from '@angular/core';

type ElementSource = Element | ElementRef<Element> | undefined;

export interface ElementEventTriggerOptions {
  events?: readonly string[];
  injector?: Injector;
}

export function onElementEvent(
  target: () => ElementSource,
  {
    events = ['pointerenter', 'focusin'],
    injector
  }: ElementEventTriggerOptions = {}
): PrefetchTrigger {
  const ownInjector = injector ?? inject(Injector);
  let pending: Promise<void> | undefined;

  return () => (pending ??= waitForEvent(target, events, ownInjector));
}

function waitForEvent(
  target: () => ElementSource,
  events: readonly string[],
  injector: Injector
): Promise<void> {
  let watcher: EffectRef | undefined;

  return new Promise<void>((resolve) => {
    watcher = effect(
      (onCleanup) => {
        const el = toElement(target());
        if (!el) return;

        const controller = new AbortController();
        onCleanup(() => controller.abort());

        const onEvent = () => {
          watcher?.destroy();
          resolve();
        };

        for (const name of events) {
          el.addEventListener(name, onEvent, {
            once: true,
            signal: controller.signal
          });
        }
      },
      { injector }
    );
  });
}

function toElement(value: ElementSource): Element | undefined {
  return value instanceof ElementRef ? value.nativeElement : value;
}
```

**Custom triggers for any scenario:**

```typescript
// Prefetch on feature flag
{ prefetch: () => this.featureFlagService.whenAvailable('pdf-export') }

// Prefetch on route navigation
{ prefetch: () => this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    first()
  ).toPromise() }

// Prefetch on scroll position
{ prefetch: () => this.scrollPrefetch() }
```

---

## Bundle Verification

### Check the Network Tab

The split is visible in the browser's Network tab:

- The service chunk appears as a separate file (e.g., `util-pdf-export-VT6G3IZ5.js`)
- It's absent from the initial page load
- It appears only when the prefetch trigger fires or the service is requested
- Users who never use the feature never download it

**Size impact:**
- PDF export service: ~33 kB in development builds
- Removed from main bundle
- Downloaded only on-demand

### Name Your Chunks

Help yourself find chunks in the Network tab:

```typescript
// Good — clearly identifies the chunk content
import('@example/util-pdf-export')

// Better — explicit alias for readability
import(/* webpackChunkName: "pdf-export" */ '@example/util-pdf-export')
```

Meaningful names make verification instant: `util-pdf-export` tells you exactly what you're looking at.

---

## Critical Mistake: Don't Let It Be Imported Elsewhere

Lazy loading only works if nothing pulls the service back into the main bundle. A single ordinary import anywhere in the project is enough:

```typescript
// ❌ Bad — defeats lazy loading
import { PdfExportService } from '@example/util-pdf-export';

// ✅ Good — type-only import disappears at compile time
import type { PdfExportService } from '@example/util-pdf-export';
```

Search your codebase for other imports. For type annotations, use type-only imports, which are removed during compilation.

Rebuild and verify in the Network tab: a separate request and a smaller main bundle confirm it worked.

---

## When Lazy Loading Services Pays Off

**Worth it:**
- Heavy services (PDF generation, charting, rich editors)
- Rarely used features (analytics clients requiring consent, map SDKs)
- Large third-party integrations
- Feature-gated functionality
- Services triggered by a single user action

**Not worth it:**
- Small services with few methods and no external dependencies
- Services used throughout the component
- Services needed on component initialization
- Performance-sensitive first loads where the async boundary becomes costly

The trade-offs:

| Benefit | Cost |
|---------|------|
| Smaller main bundle | Async boundary in code |
| Reduced initial load | Prefetch logic complexity |
| On-demand loading | Slower first use (if no prefetch) |

---

## Practical Examples

### PDF Export

```typescript
@Component({
  selector: 'app-invoice'
})
export class InvoiceComponent {
  private readonly pdfExport = injectAsync(() =>
    import('@app/services/pdf-export').then(m => m.PdfExportService)
  );

  async downloadInvoice(): Promise<void> {
    const exporter = await this.pdfExport();
    const pdf = await exporter.generate({
      template: InvoiceTemplate,
      data: this.invoice()
    });
    this.downloadFile(pdf, 'invoice.pdf');
  }
}
```

### Rich Text Editor

```typescript
@Component({
  selector: 'app-editor'
})
export class EditorComponent {
  private readonly editor = injectAsync(() =>
    import('@app/services/rich-editor').then(m => m.RichEditorService),
    { prefetch: onIdle }
  );

  async initializeEditor(): Promise<void> {
    const editorService = await this.editor();
    return editorService.initialize(this.editorContainer);
  }
}
```

### Analytics with Consent

```typescript
@Component({
  selector: 'app-root'
})
export class AppComponent implements OnInit {
  private readonly analytics = injectAsync(() =>
    import('@app/services/analytics').then(m => m.AnalyticsService),
    { prefetch: () => this.consentService.userConsented() }
  );

  ngOnInit(): void {
    this.consentService.consent$.subscribe(async (consented) => {
      if (consented) {
        const analytics = await this.analytics();
        analytics.track('user_consented');
      }
    });
  }
}
```

---

## Global Configuration

Control idle-time behavior project-wide:

```typescript
import { provideIdleServiceWith } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideIdleServiceWith(MyCustomIdleService)
  ]
};
```

---

## Best Practices

1. **Keep services focused** — One heavy dependency per chunk makes naming meaningful
2. **Verify in the browser** — Always check the Network tab to confirm the split
3. **Use type-only imports** — Prevent accidental re-imports pulling the service back
4. **Match prefetch to user intent** — Hover is better than idle for action buttons
5. **Test without prefetch** — Ensure the async boundary works under all conditions
6. **Document the lazy load** — Comment why a service is split to prevent future mistakes

---

## References

- [Lazy Loading Services in Angular 22](https://angular.love/lazy-loading-services-in-angular-22)[^1]
- [Angular injectAsync Documentation](https://angular.io/api/core/injectAsync)[^2]
- [Angular Code Splitting Guide](https://angular.io/guide/lazy-loading-ngmodules)[^3]

[^1]: Stefańczyk, Mateusz. "Lazy Loading Services in Angular 22." Angular.love, August 11, 2026.
[^2]: Angular Documentation. "injectAsync API Reference." Angular.io.
[^3]: Angular Documentation. "Code Splitting and Lazy Loading Guide." Angular.io.
