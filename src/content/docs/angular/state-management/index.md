---
title: State Management
description: Master state management in Angular with NGXS and NgRx. Learn scalable, predictable, and performant patterns for managing application state.
---

Effective state management is crucial for building scalable Angular applications. This section covers the most popular state management libraries and patterns used in modern Angular development.

## Featured Guides

### NGXS
**[NGXS Fundamentals](./ngxs.md)** — Jumpstart with NGXS state management:
- What is NGXS and core concepts
- Setting up NGXS in your project
- Defining stores, actions, and selectors
- Managing application state
- Best practices and patterns

### NgRx with Signals
**[NgRx with Signals](./ngrx-signals.md)** — Mastering scalable state management:
- NgRx fundamentals and architecture
- Combining NgRx with Angular signals
- Store, effects, and selectors
- Performance optimization
- Scalable, predictable, performant applications

### NgRx Standalone Setup
**[NgRx Standalone Setup](./ngrx-standalone.md)** — Complete NgRx setup for standalone components:
- Setting up NgRx in standalone Angular applications
- Store configuration
- Actions and reducers
- Effects and side effects
- Testing and best practices

### State Management Best Practices
**[Best Practices](./best-practices.md)** — Master patterns and practices for scalable state management:
- Core principles (immutability, pure functions, single source of truth)
- State structure best practices and normalization
- Selector patterns and memoization
- Action and reducer best practices
- Effects and side effect handling
- Performance optimization strategies
- Testing patterns and anti-patterns
- Migration strategies and checklists

---

## State Management Comparison

| Aspect | NGXS | NgRx |
|--------|------|------|
| **Learning Curve** | Gentler, more intuitive | Steeper, more verbose |
| **Bundle Size** | Smaller (~20KB) | Larger (~80KB+) |
| **Performance** | Good | Excellent with optimization |
| **Community** | Smaller but active | Large and established |
| **Signals Support** | Basic | Full integration available |
| **DevTools** | Built-in | Excellent Redux DevTools |
| **Use Case** | Small to medium apps | Large, complex applications |

---

## Getting Started Path

1. **Start with Best Practices** — Understand the core principles and patterns
2. **Choose Your Library** — NGXS for simplicity, NgRx for scale
3. **Follow the Setup Guide** — Use the appropriate setup guide for your choice
4. **Reference Best Practices** — Refer back to patterns as you build

---

## When to Use State Management

### Use State Management When:
- ✅ Multiple components need shared state
- ✅ State changes across different parts of the app
- ✅ Need centralized state management
- ✅ Complex application logic
- ✅ Want time-travel debugging
- ✅ Team size growing

### Skip State Management When:
- ❌ Simple component hierarchies
- ❌ Local component state only
- ❌ Small application
- ❌ Using signals for all state
- ❌ Over-engineering simple problems

---

## State Management Approaches

### 1. Component State (Signals/Observables)
Simple local state within components using Angular's built-in tools.

```typescript
export class Component {
  count = signal(0);
}
```

### 2. Service-Based State
Manage state in services, often with observables.

```typescript
@Injectable({ providedIn: 'root' })
export class StateService {
  private state = new BehaviorSubject<Data>(initial);
  state$ = this.state.asObservable();
}
```

### 3. NGXS
Decorator-based state management with stores.

### 4. NgRx
Functional, Redux-inspired state management with full ecosystem.

### 5. Hybrid Approach
Combine signals with lightweight state management for optimal performance.

---

## Getting Started

**New to state management?** Start with NGXS for a gentler introduction.

**Building large-scale apps?** Explore NgRx for maximum control and scalability.

**Want modern patterns?** Learn how to combine NgRx with Angular signals.

Pick a guide above and start building predictable, scalable applications!
