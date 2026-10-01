---
title: Service & HTTP Testing
description: Complete guide to testing Angular services, HTTP calls, and API integration using HttpTestingController.
---

## Overview

Services handle business logic and API communication. This guide covers testing services with dependency injection, HTTP calls, error handling, and async operations.

---

## Testing Service Basics

### Service Setup

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }

  createUser(user: User) {
    return this.http.post<User>('/api/users', user);
  }

  updateUser(id: string, user: Partial<User>) {
    return this.http.put<User>(`/api/users/${id}`, user);
  }

  deleteUser(id: string) {
    return this.http.delete(`/api/users/${id}`);
  }
}
```

### Basic Service Test

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();  // Verify no outstanding requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

**Key concepts:**
- `HttpTestingController` — Intercepts and mocks HTTP requests
- `afterEach` + `httpMock.verify()` — Ensures all requests were handled
- No actual HTTP calls are made

---

## Testing GET Requests

### Simple GET Request

```typescript
it('should fetch user by id', () => {
  const mockUser = { id: '1', name: 'John', email: 'john@example.com' };

  service.getUser('1').subscribe(user => {
    expect(user).toEqual(mockUser);
  });

  const req = httpMock.expectOne('/api/users/1');
  expect(req.request.method).toBe('GET');
  req.flush(mockUser);
});
```

### Multiple Requests

```typescript
it('should fetch multiple users', () => {
  const users = [
    { id: '1', name: 'John' },
    { id: '2', name: 'Jane' }
  ];

  service.getUsers().subscribe(result => {
    expect(result).toHaveLength(2);
  });

  const req = httpMock.expectOne('/api/users');
  req.flush(users);
});
```

### Query Parameters

```typescript
it('should include query parameters', () => {
  service.searchUsers('john').subscribe();

  const req = httpMock.expectOne(req =>
    req.url === '/api/users' && req.params.get('q') === 'john'
  );
  req.flush([]);
});
```

---

## Testing POST Requests

### Create Resource

```typescript
it('should create user', () => {
  const newUser = { name: 'Alice', email: 'alice@example.com' };
  const response = { id: '3', ...newUser };

  service.createUser(newUser).subscribe(user => {
    expect(user.id).toBe('3');
    expect(user.name).toBe('Alice');
  });

  const req = httpMock.expectOne('/api/users');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(newUser);
  req.flush(response);
});
```

### Request Headers

```typescript
it('should include authorization header', () => {
  service.createUser({ name: 'Bob' }).subscribe();

  const req = httpMock.expectOne('/api/users');
  expect(req.request.headers.has('Authorization')).toBeTruthy();
  req.flush({});
});
```

---

## Testing PUT & DELETE Requests

### Update Resource

```typescript
it('should update user', () => {
  const updates = { name: 'Jane Doe' };

  service.updateUser('1', updates).subscribe(user => {
    expect(user.name).toBe('Jane Doe');
  });

  const req = httpMock.expectOne('/api/users/1');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual(updates);
  req.flush({ id: '1', ...updates });
});
```

### Delete Resource

```typescript
it('should delete user', () => {
  service.deleteUser('1').subscribe();

  const req = httpMock.expectOne('/api/users/1');
  expect(req.request.method).toBe('DELETE');
  req.flush({});
});
```

---

## Testing Error Handling

### HTTP Error Response

```typescript
it('should handle 404 error', () => {
  service.getUser('999').subscribe(
    () => fail('should have failed'),
    (error: HttpErrorResponse) => {
      expect(error.status).toBe(404);
      expect(error.error.message).toContain('Not found');
    }
  );

  const req = httpMock.expectOne('/api/users/999');
  req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
});
```

### 500 Server Error

```typescript
it('should handle server error', () => {
  service.getUser('1').subscribe(
    () => fail('should have failed'),
    (error: HttpErrorResponse) => {
      expect(error.status).toBe(500);
    }
  );

  const req = httpMock.expectOne('/api/users/1');
  req.error(new ErrorEvent('Server error'), { status: 500 });
});
```

### Network Error

```typescript
it('should handle network error', () => {
  service.getUser('1').subscribe(
    () => fail('should have failed'),
    (error: ProgressEvent) => {
      expect(error).toBeTruthy();
    }
  );

  const req = httpMock.expectOne('/api/users/1');
  req.error(new ProgressEvent('Network error'));
});
```

### Error Recovery

```typescript
it('should retry failed request', (done) => {
  let callCount = 0;
  service.fetchDataWithRetry().subscribe(
    (data) => {
      expect(data).toEqual({ success: true });
      done();
    }
  );

  let req = httpMock.expectOne('/api/data');
  req.error(new ErrorEvent('Error'));

  // Second attempt succeeds
  req = httpMock.expectOne('/api/data');
  req.flush({ success: true });
});
```

---

## Testing Async Operations

### Using `done` Callback

```typescript
it('should complete async operation', (done) => {
  service.getData().subscribe(data => {
    expect(data.id).toBe(1);
    done();  // Signal test completion
  });

  const req = httpMock.expectOne('/api/data');
  req.flush({ id: 1 });
});
```

### Using Promises

```typescript
it('should handle promises', async () => {
  const data = await service.getDataAsPromise();
  expect(data.id).toBe(1);

  const req = httpMock.expectOne('/api/data');
  req.flush({ id: 1 });
});
```

---

## Testing Service Dependencies

### Injecting Other Services

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}
  login(credentials: Credentials) {
    return this.http.post('/auth/login', credentials);
  }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient, private auth: AuthService) {}
  getProfile() {
    return this.http.get('/api/profile');
  }
}

describe('UserService with dependency', () => {
  let service: UserService;
  let authService: jasmine.SpyObj<AuthService>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    authSpy.isLoggedIn.and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(UserService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should get profile when authenticated', () => {
    service.getProfile().subscribe();
    expect(authService.isLoggedIn).toHaveBeenCalled();

    const req = httpMock.expectOne('/api/profile');
    req.flush({ id: '1', name: 'John' });
  });
});
```

---

## Advanced Testing Patterns

### Testing Observable Chains

```typescript
it('should chain multiple requests', () => {
  service.getUserThenProfile('1').subscribe(profile => {
    expect(profile.id).toBe('1');
  });

  // First request: get user
  let req = httpMock.expectOne('/api/users/1');
  req.flush({ id: '1', name: 'John' });

  // Second request: get profile
  req = httpMock.expectOne('/api/profiles/1');
  req.flush({ id: '1', bio: 'Developer' });
});
```

### Testing Concurrent Requests

```typescript
it('should handle concurrent requests', () => {
  service.getUser('1').subscribe();
  service.getUser('2').subscribe();

  const reqs = httpMock.match(req => req.url.includes('/api/users'));
  expect(reqs).toHaveLength(2);

  reqs[0].flush({ id: '1' });
  reqs[1].flush({ id: '2' });
});
```

### Testing Timeout

```typescript
it('should timeout after delay', () => {
  service.getDataWithTimeout().subscribe(
    () => fail('should timeout'),
    (error: TimeoutError) => {
      expect(error).toBeTruthy();
    }
  );

  const req = httpMock.expectOne('/api/data');
  // Simulate timeout
  req.error(new TimeoutError());
});
```

---

## Testing with Signals

### Service with Signals

```typescript
@Injectable({ providedIn: 'root' })
export class UserStore {
  private http = inject(HttpClient);
  users = signal<User[]>([]);
  isLoading = signal(false);

  loadUsers() {
    this.isLoading.set(true);
    this.http.get<User[]>('/api/users').subscribe(users => {
      this.users.set(users);
      this.isLoading.set(false);
    });
  }
}

describe('UserStore with signals', () => {
  let store: UserStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserStore]
    });

    store = TestBed.inject(UserStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should load users and update signal', () => {
    store.loadUsers();
    expect(store.isLoading()).toBe(true);

    const req = httpMock.expectOne('/api/users');
    req.flush([{ id: '1', name: 'John' }]);

    expect(store.users()).toHaveLength(1);
    expect(store.isLoading()).toBe(false);
  });
});
```

---

## Mocking Strategies

### Complete Service Mock

```typescript
const mockUserService: jasmine.SpyObj<UserService> = jasmine.createSpyObj(
  'UserService',
  ['getUser', 'createUser', 'updateUser']
);

mockUserService.getUser.and.returnValue(of({ id: '1', name: 'John' }));
mockUserService.createUser.and.returnValue(of({ id: '2', name: 'Jane' }));

TestBed.configureTestingModule({
  providers: [
    { provide: UserService, useValue: mockUserService }
  ]
});
```

### Partial Mock

```typescript
const mockUserService = TestBed.createComponent(UserComponent);
mockUserService.debugElement.injector.get(UserService);

// Override specific methods
spyOn(mockUserService, 'getUser').and.returnValue(of(mockUser));
```

---

## Troubleshooting

### Outstanding HTTP Requests

**Problem:** Test fails with "1 pending HTTP requests"

```typescript
// ✅ Always verify in afterEach
afterEach(() => {
  httpMock.verify();
});
```

### Wrong URL Assertion

**Problem:** Test can't find expected request

```typescript
// ❌ Wrong - exact string match fails with dynamic IDs
httpMock.expectOne('/api/users/1');

// ✅ Correct - use matcher function
httpMock.expectOne(req =>
  req.url.includes('/api/users') && req.url.includes('1')
);
```

### Async Timing Issues

**Problem:** Test passes locally but fails in CI

```typescript
// ✅ Use fakeAsync and tick for timing control
it('should complete within time', fakeAsync(() => {
  service.getData().subscribe();
  const req = httpMock.expectOne('/api/data');
  req.flush({});
  tick(1000);
}));
```

---

## Best Practices

✅ **Always verify** — Call `httpMock.verify()` in `afterEach`
✅ **Test error paths** — Don't just test happy path
✅ **Mock external dependencies** — Only test service logic
✅ **Use descriptive names** — Test names should explain scenario
✅ **Test edge cases** — Empty responses, timeouts, network errors
✅ **Keep tests fast** — No real HTTP calls
✅ **Isolate tests** — Each test should be independent

---

## Resources

- [Angular HttpTestingController Guide](https://angular.io/guide/http-test)
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Spies Documentation](https://jasmine.github.io/api/edge/jasmine.html)
