---
title: Testing & Quality Assurance
description: Comprehensive guide to unit testing, integration testing, and E2E testing in Angular with Vitest and Playwright.
---

## Overview

Testing is a critical part of building reliable Angular applications. This section covers unit testing, integration testing, end-to-end testing, and best practices for maintaining high-quality codebases.

---

## Available Pages

- [**Unit Testing Components**](unit-testing-components/) — Component testing with Vitest, fixtures, signals, and DOM testing
- [**Service & HTTP Testing**](service-http-testing/) — Testing services with HttpTestingController, mocking API responses, error handling
- [**E2E Testing with Playwright**](e2e-testing-playwright/) — End-to-end testing setup, Page Object Model, fixtures, debugging
- [**Testing Best Practices**](best-practices/) — AAA pattern, edge cases, naming conventions, coverage strategies
- [**Common Testing Patterns**](common-patterns/) — Reusable patterns, mocking strategies, test data builders

---

## Testing Stack

| Tool | Purpose | Status |
|------|---------|--------|
| **Vitest** | Unit testing framework (replaces Karma) | Default in Angular 21+ |
| **Jasmine** | Assertion library & test runner | Integrated with Vitest |
| **HttpTestingController** | HTTP mocking & verification | @angular/common/http/testing |
| **Playwright** | E2E testing framework | Modern, cross-browser, multi-project support |

---

## Quick Start

### Unit Testing a Component

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Testing a Service with HTTP

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService]
    });

    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch data', () => {
    service.getData().subscribe(data => {
      expect(data).toEqual({ id: 1, name: 'Test' });
    });

    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, name: 'Test' });
  });
});
```

### E2E Test with Playwright

```typescript
import { expect, test } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display welcome message', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('[data-testid="welcome"]'))
      .toContainText('Welcome');
  });
});
```

---

## Testing Pyramid

```
       ┌─────────────┐
       │ E2E Tests   │  10%
       ├─────────────┤
       │  Integration│  20%
       ├─────────────┤
       │    Unit     │  70%
       └─────────────┘
```

Focus on:
- **Unit tests (70%)** — Components, services, pipes, directives
- **Integration tests (20%)** — Multiple components, services together
- **E2E tests (10%)** — Critical user flows only

---

## Key Principles

✅ **Write tests that matter** — Focus on behavior, not implementation details
✅ **Keep tests simple** — Use AAA pattern (Arrange, Act, Assert)
✅ **Test edge cases** — null, empty, errors, boundary values
✅ **Use data-testid** — Stable selectors independent from styling
✅ **Avoid flaky tests** — Don't rely on timing, use web-first assertions
✅ **Maintain fast feedback** — Unit tests should run in milliseconds

---

## Coverage Goals

| Category | Target |
|----------|--------|
| Statements | 80%+ |
| Branches | 75%+ |
| Functions | 80%+ |
| Lines | 80%+ |

Run coverage: `ng test --coverage`

---

## Next Steps

1. Start with [Unit Testing Components](unit-testing-components/) to understand Vitest and component testing
2. Learn [Service & HTTP Testing](service-http-testing/) for backend integration
3. Master [E2E Testing](e2e-testing-playwright/) for critical workflows
4. Apply [Best Practices](best-practices/) across your test suite
