---
title: Inputs, Outputs & Two-Way Binding
description: Passing data between components using signal inputs, function-based outputs, and model inputs in Angular 18+.
sidebar:
  order: 2
---

## Component Inputs — Receiving Data

### Signal Inputs (Angular 18+ — Recommended)

Signal inputs are the modern, type-safe, and reactive way to receive data from parent components:

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `
    <div class="card">
      <h3>{{ name() }}</h3>
      <p>{{ email() }}</p>
    </div>
  `
})
export class UserCardComponent {
  name = input.required<string>();
  email = input<string>('');
  showAvatar = input<boolean>(false);
}
```

Usage in the parent template:

```html
<app-user-card
  [name]="'Alice Johnson'"
  [email]="'alice@example.com'"
  [showAvatar]="true"
/>
```

**Key points about signal inputs:**

- `input.required<T>()` — The parent **must** provide a value.
- `input<T>(defaultValue)` — Optional with a default value.
- Accessed via function call syntax: `this.name()`.
- Fully reactive — works seamlessly with `computed()` and `effect()`.

### Input Transforms

Apply transformations when a value is received:

```ts
import { Component, input, booleanAttribute, numberAttribute } from '@angular/core';

@Component({
  selector: 'app-paginator',
  template: `<span>Page {{ page() }} of {{ total() }}</span>`
})
export class PaginatorComponent {
  disabled = input(false, { transform: booleanAttribute });
  page = input(1, { transform: numberAttribute });
  total = input.required<number>();
}
```

### Decorator-based Inputs (Legacy — still supported)

```ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `<h3>{{ name }}</h3>`
})
export class UserCardComponent {
  @Input() name: string = '';
  @Input() email: string = '';
}
```

---

## Component Outputs — Emitting Events

### Function-based Outputs (Angular 18+ — Recommended)

```ts
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `
    <div class="card">
      <h3>{{ name() }}</h3>
      <button (click)="onDelete()">Delete</button>
    </div>
  `
})
export class UserCardComponent {
  name = input.required<string>();
  deleted = output<string>();

  onDelete(): void {
    this.deleted.emit(this.name());
  }
}
```

In the parent:

```html
<app-user-card
  [name]="'Alice'"
  (deleted)="handleDelete($event)"
/>
```

```ts
handleDelete(userName: string): void {
  console.log(`Deleting user: ${userName}`);
}
```

### Decorator-based Outputs (Legacy — still supported)

```ts
import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-user-card',
  template: `<button (click)="sendMessage()">Click</button>`
})
export class UserCardComponent {
  @Output() messageSent = new EventEmitter<string>();

  sendMessage(): void {
    this.messageSent.emit('Hello from child!');
  }
}
```

---

## Model Inputs — Two-Way Binding (Angular 18+)

For two-way data binding between parent and child, use `model()`:

```ts
import { Component, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  template: `
    <button (click)="toggle()">
      {{ isActive() ? 'ON' : 'OFF' }}
    </button>
  `
})
export class ToggleComponent {
  isActive = model<boolean>(false);

  toggle(): void {
    this.isActive.update(value => !value);
  }
}
```

In the parent — use the banana-in-a-box syntax:

```html
<app-toggle [(isActive)]="showPanel" />
```

---

## Summary

| Feature | Legacy Syntax | Modern Syntax (Angular 18+) |
|---------|---------------|----------------------------|
| Inputs | `@Input() name: string` | `name = input<string>()` |
| Required inputs | `@Input({ required: true })` | `name = input.required<string>()` |
| Outputs | `@Output() event = new EventEmitter()` | `event = output<T>()` |
| Two-way binding | `@Input()` + `@Output()` pair | `value = model<T>()` |

---

## References

- [How to Build Your Own Angular Components: From Beginner to Advanced](https://medium.com/@n.wocke/how-to-build-your-own-angular-components-from-beginner-to-advanced-974fa8784383)
- [Mastering Angular Components in 2025](https://medium.com/@gitesh08/mastering-angular-components-in-2025-01a8bdf4e0ce)
- [Angular Official Documentation — Components](https://angular.dev/guide/components)
