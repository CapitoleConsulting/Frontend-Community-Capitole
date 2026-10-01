---
title: Unit Testing Components
description: Complete guide to testing Angular components with Vitest — signals, computed properties, control flow, and DOM testing.
---

## Overview

Component testing is the foundation of Angular testing. This guide covers testing standalone components using Vitest, with a focus on modern Angular 21+ patterns including signals and control flow syntax.

---

## Test Setup

### Initial Configuration

Vitest is included by default in Angular 21+. Verify in `angular.json`:

```json
{
  "architect": {
    "test": {
      "builder": "@angular/build:unit-test"
    }
  }
}
```

### Running Tests

```bash
ng test                 # Watch mode
ng test --no-watch     # Single run (CI)
ng test --coverage     # With coverage report
```

---

## Basic Component Test Structure

### TestBed Setup

Every component test starts with TestBed configuration:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**Key concepts:**
- `TestBed` — Configuration container for tests
- `ComponentFixture` — Wrapper providing testing utilities
- `component` — Direct access to TypeScript class
- `compiled` — Access to rendered HTML
- `fixture.detectChanges()` — Triggers change detection

---

## Testing Signals

Signals are functions; read them with `()`, write with `.set()` or `.update()`:

### Reading Signals

```typescript
it('should initialize with empty value', () => {
  expect(component.count()).toBe(0);
  expect(component.items()).toEqual([]);
});
```

### Writing Signals

```typescript
it('should update signal value', () => {
  component.count.set(5);
  expect(component.count()).toBe(5);

  component.count.update(val => val + 1);
  expect(component.count()).toBe(6);
});
```

### Testing Computed Signals

```typescript
export class TaskComponent {
  tasks = signal<Task[]>([]);
  
  completedCount = computed(() =>
    this.tasks().filter(t => t.completed).length
  );
}

describe('TaskComponent', () => {
  it('should calculate completed count correctly', () => {
    component.tasks.set([
      { id: 1, completed: true },
      { id: 2, completed: false },
      { id: 3, completed: true }
    ]);

    expect(component.completedCount()).toBe(2);
  });

  it('should recalculate when tasks change', () => {
    component.tasks.set([{ id: 1, completed: false }]);
    expect(component.completedCount()).toBe(0);

    component.tasks()[0].completed = true;
    component.tasks.set(component.tasks());

    expect(component.completedCount()).toBe(1);
  });
});
```

---

## Testing DOM Interactions

### Using data-testid

Always use stable selectors independent from styling:

```html
<!-- In component template -->
<button data-testid="submit-button">Submit</button>
<div data-testid="loading">Loading...</div>
<input data-testid="email-input" />
```

```typescript
it('should display button', () => {
  const button = compiled.querySelector('[data-testid="submit-button"]');
  expect(button).toBeTruthy();
});

it('should have correct button text', () => {
  const button = compiled.querySelector('[data-testid="submit-button"]');
  expect(button?.textContent).toContain('Submit');
});
```

### Understanding fixture.detectChanges()

Change detection doesn't run automatically in tests. Call `fixture.detectChanges()` after state changes:

```typescript
it('should display task in DOM', () => {
  component.task.set('Buy groceries');
  fixture.detectChanges();  // Required!

  const taskElement = compiled.querySelector('[data-testid="task"]');
  expect(taskElement?.textContent).toContain('Buy groceries');
});
```

**When to use it:**
- ✅ After signal updates before checking DOM
- ✅ After user interactions
- ✅ Already in `beforeEach` for initial render
- ❌ When testing component properties only

---

## Testing Control Flow Syntax

### Testing @if Blocks

```html
@if (isLoading()) {
  <div data-testid="spinner">Loading...</div>
}
```

```typescript
it('should show spinner when loading', () => {
  component.isLoading.set(true);
  fixture.detectChanges();

  const spinner = compiled.querySelector('[data-testid="spinner"]');
  expect(spinner).toBeTruthy();
});

it('should hide spinner when not loading', () => {
  component.isLoading.set(false);
  fixture.detectChanges();

  const spinner = compiled.querySelector('[data-testid="spinner"]');
  expect(spinner).toBeNull();
});
```

### Testing @for Loops

```html
@for (item of items(); track item.id) {
  <li data-testid="item" [data-id]="item.id">{{ item.name }}</li>
}
```

```typescript
it('should render list items', () => {
  component.items.set([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]);
  fixture.detectChanges();

  const items = compiled.querySelectorAll('[data-testid="item"]');
  expect(items).toHaveLength(2);
  expect(items[0].textContent).toContain('Item 1');
});
```

### Testing @empty Blocks

```html
@for (item of items(); track item.id) {
  <li>{{ item.name }}</li>
} @empty {
  <p data-testid="empty-state">No items yet</p>
}
```

```typescript
it('should show empty state', () => {
  component.items.set([]);
  fixture.detectChanges();

  const emptyState = compiled.querySelector('[data-testid="empty-state"]');
  expect(emptyState?.textContent).toContain('No items yet');
});
```

---

## Testing User Interactions

### AAA Pattern: Arrange, Act, Assert

```typescript
describe('Form Submission', () => {
  it('should add task on form submit', () => {
    // Arrange
    component.taskName.set('Buy milk');

    // Act
    component.addTask();

    // Assert
    expect(component.tasks()).toHaveLength(1);
    expect(component.tasks()[0].name).toBe('Buy milk');
  });
});
```

### Testing Button Clicks

```typescript
it('should increment counter on button click', () => {
  const button = compiled.querySelector(
    '[data-testid="increment-button"]'
  ) as HTMLButtonElement;

  button.click();
  fixture.detectChanges();

  expect(component.count()).toBe(1);
});
```

### Testing Input Changes

```typescript
it('should update value on input change', () => {
  const input = compiled.querySelector(
    '[data-testid="text-input"]'
  ) as HTMLInputElement;

  input.value = 'New value';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();

  expect(component.value()).toBe('New value');
});
```

### Testing Form Control State

```typescript
it('should validate email input', () => {
  const input = compiled.querySelector(
    '[data-testid="email-input"]'
  ) as HTMLInputElement;

  input.value = 'invalid-email';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();

  expect(component.isEmailValid()).toBe(false);
});
```

---

## Testing Edge Cases

### Empty and Null Values

```typescript
describe('Edge Cases', () => {
  it('should handle empty array', () => {
    component.items.set([]);
    expect(component.activeCount()).toBe(0);
  });

  it('should handle null value', () => {
    component.selectedItem.set(null);
    fixture.detectChanges();

    const detail = compiled.querySelector('[data-testid="detail"]');
    expect(detail).toBeNull();
  });
});
```

### Boundary Values

```typescript
it('should handle maximum input length', () => {
  const maxLength = 100;
  component.input.set('a'.repeat(maxLength));

  expect(component.input().length).toBe(maxLength);
});
```

### Rapid State Changes

```typescript
it('should handle rapid updates', () => {
  for (let i = 0; i < 10; i++) {
    component.count.update(val => val + 1);
  }

  expect(component.count()).toBe(10);
});
```

### Invalid Transactions

```typescript
it('should not add duplicate items', () => {
  component.addItem({ id: 1, name: 'Item' });
  component.addItem({ id: 1, name: 'Item' });

  expect(component.items()).toHaveLength(1);
});
```

---

## Testing with Dependencies

### Mocking Injected Services

```typescript
import { MyService } from './my.service';

describe('ComponentWithDependencies', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let serviceMock: jasmine.SpyObj<MyService>;

  beforeEach(async () => {
    serviceMock = jasmine.createSpyObj('MyService', ['getData']);
    serviceMock.getData.and.returnValue(of({ id: 1, name: 'Test' }));

    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        { provide: MyService, useValue: serviceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });

  it('should call service on init', () => {
    fixture.detectChanges();
    expect(serviceMock.getData).toHaveBeenCalled();
  });
});
```

### Providing Router

```typescript
import { provideRouter } from '@angular/router';

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: [provideRouter([])]
  }).compileComponents();
});
```

---

## Common Testing Patterns

### Testing Form Validation

```typescript
it('should show error message on invalid email', () => {
  component.email.set('invalid');
  fixture.detectChanges();

  const error = compiled.querySelector('[data-testid="email-error"]');
  expect(error?.textContent).toContain('Invalid email');
});
```

### Testing List Operations

```typescript
it('should delete item from list', () => {
  component.items.set([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]);

  component.deleteItem(1);
  fixture.detectChanges();

  expect(component.items()).toHaveLength(1);
  expect(component.items()[0].id).toBe(2);
});
```

### Testing Conditional Rendering

```typescript
it('should show admin panel for admins only', () => {
  component.isAdmin.set(false);
  fixture.detectChanges();

  let adminPanel = compiled.querySelector('[data-testid="admin-panel"]');
  expect(adminPanel).toBeNull();

  component.isAdmin.set(true);
  fixture.detectChanges();

  adminPanel = compiled.querySelector('[data-testid="admin-panel"]');
  expect(adminPanel).toBeTruthy();
});
```

---

## Troubleshooting

### DOM Not Updating

**Problem:** Test expects element but it's not in DOM

```typescript
// ❌ Fails
component.tasks.set([{ id: 1 }]);
const item = compiled.querySelector('[data-testid="task"]');
expect(item).toBeTruthy(); // Not found!

// ✅ Passes
component.tasks.set([{ id: 1 }]);
fixture.detectChanges();  // Add this
const item = compiled.querySelector('[data-testid="task"]');
expect(item).toBeTruthy();
```

### Router Errors

**Problem:** `NG0201: No provider found for ActivatedRoute`

```typescript
beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: [provideRouter([])]  // Add this
  }).compileComponents();
});
```

### Testing Checkbox State

**Problem:** `hasAttribute('checked')` doesn't work for form elements

```typescript
// ❌ Wrong
const checkbox = compiled.querySelector('input') as HTMLElement;
expect(checkbox.hasAttribute('checked')).toBe(true);

// ✅ Correct
const checkbox = compiled.querySelector('input') as HTMLInputElement;
expect(checkbox.checked).toBe(true);
```

---

## Best Practices

✅ **Test behavior, not implementation** — Don't test private methods
✅ **Use AAA pattern** — Arrange, Act, Assert makes tests readable
✅ **One assertion focus** — Each test should verify one thing
✅ **Use descriptive names** — Test names should explain what they verify
✅ **Keep beforeEach clean** — Only setup what's needed for all tests
✅ **Use data-testid** — Stable selectors independent of styling
✅ **Test edge cases** — Null, empty, boundary values, errors

---

## Resources

- [Angular Testing Documentation](https://angular.io/guide/testing)
- [Vitest Official Docs](https://vitest.dev/)
- [Jasmine Matchers Reference](https://jasmine.github.io/api/edge/global#expect)
