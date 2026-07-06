---
title: Content Projection
description: Building flexible and reusable component layouts using ng-content and multi-slot projection.
sidebar:
  order: 5
---

## Content Projection

Content projection lets a parent inject content into a child component's template, creating flexible and reusable layouts. It's Angular's equivalent of "slots" in other frameworks.

---

## Single-Slot Projection

The simplest form — everything the parent places inside the component tags is projected into a single `<ng-content />`:

```ts
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <ng-content />
    </div>
  `,
  styles: [`.card { border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; }`]
})
export class CardComponent {}
```

Usage:

```html
<app-card>
  <h3>Card Title</h3>
  <p>This content is projected inside the card.</p>
</app-card>
```

---

## Multi-Slot Projection

Use the `select` attribute to define multiple named slots:

```ts
@Component({
  selector: 'app-dialog',
  template: `
    <div class="dialog">
      <header>
        <ng-content select="[dialog-title]" />
      </header>
      <main>
        <ng-content />
      </main>
      <footer>
        <ng-content select="[dialog-actions]" />
      </footer>
    </div>
  `
})
export class DialogComponent {}
```

Usage:

```html
<app-dialog>
  <h2 dialog-title>Confirm Deletion</h2>
  <p>Are you sure you want to delete this item?</p>
  <div dialog-actions>
    <button (click)="cancel()">Cancel</button>
    <button (click)="confirm()">Delete</button>
  </div>
</app-dialog>
```

**How `select` works:**

- `select="[attr]"` — Matches elements with the attribute.
- `select=".class"` — Matches elements with the CSS class.
- `select="element"` — Matches elements by tag name.
- No `select` — Catches all remaining unmatched content (default slot).

---

## Conditional Projection with `@if`

Combine content projection with conditional rendering:

```ts
@Component({
  selector: 'app-expandable-panel',
  template: `
    <div class="panel">
      <header (click)="expanded.update(v => !v)">
        <ng-content select="[panel-title]" />
        <span>{{ expanded() ? '▼' : '►' }}</span>
      </header>
      @if (expanded()) {
        <div class="body">
          <ng-content />
        </div>
      }
    </div>
  `
})
export class ExpandablePanelComponent {
  expanded = signal(false);
}
```

---

## References

- [Mastering Angular Components in 2025](https://medium.com/@gitesh08/mastering-angular-components-in-2025-01a8bdf4e0ce) — Gitesh Mahadik (2025)
- [Angular Official Documentation — Content Projection](https://angular.dev/guide/components/content-projection)
