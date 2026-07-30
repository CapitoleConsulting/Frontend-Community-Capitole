---
title: Mastering Injection Tokens
description: Learn advanced dependency injection patterns using injection tokens in Angular. Create type-safe, configurable, and reusable services.
sidebar.order: 1
---

## Overview

Injection tokens are a powerful feature in Angular's dependency injection system that allow you to define custom tokens for injecting dependencies. They provide a clean way to:
- Create strongly-typed providers
- Implement complex dependency configurations
- Build flexible and reusable services
- Create multi-value providers
- Handle optional dependencies gracefully

---

## Why Use Injection Tokens?

### Type Safety
Injection tokens provide complete type safety compared to string-based keys.

```typescript
// ❌ String-based (not type-safe)
constructor(@Inject('API_URL') private apiUrl: string) {}

// ✅ Token-based (type-safe)
constructor(@Inject(API_URL) private apiUrl: string) {}
```

### Flexibility
Tokens allow multiple implementations and complex configurations.

### Encapsulation
Hide implementation details while exposing clean APIs.

### Library Building
Perfect for creating reusable, configurable libraries.

---

## Core Concepts

### 1. InjectionToken Basics

```typescript
import { InjectionToken } from '@angular/core';

const API_URL = new InjectionToken<string>('API_URL');
const API_KEY = new InjectionToken<string>('API_KEY');
const CONFIG = new InjectionToken<AppConfig>('CONFIG');

interface AppConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
}
```

### 2. Providing Values

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: API_URL, useValue: 'https://api.example.com' },
    { provide: API_KEY, useValue: 'secret-key-123' },
    {
      provide: CONFIG,
      useValue: {
        apiUrl: 'https://api.example.com',
        apiKey: 'secret-key-123',
        timeout: 5000
      }
    }
  ]
});
```

### 3. Factory Functions

Create tokens with factory functions for dynamic configuration:

```typescript
const DATABASE_CONFIG = new InjectionToken<DatabaseConfig>(
  'DATABASE_CONFIG'
);

function createDatabaseConfig(): DatabaseConfig {
  const env = process.env['NODE_ENV'];
  return {
    host: env === 'production' ? 'prod-db.example.com' : 'localhost',
    port: 5432,
    database: 'myapp'
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: DATABASE_CONFIG,
      useFactory: createDatabaseConfig
    }
  ]
});
```

### 4. Using Tokens in Services

```typescript
import { Injectable, Inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    @Inject(API_URL) private apiUrl: string,
    @Inject(API_KEY) private apiKey: string
  ) {}

  getUser(id: string) {
    return fetch(`${this.apiUrl}/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }
}
```

---

## Advanced Patterns

### Multi-Value Providers

Inject multiple values for the same token:

```typescript
const PLUGINS = new InjectionToken<Plugin[]>('PLUGINS');

interface Plugin {
  name: string;
  initialize(): void;
}

class LoggerPlugin implements Plugin {
  name = 'logger';
  initialize() {
    console.log('Logger plugin initialized');
  }
}

class AnalyticsPlugin implements Plugin {
  name = 'analytics';
  initialize() {
    console.log('Analytics plugin initialized');
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: PLUGINS,
      useValue: new LoggerPlugin(),
      multi: true
    },
    {
      provide: PLUGINS,
      useValue: new AnalyticsPlugin(),
      multi: true
    }
  ]
});
```

Using multi-value providers:

```typescript
@Injectable()
export class PluginManager {
  constructor(@Inject(PLUGINS) private plugins: Plugin[]) {
    this.plugins.forEach(plugin => plugin.initialize());
  }
}
```

### Class Providers

Use a token with a class provider:

```typescript
abstract class Logger {
  abstract log(message: string): void;
}

class ConsoleLogger extends Logger {
  log(message: string) {
    console.log(message);
  }
}

const LOGGER = new InjectionToken<Logger>('LOGGER');

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: LOGGER,
      useClass: ConsoleLogger
    }
  ]
});
```

### Optional Dependencies

Inject optional dependencies with undefined:

```typescript
const OPTIONAL_CONFIG = new InjectionToken<OptionalConfig | null>(
  'OPTIONAL_CONFIG'
);

@Injectable()
export class MyService {
  constructor(
    @Inject(OPTIONAL_CONFIG) private config: OptionalConfig | null
  ) {
    if (config) {
      console.log('Using custom config');
    } else {
      console.log('Using default config');
    }
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: OPTIONAL_CONFIG, useValue: null }
  ]
});
```

### Environment-Based Configuration

```typescript
const CONFIG = new InjectionToken<AppConfig>('CONFIG');

function createAppConfig(): AppConfig {
  const isDev = !environment.production;

  return {
    apiUrl: isDev
      ? 'http://localhost:3000'
      : 'https://api.example.com',
    timeout: isDev ? 30000 : 5000,
    enableDebug: isDev
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: CONFIG,
      useFactory: createAppConfig
    }
  ]
});
```

---

## Complete Example: Feature Configuration

### Step 1: Define Tokens

```typescript
export interface FeatureConfig {
  name: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export const FEATURE_CONFIG = new InjectionToken<FeatureConfig>(
  'FEATURE_CONFIG'
);

export const FEATURE_INTERCEPTORS = new InjectionToken<
  FeatureInterceptor[]
>('FEATURE_INTERCEPTORS');

export interface FeatureInterceptor {
  beforeInit?: () => void;
  afterInit?: () => void;
}
```

### Step 2: Create Feature Service

```typescript
@Injectable()
export class FeatureService {
  constructor(
    @Inject(FEATURE_CONFIG) private config: FeatureConfig,
    @Inject(FEATURE_INTERCEPTORS)
    private interceptors: FeatureInterceptor[]
  ) {
    this.initialize();
  }

  private initialize() {
    this.interceptors.forEach(int => int.beforeInit?.());
    console.log(`Feature ${this.config.name} initialized`);
    this.interceptors.forEach(int => int.afterInit?.());
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getSetting<T>(key: string, defaultValue: T): T {
    return this.config.settings[key] ?? defaultValue;
  }
}
```

### Step 3: Configure Feature

```typescript
class LoggingInterceptor implements FeatureInterceptor {
  beforeInit() {
    console.log('[LOG] Feature initializing...');
  }
  afterInit() {
    console.log('[LOG] Feature initialized');
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: FEATURE_CONFIG,
      useValue: {
        name: 'PaymentProcessor',
        enabled: true,
        settings: {
          provider: 'stripe',
          currency: 'USD',
          retryAttempts: 3
        }
      }
    },
    {
      provide: FEATURE_INTERCEPTORS,
      useValue: new LoggingInterceptor(),
      multi: true
    }
  ]
});
```

### Step 4: Use in Components

**Module-based approach:**
```typescript
@Component({
  selector: 'app-payment',
  template: `
    <div *ngIf="isEnabled">
      <p>Provider: {{ provider }}</p>
      <button (click)="processPayment()">Pay Now</button>
    </div>
    <div *ngIf="!isEnabled">
      <p>Payment processing is currently unavailable</p>
    </div>
  `
})
export class PaymentComponent {
  isEnabled = this.feature.isEnabled();
  provider = this.feature.getSetting<string>('provider', 'stripe');

  constructor(private feature: FeatureService) {}

  processPayment() {
    console.log(`Processing payment via ${this.provider}`);
  }
}
```

**Standalone component approach:**
```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isEnabled">
      <p>Provider: {{ provider }}</p>
      <button (click)="processPayment()">Pay Now</button>
    </div>
    <div *ngIf="!isEnabled">
      <p>Payment processing is currently unavailable</p>
    </div>
  `
})
export class PaymentComponent {
  private feature = inject(FeatureService);
  
  isEnabled = this.feature.isEnabled();
  provider = this.feature.getSetting<string>('provider', 'stripe');

  processPayment() {
    console.log(`Processing payment via ${this.provider}`);
  }
}
```

---

## Best Practices

### ✅ DO's

**Do create tokens for configuration**
```typescript
const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
```

**Do use factory functions for complex initialization**
```typescript
{
  provide: SERVICE,
  useFactory: (dep1: Dep1, dep2: Dep2) => new Service(dep1, dep2),
  deps: [Dep1, Dep2]
}
```

**Do type tokens properly**
```typescript
const TOKEN = new InjectionToken<Type>('TOKEN');
```

**Do document token usage**
```typescript
const API_ENDPOINT = new InjectionToken<string>(
  'API endpoint URL for server communication'
);
```

### ❌ DON'Ts

**Don't use string tokens for anything other than debugging**
```typescript
@Inject('apiUrl')
```

**Don't forget to provide tokens**
```typescript
bootstrapApplication(AppComponent, {
  providers: [
    { provide: MY_TOKEN, useValue: value }
  ]
});
```

**Don't mix token and string injection**
```typescript
constructor(
  @Inject(TOKEN) value: Type,
  @Inject('string') other: string
)
```

---

## Testing with Tokens

### Unit Tests

```typescript
describe('FeatureService', () => {
  it('should use injected config', () => {
    const config: FeatureConfig = {
      name: 'Test',
      enabled: true,
      settings: { test: true }
    };

    const service = new FeatureService(config, []);
    expect(service.isEnabled()).toBe(true);
  });

  it('should apply interceptors', () => {
    const beforeInitSpy = jasmine.createSpy('beforeInit');
    const interceptor: FeatureInterceptor = {
      beforeInit: beforeInitSpy
    };

    new FeatureService(
      { name: 'Test', enabled: true, settings: {} },
      [interceptor]
    );

    expect(beforeInitSpy).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
describe('Feature Configuration', () => {
  it('should inject tokens correctly', async () => {
    const result = await TestBed.configureTestingModule({
      providers: [
        {
          provide: FEATURE_CONFIG,
          useValue: { name: 'Test', enabled: true, settings: {} }
        },
        FeatureService
      ]
    }).compileComponents();

    const service = TestBed.inject(FeatureService);
    expect(service.isEnabled()).toBe(true);
  });
});
```

---

## Common Use Cases

### 1. API Configuration

```typescript
const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
const API_TIMEOUT = new InjectionToken<number>('API_TIMEOUT');

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: API_CONFIG,
      useValue: {
        baseUrl: 'https://api.example.com',
        version: 'v1'
      }
    },
    { provide: API_TIMEOUT, useValue: 5000 }
  ]
});
```

### 2. Feature Flags

```typescript
const FEATURE_FLAGS = new InjectionToken<Map<string, boolean>>(
  'FEATURE_FLAGS'
);

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: FEATURE_FLAGS,
      useValue: new Map([
        ['newDashboard', true],
        ['betaFeature', false]
      ])
    }
  ]
});
```

### 3. Theming

```typescript
const THEME = new InjectionToken<Theme>('THEME');
const THEME_COLORS = new InjectionToken<ThemeColors>('THEME_COLORS');

bootstrapApplication(AppComponent, {
  providers: [
    { provide: THEME, useValue: 'dark' },
    {
      provide: THEME_COLORS,
      useValue: {
        primary: '#007bff',
        secondary: '#6c757d'
      }
    }
  ]
});
```

---

## Performance Considerations

### Tree-Shaking

Use tokens to enable better tree-shaking:

```typescript
const OPTIONAL_FEATURE = new InjectionToken<OptionalFeature | null>(
  'OPTIONAL_FEATURE'
);

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: OPTIONAL_FEATURE,
      useFactory: () => {
        if (shouldEnableFeature()) {
          return new OptionalFeatureImpl();
        }
        return null;
      }
    }
  ]
});
```

---

## Comparison: String Injection vs Tokens

| Feature | String | Token |
|---------|--------|-------|
| **Type Safety** | ❌ None | ✅ Full |
| **IDE Support** | ❌ Limited | ✅ Complete |
| **Refactoring** | ❌ Manual | ✅ Automatic |
| **Collisions** | ⚠️ Possible | ✅ Impossible |
| **Documentation** | ❌ Weak | ✅ Strong |
| **Bundle Size** | ✅ Slightly smaller | ⚠️ Slightly larger |

---

## Conclusion

Injection tokens are essential for building scalable, maintainable Angular applications. They provide:

- **Type Safety** — Catch errors at compile-time
- **Flexibility** — Support multiple implementations
- **Clarity** — Make dependencies explicit
- **Testability** — Easy to mock and test
- **Reusability** — Build shareable, configurable services

Master injection tokens to unlock Angular's full dependency injection power.

---

## References

This guide is based on and inspired by:
- [Master Injection Tokens for Cleaner Angular Dependency Injection](https://medium.com/@sinasiri/master-injection-tokens-for-cleaner-angular-dependency-injection-c5cc668f9ed0)
- [Angular Official Documentation - Providing Dependencies](https://angular.io/guide/dependency-injection-providers)
- [Angular Official Documentation - InjectionToken](https://angular.io/api/core/InjectionToken)
