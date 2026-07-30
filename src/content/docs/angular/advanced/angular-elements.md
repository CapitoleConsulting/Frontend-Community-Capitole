---
title: Angular Elements
description: Build web components with Angular. Learn to create framework-agnostic custom elements using Angular Elements.
sidebar.order: 2
---

## Overview

Angular Elements lets you build native web components using Angular. This allows you to:
- Create framework-agnostic, reusable components
- Use Angular components in non-Angular applications
- Build component libraries that work anywhere
- Simplify integration between different frameworks
- Enable micro-frontend architectures

Angular Elements bridges the Angular framework and the Web Components standard, allowing Angular components to be packaged and deployed as custom HTML elements.

---

## Why Angular Elements?

### Framework Agnostic
Components work in any framework or vanilla JavaScript.

### Distribution
Share components as simple HTML elements (npm packages).

### Integration
Use Angular components in React, Vue, or vanilla applications.

### Micro Frontends
Build independent, deployable component libraries.

### Simplicity
No complex setup for consumers, just a single HTML tag.

---

## Core Concepts

### 1. What are Web Components?

Web Components are a set of standards for creating reusable custom HTML elements:

```html
<!-- Simple to use -->
<app-counter [startValue]="5"></app-counter>
<app-data-table [data]="users"></app-data-table>
```

### 2. Angular Elements Overview

Angular Elements wraps Angular components as custom elements:

```typescript
@Component({
  selector: 'app-greeting',
  template: `<p>Hello, {{ name }}!</p>`
})
export class GreetingComponent {
  @Input() name = 'World';
}
```

---

## Setup and Installation

### Step 1: Install Dependencies

```bash
npm install @angular/elements
```

### Step 2: Create a Standalone Component

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button (click)="increment()">+</button>
      <button (click)="decrement()">-</button>
    </div>
  `,
  styles: [`
    div {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      margin: 0 5px;
      padding: 8px 16px;
    }
  `]
})
export class CounterComponent {
  @Input() initialValue = 0;
  @Output() countChange = new EventEmitter<number>();

  count = 0;

  ngOnInit() {
    this.count = this.initialValue;
  }

  increment() {
    this.count++;
    this.countChange.emit(this.count);
  }

  decrement() {
    this.count--;
    this.countChange.emit(this.count);
  }
}
```

### Step 3: Define Custom Element (Standalone Approach)

```typescript
import { Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { CounterComponent } from './counter.component';

const injector = Injector.create({
  providers: []
});

const counterElement = createCustomElement(CounterComponent, { injector });
customElements.define('app-counter', counterElement);

export function defineCustomElements() {
  customElements.define('app-counter', counterElement);
}
```

**Or with bootstrapApplication:**
```typescript
import { Injector, createNgModule, NgZone } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { CounterComponent } from './counter.component';

bootstrapApplication(document.body as any, {
  providers: [
    {
      provide: 'customElements',
      useFactory: (injector: Injector) => {
        const counterElement = createCustomElement(CounterComponent, { injector });
        customElements.define('app-counter', counterElement);
      },
      deps: [Injector]
    }
  ]
});
```

### Step 4: Use in HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script src="elements.js"></script>
</head>
<body>
  <app-counter
    initialValue="10"
    (countChange)="onCountChange($event)"
  ></app-counter>

  <script>
    const counter = document.querySelector('app-counter');
    counter.addEventListener('countChange', (e) => {
      console.log('New count:', e.detail);
    });
  </script>
</body>
</html>
```

---

## Advanced Patterns

### 1. Two-Way Communication

Inputs and Outputs work automatically with web components:

```typescript
@Component({
  selector: 'app-form-input',
  template: `
    <input
      type="text"
      [value]="value"
      (input)="onChange($event)"
      placeholder="{{ placeholder }}"
    >
  `
})
export class FormInputComponent {
  @Input() placeholder = '';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  onChange(event: any) {
    this.value = event.target.value;
    this.valueChange.emit(this.value);
  }
}
```

Usage in vanilla JavaScript:

```javascript
const input = document.querySelector('app-form-input');
input.placeholder = 'Enter your name';
input.value = 'Initial value';

input.addEventListener('valueChange', (e) => {
  console.log('New value:', e.detail);
});
```

### 2. Complex Data Types

Pass objects and arrays through properties:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-user-card',
  template: `
    <div class="card">
      <h2>{{ user.name }}</h2>
      <p>Email: {{ user.email }}</p>
    </div>
  `
})
export class UserCardComponent {
  @Input() user: User;
}
```

Usage:

```javascript
const userCard = document.querySelector('app-user-card');
userCard.user = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com'
};
```

### 3. Content Projection

Support content projection in custom elements:

```typescript
@Component({
  selector: 'app-dialog',
  template: `
    <div class="dialog-backdrop" (click)="close()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>{{ title }}</h2>
          <button (click)="close()">×</button>
        </div>
        <div class="dialog-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `
})
export class DialogComponent {
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
```

Usage:

```html
<app-dialog title="Confirm Action" (closed)="onDialogClosed()">
  <p>Are you sure you want to proceed?</p>
  <button (click)="confirm()">Yes</button>
  <button (click)="cancel()">No</button>
</app-dialog>
```

### 4. View Encapsulation

Control style encapsulation:

```typescript
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-isolated-component',
  template: `<p class="text">Styled text</p>`,
  styles: [`
    .text {
      color: blue;
      font-size: 16px;
    }
  `],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class IsolatedComponent {}
```

Shadow DOM encapsulation ensures styles don't leak to parent page.

---

## Complete Example: Data Table Element

### Step 1: Create Standalone Data Table Component

```typescript
import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Column {
  field: string;
  header: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th
              *ngFor="let col of columns"
              [class.sortable]="col.sortable"
              (click)="sort(col.field)"
            >
              {{ col.header }}
              <span *ngIf="sortField === col.field">
                {{ sortOrder === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of sortedRows">
            <td *ngFor="let col of columns">
              {{ row[col.field] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    th.sortable {
      cursor: pointer;
    }
    tr:hover {
      background-color: #f9f9f9;
    }
  `],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class DataTableComponent {
  @Input() columns: Column[] = [];
  @Input() rows: any[] = [];
  @Output() rowClick = new EventEmitter<any>();

  sortField: string | null = null;
  sortOrder: 'asc' | 'desc' = 'asc';

  get sortedRows() {
    if (!this.sortField) return this.rows;

    return [...this.rows].sort((a, b) => {
      const aVal = a[this.sortField!];
      const bVal = b[this.sortField!];

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  sort(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
  }
}
```

### Step 2: Register Element (Standalone)

```typescript
import { Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { DataTableComponent } from './data-table.component';

export function setupDataTableElement(injector: Injector) {
  const tableElement = createCustomElement(DataTableComponent, {
    injector
  });
  customElements.define('app-data-table', tableElement);
}
```

**In your main.ts:**
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { Injector, runInInjectionContext } from '@angular/core';
import { AppComponent } from './app.component';
import { setupDataTableElement } from './data-table.setup';

bootstrapApplication(AppComponent).then(appRef => {
  const injector = appRef.injector;
  setupDataTableElement(injector);
});
```

### Step 3: Use Element

```html
<!DOCTYPE html>
<html>
<head>
  <script src="table-element.js"></script>
</head>
<body>
  <app-data-table></app-data-table>

  <script>
    const table = document.querySelector('app-data-table');

    table.columns = [
      { field: 'id', header: 'ID' },
      { field: 'name', header: 'Name', sortable: true },
      { field: 'email', header: 'Email', sortable: true }
    ];

    table.rows = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
    ];

    table.addEventListener('rowClick', (e) => {
      console.log('Clicked row:', e.detail);
    });
  </script>
</body>
</html>
```

---

## Building and Bundling

### Build for Production

```bash
ng build --configuration production
```

### Create Single Bundle

Combine all scripts into one file:

```bash
npm install @angular/elements @webcomponents/custom-elements
```

Use `build-elements.js` to create a single bundle:

```javascript
const fs = require('fs');
const path = require('path');
const concat = require('concat');

(async function build() {
  const files = [
    './dist/your-app/runtime.js',
    './dist/your-app/polyfills.js',
    './dist/your-app/main.js'
  ];

  await concat(files, './dist/bundle.js');
  console.log('Bundle created successfully');
})();
```

### Publish to NPM

```json
{
  "name": "@myorg/angular-elements",
  "version": "1.0.0",
  "main": "dist/bundle.js",
  "types": "dist/index.d.ts"
}
```

---

## Best Practices

### ✅ DO's

**Do create focused, single-responsibility elements**
```typescript
@Component({
  selector: 'app-button'
})
export class ButtonComponent {}

@Component({
  selector: 'app-form-field'
})
export class FormFieldComponent {}
```

**Do document properties and events**
```typescript
@Input() label: string;
@Output() valueChange: EventEmitter<any>;
```

**Do use Shadow DOM for style encapsulation**
```typescript
encapsulation: ViewEncapsulation.ShadowDom
```

**Do minimize dependencies**
```typescript
imports: [CommonModule]
```

### ❌ DON'Ts

**Don't create overly complex elements**
```typescript
@Component({
  selector: 'app-entire-dashboard'
})
```

**Don't expose internal methods**
```typescript
public internalMethod() {}
```

**Don't rely on Angular-specific features in elements**
```typescript
@Component({
  selector: 'app-element',
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

**Don't include unnecessary styles**

---

## Performance Optimization

### 1. Lazy Load Modules

```typescript
const route: Routes = [
  {
    path: 'elements',
    loadChildren: () => import('./elements/elements.module')
      .then(m => m.ElementsModule)
  }
];
```

### 2. Optimize Bundle Size

```typescript
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule]
})
export class ElementsModule {}
```

### 3. Use OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyElement {}
```

---

## Browser Support

| Browser | Support | Polyfill |
|---------|---------|----------|
| Chrome | ✅ Yes | No |
| Firefox | ✅ Yes | No |
| Safari | ✅ Yes | No |
| Edge | ✅ Yes | No |
| IE 11 | ⚠️ Limited | Required |

Use `@webcomponents/custom-elements` for older browsers.

---

## Comparison: Angular Elements vs Other Approaches

| Feature | Elements | iFrame | Micro Apps |
|---------|----------|--------|-----------|
| **Setup** | Simple | Complex | Medium |
| **Style Isolation** | Yes | Complete | Yes |
| **Bundle Size** | Medium | Small | Large |
| **Interaction** | Easy | Limited | Hard |
| **Maintenance** | Easy | Medium | Hard |

---

## Common Use Cases

### 1. Widget Library
Create reusable widgets for multiple applications.

### 2. Micro Frontends
Build independent teams' components that work together.

### 3. Design System
Distribute design system components as elements.

### 4. Third-Party Integration
Embed Angular applications in non-Angular sites.

---

## Debugging Web Components

### Chrome DevTools

Web Components are fully visible in DevTools:

```javascript
const element = document.querySelector('app-counter');
console.log(element.shadowRoot);

console.log(element.initialValue);

element.increment();
```

### Common Issues

**Properties not updating:**
```javascript
element.property = value;
element.dispatchEvent(new CustomEvent('propertyChange'));
```

**Events not firing:**
```typescript
@Output() myEvent = new EventEmitter<string>();

onClick() {
  this.myEvent.emit('value');
}
```

---

## Conclusion

Angular Elements enables you to:

- **Share Components** — Distribute as simple HTML elements
- **Integrate** — Use in any framework or vanilla JavaScript
- **Scale** — Build micro-frontend architectures
- **Simplify** — Reduce complexity for consumers

Master Angular Elements to unlock component portability and framework flexibility.

---

## References

This guide is based on and inspired by:
- [Master Angular Custom Elements Using Angular Elements](https://medium.com/@piyalidas.it/angular-custom-elements-using-angular-elements-52a49c08fa6c)
- [Angular Official Documentation - Elements](https://angular.io/guide/elements)
- [Web Components MDN Guide](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
