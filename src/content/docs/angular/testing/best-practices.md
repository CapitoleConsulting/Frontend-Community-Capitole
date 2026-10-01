---
title: Testing Best Practices
description: Best practices, patterns, and strategies for writing maintainable, reliable tests in Angular applications.
---

## Overview

Writing good tests is as important as writing good code. This guide covers patterns, conventions, and strategies that make tests effective, maintainable, and valuable.

---

## The AAA Pattern

The Arrange-Act-Assert pattern makes tests self-documenting and easy to understand:

### Structure

```typescript
describe('ComponentBehavior', () => {
  it('should update value on user input', () => {
    // ARRANGE - Set up initial conditions
    const component = TestBed.createComponent(MyComponent);
    const input = component.debugElement.nativeElement.querySelector('input');
    component.componentInstance.value.set('initial');

    // ACT - Perform the action
    input.value = 'updated';
    input.dispatchEvent(new Event('input'));
    component.detectChanges();

    // ASSERT - Verify the result
    expect(component.componentInstance.value()).toBe('updated');
  });
});
```

### Benefits

✅ Clear test intent — Readers immediately understand what's being tested
✅ Modular structure — Each section has a single responsibility
✅ Easier debugging — Know exactly where failures occur
✅ Consistency — All tests follow the same structure

---

## Naming Conventions

### Test Suite Names

Use descriptive names that explain what's being tested:

```typescript
// ✅ Good
describe('UserListComponent', () => { ... });
describe('AuthService', () => { ... });
describe('LoginFormValidation', () => { ... });

// ❌ Vague
describe('Component', () => { ... });
describe('Test', () => { ... });
```

### Test Case Names

Start with "should" and describe the expected behavior:

```typescript
// ✅ Good
it('should add item to list when button clicked', () => { ... });
it('should display error message on invalid email', () => { ... });
it('should not call API when validation fails', () => { ... });
it('should handle network error gracefully', () => { ... });

// ❌ Vague or unclear
it('tests adding items', () => { ... });
it('validates', () => { ... });
it('test1', () => { ... });
```

---

## Testing Edge Cases

Comprehensive testing includes edge cases that reveal bugs:

### Null & Undefined

```typescript
describe('EdgeCases', () => {
  it('should handle null input', () => {
    expect(component.process(null)).toEqual([]);
  });

  it('should handle undefined value', () => {
    const value = undefined;
    expect(component.getValue(value)).toBe(undefined);
  });
});
```

### Empty Collections

```typescript
it('should handle empty array', () => {
  component.items.set([]);
  fixture.detectChanges();

  expect(component.totalCount()).toBe(0);
  const noItems = compiled.querySelector('[data-testid="no-items"]');
  expect(noItems).toBeTruthy();
});
```

### Boundary Values

```typescript
it('should handle minimum value', () => {
  component.value.set(0);
  expect(component.isValid()).toBe(true);
});

it('should handle maximum value', () => {
  component.value.set(Number.MAX_SAFE_INTEGER);
  expect(component.isValid()).toBe(true);
});

it('should reject value exceeding limit', () => {
  component.value.set(100);
  expect(component.isValid()).toBe(false);
});
```

### Special Characters & Unicode

```typescript
it('should handle special characters in input', () => {
  const input = '!@#$%^&*(){}[]|\\:;"\'<>?,./';
  component.setText(input);

  expect(component.getText()).toBe(input);
});

it('should handle unicode characters', () => {
  const text = '你好世界 مرحبا العالم';
  component.setText(text);

  expect(component.getText()).toBe(text);
});
```

### Whitespace

```typescript
it('should trim whitespace from input', () => {
  component.input.set('  text  ');
  component.process();

  expect(component.result()).toBe('text');
});

it('should reject whitespace-only input', () => {
  component.input.set('   ');
  const isValid = component.validate();

  expect(isValid).toBe(false);
});
```

### Concurrent Operations

```typescript
it('should handle rapid consecutive calls', () => {
  for (let i = 0; i < 100; i++) {
    component.increment();
  }

  expect(component.count()).toBe(100);
});

it('should handle simultaneous updates', fakeAsync(() => {
  component.updateA();
  component.updateB();
  tick();

  expect(component.stateA()).toBe('updated');
  expect(component.stateB()).toBe('updated');
}));
```

---

## Mocking & Stubbing

### Service Mocking

```typescript
describe('ComponentWithService', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let serviceMock: jasmine.SpyObj<DataService>;

  beforeEach(async () => {
    serviceMock = jasmine.createSpyObj('DataService', [
      'getData',
      'saveData',
      'deleteData'
    ]);

    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        { provide: DataService, useValue: serviceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });

  it('should call service on init', () => {
    fixture.detectChanges();
    expect(serviceMock.getData).toHaveBeenCalled();
  });

  it('should handle service error', () => {
    serviceMock.getData.and.returnValue(
      throwError(() => new Error('Service error'))
    );

    fixture.detectChanges();
    expect(component.error()).toContain('Service error');
  });
});
```

### Partial Mock (Real + Mocked Methods)

```typescript
class PartialMockService extends RealService {
  override fetchData() {
    return of({ id: 1, name: 'Test' });
  }
}

TestBed.configureTestingModule({
  providers: [
    { provide: DataService, useClass: PartialMockService }
  ]
});
```

### Spy on Real Object

```typescript
const realService = TestBed.inject(DataService);
spyOn(realService, 'getData').and.returnValue(of(mockData));
```

---

## Test Data Management

### Constants

```typescript
const MOCK_USER = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com'
};

const MOCK_USERS = [
  { id: '1', name: 'John' },
  { id: '2', name: 'Jane' }
];

describe('UserService', () => {
  it('should return user', () => {
    service.getUser('1').subscribe(user => {
      expect(user).toEqual(MOCK_USER);
    });
  });
});
```

### Test Data Builders

```typescript
class UserBuilder {
  private id = '1';
  private name = 'John';
  private email = 'john@example.com';

  withId(id: string) {
    this.id = id;
    return this;
  }

  withName(name: string) {
    this.name = name;
    return this;
  }

  build() {
    return {
      id: this.id,
      name: this.name,
      email: this.email
    };
  }
}

it('should create custom user', () => {
  const user = new UserBuilder()
    .withId('123')
    .withName('Jane')
    .build();

  expect(user.name).toBe('Jane');
});
```

### Factory Functions

```typescript
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: '1',
    name: 'John',
    email: 'john@example.com',
    ...overrides
  };
}

const admin = createMockUser({ role: 'admin' });
const guest = createMockUser({ role: 'guest' });
```

---

## Avoiding Common Test Mistakes

### ❌ Testing Implementation Details

```typescript
// ❌ Wrong - Testing private method
it('should call private method', () => {
  spyOn(component as any, 'privateMethod');
  component.publicMethod();
  expect(component['privateMethod']).toHaveBeenCalled();
});

// ✅ Right - Testing behavior
it('should update display on action', () => {
  component.publicMethod();
  fixture.detectChanges();

  expect(component.displayValue()).toBe('expected');
});
```

### ❌ Over-specifying

```typescript
// ❌ Wrong - Too specific to implementation
it('should create component', () => {
  expect(component.ngOnInit).toBeDefined();
  expect(component.items$.subscribe).toBeDefined();
});

// ✅ Right - Test behavior
it('should display items on init', () => {
  fixture.detectChanges();
  const items = compiled.querySelectorAll('[data-testid="item"]');
  expect(items.length).toBeGreaterThan(0);
});
```

### ❌ Test Order Dependency

```typescript
// ❌ Wrong - Tests depend on order
let counter = 0;
it('test 1', () => { counter++; expect(counter).toBe(1); });
it('test 2', () => { expect(counter).toBe(1); }); // Fails if run alone

// ✅ Right - Each test is independent
it('test 1', () => {
  let counter = 0;
  counter++;
  expect(counter).toBe(1);
});

it('test 2', () => {
  let counter = 0;
  expect(counter).toBe(0);
});
```

### ❌ Ignoring Async

```typescript
// ❌ Wrong - Missing async handling
it('should fetch data', () => {
  service.getData().subscribe(data => {
    expect(data).toBeTruthy();
  });
  // Test ends before subscription completes
});

// ✅ Right - Handle async properly
it('should fetch data', (done) => {
  service.getData().subscribe(data => {
    expect(data).toBeTruthy();
    done();
  });
});
```

---

## Test Organization

### beforeEach vs beforeAll

```typescript
describe('UserService', () => {
  let service: UserService;

  // ✅ Runs before EACH test - fresh state
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [UserService] });
    service = TestBed.inject(UserService);
  });

  // ❌ Runs once - shared state can cause issues
  // beforeAll(() => { ... });

  it('test 1', () => { ... });
  it('test 2', () => { ... });
});
```

### Nested Describe for Organization

```typescript
describe('TodoComponent', () => {
  describe('Initialization', () => {
    it('should create', () => { ... });
    it('should load todos', () => { ... });
  });

  describe('Adding Todos', () => {
    it('should add valid todo', () => { ... });
    it('should reject empty todo', () => { ... });
  });

  describe('Deleting Todos', () => {
    it('should delete todo', () => { ... });
    it('should update display', () => { ... });
  });
});
```

---

## Coverage Strategy

### Minimum Coverage Goals

| Metric | Target |
|--------|--------|
| Statements | 80%+ |
| Branches | 75%+ |
| Functions | 80%+ |
| Lines | 80%+ |

### Focus Areas

1. **Business Logic** — Core features, calculations
2. **Error Handling** — All error paths
3. **Edge Cases** — Null, empty, boundaries
4. **User Interactions** — Click, input, submit
5. **Async Operations** — Observable chains, promises

### Low Priority

- Trivial getters/setters
- Boilerplate code
- Third-party library wrappers
- UI-only components without logic

### Checking Coverage

```bash
ng test --coverage

# Output in coverage/ directory
# View detailed report
open coverage/index.html
```

---

## Performance Testing

### Slow Tests

```typescript
// ✅ Identify slow tests
ng test --reporter=verbose

// ✅ Use fakeAsync for timing tests
import { fakeAsync, tick } from '@angular/core/testing';

it('should debounce input', fakeAsync(() => {
  component.input.setValue('test');
  tick(300); // Skip time
  expect(component.searchResults()).toHaveLength(1);
}));
```

### Optimize Test Execution

```typescript
// ✅ Reuse expensive setup
let complexFixture: ComplexFixture;

beforeEach(() => {
  // Avoid creating if not needed
  complexFixture = setupComplexFixture();
});

it('test 1', () => {
  // Reuse fixture
});

it('test 2', () => {
  // Reuse same fixture
});
```

---

## Debugging Failing Tests

### Use fit() & xit()

```typescript
// ✅ Run only this test
fit('should pass', () => { ... });

// ✅ Skip this test
xit('should skip', () => { ... });
```

### Add Logging

```typescript
it('should process data', () => {
  const input = [1, 2, 3];
  console.log('Input:', input);

  const result = component.process(input);
  console.log('Result:', result);

  expect(result).toEqual([2, 4, 6]);
});
```

### Use Debugger

```typescript
it('should debug', () => {
  debugger;  // Pauses execution
  component.doSomething();
  expect(component.value()).toBe(5);
});

// Run: ng test --browsers=Chrome --watch
```

---

## Continuous Integration

### CI Configuration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

### Test Commands

```json
{
  "scripts": {
    "test": "ng test",
    "test:ci": "ng test --no-watch --browsers=ChromeHeadless",
    "test:coverage": "ng test --coverage --no-watch",
    "test:watch": "ng test --watch"
  }
}
```

---

## Key Takeaways

✅ Use AAA pattern for clarity
✅ Write descriptive test names
✅ Test edge cases thoroughly
✅ Mock external dependencies
✅ Keep tests independent
✅ Aim for 80%+ coverage
✅ Make tests fast & reliable
✅ Review tests like production code
✅ Refactor tests as you refactor code
✅ Treat tests as documentation

---

## Resources

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/)
- [How to Write Tests for Angular Components](https://www.smashingmagazine.com/2021/07/angular-components-unit-tests/)
