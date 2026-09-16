---
title: Signal Forms in Angular 21-22
description: Master Signal Forms — the new reactive forms API for Angular 21-22. Learn type-safe reactive forms with signals, validation patterns, custom controls, and migration strategies.
sidebar.order: 3
---

## Overview

Signal Forms represent a fundamental rethink of reactive forms in Angular. Introduced in Angular 21 and stabilized in Angular 22, they provide a simpler, more type-safe alternative to Reactive Forms by leveraging Angular signals.

Instead of managing form state through `FormControl`, `FormGroup`, and `FormArray` with manual subscriptions, Signal Forms keep the model as the single source of truth and synchronize automatically through signals.

**Key advantages:**
- Full type safety without manual casting
- Automatic reactivity with computed signals
- Simplified custom control creation
- Natural data binding without ControlValueAccessor ceremony
- Gradual migration path from Reactive Forms

---

## Getting Started

### Define Form State as a Signal

Start with a plain writable signal describing your form shape:

```typescript
import { signal } from '@angular/core';

export class LoginComponent {
  readonly loginModel = signal({
    email: '',
    password: ''
  });
}
```

### Create the Form with form()

Wrap the model with `form()` and declare validation rules in the schema callback:

```typescript
import { Component, signal } from '@angular/core';
import { form, required, email, minLength } from '@angular/forms/signals';

@Component({
  selector: 'app-login',
  template: `...`
})
export class LoginComponent {
  readonly loginModel = signal({
    email: '',
    password: ''
  });

  readonly loginForm = form(this.loginModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    email(schema.email, { message: 'Enter a valid email' });
    required(schema.password, { message: 'Password is required' });
    minLength(schema.password, 8, { message: 'At least 8 characters' });
  });
}
```

### Bind Fields in Template

Use the `[formField]` directive to bind controls:

```html
<form [formRoot]="loginForm">
  <div>
    <label for="email">Email</label>
    <input id="email" [formField]="loginForm.email" />
    @if (loginForm.email().invalid() && loginForm.email().touched()) {
      <div class="error">
        @for (error of loginForm.email().errors(); track error.kind) {
          <span>{{ error.message }}</span>
        }
      </div>
    }
  </div>

  <div>
    <label for="password">Password</label>
    <input id="password" type="password" [formField]="loginForm.password" />
    @if (loginForm.password().invalid() && loginForm.password().touched()) {
      <div class="error">
        @for (error of loginForm.password().errors(); track error.kind) {
          <span>{{ error.message }}</span>
        }
      </div>
    }
  </div>

  <button [disabled]="loginForm().invalid()">Log in</button>
</form>
```

Remember to import `FormField` and `FormRoot`:

```typescript
import { FormField, FormRoot } from '@angular/forms/signals';

@Component({
  imports: [FormField, FormRoot]
})
export class LoginComponent { }
```

---

## Type Safety – End of Compromises

### Problem 1: Nullable Everywhere

In Reactive Forms, every control defaults to `T | null`:

```typescript
// Reactive Forms
const emailControl = new FormControl('');
// Type: FormControl<string | null> — always nullable!

// Signal Forms — type from model
const model = signal({ email: '' });
const myForm = form(model);
myForm.email().value(); // string — no null!
```

### Problem 2: get() Method Loses Types

The `get()` method breaks type inference:

```typescript
// Reactive Forms — loses type
const form = new FormGroup({
  user: new FormGroup({
    email: new FormControl('')
  })
});

const email = form.get('user.email');
// Type: AbstractControl<unknown, unknown> | null

// Signal Forms — full typing
const model = signal({
  user: { email: '' }
});
const myForm = form(model);

myForm.user.email().value(); // string — full path typed!
myForm.user.emial; // ❌ Compilation error!
```

### Problem 3: FormArray Loses Structure

Arrays lose their element type information:

```typescript
// Reactive Forms
users.at(0); // AbstractControl — type lost!

// Signal Forms — structure preserved
interface User {
  name: string;
  email: string;
}

const model = signal<{ users: User[] }>({
  users: [{ name: 'Jan', email: 'jan@example.com' }]
});

const myForm = form(model);
myForm.users[0].name().value(); // string — fully typed!
```

### Problem 4: Dynamic Fields

Adding fields at runtime breaks the type:

```typescript
// Reactive Forms — TypeScript unaware of added field
const form = new FormGroup({ name: new FormControl('') });
form.addControl('email', new FormControl(''));
form.controls.email; // ❌ Property 'email' does not exist

// Signal Forms — model is source of truth
const model = signal<{ name: string; email?: string }>({
  name: ''
});
const myForm = form(model);

model.update(m => ({ ...m, email: 'user@example.com' }));
if (myForm.email) {
  myForm.email().value(); // string — now typed!
}
```

---

## Validation Patterns

### Built-in Validators

Signal Forms provide typed validators with integrated messages:

```typescript
import {
  form,
  required,
  email,
  minLength,
  maxLength,
  pattern,
  min,
  max,
  minDate,
  maxDate
} from '@angular/forms/signals';

const checkoutForm = form(this.model, (schema) => {
  required(schema.firstName);
  minLength(schema.firstName, 2, { message: 'Minimum 2 characters' });
  
  required(schema.email);
  email(schema.email);
  
  required(schema.cardNumber);
  pattern(schema.cardNumber, /^\d{16}$/, {
    message: 'Card number must be 16 digits'
  });
  
  required(schema.expiryDate);
  minDate(schema.expiryDate, new Date(), {
    message: 'Card must not be expired'
  });
});
```

### Custom Validators

Create custom validation rules that react to other fields:

```typescript
import { form, validate } from '@angular/forms/signals';

const signupForm = form(this.model, (schema) => {
  required(schema.username);
  
  validate(schema.username, ({ value }) => {
    const username = value();
    if (username.includes(' ')) {
      return { kind: 'no-spaces', message: 'Username cannot contain spaces' };
    }
    return undefined;
  });

  required(schema.password);
  minLength(schema.password, 8);

  required(schema.confirmPassword);
  
  validate(schema.confirmPassword, ({ value, valueOf }) => {
    if (value() !== valueOf(schema.password)) {
      return { kind: 'password-mismatch', message: 'Passwords do not match' };
    }
    return undefined;
  });
});
```

### Conditional Validation

Apply rules based on other field values:

```typescript
import { form, required, disabled, hidden } from '@angular/forms/signals';

const orderForm = form(this.model, (schema) => {
  required(schema.customerType);
  
  hidden(schema.companyName, {
    when: ({ valueOf }) => valueOf(schema.customerType) !== 'business'
  });
  
  required(schema.companyName, {
    when: ({ valueOf }) => valueOf(schema.customerType) === 'business'
  });

  disabled(schema.discountCode, {
    when: ({ valueOf }) => valueOf(schema.orderType) === 'wholesale',
    message: 'Discount codes do not apply to wholesale orders'
  });
});
```

### Asynchronous Validation

Server-side validation with automatic debouncing:

```typescript
import { form, required, validateHttp } from '@angular/forms/signals';

const registrationForm = form(this.model, (schema) => {
  required(schema.username);
  
  validateHttp(schema.username, {
    debounce: 300,
    request: ({ value }) => 
      value() ? `/api/check-username?name=${value()}` : undefined,
    onSuccess: (result: { taken: boolean }) =>
      result.taken 
        ? { kind: 'taken', message: 'Username already registered' }
        : undefined,
    onError: () => ({
      kind: 'server-error',
      message: 'Could not verify username'
    })
  });
});
```

---

## Reusable Validation Schemas

Define validation rules once and apply them everywhere:

```typescript
import { schema, required, email, minLength } from '@angular/forms/signals';

export const addressSchema = schema<Address>((addr) => {
  required(addr.street);
  required(addr.city);
  required(addr.zipCode);
  pattern(addr.zipCode, /^\d{2}-\d{3}$/);
});

export const contactSchema = schema<Contact>((contact) => {
  required(contact.email);
  email(contact.email);
  minLength(contact.phone, 9);
});
```

Apply schemas to nested objects and arrays:

```typescript
import { form, apply, applyEach } from '@angular/forms/signals';

const customerForm = form(this.model, (schema) => {
  required(schema.name);
  
  apply(schema.billingAddress, addressSchema);
  apply(schema.shippingAddress, addressSchema);
  apply(schema.contact, contactSchema);
});

const orderForm = form(this.model, (schema) => {
  applyEach(schema.addresses, addressSchema);
});
```

Conditional schema application:

```typescript
import { applyWhen, applyWhenValue } from '@angular/forms/signals';

const form = form(this.model, (schema) => {
  applyWhen(
    schema.payment,
    ({ valueOf }) => valueOf(schema.paymentMethod) === 'card',
    cardPaymentSchema
  );
});
```

---

## Form Submission

### Basic Submit

Configure submission in the form definition:

```typescript
import { form, required, FormField, FormRoot, submit } from '@angular/forms/signals';
import { Component, signal, inject } from '@angular/core';

@Component({
  selector: 'app-checkout',
  imports: [FormField, FormRoot],
  template: `
    <form [formRoot]="checkoutForm">
      <input [formField]="checkoutForm.email" />
      <button [disabled]="checkoutForm().submitting()">
        {{ checkoutForm().submitting() ? 'Processing...' : 'Pay Now' }}
      </button>
    </form>
  `
})
export class CheckoutComponent {
  private readonly paymentService = inject(PaymentService);
  
  readonly checkoutModel = signal({ email: '', amount: 100 });

  readonly checkoutForm = form(
    this.checkoutModel,
    (schema) => {
      required(schema.email);
    },
    {
      submission: {
        action: async (field) => {
          const result = await this.paymentService.charge(field().value());
          
          if (result.error) {
            return {
              kind: 'server',
              message: result.error,
              fieldTree: field.email
            };
          }
          return undefined;
        },
        ignoreValidators: 'none', // Wait for all async validators
        onInvalid: (field) => {
          field().errorSummary()[0]?.fieldTree().focusBoundControl();
        }
      }
    }
  );
}
```

### Multiple Submit Actions

Handle save vs. submit scenarios:

```typescript
import { submit } from '@angular/forms/signals';

async requestApproval(): Promise<void> {
  const ok = await submit(this.orderForm, {
    action: async (field) => {
      return this.store.requestApproval(field().value());
    },
    ignoreValidators: 'none'
  });
  
  if (ok) {
    // Handle success
  }
}
```

---

## Custom Controls

### Minimal FormValueControl

Create a custom control without ControlValueAccessor boilerplate:

```typescript
import { Component, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

@Component({
  selector: 'app-custom-input',
  template: `
    <input
      [value]="value()"
      (input)="value.set($event.target.value)"
      [disabled]="disabled()"
    />
  `
})
export class CustomInputComponent implements FormValueControl<string> {
  // Required: current value
  readonly value = model('');

  // Optional: FormField will bind these automatically
  readonly disabled = input(false);
  readonly touched = input(false);
  readonly errors = input<readonly ValidationError[]>([]);
  readonly invalid = input(false);
}
```

### Checkbox Control

For boolean controls:

```typescript
import { Component, model } from '@angular/core';
import { FormCheckboxControl } from '@angular/forms/signals';

@Component({
  selector: 'app-custom-checkbox',
  template: `
    <label>
      <input
        type="checkbox"
        [checked]="checked()"
        (change)="checked.set($event.target.checked)"
        [disabled]="disabled()"
      />
      <ng-content></ng-content>
    </label>
  `
})
export class CustomCheckboxComponent implements FormCheckboxControl {
  readonly checked = model(false);
  readonly disabled = input(false);
  readonly touched = input(false);
  readonly errors = input<readonly ValidationError[]>([]);
}
```

---

## Nested and Array Fields

### Nested Objects

Nesting is automatic through model shape:

```typescript
const checkoutModel = signal({
  customer: {
    firstName: '',
    lastName: '',
    email: ''
  },
  shipping: {
    street: '',
    city: '',
    zipCode: ''
  }
});

const checkoutForm = form(checkoutModel, (schema) => {
  required(schema.customer.firstName);
  required(schema.customer.email);
  email(schema.customer.email);
  
  required(schema.shipping.street);
  required(schema.shipping.city);
});
```

Bind nested fields naturally:

```html
<input [formField]="checkoutForm.customer.firstName" />
<input [formField]="checkoutForm.customer.email" />
<input [formField]="checkoutForm.shipping.street" />
```

### Array Fields

Use `applyEach` for repeating sections:

```typescript
const orderModel = signal({
  items: [
    { productId: '', quantity: 1 }
  ]
});

const orderForm = form(orderModel, (schema) => {
  applyEach(schema.items, (item) => {
    required(item.productId);
    min(item.quantity, 1);
  });
});
```

Render with `@for`:

```html
@for (item of orderForm.items; track $index) {
  <div class="row">
    <input [formField]="item.productId" />
    <input type="number" [formField]="item.quantity" />
  </div>
}

<button (click)="addItem()">Add Item</button>
```

Add/remove items by updating the signal:

```typescript
addItem(): void {
  this.orderModel.update(model => ({
    ...model,
    items: [...model.items, { productId: '', quantity: 1 }]
  }));
}

removeItem(index: number): void {
  this.orderModel.update(model => ({
    ...model,
    items: model.items.filter((_, i) => i !== index)
  }));
}
```

---

## Gradual Migration from Reactive Forms

### Option 1: compatForm (Top-Down)

Wrap existing Reactive Forms into Signal Forms:

```typescript
import { compatForm } from '@angular/forms/signals/compat';
import { FormControl, Validators } from '@angular/forms';

export class MixedFormComponent {
  private readonly ageControl = new FormControl(5, Validators.min(3));

  readonly model = signal({
    name: 'John',
    age: this.ageControl
  });

  readonly myForm = compatForm(this.model);
}
```

Both systems stay in sync bidirectionally. Useful when you want to gradually modernize parts of a form.

### Option 2: SignalFormControl (Bottom-Up)

Use signal-based controls within existing FormGroups:

```typescript
import { SignalFormControl } from '@angular/forms/signals/compat';
import { FormBuilder } from '@angular/forms';
import { required, email, validateHttp } from '@angular/forms/signals';

@Component({
  selector: 'app-user-form'
})
export class UserFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly emailControl = new SignalFormControl('', (path) => {
    required(path);
    email(path);
    validateHttp(path, {
      debounce: 300,
      request: ({ value }) => `/api/check-email?email=${value()}`,
      onSuccess: (res: { taken: boolean }) =>
        res.taken ? { kind: 'taken', message: 'Already registered' } : null
    });
  });

  readonly userForm = this.fb.group({
    firstName: ['', Validators.required],
    email: this.emailControl
  });
}
```

---

## Key Differences from Reactive Forms

| Feature | Reactive Forms | Signal Forms |
|---------|---|---|
| Form state | Manual FormControl/Group | Signal model |
| Type safety | T \| null default | Type from model |
| Navigation | `get()` loses types | Dot notation preserves type |
| Arrays | FormArray abstraction | Native array in signal |
| Custom controls | ControlValueAccessor | FormValueControl (one method!) |
| Validation | Validator array | Schema callback (centralized) |
| Reactivity | Manual subscriptions | Automatic with signals |
| Nested fields | Nested form structures | Model structure reflected |

---

## Common Patterns

### Display/Edit Toggle

Switch between display and edit mode:

```typescript
const isEditing = signal(false);
const contactModel = signal({ name: 'John', email: 'john@example.com' });

readonly contactForm = form(contactModel, (schema) => {
  required(schema.name);
  email(schema.email);
});

saveContact(): void {
  if (this.contactForm().valid()) {
    // Persist changes
    isEditing.set(false);
  }
}

cancelEdit(): void {
  this.contactForm().reset();
  isEditing.set(false);
}
```

### Wizard/Stepper

Multi-step form with per-step validation:

```typescript
const currentStep = signal(1);

readonly wizardModel = signal({
  step1: { name: '', email: '' },
  step2: { company: '', role: '' },
  step3: { phone: '', newsletter: false }
});

readonly wizardForm = form(this.wizardModel, (schema) => {
  applyWhen(schema.step1, () => currentStep() >= 1, step1Schema);
  applyWhen(schema.step2, () => currentStep() >= 2, step2Schema);
  applyWhen(schema.step3, () => currentStep() >= 3, step3Schema);
});

nextStep(): void {
  if (this.currentStepIsValid()) {
    currentStep.update(s => s + 1);
  }
}
```

### Dynamic Sections

Show/hide entire form sections:

```typescript
const orderType = signal<'standard' | 'wholesale'>('standard');

readonly orderForm = form(this.model, (schema) => {
  required(schema.items);
  
  applyWhen(
    schema.discount,
    ({ valueOf }) => valueOf(schema.orderType) === 'standard'
  );
  
  applyWhen(
    schema.bulkDiscount,
    ({ valueOf }) => valueOf(schema.orderType) === 'wholesale'
  );
});
```

---

## Import Paths

Signal Forms have separate entry points:

```typescript
// Core Signal Forms API
import { form, required, validate, FormField, FormRoot } from '@angular/forms/signals';

// Interop with Reactive Forms
import { compatForm, SignalFormControl } from '@angular/forms/signals/compat';

// CSS class configuration
import { provideSignalFormsConfig, NG_STATUS_CLASSES } from '@angular/forms/signals';
```

---

## Configuration

### CSS Status Classes

Configure which state classes Angular applies:

```typescript
import { provideSignalFormsConfig, NG_STATUS_CLASSES } from '@angular/forms/signals';

export const appConfig: ApplicationConfig = {
  providers: [
    provideSignalFormsConfig({
      classes: NG_STATUS_CLASSES // Restore classic ng-valid, ng-invalid, etc.
    })
  ]
};
```

Or customize:

```typescript
provideSignalFormsConfig({
  classes: {
    'ng-valid': ({ state }) => state().valid(),
    'ng-invalid': ({ state }) => state().invalid(),
    'ng-touched': ({ state }) => state().touched(),
    'ng-dirty': ({ state }) => state().dirty(),
    'is-warning': ({ state }) => state().dirty() && state().valid()
  }
})
```

---

## Status and Version Requirements

- **Stable since:** Angular 22.0
- **Preview in:** Angular 21
- **Minimum version:** Angular 21

Signal Forms are production-ready and recommended for new applications. Reactive Forms remain fully supported.

---

## References

- [Signal Forms – Complete Guide v.21-22](https://angular.love/signal-forms-in-angular-21-complete-guide)[^1]
- [Angular Signal Forms Tutorial (v22)](https://medium.com/google-developer-experts/angular-signal-forms-tutorial-v22-4d6b72a306e3)[^2]
- [Angular 22: Embracing the Signal-First Era](https://medium.com/@marcomatto/angular-22-embracing-the-signal-first-era-b1c8803acea6)[^3]
- [Angular Signals Documentation](https://angular.io/guide/signals)[^4]

[^1]: Stefańczyk, Mateusz. "Signal Forms – Complete Guide v.21-22." Angular.love, 2024.
[^2]: Ayaz, Muhammad Ahsan. "Angular Signal Forms Tutorial (v22)." Medium, June 29, 2026.
[^3]: Martorana, Marco. "Angular 22: Embracing the Signal-First Era." Medium, May 19, 2026.
[^4]: Angular Documentation. "Signals Guide." Angular.io.
