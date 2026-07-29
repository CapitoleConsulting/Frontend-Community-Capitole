---
title: NgRx Standalone Setup
description: Complete NgRx setup for standalone Angular components. Learn store configuration, actions, reducers, effects, and testing.
sidebar.order: 3
---

## Overview

NgRx standalone setup eliminates the need for NgModule configuration, making it seamless to integrate state management into modern Angular applications using standalone components. This guide provides a complete setup from scratch to production-ready state management.

---

## Why Standalone NgRx?

### Simplified Setup
No module configuration needed - just provide the store where you bootstrap your app.

### Modern Angular
Aligns with the future direction of Angular (standalone as default in v19+).

### Better Tree-Shaking
Standalone APIs enable better dead code elimination.

### Cleaner Architecture
Dependencies are explicit and easier to reason about.

---

## Step 1: Install NgRx

```bash
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools
```

---

## Step 2: Define State Interface

```typescript
// src/app/store/app.state.ts

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AppState {
  user: UserState;
}

export interface UserState {
  data: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}
```

---

## Step 3: Create Actions

```typescript
// src/app/store/user/user.actions.ts

import { createAction, props } from '@ngrx/store';

export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: User }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

export const logout = createAction(
  '[Auth] Logout'
);

export const loadUser = createAction(
  '[User] Load User',
  props<{ id: string }>()
);

export const loadUserSuccess = createAction(
  '[User] Load User Success',
  props<{ user: User }>()
);

export const loadUserFailure = createAction(
  '[User] Load User Failure',
  props<{ error: string }>()
);
```

---

## Step 4: Create Reducer

```typescript
// src/app/store/user/user.reducer.ts

import { createReducer, on } from '@ngrx/store';
import * as UserActions from './user.actions';
import { UserState } from '../app.state';

const initialState: UserState = {
  data: null,
  loading: false,
  error: null,
  isAuthenticated: false
};

export const userReducer = createReducer(
  initialState,
  on(UserActions.login, state => ({
    ...state,
    loading: true,
    error: null
  })),
  on(UserActions.loginSuccess, (state, { user }) => ({
    ...state,
    data: user,
    loading: false,
    isAuthenticated: true,
    error: null
  })),
  on(UserActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    isAuthenticated: false
  })),
  on(UserActions.logout, () => ({
    data: null,
    loading: false,
    error: null,
    isAuthenticated: false
  })),
  on(UserActions.loadUser, state => ({
    ...state,
    loading: true,
    error: null
  })),
  on(UserActions.loadUserSuccess, (state, { user }) => ({
    ...state,
    data: user,
    loading: false,
    error: null
  })),
  on(UserActions.loadUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
```

---

## Step 5: Create Selectors

```typescript
// src/app/store/user/user.selectors.ts

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserState } from '../app.state';

export const selectUserState = createFeatureSelector<UserState>('user');

export const selectUser = createSelector(
  selectUserState,
  (state: UserState) => state.data
);

export const selectUserLoading = createSelector(
  selectUserState,
  (state: UserState) => state.loading
);

export const selectUserError = createSelector(
  selectUserState,
  (state: UserState) => state.error
);

export const selectIsAuthenticated = createSelector(
  selectUserState,
  (state: UserState) => state.isAuthenticated
);

export const selectUserName = createSelector(
  selectUser,
  (user: User | null) => user?.name || ''
);

export const selectUserEmail = createSelector(
  selectUser,
  (user: User | null) => user?.email || ''
);
```

---

## Step 6: Create Effects

```typescript
// src/app/store/user/user.effects.ts

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as UserActions from './user.actions';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class UserEffects {
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.login),
      mergeMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map(user => UserActions.loginSuccess({ user })),
          catchError(error =>
            of(UserActions.loginFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UserActions.loginSuccess),
        tap(() => {
          this.router.navigate(['/dashboard']);
        })
      ),
    { dispatch: false }
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UserActions.logout),
        tap(() => {
          this.authService.logout();
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );

  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadUser),
      mergeMap(({ id }) =>
        this.authService.getUserById(id).pipe(
          map(user => UserActions.loadUserSuccess({ user })),
          catchError(error =>
            of(UserActions.loadUserFailure({ error: error.message }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private router: Router
  ) {}
}
```

---

## Step 7: Standalone Bootstrap Configuration

```typescript
// src/main.ts

import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { userReducer } from './app/store/user/user.reducer';
import { UserEffects } from './app/store/user/user.effects';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      // Add your interceptors here
    ),
    provideStore({
      user: userReducer
    }),
    provideEffects([UserEffects]),
    !environment.production
      ? provideStoreDevtools({
          maxAge: 25,
          logOnly: environment.production,
          features: {
            pause: true,
            lock: true
          }
        })
      : []
  ]
}).catch(err => console.error(err));
```

---

## Step 8: Use in Standalone Components

```typescript
// src/app/components/login.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { selectUserLoading, selectUserError } from '../store/user/user.selectors';
import * as UserActions from '../store/user/user.actions';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <h2>Login</h2>
      <form (ngSubmit)="onLogin()">
        <input
          [(ngModel)]="email"
          name="email"
          type="email"
          placeholder="Email"
          required
        >
        <input
          [(ngModel)]="password"
          name="password"
          type="password"
          placeholder="Password"
          required
        >
        <button type="submit" [disabled]="loading$ | async">
          {{ (loading$ | async) ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      @if (error$ | async as error) {
        <p class="error">{{ error }}</p>
      }
    </div>
  `
})
export class LoginComponent {
  private store = inject(Store);

  email = '';
  password = '';
  loading$ = this.store.select(selectUserLoading);
  error$ = this.store.select(selectUserError);

  onLogin(): void {
    this.store.dispatch(
      UserActions.login({
        email: this.email,
        password: this.password
      })
    );
  }
}
```

---

## Step 9: Dashboard Component with Store Integration

```typescript
// src/app/components/dashboard.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import {
  selectUser,
  selectUserName,
  selectIsAuthenticated
} from '../store/user/user.selectors';
import * as UserActions from '../store/user/user.actions';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isAuthenticated$ | async) {
      <div class="dashboard">
        <h1>Welcome, {{ userName$ | async }}!</h1>
        <p>Email: {{ (user$ | async)?.email }}</p>
        <button (click)="onLogout()">Logout</button>
      </div>
    } @else {
      <p>Please login to view the dashboard</p>
    }
  `
})
export class DashboardComponent implements OnInit {
  private store = inject(Store);

  user$ = this.store.select(selectUser);
  userName$ = this.store.select(selectUserName);
  isAuthenticated$ = this.store.select(selectIsAuthenticated);

  ngOnInit(): void {
    this.user$.subscribe(user => {
      if (user) {
        this.store.dispatch(UserActions.loadUser({ id: user.id }));
      }
    });
  }

  onLogout(): void {
    this.store.dispatch(UserActions.logout());
  }
}
```

---

## Step 10: Testing

### Testing Reducers

```typescript
// src/app/store/user/user.reducer.spec.ts

import { userReducer } from './user.reducer';
import * as UserActions from './user.actions';

describe('UserReducer', () => {
  it('should handle loginSuccess action', () => {
    const user = { id: '1', email: 'test@test.com', name: 'Test' };
    const action = UserActions.loginSuccess({ user });
    const result = userReducer(undefined, action);

    expect(result.data).toEqual(user);
    expect(result.isAuthenticated).toBe(true);
    expect(result.loading).toBe(false);
  });

  it('should handle logout action', () => {
    const action = UserActions.logout();
    const result = userReducer(undefined, action);

    expect(result.data).toBeNull();
    expect(result.isAuthenticated).toBe(false);
  });
});
```

### Testing Effects

```typescript
// src/app/store/user/user.effects.spec.ts

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { UserEffects } from './user.effects';
import * as UserActions from './user.actions';
import { AuthService } from '../../services/auth.service';

describe('UserEffects', () => {
  let effects: UserEffects;
  let actions$: Observable<any>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);

    TestBed.configureTestingModule({
      providers: [
        UserEffects,
        provideMockActions(() => actions$),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    effects = TestBed.inject(UserEffects);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should dispatch loginSuccess on successful login', () => {
    const user = { id: '1', email: 'test@test.com', name: 'Test' };
    const action = UserActions.login({ email: 'test@test.com', password: 'pass' });
    const completion = UserActions.loginSuccess({ user });

    actions$ = of(action);
    authService.login.and.returnValue(of(user));

    effects.login$.subscribe(result => {
      expect(result).toEqual(completion);
    });
  });
});
```

---

## Best Practices

### ✅ DO's

**Do organize by feature**
```
src/app/
  store/
    user/
      user.actions.ts
      user.reducer.ts
      user.selectors.ts
      user.effects.ts
```

**Do use strong typing**
```typescript
export const selectUser = createSelector(
  selectUserState,
  (state: UserState): User | null => state.data
);
```

**Do handle loading and error states**
```typescript
loading$: Observable<boolean>;
error$: Observable<string | null>;
```

### ❌ DON'Ts

**Don't put business logic in reducers**
```typescript
// Bad: Complex logic in reducer
on(someAction, (state) => {
  // Complex calculations
  return newState;
})

// Good: Simple state updates
on(someAction, (state, { payload }) => ({
  ...state,
  data: payload
}))
```

**Don't forget to handle errors**
```typescript
// Always have error handling
catchError(error => of(failureAction({ error: error.message })))
```

---

## Project Structure

```
src/app/
├── store/
│   ├── user/
│   │   ├── user.actions.ts
│   │   ├── user.reducer.ts
│   │   ├── user.selectors.ts
│   │   ├── user.effects.ts
│   │   └── user.reducer.spec.ts
│   ├── app.state.ts
│   └── index.ts
├── services/
│   └── auth.service.ts
├── components/
│   ├── login.component.ts
│   └── dashboard.component.ts
├── app.component.ts
├── app.routes.ts
└── main.ts
```

---

## Conclusion

NgRx standalone setup is the modern way to integrate state management into Angular applications. By following this guide, you have a production-ready state management solution that scales with your application.

**Key Takeaways:**
- ✅ Use standalone providers for cleaner setup
- ✅ Organize store by features
- ✅ Always handle loading and error states
- ✅ Use selectors for all state access
- ✅ Test your store thoroughly

---

## References

This guide is based on and inspired by:
- [Complete NgRx Setup in Angular Standalone](https://siva-cs579.medium.com/complete-ngrx-setup-in-angular-standalone-907b7b76ff25)
- [NgRx Official Documentation](https://ngrx.io/)
- [Angular Official Guide](https://angular.io/guide/standalone-components)
