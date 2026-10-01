---
title: E2E Testing with Playwright
description: End-to-end testing for Angular apps using Playwright — setup, Page Object Model, fixtures, and debugging.
---

## Overview

End-to-end (E2E) testing verifies complete user workflows in a real browser. Playwright is a modern E2E testing framework developed by Microsoft that provides cross-browser support, auto-waiting, and powerful debugging tools.

---

## Why Playwright?

✅ **Cross-browser** — Test on Chromium, Firefox, WebKit
✅ **Fast & reliable** — Auto-waiting, minimal flaky tests
✅ **Flexible** — Multiple tabs, origins, Shadow DOM in one test
✅ **Great tooling** — Inspector, trace viewer, code generation
✅ **Multiple devices** — Emulate mobile and desktop
✅ **Persistent auth** — Reuse login sessions across tests

---

## Installation & Setup

### Install Playwright

```bash
npm init playwright@latest
```

This prompts you to:
- Select TypeScript (recommended)
- Choose test directory (default: tests)
- Add GitHub Actions workflow
- Install browser binaries

### Configuration File

Create or update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  workers: 4,
  retries: 2,
  timeout: 30000,

  webServer: {
    command: 'ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

### Run Tests

```bash
npx playwright test              # All browsers
npx playwright test --project=chromium  # Single browser
npx playwright test --debug      # Debug mode
npx playwright test --ui         # UI mode
```

---

## Page Object Model (POM)

POM pattern centralizes element selectors and page interactions, making tests maintainable.

### Basic Page Object

```typescript
import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly welcomeTitle: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeTitle = page.getByTestId('welcome-title');
    this.loginButton = page.getByTestId('login-button');
  }

  async goto() {
    await this.page.goto('/');
  }

  async clickLogin() {
    await this.loginButton.click();
  }
}
```

### Page Object with Methods

```typescript
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('submit-button');
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorText() {
    return this.errorMessage.textContent();
  }
}
```

---

## Creating Fixtures

Fixtures automate setup and teardown, reducing test boilerplate.

### Basic Fixture

```typescript
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';

type LoginFixture = {
  loginPage: LoginPage;
};

export const test = base.extend<LoginFixture>({
  loginPage: async ({ page }, use) => {
    // Setup
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Use in test
    await use(loginPage);

    // Teardown (if needed)
  },
});

export { expect } from '@playwright/test';
```

### Using the Fixture

```typescript
import { expect, test } from './fixtures';

test('should login successfully', async ({ loginPage }) => {
  await loginPage.login('user@example.com', 'password123');
  await expect(loginPage.page).toHaveURL('/dashboard');
});
```

### Multiple Fixtures

```typescript
type PageFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<PageFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await use(homePage);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  dashboardPage: async ({ page, loginPage }, use) => {
    // Depends on loginPage fixture
    const dashboardPage = new DashboardPage(page);
    await loginPage.login('user@example.com', 'password');
    await use(dashboardPage);
  },
});
```

---

## Reusable Test Elements

For shared UI components used across multiple pages:

### Element Class

```typescript
import type { Locator, Page } from '@playwright/test';

export class FilterInputElement {
  readonly input: Locator;
  readonly resetButton: Locator;

  constructor(private parent: Locator | Page) {
    this.input = this.parent.getByTestId('filter-input');
    this.resetButton = this.parent.getByTestId('filter-reset');
  }

  async fillInput(text: string) {
    await this.input.fill(text);
  }

  async clearInput() {
    await this.resetButton.click();
  }

  async getValue() {
    return this.input.inputValue();
  }
}
```

### Using Elements in Page Objects

```typescript
export class TodosPage {
  readonly filterInput: FilterInputElement;
  readonly todoList: Locator;

  constructor(page: Page) {
    this.filterInput = new FilterInputElement(page);
    this.todoList = page.getByTestId('todo-list');
  }
}
```

### Test Usage

```typescript
test('should filter todos', async ({ page }) => {
  const todosPage = new TodosPage(page);
  await todosPage.filterInput.fillInput('important');

  const count = await todosPage.todoList
    .locator('[data-testid="todo-item"]')
    .count();
  
  expect(count).toBeGreaterThan(0);
});
```

---

## Writing Tests

### Basic Test

```typescript
import { expect, test } from '@playwright/test';

test('should display welcome message', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('welcome')).toContainText('Welcome');
});
```

### Test Suite with Setup

```typescript
test.describe('User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email').fill('user@example.com');
    await page.getByTestId('password').fill('password');
    await page.getByTestId('submit').click();
    await page.waitForURL('/dashboard');
  });

  test('should display user name', async ({ page }) => {
    await expect(page.getByTestId('user-name'))
      .toContainText('John Doe');
  });

  test('should show user stats', async ({ page }) => {
    const stats = page.getByTestId('stats');
    await expect(stats).toBeVisible();
  });
});
```

### Testing User Interactions

```typescript
test('should add todo item', async ({ page }) => {
  await page.goto('/todos');

  const input = page.getByTestId('todo-input');
  await input.fill('Buy groceries');
  await page.getByTestId('add-button').click();

  await expect(page.getByTestId('todo-item'))
    .toContainText('Buy groceries');
});
```

### Testing Forms

```typescript
test('should submit form with validation', async ({ page }) => {
  await page.goto('/contact');

  const form = page.getByTestId('contact-form');
  await form.getByTestId('name').fill('John');
  await form.getByTestId('email').fill('john@example.com');
  await form.getByTestId('message').fill('Hello');
  await form.getByTestId('submit').click();

  await expect(page.getByTestId('success-message'))
    .toContainText('Message sent');
});
```

### Testing Navigation

```typescript
test('should navigate between pages', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('about-link').click();
  await expect(page).toHaveURL('/about');

  await page.getByTestId('services-link').click();
  await expect(page).toHaveURL('/services');
});
```

---

## Advanced Testing Patterns

### Testing with Multiple Tabs

```typescript
test('should open link in new tab', async ({ page, context }) => {
  await page.goto('/');

  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByTestId('external-link').click()
  ]);

  await expect(newPage).toHaveURL(/external-domain.com/);
  await newPage.close();
});
```

### Authentication Session Reuse

```typescript
// setup/auth.setup.ts
import { expect, test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('email').fill('user@example.com');
  await page.getByTestId('password').fill('password');
  await page.getByTestId('submit').click();

  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

Then use in tests:

```typescript
import { test } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test('should access protected route', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL('/profile');
});
```

### Network Interception

```typescript
test('should handle API error gracefully', async ({ page }) => {
  await page.route('**/api/data', route =>
    route.abort('failed')
  );

  await page.goto('/');
  await expect(page.getByTestId('error-message'))
    .toContainText('Failed to load data');
});
```

### Visual Testing

```typescript
test('should match snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-page.png');
});
```

---

## Debugging & Inspection

### Using Page.pause()

```typescript
test('debug test execution', async ({ page }) => {
  await page.goto('/');
  await page.pause();  // Pauses here for inspection
  
  await page.getByTestId('button').click();
});
```

### Debug Mode

```bash
npx playwright test --debug
```

This opens the Playwright Inspector where you can:
- Step through test execution
- Inspect DOM elements
- Use the locator picker tool

### Trace Viewer

Traces capture network, console, and execution details:

```bash
npx playwright show-trace trace.zip
```

### Screenshot on Failure

```typescript
import { test, expect } from '@playwright/test';

test('should fail with screenshot', async ({ page }) => {
  await page.goto('/');
  
  await expect(page.getByTestId('element'))
    .toContainText('expected text');
  // If fails, screenshot is saved to test-results/
});
```

---

## Running Tests

### Basic Commands

```bash
npx playwright test              # All tests, all browsers
npx playwright test --project=chromium  # Single browser
npx playwright test --headed     # Visible browser
npx playwright test --debug      # Debug mode
npx playwright test --ui         # UI mode with live preview
npx playwright test --grep="login"  # Tests matching pattern
npx playwright test --max-failures=5  # Stop after N failures
```

### CI/CD Integration

```bash
npx playwright test --workers=1 # Single worker for CI
npx playwright test --reporter=github  # GitHub reporter
```

### Watch Mode

```bash
npx playwright test --watch
```

---

## Structure & Organization

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts
│   └── pages.fixture.ts
├── pages/
│   ├── home.page.ts
│   ├── login.page.ts
│   └── dashboard.page.ts
├── elements/
│   ├── filter-input.element.ts
│   └── navbar.element.ts
├── data/
│   ├── users.data.ts
│   └── test-constants.ts
├── home.spec.ts
├── login.spec.ts
└── dashboard.spec.ts
```

---

## Best Practices

✅ **Use data-testid** — Stable selectors independent of styling
✅ **Page Object Model** — Centralize selectors and interactions
✅ **Fixtures for setup** — Reduce boilerplate, reusable fixtures
✅ **Test isolated flows** — Each test should be independent
✅ **Auto-waiting** — Playwright waits for elements automatically
✅ **Web-first assertions** — Use built-in assertions, not generic expect
✅ **Keep tests focused** — One user scenario per test
✅ **Use descriptive names** — Test names should explain scenario

---

## Common Issues

### Test Timeout

**Problem:** Test hangs waiting for element

```typescript
// ✅ Increase timeout for slow operations
test('should load large list', async ({ page }) => {
  await page.goto('/large-list', { waitUntil: 'networkidle' });
}, { timeout: 60000 });
```

### Flaky Tests

**Problem:** Test passes sometimes, fails others

```typescript
// ✅ Use proper waits
await page.waitForSelector('[data-testid="item"]');
await page.waitForURL('/dashboard');
await page.waitForFunction(() => /* condition */);
```

### Element Not Found

**Problem:** Selector returns null

```typescript
// ✅ Use getBy* instead of query*
const element = page.getByTestId('element');  // Throws if not found
// vs
const element = page.locator('[data-testid="element"]').first();
```

---

## Resources

- [Playwright Official Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
