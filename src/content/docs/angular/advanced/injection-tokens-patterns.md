---
title: Advanced Injection Token Patterns
description: Explore production-ready patterns with injection tokens, including plugin systems, hierarchical DI, and third-party library integration.
sidebar.order: 2
---

## Building Plugin Systems with Multi-Providers

Create extensible systems where multiple implementations can be registered for the same token:

```typescript
import { InjectionToken } from '@angular/core';

interface NotificationHandler {
  type: string;
  send(message: string): Promise<void>;
}

const NOTIFICATION_HANDLERS = new InjectionToken<NotificationHandler[]>(
  'NOTIFICATION_HANDLERS'
);
```

Define handler implementations:

```typescript
import { Injectable } from '@angular/core';

@Injectable()
export class EmailHandler implements NotificationHandler {
  type = 'email';

  async send(message: string) {
    console.log(`Sending email: ${message}`);
  }
}

@Injectable()
export class SmsHandler implements NotificationHandler {
  type = 'sms';

  async send(message: string) {
    console.log(`Sending SMS: ${message}`);
  }
}

@Injectable()
export class SlackHandler implements NotificationHandler {
  type = 'slack';

  async send(message: string) {
    console.log(`Posting to Slack: ${message}`);
  }
}
```

Register all handlers in your module or bootstrap:

```typescript
import { NgModule } from '@angular/core';

@NgModule({
  providers: [
    { provide: NOTIFICATION_HANDLERS, useClass: EmailHandler, multi: true },
    { provide: NOTIFICATION_HANDLERS, useClass: SmsHandler, multi: true },
    { provide: NOTIFICATION_HANDLERS, useClass: SlackHandler, multi: true }
  ]
})
export class NotificationModule { }
```

Create a service that dispatches to the appropriate handler:

```typescript
import { Injectable, Inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(
    @Inject(NOTIFICATION_HANDLERS) private handlers: NotificationHandler[]
  ) { }

  async notify(type: string, message: string): Promise<void> {
    const handler = this.handlers.find(h => h.type === type);
    if (handler) {
      await handler.send(message);
    } else {
      console.warn(`No handler found for notification type: ${type}`);
    }
  }
}
```

Use the service:

```typescript
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-notifications',
  template: `
    <button (click)="sendNotification('email')">Send Email</button>
    <button (click)="sendNotification('sms')">Send SMS</button>
    <button (click)="sendNotification('slack')">Post to Slack</button>
  `
})
export class NotificationsComponent {
  private notificationService = inject(NotificationService);

  async sendNotification(type: string) {
    await this.notificationService.notify(type, 'Hello from Angular!');
  }
}
```

**Benefits:**
- New handlers can be added without modifying existing code
- Decoupled from the notification service implementation
- Easy to test with mock handlers
- Scales for complex feature extensions

---

## Hierarchical Dependency Injection

Use injection tokens to swap implementations based on injection hierarchy:

```typescript
import { InjectionToken } from '@angular/core';

interface Logger {
  log(message: string): void;
}

const LOGGER = new InjectionToken<Logger>('LOGGER');
```

Create different logger implementations:

```typescript
import { Injectable } from '@angular/core';

@Injectable()
export class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(`[Console] ${message}`);
  }
}

@Injectable()
export class ServerLogger implements Logger {
  constructor(private http: HttpClient) { }

  log(message: string) {
    this.http.post('/api/logs', { message }).subscribe();
  }
}

@Injectable()
export class FileLogger implements Logger {
  log(message: string) {
    console.log(`[File] ${message}`);
  }
}
```

Provide a default logger globally:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: LOGGER, useClass: ConsoleLogger }
  ]
});
```

Override logger at component level for specific requirements:

```typescript
import { Component, Inject } from '@angular/core';
import { ServerLogger } from './server-logger';

@Component({
  selector: 'app-analytics',
  template: `<button (click)="trackEvent()">Track</button>`,
  providers: [
    { provide: LOGGER, useClass: ServerLogger }
  ]
})
export class AnalyticsComponent {
  constructor(@Inject(LOGGER) private logger: Logger) { }

  trackEvent() {
    this.logger.log('User clicked track button');
  }
}
```

In another component, use the default logger:

```typescript
import { Component, Inject } from '@angular/core';

@Component({
  selector: 'app-user-profile',
  template: `<p>User Profile</p>`
})
export class UserProfileComponent {
  constructor(@Inject(LOGGER) private logger: Logger) {
    this.logger.log('User profile loaded');
  }
}
```

**Use Cases:**
- Development vs. production logging strategies
- Different logging for features requiring audit trails
- A/B testing different implementations
- Feature flags with multiple implementations

---

## Third-Party Library Integration

Cleanly integrate external libraries with configuration tokens:

```typescript
export class AnalyticsSDK {
  constructor(private config: { trackingId: string; apiUrl?: string }) { }

  track(event: string, data?: any) {
    console.log(
      `Tracking ${event} with ID ${this.config.trackingId}`,
      data
    );
  }
}
```

Define configuration and SDK tokens:

```typescript
import { InjectionToken } from '@angular/core';

export interface AnalyticsConfig {
  trackingId: string;
  apiUrl?: string;
  environment: 'development' | 'production';
}

export const ANALYTICS_CONFIG = new InjectionToken<AnalyticsConfig>(
  'ANALYTICS_CONFIG'
);

export const ANALYTICS_SDK = new InjectionToken<AnalyticsSDK>(
  'ANALYTICS_SDK'
);
```

Provide configuration based on environment:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: ANALYTICS_CONFIG,
      useValue: {
        trackingId: environment.analyticsId,
        apiUrl: environment.analyticsApi,
        environment: environment.production ? 'production' : 'development'
      }
    },
    {
      provide: ANALYTICS_SDK,
      useFactory: (config: AnalyticsConfig) => new AnalyticsSDK(config),
      deps: [ANALYTICS_CONFIG]
    }
  ]
});
```

Use the SDK in services:

```typescript
import { Injectable, Inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(@Inject(ANALYTICS_SDK) private analytics: AnalyticsSDK) { }

  trackPageView(pageName: string) {
    this.analytics.track('pageview', { page: pageName });
  }

  trackUserAction(action: string, metadata?: any) {
    this.analytics.track('user_action', { action, ...metadata });
  }
}
```

Use in components:

```typescript
import { Component, inject, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `<h1>Dashboard</h1>`
})
export class DashboardComponent implements OnInit {
  private analytics = inject(AnalyticsService);

  ngOnInit() {
    this.analytics.trackPageView('dashboard');
  }
}
```

**Advantages:**
- Single source of truth for library configuration
- Easy to swap SDK versions or implementations
- Environment-specific setup
- Centralized initialization and error handling
- Type-safe configuration

---

## Combining Multiple Patterns

Create a feature-complete system combining plugins, hierarchical DI, and third-party integration:

```typescript
import { InjectionToken, Injectable, Inject } from '@angular/core';

interface DataSource {
  type: string;
  fetch<T>(url: string): Promise<T>;
}

const DATA_SOURCES = new InjectionToken<DataSource[]>('DATA_SOURCES');

const CACHE_STRATEGY = new InjectionToken<'memory' | 'localStorage'>(
  'CACHE_STRATEGY'
);
```

Multiple data source implementations:

```typescript
@Injectable()
export class HttpDataSource implements DataSource {
  type = 'http';

  constructor(private http: HttpClient) { }

  fetch<T>(url: string): Promise<T> {
    return this.http.get<T>(url).toPromise() as Promise<T>;
  }
}

@Injectable()
export class MockDataSource implements DataSource {
  type = 'mock';

  fetch<T>(url: string): Promise<T> {
    return Promise.resolve({ id: 1, name: 'Mock Data' } as T);
  }
}

@Injectable()
export class GraphQLDataSource implements DataSource {
  type = 'graphql';

  constructor(private apollo: ApolloClient<any>) { }

  fetch<T>(url: string): Promise<T> {
    return this.apollo.query({ query: url }).toPromise() as Promise<T>;
  }
}
```

Data access service that routes to appropriate source:

```typescript
@Injectable({ providedIn: 'root' })
export class DataAccessService {
  constructor(
    @Inject(DATA_SOURCES) private dataSources: DataSource[],
    @Inject(CACHE_STRATEGY) private cacheStrategy: string
  ) { }

  async fetchData<T>(type: string, url: string): Promise<T> {
    const source = this.dataSources.find(ds => ds.type === type);
    if (!source) {
      throw new Error(`No data source found for type: ${type}`);
    }
    return source.fetch<T>(url);
  }
}
```

Module setup:

```typescript
import { NgModule } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: DATA_SOURCES,
      useClass: HttpDataSource,
      multi: true
    },
    {
      provide: DATA_SOURCES,
      useClass: MockDataSource,
      multi: true
    },
    {
      provide: CACHE_STRATEGY,
      useValue: 'memory'
    }
  ]
});
```

---

## Testing with Tokens

Mock tokens easily in unit tests:

```typescript
import { TestBed } from '@angular/core/testing';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    const mockHandlers: NotificationHandler[] = [
      {
        type: 'test',
        send: jasmine.createSpy('send').and.returnValue(Promise.resolve())
      }
    ];

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: NOTIFICATION_HANDLERS, useValue: mockHandlers }
      ]
    });

    service = TestBed.inject(NotificationService);
  });

  it('should send notification with registered handler', async () => {
    await service.notify('test', 'test message');
    expect(service['handlers'][0].send).toHaveBeenCalledWith('test message');
  });
});
```

---

## References

- [Master Injection Tokens for Cleaner Angular Dependency Injection](https://medium.com/@sinasiri/master-injection-tokens-for-cleaner-angular-dependency-injection-c5cc668f9ed0)[^1]
- [Angular Dependency Injection Documentation](https://angular.io/guide/dependency-injection)[^2]

[^1]: Nasiri, Sina. "Master Injection Tokens for Cleaner Angular Dependency Injection." Medium, August 4, 2025.
[^2]: Angular Documentation. "Dependency Injection Guide." Angular.io.
