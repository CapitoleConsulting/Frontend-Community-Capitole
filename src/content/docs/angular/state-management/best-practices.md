---
title: State Management Best Practices
description: Master best practices for Angular state management. Learn patterns, anti-patterns, and strategies for building scalable applications.
sidebar.order: 4
---

## Overview

Effective state management is about more than just choosing a library. It's about establishing patterns, conventions, and practices that ensure your application remains maintainable, scalable, and performant as it grows.

This guide covers proven best practices for state management in Angular, regardless of which library you choose.

---

## Core Principles

### 1. Single Source of Truth

All application state should be stored in one centralized location.

```typescript
const appState = {
  user: { },
  products: { },
  cart: { }
};
```

### 2. State is Read-Only

State should never be mutated directly. Changes happen through actions.

```typescript
this.store.dispatch(updateUserName({ name: 'John' }));
```

### 3. Immutability

Always create new objects/arrays instead of modifying existing ones.

```typescript
return {
  ...state,
  items: [...state.items, newItem]
};

return {
  ...state,
  items: state.items.map(item =>
    item.id === 1 ? { ...item, name: 'Updated' } : item
  )
};
```

### 4. Pure Functions

Reducers and selectors should be pure functions with no side effects.

```typescript
const reducer = (state, action) => {
  return {
    ...state,
    data: action.payload
  };
};
```

---

## State Structure Best Practices

### 1. Normalize Your State

Store data in a normalized format to avoid duplication and ensure consistency.

```typescript
{
  users: {
    ids: ['1'],
    entities: {
      '1': { id: '1', name: 'John' }
    }
  },
  posts: {
    ids: ['1', '2'],
    entities: {
      '1': { id: '1', title: 'Post 1', authorId: '1' },
      '2': { id: '2', title: 'Post 2', authorId: '1' }
    }
  }
}
```

### 2. Use Proper State Shape

```typescript
{
  user: {
    data: User | null,
    loading: boolean,
    error: string | null,
    lastUpdated: Date | null
  },
  products: {
    data: Product[],
    loading: boolean,
    error: string | null,
    pagination: {
      page: number,
      pageSize: number,
      total: number
    }
  }
}
```

### 3. Keep State Flat

```typescript
{
  ui: {
    userModalOpen: boolean,
    userModalSize: string,
    userModalData: any
  }
}
```

---

## Selector Best Practices

### 1. Use Selectors for All State Access

```typescript
export const selectUser = createSelector(
  selectUserState,
  state => state.data
);

export const selectUserName = createSelector(
  selectUser,
  user => user?.name
);
```

### 2. Memoize Selectors

```typescript
export const selectFilteredItems = createSelector(
  selectAllItems,
  selectFilter,
  (items, filter) => items.filter(item => item.type === filter)
);
```

### 3. Create Reusable Selector Factory

```typescript
export const selectItemById = (id: string) =>
  createSelector(
    selectAllItems,
    items => items.find(item => item.id === id)
  );

const item$ = this.store.select(selectItemById('123'));
```

---

## Action Best Practices

### 1. Name Actions Clearly

```typescript
export const loadUserProfile = createAction(
  '[User] Load Profile'
);

export const loadUserProfileSuccess = createAction(
  '[User] Load Profile Success',
  props<{ profile: UserProfile }>()
);

export const loadUserProfileFailure = createAction(
  '[User] Load Profile Failure',
  props<{ error: string }>()
);
```

### 2. Include Required Data in Payload

```typescript
export const updateUser = createAction(
  '[User] Update',
  props<{ id: string; changes: Partial<User> }>()
);
```

### 3. Group Related Actions

```typescript
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

## Reducer Best Practices

### 1. Handle All Action Types

```typescript
export const userReducer = createReducer(
  initialState,
  on(loadUser, state => ({ ...state, loading: true })),
  on(loadUserSuccess, (state, { user }) => ({
    ...state,
    data: user,
    loading: false,
    error: null
  })),
  on(loadUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
```

### 2. Keep Reducers Small and Focused

```typescript
const userReducer = createReducer(initialUserState, ...);
const productsReducer = createReducer(initialProductsState, ...);
const uiReducer = createReducer(initialUiState, ...);

provideStore({
  user: userReducer,
  products: productsReducer,
  ui: uiReducer
})
```

### 3. Use Immutable Updates

```typescript
on(addItem, (state, { item }) => ({
  ...state,
  items: [...state.items, item]
})),

on(updateItem, (state, { id, changes }) => ({
  ...state,
  items: state.items.map(item =>
    item.id === id ? { ...item, ...changes } : item
  )
})),

on(removeItem, (state, { id }) => ({
  ...state,
  items: state.items.filter(item => item.id !== id)
}))
```

---

## Effects Best Practices

### 1. Handle Errors Gracefully

```typescript
loadUser$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadUser),
    mergeMap(({ id }) =>
      this.api.getUser(id).pipe(
        map(user => loadUserSuccess({ user })),
        catchError(error =>
          of(loadUserFailure({ error: error.message }))
        )
      )
    )
  )
);
```

### 2. Use Proper RxJS Operators

```typescript
mergeMap(action => this.api.call())

concatMap(action => this.api.call())

switchMap(action => this.api.call())

mergeMap(action => this.api.call(), 3)
```

### 3. Dispatch Side Effects, Not Results

```typescript
loadUserSuccess$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(loadUserSuccess),
      tap(({ user }) => {
        this.router.navigate(['/user', user.id]);
      })
    ),
  { dispatch: false }
);
```

---

## Performance Best Practices

### 1. Use OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserComponent {
  user$ = this.store.select(selectUser);
}
```

### 2. Unsubscribe Properly

```typescript
user$ = this.store.select(selectUser);

private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.store.select(selectUser)
    .pipe(takeUntil(this.destroy$))
    .subscribe(user => { });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 3. Avoid Multiple Selects

```typescript
userInfo$ = this.store.select(selectUser).pipe(
  map(user => ({
    name: user?.name,
    email: user?.email
  }))
);

export const selectUserInfo = createSelector(
  selectUser,
  user => ({
    name: user?.name,
    email: user?.email
  })
);
```

---

## Testing Best Practices

### 1. Test Reducers in Isolation

```typescript
describe('UserReducer', () => {
  it('should add a user on loadUserSuccess', () => {
    const user = { id: '1', name: 'John' };
    const action = loadUserSuccess({ user });
    const result = userReducer(initialState, action);

    expect(result.data).toEqual(user);
    expect(result.loading).toBe(false);
  });
});
```

### 2. Test Selectors

```typescript
describe('User Selectors', () => {
  it('should select user name', () => {
    const state = {
      user: {
        data: { id: '1', name: 'John' }
      }
    };

    const result = selectUserName(state);
    expect(result).toBe('John');
  });
});
```

### 3. Mock Effects in Tests

```typescript
describe('UserEffects', () => {
  it('should dispatch loadUserSuccess on loadUser', () => {
    const user = { id: '1', name: 'John' };
    const action = loadUser({ id: '1' });
    const completion = loadUserSuccess({ user });

    actions$ = hot('-a', { a: action });
    const response = cold('-b|', { b: user });
    const expected = cold('--c', { c: completion });

    api.getUser.and.returnValue(response);

    expect(effects.loadUser$).toBeObservable(expected);
  });
});
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: State in Multiple Places

```typescript
@Injectable()
export class UserService {
  user = new BehaviorSubject(null);
}

@Component({
  selector: 'app-user'
})
export class UserComponent {
  user: User;
  userFromService: User;
  userFromStore: Observable<User>;
}
```

### ❌ Anti-Pattern 2: Mutating State

```typescript
on(updateUser, (state, { user }) => ({
  ...state,
  user
}))
```

### ❌ Anti-Pattern 3: Storing Computed Data

```typescript
{
  user: { id: '1', name: 'John', email: 'john@example.com' }
}

export const selectUserDisplayName = createSelector(
  selectUser,
  user => user?.name
);
```

### ❌ Anti-Pattern 4: Putting Logic in Reducers

```typescript
export const selectTotal = createSelector(
  selectItems,
  items => items.reduce((sum, item) => sum + item.price, 0)
);
```

---

## When to Use State Management

### ✅ Use State Management For:
- **Shared State** — Multiple components need same data
- **Complex Interactions** — State changes across multiple features
- **Historical Data** — Need to track state changes over time
- **Performance** — Need fine-grained change detection
- **Testing** — Want predictable, testable state mutations
- **Debugging** — Need time-travel debugging capabilities

### ❌ Don't Use State Management For:
- **Local Component State** — Data used by single component
- **Simple CRUD** — Basic form data in single component
- **Temporary UI State** — Modal open/closed, dropdown expanded
- **Small Apps** — Complexity not justified
- **Simple REST APIs** — Just fetch and display

---

## Migration Strategy

### Phase 1: Identify State

Identify what needs to be in the store vs. local component state.

### Phase 2: Design Structure

Plan your state shape, actions, and selectors before implementation.

### Phase 3: Implement Incrementally

Start with one feature, then expand to others.

### Phase 4: Refactor Existing Code

Gradually move existing state management to the store.

### Phase 5: Optimize Performance

Monitor and optimize change detection and subscriptions.

---

## Checklist for State Management

- ✅ Single source of truth for all application state
- ✅ State is immutable and read-only
- ✅ Changes happen only through actions
- ✅ Normalized state structure
- ✅ Memoized selectors for all state access
- ✅ Proper error handling in effects
- ✅ OnPush change detection enabled
- ✅ Proper cleanup of subscriptions
- ✅ Comprehensive unit tests
- ✅ Redux DevTools enabled for debugging

---

## Conclusion

Following these best practices ensures your state management:

- **Scales** — Handles growing application complexity
- **Maintains** — Code remains readable and organized
- **Performs** — Efficient change detection and rendering
- **Tests** — Easy to test in isolation
- **Debugs** — Time-travel debugging and clear history
- **Teams** — Clear patterns for team collaboration

Remember: **The best state management solution is the one that scales with your application needs and team's understanding.**

---

## References

This guide is based on and inspired by:
- [Best Practices for Angular State Management](https://dev.to/devin-rosario/best-practices-for-angular-state-management-2pm1)