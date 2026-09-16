---
title: Build & Tooling Issues
description: Build failures, bundle size regressions, CI-only errors, peer dependency conflicts and source map problems.
sidebar.order: 4
---

## Build works locally but fails in CI

**Symptom**
`ng build` is green on your machine, red in the pipeline.

**Causes and fixes**

| Cause | Diagnosis | Fix |
| --- | --- | --- |
| Different Node version | `node -v` vs CI image | Pin with `"engines"` and `.nvmrc` |
| `npm install` vs `npm ci` | Lockfile drift | Always `npm ci` in CI; commit the lockfile |
| Case-sensitive filesystem | Works on macOS, fails on Linux | Fix the import casing; enable `forceConsistentCasingInFileNames` |
| Memory limit | `JavaScript heap out of memory` | `NODE_OPTIONS=--max-old-space-size=4096` |
| Dev-only type errors ignored | CI builds production | Run `ng build --configuration=production` locally before pushing |

:::caution
The case-sensitivity one is the most expensive to debug. `import { Foo } from './foo'` when the file is `Foo.ts` works on macOS and Windows but not on the Linux CI runner.
:::

---

## Bundle size exploded

**Symptom**
```
Warning: bundle initial exceeded maximum budget.
Budget 500 kB was not met by 380 kB with a total of 880 kB.
```

**Diagnosis**

```bash
ng build --stats-json
npx esbuild-visualizer --metadata dist/my-app/stats.json --open
# or
npx source-map-explorer dist/my-app/browser/*.js
```

**Common culprits**

| Culprit | Fix |
| --- | --- |
| Importing a whole library | `import { debounce } from 'lodash-es'`, never `import _ from 'lodash'` |
| Moment.js | Migrate to `date-fns` or the native `Intl` API |
| A barrel file re-exporting everything | Import from the concrete path |
| Eager feature routes | `loadComponent` / `loadChildren` |
| A heavy widget always loaded | Wrap it in `@defer (on viewport)` |
| Icon libraries | Import only the icons you use |
| Source maps in production | `"sourceMap": { "scripts": true, "hidden": true }` |

**Prevention**
Set strict budgets in `angular.json` and let the build fail rather than warn:

```json
"budgets": [
  { "type": "initial", "maximumWarning": "500kB", "maximumError": "600kB" },
  { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
]
```

---

## Peer dependency conflicts

**Symptom**
```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Cause**
A library declares a peer range that excludes your Angular version.

**Fix, in order of preference**

1. Upgrade the library to a version that supports your Angular release.
2. Check whether the library is still maintained; if not, plan its replacement.
3. As a temporary, documented measure only:

```bash
npm install --legacy-peer-deps
```

:::danger
`--legacy-peer-deps` in CI hides real incompatibilities and produces builds that fail at runtime. If you need it, open a ticket with an expiry date.
:::

**Prevention**
Before every Angular major upgrade, run `npx ng update --dry-run` and check the compatibility of each third-party package.

---

## `ng update` fails or leaves the project broken

**Recommended procedure**

```bash
# 1. Clean tree, no pending changes
git status

# 2. One major at a time, never skip versions
ng update @angular/core@19 @angular/cli@19

# 3. Run the automatic migrations offered
ng update @angular/core --migrate-only --from=18 --to=19

# 4. Then third-party packages
ng update @angular/material@19
```

**If a migration fails halfway**
`git checkout .` and redo it; partial migrations are worse than none.

**Useful standalone migrations**

```bash
ng generate @angular/core:standalone          # NgModule → standalone
ng generate @angular/core:control-flow        # *ngIf/*ngFor → @if/@for
ng generate @angular/core:signal-inputs       # @Input → input()
ng generate @angular/core:output-migration    # @Output → output()
ng generate @angular/core:signal-queries      # @ViewChild → viewChild()
ng generate @angular/core:inject              # constructor DI → inject()
```

---

## NG0912 — Component ID generation collision

**Symptom**
```
NG0912: Component ID generation collision detected.
Components 'FooComponent' and 'BarComponent' with selector '...' generated the same component ID.
```

**Cause**
Two components share the same selector, inputs, outputs and template metadata — usually copy-pasted placeholders.

**Fix**
Give them distinct selectors or genuinely distinct metadata. If they are identical, delete one.

---

## NG05104 — Root element was not found

**Symptom**
Blank page, console shows the app root selector could not be located.

**Cause**
`index.html` does not contain `<app-root></app-root>`, or the selector was renamed in the component but not in the HTML.

**Fix**
Keep the component `selector` and the tag in [index.html] in sync. In microfrontend setups, ensure the shell actually renders the remote's mount point before bootstrapping.

---

## Source maps do not map to the original code

**Symptom**
Stack traces in production point to `main-XXXX.js:1:98765`.

**Fix**
Emit hidden source maps and upload them to your error tracker (Sentry, Datadog) instead of serving them:

```json
"sourceMap": {
  "scripts": true,
  "styles": false,
  "hidden": true,
  "vendor": false
}
```

`hidden: true` generates the `.map` files without referencing them in the bundle, so users cannot download your source but your monitoring tool can symbolicate.

---

## Styles leak between microfrontends

**Symptom**
A remote application changes the look of the shell.

**Cause**
Global styles (`styles.scss`) from the remote are injected into the shared document.

**Fix**
- Keep all styling in component styles; never rely on global stylesheets in a remote.
- Use `ViewEncapsulation.Emulated` (the default) and avoid `::ng-deep`.
- Prefix CSS custom properties per remote (`--mfe-orders-primary`).

See [Federation common issues](/angular/architecture/federation-common-issues/).

---

## Tests pass individually but fail together

**Symptom**
`ng test` fails only when the whole suite runs.

**Causes**
- Shared mutable state in a `providedIn: 'root'` service not reset between specs.
- `jasmine.clock()` or fake timers not uninstalled.
- Real timers or pending HTTP requests leaking between specs.

**Fix**

```typescript
afterEach(() => {
  httpTestingController.verify();
  TestBed.resetTestingModule();
});
```

**Prevention**
Never share module-level mutable state in test helpers; build fresh fixtures per spec.

---

## Related

- [Troubleshooting index](/angular/troubleshooting/)
- [Performance optimization](/angular/guidelines/performance-optimization/)
- [Federation common issues](/angular/architecture/federation-common-issues/)
