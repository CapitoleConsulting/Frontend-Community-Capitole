---
title: Utilities & Advanced Features
description: Master advanced Angular utilities including route resolvers, deferred loading, and performance optimization techniques.
---

This section covers advanced Angular utilities and features that help you build robust, performant applications. Learn about route resolvers for handling data loading, deferred view rendering for better performance, and other powerful patterns.

## Featured Guides

### Route Resolvers
**[Route Resolvers](./resolvers.md)** — Comprehensive guide to loading data before route activation:
- Understanding resolvers and when to use them
- Implementing route resolvers
- Comparing resolvers with other data-loading strategies
- Best practices and common pitfalls
- Modern alternatives and migration strategies

### Deferred Loading
**[Deferred Loading](./deferred.md)** — Optimize performance with deferred view rendering:
- Introduction to Angular's @defer block
- Deferred loading strategies
- Placeholder and loading states
- Performance optimization with deferring
- Practical use cases and examples

### Preventing Memory Leaks
**[Preventing Memory Leaks](./memory-leaks.md)** — Master techniques to prevent memory leaks:
- Common causes: subscriptions, timers, event listeners, DOM references
- Detection and debugging with Chrome DevTools
- Best practices and lifecycle hooks
- Quick reference patterns and checklists
- Performance monitoring and solutions

### Advanced Angular Features
**[Advanced Angular Features](./advanced-features.md)** — Explore cutting-edge Angular capabilities for 2025:
- Signals and fine-grained reactivity
- Zoneless Angular for better performance
- Modern control flow syntax (@if, @for, @defer)
- Functional guards and resolvers
- Hydration and server-side rendering
- Enhanced type safety and dependency injection
- Migration paths from legacy patterns

---

## How to Use These Guides

**Learn Advanced Features First:** Start with Advanced Features to understand modern Angular patterns  
**Understand Performance Tools:** Learn Route Resolvers and Deferred Loading for performance optimization  
**Prevent Common Issues:** Understand Memory Leaks prevention to keep apps responsive  
**Apply to Your Project:** Implement these patterns and features in your application  
**Optimize Progressively:** Use these utilities to improve performance and user experience over time  
**Refer Back:** Use as reference when working with routing, data loading, and performance  

---

## Quick Comparison

| Feature | Resolvers | Deferred Loading | Memory Leaks | Advanced Features |
|---------|-----------|-----------------|---|---|
| **Purpose** | Load data before route | Defer rendering | Prevent memory waste | Modern patterns |
| **Best For** | Data dependencies | Heavy components | Long-running apps | New projects |
| **User Experience** | Wait for data | Fast initial load | Consistent | Optimal |
| **Bundle Impact** | Minimal | Reduce bundle | No impact | Significant |
| **Complexity** | Medium | Low-Medium | Low | Medium-High |
| **Modern Alternative** | Signals | @defer | takeUntilDestroyed | Signals + Zoneless |

---

## Related Utilities

These guides work together to create robust, high-performance Angular applications:

- **Advanced Features** — Foundation for modern Angular development (Signals, Control Flow, Zoneless)
- **Resolvers** — Ensure data is ready when routes activate
- **Deferred Loading** — Speed up initial page load with progressive rendering
- **Memory Leak Prevention** — Keep the app responsive over time

Build faster, more maintainable applications by combining these utilities strategically.
