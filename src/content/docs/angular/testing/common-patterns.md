---
title: Common Testing Patterns
description: Reusable testing patterns, strategies, and solutions for common Angular testing scenarios.
---

## Overview

This guide covers commonly encountered testing scenarios and proven patterns to solve them effectively.

---

## Testing Component Inputs & Outputs

### Signal Input Testing

```typescript
export class ButtonComponent {
  label = input<string>();
  onClick = output<void>();
}

describe('ButtonComponent with signal inputs', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
  });

  it('should render label', () => {
    fixture.componentRef.setInput('label', 'Click me');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Click me');
  });

  it('should emit click event', () => {
    spyOn(component.onClick, 'emit');

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(component.onClick.emit).toHaveBeenCalled();
  });
});
```

### Legacy @Input/@Output Testing

```typescript
it('should receive input', () => {
  component.title = 'Test Title';
  fixture.detectChanges();

  expect(component.title).toBe('Test Title');
});

it('should emit output', () => {
  spyOn(component.valueChange, 'emit');

  component.emitValue('new value');

  expect(component.valueChange.emit).toHaveBeenCalledWith('new value');
});
```

---

## Testing Two-Way Binding

### With model() Signal

```typescript
export class InputComponent {
  value = model<string>('');
}

it('should update model on input', () => {
  fixture.componentRef.setInput('value', 'initial');
  fixture.detectChanges();

  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  input.value = 'updated';
  input.dispatchEvent(new Event('input'));

  expect(component.value()).toBe('updated');
});
```

### Legacy [(ngModel)]

```typescript
it('should two-way bind', () => {
  component.value = 'initial';
  fixture.detectChanges();

  const input = fixture.nativeElement.querySelector('input');
  input.value = 'updated';
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();

  expect(component.value).toBe('updated');
});
```

---

## Testing Forms

### Reactive Forms with Typed Forms

```typescript
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';

describe('FormComponent', () => {
  it('should validate email format', () => {
    const form = new FormGroup({
      email: new FormControl('', [Validators.email])
    });

    form.patchValue({ email: 'invalid' });
    expect(form.get('email')?.hasError('email')).toBe(true);

    form.patchValue({ email: 'valid@example.com' });
    expect(form.valid).toBe(true);
  });

  it('should show validation errors', () => {
    const control = new FormControl('', [
      Validators.required,
      Validators.minLength(3)
    ]);

    control.setValue('');
    expect(control.hasError('required')).toBe(true);

    control.setValue('ab');
    expect(control.hasError('minlength')).toBe(true);

    control.setValue('abc');
    expect(control.valid).toBe(true);
  });
});
```

### Form Array Testing

```typescript
it('should add and remove form controls', () => {
  const formArray = new FormArray([
    new FormControl('item1'),
    new FormControl('item2')
  ]);

  expect(formArray.length).toBe(2);

  formArray.push(new FormControl('item3'));
  expect(formArray.length).toBe(3);

  formArray.removeAt(1);
  expect(formArray.length).toBe(2);
  expect(formArray.value).toEqual(['item1', 'item3']);
});
```

### Dynamic Form Validation

```typescript
it('should validate conditional fields', () => {
  const form = new FormGroup({
    country: new FormControl('US'),
    state: new FormControl('')
  });

  // State required only for US
  form.get('country')?.valueChanges.subscribe(country => {
    const stateControl = form.get('state');
    if (country === 'US') {
      stateControl?.setValidators(Validators.required);
    } else {
      stateControl?.clearValidators();
    }
    stateControl?.updateValueAndValidity();
  });

  form.patchValue({ country: 'US' });
  expect(form.valid).toBe(false);

  form.patchValue({ state: 'NY' });
  expect(form.valid).toBe(true);
});
```

---

## Testing Lists & Arrays

### Testing Dynamic Lists

```typescript
export class ListComponent {
  items = signal<Item[]>([]);

  addItem(item: Item) {
    this.items.update(items => [...items, item]);
  }

  removeItem(id: string) {
    this.items.update(items => items.filter(i => i.id !== id));
  }
}

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
  });

  it('should add items to list', () => {
    component.addItem({ id: '1', name: 'Item 1' });
    component.addItem({ id: '2', name: 'Item 2' });

    expect(component.items()).toHaveLength(2);
  });

  it('should render added items', () => {
    component.items.set([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' }
    ]);
    fixture.detectChanges();

    const listItems = fixture.nativeElement.querySelectorAll('[data-testid="item"]');
    expect(listItems).toHaveLength(2);
    expect(listItems[0].textContent).toContain('Item 1');
  });

  it('should remove item from list', () => {
    component.items.set([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' }
    ]);

    component.removeItem('1');
    fixture.detectChanges();

    expect(component.items()).toHaveLength(1);
    expect(component.items()[0].id).toBe('2');
  });

  it('should update DOM when item removed', () => {
    component.items.set([
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' }
    ]);
    fixture.detectChanges();

    component.removeItem('1');
    fixture.detectChanges();

    const listItems = fixture.nativeElement.querySelectorAll('[data-testid="item"]');
    expect(listItems).toHaveLength(1);
  });
});
```

---

## Testing Async Operations

### Testing Promises

```typescript
it('should resolve promise', (done) => {
  const promise = new Promise(resolve => {
    setTimeout(() => resolve('success'), 100);
  });

  promise.then(result => {
    expect(result).toBe('success');
    done();
  });
});

it('should handle promise rejection', (done) => {
  const promise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('failed')), 100);
  });

  promise.catch(error => {
    expect(error.message).toBe('failed');
    done();
  });
});
```

### Testing Async/Await

```typescript
it('should handle async function', async () => {
  const result = await asyncFunction();
  expect(result).toEqual({ id: 1 });
});

it('should handle async error', async () => {
  try {
    await failingAsyncFunction();
    fail('should have thrown');
  } catch (error) {
    expect(error.message).toContain('Error');
  }
});
```

### Testing Observables

```typescript
it('should emit values', (done) => {
  const observable = new Observable(observer => {
    observer.next('first');
    observer.next('second');
    observer.complete();
  });

  const values: string[] = [];
  observable.subscribe({
    next: value => values.push(value),
    complete: () => {
      expect(values).toEqual(['first', 'second']);
      done();
    }
  });
});

it('should handle observable error', (done) => {
  const observable = throwError(() => new Error('Observable error'));

  observable.subscribe({
    error: error => {
      expect(error.message).toBe('Observable error');
      done();
    }
  });
});
```

---

## Testing Router Navigation

### Testing Route Parameters

```typescript
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

describe('ComponentWithRouting', () => {
  let component: DetailComponent;
  let fixture: ComponentFixture<DetailComponent>;
  let activatedRoute: ActivatedRoute;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailComponent],
      providers: [
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DetailComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    component = fixture.componentInstance;
  });

  it('should get route param', () => {
    spyOn(activatedRoute.params, 'subscribe').and.returnValue(
      of({ id: '123' }).subscribe(params => {
        expect(params.id).toBe('123');
      })
    );
  });
});
```

### Testing Navigation

```typescript
it('should navigate to detail page', fakeAsync(() => {
  const router = TestBed.inject(Router);
  spyOn(router, 'navigate');

  component.openDetail('123');
  tick();

  expect(router.navigate).toHaveBeenCalledWith(['/detail', '123']);
}));
```

---

## Testing HTTP with Observables

### Testing Observable HTTP Response

```typescript
it('should fetch and transform data', () => {
  service.getData().pipe(
    map(data => data.name.toUpperCase())
  ).subscribe(result => {
    expect(result).toBe('JOHN');
  });

  const req = httpMock.expectOne('/api/data');
  req.flush({ id: 1, name: 'john' });
});
```

### Testing Observable Error

```typescript
it('should catch and handle error', () => {
  service.getData().pipe(
    catchError(error => of({ default: true }))
  ).subscribe(result => {
    expect(result.default).toBe(true);
  });

  const req = httpMock.expectOne('/api/data');
  req.error(new ErrorEvent('Network error'));
});
```

---

## Testing Signals & Computed Values

### Testing Signal Dependencies

```typescript
export class CalculatorComponent {
  a = signal(5);
  b = signal(3);

  sum = computed(() => this.a() + this.b());
  difference = computed(() => this.a() - this.b());
  product = computed(() => this.a() * this.b());
}

describe('CalculatorComponent', () => {
  let component: CalculatorComponent;
  let fixture: ComponentFixture<CalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorComponent);
    component = fixture.componentInstance;
  });

  it('should calculate sum', () => {
    expect(component.sum()).toBe(8);
  });

  it('should recalculate on signal change', () => {
    component.a.set(10);
    expect(component.sum()).toBe(13);

    component.b.set(5);
    expect(component.sum()).toBe(15);
  });

  it('should calculate multiple derived values', () => {
    expect(component.sum()).toBe(8);
    expect(component.difference()).toBe(2);
    expect(component.product()).toBe(15);
  });
});
```

---

## Testing Effects

```typescript
export class AutoSaveComponent {
  value = signal('');
  saved = signal(false);

  constructor() {
    effect(() => {
      if (this.value()) {
        this.saveToServer(this.value());
      }
    });
  }

  saveToServer(value: string) {
    this.saved.set(true);
  }
}

it('should trigger effect on signal change', () => {
  const component = new AutoSaveComponent();
  spyOn(component, 'saveToServer');

  component.value.set('new value');

  expect(component.saveToServer).toHaveBeenCalledWith('new value');
});
```

---

## Testing Change Detection

### OnPush Strategy

```typescript
@Component({
  selector: 'app-optimized',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ value() }}'
})
export class OptimizedComponent {
  value = signal('initial');
}

it('should update with OnPush', () => {
  component.value.set('updated');
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain('updated');
});
```

---

## Testing Custom Directives

```typescript
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  @Input() appHighlight = 'yellow';

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.el.nativeElement.style.backgroundColor = this.appHighlight;
  }
}

describe('HighlightDirective', () => {
  it('should apply highlight color', () => {
    const fixture = TestBed.createComponent(TestComponent);
    fixture.componentInstance.color = 'red';
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('[appHighlight]');
    expect(element.style.backgroundColor).toBe('red');
  });
});
```

---

## Testing Custom Pipes

```typescript
@Pipe({
  name: 'uppercase',
  standalone: true
})
export class UppercasePipe implements PipeTransform {
  transform(value: string): string {
    return value?.toUpperCase() ?? '';
  }
}

describe('UppercasePipe', () => {
  let pipe: UppercasePipe;

  beforeEach(() => {
    pipe = new UppercasePipe();
  });

  it('should convert to uppercase', () => {
    expect(pipe.transform('hello')).toBe('HELLO');
  });

  it('should handle null', () => {
    expect(pipe.transform(null as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(pipe.transform('')).toBe('');
  });
});
```

---

## Testing Guards

```typescript
import { inject } from '@angular/core';

export const authGuard = () => {
  const authService = inject(AuthService);
  return authService.isAuthenticated() ? true : false;
};

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: spy }
      ]
    });
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should allow access when authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    expect(authGuard()).toBe(true);
  });

  it('should deny access when not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    expect(authGuard()).toBe(false);
  });
});
```

---

## Testing Interceptors

```typescript
describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should add authorization header', () => {
    httpClient.get('/api/data').subscribe();

    const req = httpMock.expectOne('/api/data');
    expect(req.request.headers.has('Authorization')).toBeTruthy();
    req.flush({});
  });
});
```

---

## Testing Providers & DI

```typescript
describe('Dependency Injection', () => {
  it('should provide singleton service', () => {
    TestBed.configureTestingModule({
      providers: [MyService]
    });

    const service1 = TestBed.inject(MyService);
    const service2 = TestBed.inject(MyService);

    expect(service1).toBe(service2);
  });

  it('should override provider', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MyService, useValue: mockService }
      ]
    });

    const service = TestBed.inject(MyService);
    expect(service).toBe(mockService);
  });
});
```

---

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| Component creation | `TestBed.createComponent()` |
| Service injection | `TestBed.inject()` |
| HTTP request | `httpMock.expectOne()` |
| Observable | `.subscribe()` with done callback |
| Async/await | `async () => {}` |
| Routing | `provideRouter([])` |
| Spy on method | `jasmine.createSpyObj()` |
| Detect changes | `fixture.detectChanges()` |
| Signal input | `fixture.componentRef.setInput()` |
| DOM query | `.querySelector()` / `.querySelectorAll()` |

---

## Resources

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Testing Best Practices](best-practices/)
