---
title: NgRx with Signals
description: Master scalable state management in Angular with NgRx and signals. Learn to build predictable, performant applications.
sidebar.order: 2
---

## Overview

NgRx is a powerful, Redux-inspired state management library for Angular that combines with signals to create highly scalable and performant applications. By integrating NgRx with Angular signals, you get the best of both worlds: Redux's predictability and signals' reactivity.

This combination enables building enterprise-grade applications with excellent performance characteristics and time-travel debugging capabilities.

---

## Why NgRx + Signals?

### Scalability
NgRx handles complex state trees with predictable mutations, while signals provide fine-grained reactivity.

### Performance
Signals optimize change detection by only updating affected components, reducing unnecessary renders.

### Predictability
Redux-inspired architecture ensures state changes are traceable and debuggable.

### Developer Experience
Combined with Angular DevTools, NgRx offers unparalleled debugging capabilities.

### Team Confidence
Clear patterns and centralized state make large teams confident in code changes.

---

## Core Concepts

### 1. Store

The single source of truth for your application state.

```typescript
import { createAction, props } from '@ngrx/store';

export const loadItems = createAction(
  '[Items] Load Items',
  props<{ category: string }>()
);

export const loadItemsSuccess = createAction(
  '[Items] Load Items Success',
  props<{ items: Item[] }>()
);

export const loadItemsFailure = createAction(
  '[Items] Load Items Failure',
  props<{ error: string }>()
);
```

### 2. Actions

Describe events that happen in your application.

```typescript
export interface Item {
  id: string;
  name: string;
  price: number;
}

export const addItem = createAction(
  '[Items] Add Item',
  props<{ item: Item }>()
);

export const removeItem = createAction(
  '[Items] Remove Item',
  props<{ id: string }>()
);
```

### 3. Reducers

Pure functions that respond to actions and update state.

```typescript
import { createReducer, on } from '@ngrx/store';
import { addItem, removeItem, loadItemsSuccess } from './items.actions';

export interface ItemsState {
  items: Item[];
  loading: boolean;
  error: string | null;
}

const initialState: ItemsState = {
  items: [],
  loading: false,
  error: null
};

export const itemsReducer = createReducer(
  initialState,
  on(loadItems, state => ({
    ...state,
    loading: true
  })),
  on(loadItemsSuccess, (state, { items }) => ({
    ...state,
    items,
    loading: false,
    error: null
  })),
  on(loadItemsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(addItem, (state, { item }) => ({
    ...state,
    items: [...state.items, item]
  })),
  on(removeItem, (state, { id }) => ({
    ...state,
    items: state.items.filter(item => item.id !== id)
  }))
);
```

### 4. Selectors

Efficiently select slices of state.

```typescript
import { createSelector, createFeatureSelector } from '@ngrx/store';

export const selectItemsState = createFeatureSelector<ItemsState>('items');

export const selectItems = createSelector(
  selectItemsState,
  (state: ItemsState) => state.items
);

export const selectLoading = createSelector(
  selectItemsState,
  (state: ItemsState) => state.loading
);

export const selectError = createSelector(
  selectItemsState,
  (state: ItemsState) => state.error
);

export const selectItemById = (id: string) =>
  createSelector(
    selectItems,
    (items: Item[]) => items.find(item => item.id === id)
  );
```

### 5. Effects

Handle side effects like API calls.

```typescript
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { ItemsService } from './items.service';
import { loadItems, loadItemsSuccess, loadItemsFailure } from './items.actions';

@Injectable()
export class ItemsEffects {
  loadItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadItems),
      mergeMap(action =>
        this.itemsService.getItems(action.category).pipe(
          map(items => loadItemsSuccess({ items })),
          catchError(error => of(loadItemsFailure({ error: error.message })))
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private itemsService: ItemsService
  ) {}
}
```

---

## Complete Example: Todo App with NgRx & Signals

### Step 1: Define State

```typescript
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface TodosState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'active' | 'completed';
}
```

### Step 2: Create Actions

```typescript
export const loadTodos = createAction(
  '[Todos] Load Todos'
);

export const loadTodosSuccess = createAction(
  '[Todos] Load Todos Success',
  props<{ todos: Todo[] }>()
);

export const loadTodosFailure = createAction(
  '[Todos] Load Todos Failure',
  props<{ error: string }>()
);

export const addTodo = createAction(
  '[Todos] Add Todo',
  props<{ title: string }>()
);

export const removeTodo = createAction(
  '[Todos] Remove Todo',
  props<{ id: string }>()
);

export const toggleTodo = createAction(
  '[Todos] Toggle Todo',
  props<{ id: string }>()
);

export const setFilter = createAction(
  '[Todos] Set Filter',
  props<{ filter: 'all' | 'active' | 'completed' }>()
);
```

### Step 3: Create Reducer

```typescript
export const todosReducer = createReducer(
  initialState,
  on(loadTodos, state => ({
    ...state,
    loading: true
  })),
  on(loadTodosSuccess, (state, { todos }) => ({
    ...state,
    todos,
    loading: false,
    error: null
  })),
  on(addTodo, (state, { title }) => ({
    ...state,
    todos: [
      ...state.todos,
      {
        id: Math.random().toString(),
        title,
        completed: false,
        createdAt: new Date()
      }
    ]
  })),
  on(removeTodo, (state, { id }) => ({
    ...state,
    todos: state.todos.filter(t => t.id !== id)
  })),
  on(toggleTodo, (state, { id }) => ({
    ...state,
    todos: state.todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    )
  })),
  on(setFilter, (state, { filter }) => ({
    ...state,
    filter
  }))
);
```

### Step 4: Create Selectors

```typescript
const selectTodosState = createFeatureSelector<TodosState>('todos');

const selectAllTodos = createSelector(
  selectTodosState,
  state => state.todos
);

const selectFilter = createSelector(
  selectTodosState,
  state => state.filter
);

export const selectFilteredTodos = createSelector(
  selectAllTodos,
  selectFilter,
  (todos, filter) => {
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed);
      case 'completed':
        return todos.filter(t => t.completed);
      default:
        return todos;
    }
  }
);

export const selectLoading = createSelector(
  selectTodosState,
  state => state.loading
);
```

### Step 5: Create Effects

```typescript
@Injectable()
export class TodosEffects {
  loadTodos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTodos),
      mergeMap(() =>
        this.todosService.getTodos().pipe(
          map(todos => loadTodosSuccess({ todos })),
          catchError(error =>
            of(loadTodosFailure({ error: error.message }))
          )
        )
      )
    )
  );

  addTodo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addTodo),
      mergeMap(({ title }) =>
        this.todosService.createTodo(title).pipe(
          map(() => loadTodos()),
          catchError(error =>
            of(loadTodosFailure({ error: error.message }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private todosService: TodosService
  ) {}
}
```

### Step 6: Use in Components with Signals

```typescript
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectFilteredTodos, selectLoading } from './store/todos.selectors';
import { addTodo, removeTodo, toggleTodo, setFilter, loadTodos } from './store/todos.actions';

@Component({
  selector: 'app-todos',
  template: `
    <div class="todos-container">
      <input #input placeholder="Add a todo...">
      <button (click)="add(input.value)">Add</button>

      <div class="filters">
        <button (click)="filterBy('all')">All</button>
        <button (click)="filterBy('active')">Active</button>
        <button (click)="filterBy('completed')">Completed</button>
      </div>

      @if (loading$ | async) {
        <p>Loading...</p>
      }

      <ul>
        @for (todo of todos$ | async; track todo.id) {
          <li>
            <input
              type="checkbox"
              [checked]="todo.completed"
              (change)="toggle(todo.id)"
            >
            <span [class.completed]="todo.completed">{{ todo.title }}</span>
            <button (click)="remove(todo.id)">Delete</button>
          </li>
        }
      </ul>
    </div>
  `
})
export class TodosComponent {
  todos$ = this.store.select(selectFilteredTodos);
  loading$ = this.store.select(selectLoading);

  constructor(private store: Store) {
    this.store.dispatch(loadTodos());
  }

  add(title: string): void {
    if (title.trim()) {
      this.store.dispatch(addTodo({ title }));
    }
  }

  remove(id: string): void {
    this.store.dispatch(removeTodo({ id }));
  }

  toggle(id: string): void {
    this.store.dispatch(toggleTodo({ id }));
  }

  filterBy(filter: 'all' | 'active' | 'completed'): void {
    this.store.dispatch(setFilter({ filter }));
  }
}
```

---

## NgRx + Signals Integration

### Converting Selectors to Signals

```typescript
import { computed, signal } from '@angular/core';

@Component({
  selector: 'app-todos'
})
export class TodosComponent {
  private store = inject(Store);
  
  // Convert selector to signal
  todos = toSignal(this.store.select(selectFilteredTodos), {
    initialValue: []
  });

  completedCount = computed(() =>
    this.todos().filter(t => t.completed).length
  );

  activeCount = computed(() =>
    this.todos().filter(t => !t.completed).length
  );
}
```

### Combine NgRx with Local Signals

```typescript
@Component({
  selector: 'app-advanced-todos'
})
export class AdvancedTodosComponent {
  private store = inject(Store);
  
  todos = toSignal(this.store.select(selectFilteredTodos));
  searchTerm = signal('');

  filteredTodos = computed(() => {
    const todos = this.todos() || [];
    const search = this.searchTerm().toLowerCase();
    return todos.filter(t => t.title.toLowerCase().includes(search));
  });
}
```

---

## Setup NgRx

### Installation

```bash
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools
```

### Standalone Configuration

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { AppComponent } from './app.component';
import { todosReducer } from './store/todos.reducer';
import { TodosEffects } from './store/todos.effects';

bootstrapApplication(AppComponent, {
  providers: [
    provideStore({ todos: todosReducer }),
    provideEffects([TodosEffects]),
    provideStoreDevtools({ maxAge: 25 })
  ]
});
```

---

## Best Practices

### ✅ DO's

**Do use selectors for all state access**
```typescript
todos$ = this.store.select(selectFilteredTodos);
```

**Do normalize state**
```typescript
{
  ids: ['1', '2'],
  entities: { '1': todo1, '2': todo2 }
}
```

**Do use effects for side effects**
```typescript
saveItem$ = createEffect(() =>
  this.actions$.pipe(ofType(saveItem))
);
```

### ❌ DON'Ts

**Don't subscribe directly in components**
```typescript
// Bad
this.store.subscribe(state => this.state = state);

// Good
state$ = this.store.select(selectState);
```

**Don't mutate in reducers**
```typescript
// Bad
state.items.push(newItem);

// Good
{ ...state, items: [...state.items, newItem] }
```

---

## Performance Optimization

### OnPush Change Detection

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodosComponent {
  todos$ = this.store.select(selectTodos);
}
```

### Memoized Selectors

```typescript
export const selectActiveTodos = createSelector(
  selectAllTodos,
  todos => todos.filter(t => !t.completed)
);
```

---

## Conclusion

NgRx with signals provides the ultimate foundation for scalable, performant Angular applications. The combination of Redux's predictability with signals' reactivity creates a powerful pattern for complex state management.

**Use NgRx + Signals when:**
- ✅ Building large-scale applications
- ✅ Team needs predictable patterns
- ✅ Time-travel debugging is important
- ✅ Complex state interactions

---

## References

This guide is based on and inspired by:
- [Mastering State Management in Angular with NgRx and Signals](https://angular.love/mastering-state-management-in-angular-with-ngrx-and-signals-scalable-predictable-performant)
- [NgRx Official Documentation](https://ngrx.io/)
- [NgRx Best Practices](https://ngrx.io/guide/store/best-practices)
