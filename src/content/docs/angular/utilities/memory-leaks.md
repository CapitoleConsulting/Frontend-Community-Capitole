---
title: Preventing Memory Leaks
description: Master techniques to prevent memory leaks in Angular applications. Learn about subscriptions, timers, DOM references, and more.
sidebar.order: 3
---

## Overview

Memory leaks in Angular applications occur when objects are no longer needed but remain in memory because references to them aren't properly cleaned up. This degrades application performance, consumes excessive RAM, and can eventually crash the application, especially in long-running single-page applications.

This guide covers the most common causes of memory leaks in Angular and provides practical solutions to prevent them.

---

## Why Memory Leaks Matter

### Performance Degradation
Memory leaks cause the application to use more and more memory over time. Users experience:
- Slower JavaScript execution
- Increased garbage collection pauses
- Choppy interactions and animations
- Battery drain on mobile devices

### User Experience Impact
As memory grows:
- Initial app load time remains fast
- But user experience degrades gradually
- Long sessions become unusable
- Navigation and interactions lag

### Business Impact
- Negative user reviews and ratings
- Users leaving for competitors
- Increased support tickets
- Reputation damage

---

## Common Causes of Memory Leaks

### 1. Unsubscribed Observables

The most common cause of memory leaks in Angular.

**❌ Bad: Observable subscription without cleanup**
```typescript
export class UserComponent implements OnInit {
  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getUser().subscribe(user => {
      this.displayUser(user);
    });
  }

  displayUser(user: User): void {
  }
}
```

When the component is destroyed, the subscription remains active in memory.

**✅ Good: Manual unsubscribe with OnDestroy**
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class UserComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getUser()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(user => {
        this.displayUser(user);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  displayUser(user: User): void {
    // Display logic
  }
}
```

**✅ Better: Using async pipe (automatic cleanup)**
```typescript
export class UserComponent {
  user$ = this.userService.getUser();

  constructor(private userService: UserService) {}
}

// Template
<div *ngIf="user$ | async as user">
  <h1>{{ user.name }}</h1>
</div>
```

**✅ Modern: Using signals (no subscription needed)**
```typescript
export class UserComponent implements OnInit {
  user = signal<User | null>(null);

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getUser()
      .pipe(takeUntil(destroy$(this)))
      .subscribe(user => this.user.set(user));
  }
}
```

### 2. Uncleared Timers

SetTimeout and setInterval must be cleared to prevent memory leaks.

**❌ Bad: Timer never cleared**
```typescript
export class DashboardComponent implements OnInit {
  constructor(private updateService: UpdateService) {}

  ngOnInit(): void {
    setInterval(() => {
      this.updateService.refresh();
    }, 5000);
  }
}
```

**✅ Good: Clear timers in ngOnDestroy**
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';

export class DashboardComponent implements OnInit, OnDestroy {
  private intervalId: any;

  constructor(private updateService: UpdateService) {}

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.updateService.refresh();
    }, 5000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}
```

**✅ Better: Using RxJS interval**
```typescript
import { Component, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private updateService: UpdateService) {}

  ngOnInit(): void {
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateService.refresh();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 3. Event Listeners Not Removed

**❌ Bad: Event listener never removed**
```typescript
export class ScrollComponent implements OnInit {
  ngOnInit(): void {
    window.addEventListener('scroll', () => {
      this.handleScroll();
    });
  }

  handleScroll(): void {
  }
}
```

**✅ Good: Remove event listener in ngOnDestroy**
```typescript
export class ScrollComponent implements OnInit, OnDestroy {
  private scrollListener: any;

  ngOnInit(): void {
    this.scrollListener = () => this.handleScroll();
    window.addEventListener('scroll', this.scrollListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollListener);
  }

  handleScroll(): void {
    // Scroll logic
  }
}
```

**✅ Better: Using RxJS fromEvent**
```typescript
import { fromEvent } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';

export class ScrollComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    fromEvent(window, 'scroll')
      .pipe(
        throttleTime(100),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.handleScroll();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleScroll(): void {
    // Scroll logic
  }
}
```

### 4. DOM References Not Cleaned

**❌ Bad: Holding references to DOM elements**
```typescript
export class ModalComponent {
  private modalElement: HTMLElement | null = null;

  openModal(): void {
    this.modalElement = document.getElementById('modal');
    this.modalElement?.classList.add('open');
  }
}
```

**✅ Good: Clear references when done**
```typescript
export class ModalComponent implements OnDestroy {
  private modalElement: HTMLElement | null = null;

  openModal(): void {
    this.modalElement = document.getElementById('modal');
    this.modalElement?.classList.add('open');
  }

  closeModal(): void {
    this.modalElement?.classList.remove('open');
    this.modalElement = null; // Clear reference
  }

  ngOnDestroy(): void {
    this.modalElement = null; // Ensure cleanup
  }
}
```

**✅ Better: Use ViewChild for template references**
```typescript
import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: '<div #modal class="modal"></div>'
})
export class ModalComponent {
  @ViewChild('modal') modalRef!: ElementRef;

  openModal(): void {
    this.modalRef.nativeElement.classList.add('open');
  }

  closeModal(): void {
    this.modalRef.nativeElement.classList.remove('open');
  }
}
```

### 5. Global Objects and Singletons

**❌ Bad: Storing component state in global singleton**
```typescript
const componentCache = new Map();

export class UserComponent implements OnInit {
  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getUser().subscribe(user => {
      componentCache.set(Math.random(), this);
    });
  }
}
```

**✅ Good: Use proper state management with cleanup**
```typescript
// Use Angular services with proper scope
@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private userCache = new Map<string, User>();

  getUser(id: string): Observable<User> {
    if (this.userCache.has(id)) {
      return of(this.userCache.get(id)!);
    }
    return this.http.get<User>(`/api/users/${id}`).pipe(
      tap(user => this.userCache.set(id, user))
    );
  }

  clearCache(): void {
    this.userCache.clear();
  }
}
```

### 6. Third-Party Library Subscriptions

**❌ Bad: Library subscription without cleanup**
```typescript
export class MapComponent implements OnInit {
  constructor(private mapService: MapService) {}

  ngOnInit(): void {
    this.mapService.mapChanged.subscribe(newMap => {
      this.updateMap(newMap);
    });
  }
}
```

**✅ Good: Always unsubscribe from external libraries**
```typescript
export class MapComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private mapService: MapService) {}

  ngOnInit(): void {
    this.mapService.mapChanged
      .pipe(takeUntil(this.destroy$))
      .subscribe(newMap => {
        this.updateMap(newMap);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## Best Practices for Prevention

### ✅ Always Implement OnDestroy

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### ✅ Use takeUntil Pattern

```typescript
import { takeUntil } from 'rxjs/operators';

ngOnInit(): void {
  this.userService.getUser()
    .pipe(
      takeUntil(this.destroy$)
    )
    .subscribe(user => {
    });
}
```

### ✅ Prefer Async Pipe

```typescript
// Component
export class UserComponent {
  user$ = this.userService.getUser();

  constructor(private userService: UserService) {}
}

// Template - async pipe handles subscription and cleanup
<div *ngIf="user$ | async as user">
  {{ user.name }}
</div>
```

### ✅ Use takeUntilDestroyed (Angular 16+)

```typescript
import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user',
  template: '<h1>{{ user$ | async }}</h1>'
})
export class UserComponent {
  user$ = this.userService.getUser()
    .pipe(
      takeUntilDestroyed()
    );

  constructor(private userService: UserService) {}
  // No OnDestroy needed!
}
```

### ✅ Document Lifecycle Hooks

```typescript
/**
 * Component lifecycle:
 * 1. ngOnInit - Load data, set up subscriptions
 * 2. ngOnChanges - React to input property changes
 * 3. ngDoCheck - Custom change detection
 * 4. ngAfterViewInit - Access child components
 * 5. ngOnDestroy - Cleanup subscriptions, timers, listeners
 */
export class MyComponent implements OnInit, OnDestroy {
  ngOnInit(): void { }
  ngOnDestroy(): void { }
}
```

---

## Detection and Debugging

### Using Chrome DevTools

**1. Take Heap Snapshots:**
```
Chrome DevTools → Memory → Take heap snapshot
```

**2. Compare Snapshots Over Time:**
- Take initial snapshot
- Perform actions in app
- Navigate away from component
- Take another snapshot
- Compare to find retained objects

**3. Look for:**
- Detached DOM nodes
- Listener functions
- Timer IDs
- Subscription objects

### Angular DevTools

```typescript
// Enable debug mode to track component lifecycle
import { enableDebugTools } from '@angular/platform-browser';

enableDebugTools(componentRef);
```

### Console Warnings

```typescript
export class MyComponent implements OnDestroy {
  ngOnDestroy(): void {
    if (this.subscription && !this.subscription.closed) {
      console.warn('Subscription not closed in MyComponent');
    }
  }
}
```

---

## Common Scenarios and Solutions

### Scenario 1: HTTP Requests

**❌ Bad:**
```typescript
ngOnInit(): void {
  this.http.get('/api/data').subscribe(data => {
    this.data = data;
  });
}
```

**✅ Good:**
```typescript
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.http.get('/api/data')
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.data = data;
    });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### Scenario 2: Form ValueChanges

**❌ Bad:**
```typescript
ngOnInit(): void {
  this.form.valueChanges.subscribe(value => {
    // Memory leak
  });
}
```

**✅ Good:**
```typescript
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.form.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(value => {
      // Cleanup handled
    });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### Scenario 3: Router Events

**❌ Bad:**
```typescript
ngOnInit(): void {
  this.router.events.subscribe(event => {
    // Memory leak
  });
}
```

**✅ Good:**
```typescript
private destroy$ = new Subject<void>();

ngOnInit(): void {
  this.router.events
    .pipe(takeUntil(this.destroy$))
    .subscribe(event => {
      // Cleanup handled
    });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

---

## Performance Monitoring

### Monitor Memory Usage

```typescript
// Log memory usage periodically
if (performance.memory) {
  console.log({
    usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
    jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
  });
}
```

### Create Memory Leak Checklist

```typescript
/**
 * Memory Leak Prevention Checklist:
 * 
 * ✅ Observable subscriptions have takeUntil
 * ✅ Timers are cleared in ngOnDestroy
 * ✅ Event listeners are removed
 * ✅ DOM references are nullified
 * ✅ ngOnDestroy is implemented
 * ✅ No global variable assignments
 * ✅ Third-party library cleanup
 * ✅ Component cache is managed
 * ✅ Tested with DevTools memory profiler
 */
```

---

## Quick Reference

### Memory Leak Prevention Pattern

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-example',
  template: '...'
})
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private service: MyService) {}

  ngOnInit(): void {
    this.service.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
      });

    this.timerId = setInterval(() => {}, 5000);

    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    clearInterval(this.timerId);

    window.removeEventListener('resize', this.onResize);

    this.data = null;
  }

  private onResize = (): void => {
    // Handle resize
  };
}
```

---

## Conclusion

Memory leaks in Angular are preventable with consistent practices:

**Key Takeaways:**
- ✅ Always unsubscribe from Observables
- ✅ Clear timers and intervals
- ✅ Remove event listeners
- ✅ Clear DOM references
- ✅ Use takeUntil pattern
- ✅ Prefer async pipe
- ✅ Implement OnDestroy
- ✅ Monitor memory regularly

By following these patterns, you'll create performant applications that remain responsive even during long user sessions.

---

## References

This guide is based on and inspired by:
- **[Preventing Memory Leaks in Angular: A Practical Story Series (Part 5)](https://medium.com/@anjusiva94/preventing-memory-leaks-in-angular-a-practical-story-series-part-5-109393da7c61)**
- [Angular Official Documentation: Lifecycle Hooks](https://angular.io/guide/lifecycle-hooks)
- [Angular Official Documentation: RxJS Interop](https://angular.io/guide/rxjs-interop)
- [RxJS Documentation: takeUntil](https://rxjs.dev/api/operators/takeUntil)
- [Chrome DevTools: Memory Problems](https://developer.chrome.com/docs/devtools/memory-problems/)
