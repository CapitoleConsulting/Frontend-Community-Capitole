---
title: NGXS Fundamentals
description: Jumpstart with NGXS state management. Learn stores, actions, selectors, and best practices for managing application state in Angular.
sidebar.order: 1
---

## Overview

NGXS is a state management library for Angular that provides a more intuitive and straightforward approach compared to Redux-based solutions. It uses decorators and classes to manage application state, making it easier to learn and implement.

NGXS excels at simplifying state management with minimal boilerplate while providing powerful features for managing complex application state.

---

## Why NGXS?

### Simple and Intuitive
NGXS uses decorators and a class-based approach, making the code more readable and easier to understand.

### Less Boilerplate
Compared to NgRx, NGXS requires significantly less code to set up and maintain.

### Excellent DevTools
Built-in debugging tools help you inspect state changes and time-travel through actions.

### Good Performance
Efficient change detection and minimal overhead for most applications.

### Great Community
Active community with good documentation and examples.

---

## Core Concepts

### 1. State

A state is a class decorated with `@State` that holds your application data.

```typescript
import { State, Action, StateContext } from '@ngxs/store';

export interface CounterStateModel {
  count: number;
}

@State<CounterStateModel>({
  name: 'counter',
  defaults: {
    count: 0
  }
})
export class CounterState {
}
```

### 2. Actions

Actions are classes that represent events or user interactions.

```typescript
export class Increment {
  static readonly type = '[Counter] Increment';
  constructor(public payload: number) {}
}

export class Decrement {
  static readonly type = '[Counter] Decrement';
}

export class Reset {
  static readonly type = '[Counter] Reset';
}
```

### 3. Selectors

Selectors retrieve specific pieces of state.

```typescript
import { Selector } from '@ngxs/store';

@State<CounterStateModel>({
  name: 'counter',
  defaults: { count: 0 }
})
export class CounterState {
  @Selector()
  static getCount(state: CounterStateModel): number {
    return state.count;
  }
}
```

### 4. State Mutations

Mutate state in response to actions.

```typescript
@State<CounterStateModel>({
  name: 'counter',
  defaults: { count: 0 }
})
export class CounterState {
  @Action(Increment)
  increment(ctx: StateContext<CounterStateModel>, action: Increment) {
    const state = ctx.getState();
    ctx.setState({
      ...state,
      count: state.count + action.payload
    });
  }

  @Action(Decrement)
  decrement(ctx: StateContext<CounterStateModel>) {
    const state = ctx.getState();
    ctx.setState({
      ...state,
      count: state.count - 1
    });
  }

  @Action(Reset)
  reset(ctx: StateContext<CounterStateModel>) {
    ctx.setState({ count: 0 });
  }
}
```

---

## Complete Example

### Define State

```typescript
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoStateModel {
  todos: Todo[];
  filter: 'all' | 'completed' | 'pending';
}
```

### Define Actions

```typescript
export class AddTodo {
  static readonly type = '[Todo] Add Todo';
  constructor(public payload: { title: string }) {}
}

export class RemoveTodo {
  static readonly type = '[Todo] Remove Todo';
  constructor(public payload: string) {}
}

export class ToggleTodo {
  static readonly type = '[Todo] Toggle Todo';
  constructor(public payload: string) {}
}

export class SetFilter {
  static readonly type = '[Todo] Set Filter';
  constructor(public payload: 'all' | 'completed' | 'pending') {}
}
```

### Create State

```typescript
import { State, Action, StateContext, Selector } from '@ngxs/store';

@State<TodoStateModel>({
  name: 'todos',
  defaults: {
    todos: [],
    filter: 'all'
  }
})
export class TodoState {
  @Selector()
  static getTodos(state: TodoStateModel): Todo[] {
    return state.todos;
  }

  @Selector()
  static getFilter(state: TodoStateModel): string {
    return state.filter;
  }

  @Selector()
  static getFilteredTodos(state: TodoStateModel): Todo[] {
    switch (state.filter) {
      case 'completed':
        return state.todos.filter(t => t.completed);
      case 'pending':
        return state.todos.filter(t => !t.completed);
      default:
        return state.todos;
    }
  }

  @Action(AddTodo)
  addTodo(ctx: StateContext<TodoStateModel>, action: AddTodo) {
    const state = ctx.getState();
    const newTodo: Todo = {
      id: Math.random().toString(36),
      title: action.payload.title,
      completed: false
    };
    ctx.setState({
      ...state,
      todos: [...state.todos, newTodo]
    });
  }

  @Action(RemoveTodo)
  removeTodo(ctx: StateContext<TodoStateModel>, action: RemoveTodo) {
    const state = ctx.getState();
    ctx.setState({
      ...state,
      todos: state.todos.filter(t => t.id !== action.payload)
    });
  }

  @Action(ToggleTodo)
  toggleTodo(ctx: StateContext<TodoStateModel>, action: ToggleTodo) {
    const state = ctx.getState();
    ctx.setState({
      ...state,
      todos: state.todos.map(t =>
        t.id === action.payload ? { ...t, completed: !t.completed } : t
      )
    });
  }

  @Action(SetFilter)
  setFilter(ctx: StateContext<TodoStateModel>, action: SetFilter) {
    const state = ctx.getState();
    ctx.setState({
      ...state,
      filter: action.payload
    });
  }
}
```

### Use in Components

```typescript
import { Component } from '@angular/core';
import { Store } from '@ngxs/store';
import { TodoState, AddTodo, RemoveTodo, ToggleTodo, SetFilter } from './store';

@Component({
  selector: 'app-todo-list',
  template: `
    <div class="todos">
      <input #newTodo placeholder="Add a todo...">
      <button (click)="add(newTodo.value)">Add</button>

      <div class="filters">
        <button (click)="filter('all')">All</button>
        <button (click)="filter('pending')">Pending</button>
        <button (click)="filter('completed')">Completed</button>
      </div>

      @for (todo of todos$ | async; track todo.id) {
        <div class="todo">
          <input 
            type="checkbox" 
            [checked]="todo.completed"
            (change)="toggle(todo.id)"
          >
          <span [class.completed]="todo.completed">{{ todo.title }}</span>
          <button (click)="remove(todo.id)">Delete</button>
        </div>
      }
    </div>
  `
})
export class TodoListComponent {
  todos$ = this.store.select(TodoState.getFilteredTodos);

  constructor(private store: Store) {}

  add(title: string): void {
    this.store.dispatch(new AddTodo({ title }));
  }

  remove(id: string): void {
    this.store.dispatch(new RemoveTodo(id));
  }

  toggle(id: string): void {
    this.store.dispatch(new ToggleTodo(id));
  }

  filter(type: 'all' | 'completed' | 'pending'): void {
    this.store.dispatch(new SetFilter(type));
  }
}
```

---

## Setting Up NGXS

### Installation

```bash
npm install @ngxs/store
```

### Module Setup

```typescript
import { NgxsModule } from '@ngxs/store';
import { TodoState } from './store/todo.state';

@NgModule({
  imports: [
    NgxsModule.forRoot([TodoState])
  ]
})
export class AppModule {}
```

### Standalone Setup

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideStore } from '@ngxs/store';
import { TodoState } from './store/todo.state';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideStore([TodoState])
  ]
});
```

---

## Advanced Features

### Effects

Handle side effects like API calls.

```typescript
import { Action } from '@ngxs/store';

@State<DataStateModel>({
  name: 'data',
  defaults: { items: [], loading: false }
})
export class DataState {
  @Action(LoadItems)
  loadItems(ctx: StateContext<DataStateModel>) {
    ctx.patchState({ loading: true });
    
    return this.api.getItems().pipe(
      tap(items => {
        ctx.patchState({ items, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ loading: false });
        return throwError(() => error);
      })
    );
  }
}
```

### Plugins

Extend NGXS functionality with plugins for logging, dev tools, etc.

```typescript
import { NgxsModule } from '@ngxs/store';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';

@NgModule({
  imports: [
    NgxsModule.forRoot([TodoState]),
    NgxsReduxDevtoolsPluginModule.forRoot(),
    NgxsLoggerPluginModule.forRoot()
  ]
})
export class AppModule {}
```

---

## Best Practices

### ✅ DO's

**Do keep state normalized**
```typescript
{
  todos: {
    byId: { '1': todo1, '2': todo2 },
    allIds: ['1', '2']
  }
}
```

**Do use selectors**
```typescript
@Selector()
static getTodoById(id: string) {
  return (state: TodoStateModel) => state.todos[id];
}
```

**Do handle side effects in effects**
```typescript
@Action(FetchData)
fetchData(ctx: StateContext, action: FetchData) {
  return this.api.getData().pipe(
    tap(data => ctx.setState(data))
  );
}
```

### ❌ DON'Ts

**Don't mutate state directly**
```typescript
state.count++;

ctx.setState({ count: state.count + 1 });
```

**Don't put logic in components**
```typescript
todos = this.store.select(state => 
  state.todos.filter(t => t.completed)
);

@Selector()
static getCompletedTodos(state): Todo[] {
  return state.todos.filter(t => t.completed);
}
```

---

## Comparison: NGXS vs NgRx

| Feature | NGXS | NgRx |
|---------|------|------|
| **Setup Time** | Minutes | Hours |
| **Learning Curve** | Easy | Steep |
| **Boilerplate** | Minimal | Significant |
| **Type Safety** | Good | Excellent |
| **DevTools** | Built-in | Redux DevTools |
| **Ecosystem** | Small | Large |
| **Performance** | Good | Excellent |

---

## Conclusion

NGXS is an excellent choice for Angular applications that need state management without the complexity of Redux-based solutions. Its intuitive API and minimal boilerplate make it ideal for teams new to state management.

**When to use NGXS:**
- ✅ Small to medium projects
- ✅ Teams new to state management
- ✅ Want quick setup
- ✅ Prefer simplicity over complexity

**Consider NgRx when:**
- ❌ Need maximum type safety
- ❌ Large, complex applications
- ❌ Enterprise requirements
- ❌ Already familiar with Redux

---

## References

This guide is based on and inspired by:
- [All You Need to Know to Jumpstart with NGXS](https://angular.love/all-you-need-to-know-to-jumpstart-with-ngxs)
- [NGXS Official Documentation](https://www.ngxs.io/)
- [NGXS GitHub Repository](https://github.com/ngxs/store)
