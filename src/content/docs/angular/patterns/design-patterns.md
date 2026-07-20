---
title: Design Patterns
description: Essential design patterns every Angular developer should know. Learn how to implement Singleton, Facade, Factory, and Strategy patterns in Angular applications.
sidebar.order: 1
---

## Overview

Design patterns are tried-and-tested solutions for common design issues in software development. Rather than offering complete solutions, they serve as **best practices addressing typical software development challenges**.

In Angular, these patterns facilitate cleaner, more organized code that improves **buildability, scalability, and maintainability**.

---

## Why Design Patterns Matter

### Scalability
Design patterns decompose applications into small, reusable components, facilitating feature additions without disrupting existing functionality.

### Maintainability
Organized code structure ensures clarity. Using patterns like Singleton means updating logic in one location automatically cascades changes across dependent components.

### Testability
Separation of concerns enabled by design patterns simplifies mocking and testing procedures for individual components.

### Code Reusability
Patterns encourage writing reusable code. Factory and Singleton patterns consolidate similar tasks, eliminating redundant logic.

---

## 1. Singleton Pattern

The Singleton pattern **ensures that a class only has one instance and allows that instance to be shared globally**.

Angular services typically leverage this through root-level provision using `providedIn: 'root'`. This guarantees only one instance exists throughout the application lifecycle.

### Implementation

```typescript
@Injectable({
  providedIn: 'root'
})
export class MyService {
  constructor() { }
}
```

### Real-World Example: Authentication Service

```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>('/api/login', { email, password })
      .pipe(
        tap(user => this.currentUser = user)
      );
  }

  logout(): void {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}
```

### Benefits
✅ Single instance across application  
✅ Centralized state management  
✅ Guaranteed consistency  
✅ Easy to inject and test  

---

## 2. Facade Pattern

The Facade Pattern provides **a simplified interface to interact with complex subsystems**. Rather than components directly communicating with multiple services (causing duplication), they interact with a facade service containing centralized business logic.

### Implementation

```typescript
@Injectable({
  providedIn: 'root',
})
export class CartFacade {
  constructor(
    private cartService: CartService, 
    private orderService: OrderService
  ) {}

  addToCart(product: Product): void {
    this.cartService.addItem(product);
  }

  removeFromCart(product: Product): void {
    this.cartService.removeItem(product);
  }

  checkout(): void {
    const cart = this.cartService.getCart();
    this.orderService.processOrder(cart);
  }

  getCartItems(): Product[] {
    return this.cartService.getCart();
  }

  getTotalPrice(): number {
    return this.cartService.getTotalPrice();
  }
}
```

### Component Usage

```typescript
@Component({
  selector: 'app-shopping-cart',
  template: `
    <h2>Shopping Cart</h2>
    @for (item of cartItems(); track item.id) {
      <div>
        <p>{{ item.name }} - ${{ item.price }}</p>
        <button (click)="removeItem(item)">Remove</button>
      </div>
    }
    <h3>Total: ${{ totalPrice() }}</h3>
    <button (click)="checkout()">Checkout</button>
  `
})
export class ShoppingCartComponent implements OnInit {
  cartItems = signal<Product[]>([]);
  totalPrice = signal<number>(0);

  constructor(private cartFacade: CartFacade) {}

  ngOnInit(): void {
    this.cartItems.set(this.cartFacade.getCartItems());
    this.totalPrice.set(this.cartFacade.getTotalPrice());
  }

  removeItem(product: Product): void {
    this.cartFacade.removeFromCart(product);
    this.cartItems.set(this.cartFacade.getCartItems());
    this.totalPrice.set(this.cartFacade.getTotalPrice());
  }

  checkout(): void {
    this.cartFacade.checkout();
  }
}
```

### Benefits
✅ Simplifies complex operations  
✅ Encapsulates business logic  
✅ Reduces component complexity  
✅ Single point of change for related functionality  

---

## 3. Factory Pattern

The Factory Pattern creates objects without specifying exact classes, handling instantiation details. This enables **dynamic object creation when runtime requirements aren't predetermined**.

### Implementation

**Notification Interface:**
```typescript
export interface Notification {
  send(message: string): void;
}
```

**Concrete Implementations:**
```typescript
@Injectable({
  providedIn: 'root',
})
export class EmailNotification implements Notification {
  send(message: string): void {
    console.log(`Email: ${message}`);
    // Send via email service
  }
}

@Injectable({
  providedIn: 'root',
})
export class SmsNotification implements Notification {
  send(message: string): void {
    console.log(`SMS: ${message}`);
    // Send via SMS service
  }
}

@Injectable({
  providedIn: 'root',
})
export class PushNotification implements Notification {
  send(message: string): void {
    console.log(`Push: ${message}`);
    // Send via push notification service
  }
}
```

**Factory Service:**
```typescript
@Injectable({
  providedIn: 'root',
})
export class NotificationFactory {
  constructor(
    private emailNotification: EmailNotification,
    private smsNotification: SmsNotification,
    private pushNotification: PushNotification
  ) {}

  createNotification(type: 'email' | 'sms' | 'push'): Notification {
    switch (type) {
      case 'email':
        return this.emailNotification;
      case 'sms':
        return this.smsNotification;
      case 'push':
        return this.pushNotification;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }
}
```

**Component Usage:**
```typescript
@Component({
  selector: 'app-notification',
  template: `
    <h1>Send Notification</h1>
    @for (type of notificationTypes; track type) {
      <button (click)="send(type)">
        Send {{ type | titlecase }}
      </button>
    }
  `,
})
export class NotificationComponent {
  notificationTypes: Array<'email' | 'sms' | 'push'> = ['email', 'sms', 'push'];

  constructor(private notificationFactory: NotificationFactory) {}

  send(type: 'email' | 'sms' | 'push'): void {
    const notification: Notification = 
      this.notificationFactory.createNotification(type);
    notification.send(`This is a ${type} notification!`);
  }
}
```

### Benefits
✅ Decouples creation from usage  
✅ Easy to add new notification types  
✅ Centralized object creation logic  
✅ Simplifies component code  

---

## 4. Strategy Pattern

Strategy Pattern manages **different algorithms or behaviors, allowing dynamic switching based on context**. It's especially useful for handling different payment methods, sorting algorithms, or authentication strategies.

### Implementation

**Payment Strategy Interface:**
```typescript
export interface PaymentStrategy {
  processPayment(amount: number): Promise<PaymentResult>;
  validate(): boolean;
}
```

**Concrete Strategies:**
```typescript
@Injectable({
  providedIn: 'root',
})
export class PayPalPayment implements PaymentStrategy {
  validate(): boolean {
    return !!localStorage.getItem('paypal_token');
  }

  processPayment(amount: number): Promise<PaymentResult> {
    return Promise.resolve({
      success: true,
      transactionId: 'PAYPAL_' + Date.now(),
      amount,
      method: 'PayPal'
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class CreditCardPayment implements PaymentStrategy {
  validate(): boolean {
    return !!localStorage.getItem('card_token');
  }

  processPayment(amount: number): Promise<PaymentResult> {
    return Promise.resolve({
      success: true,
      transactionId: 'CARD_' + Date.now(),
      amount,
      method: 'Credit Card'
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class CryptoPayment implements PaymentStrategy {
  validate(): boolean {
    return !!localStorage.getItem('crypto_wallet');
  }

  processPayment(amount: number): Promise<PaymentResult> {
    return Promise.resolve({
      success: true,
      transactionId: 'CRYPTO_' + Date.now(),
      amount,
      method: 'Cryptocurrency'
    });
  }
}
```

**Context Service:**
```typescript
@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private currentStrategy: PaymentStrategy;

  constructor(
    private payPalPayment: PayPalPayment,
    private creditCardPayment: CreditCardPayment,
    private cryptoPayment: CryptoPayment
  ) {
    this.currentStrategy = this.creditCardPayment; // Default
  }

  setPaymentStrategy(strategy: PaymentStrategy): void {
    if (!strategy.validate()) {
      throw new Error('Payment strategy is not valid');
    }
    this.currentStrategy = strategy;
  }

  processPayment(amount: number): Promise<PaymentResult> {
    return this.currentStrategy.processPayment(amount);
  }

  getAvailableStrategies(): PaymentStrategy[] {
    const strategies = [
      this.payPalPayment,
      this.creditCardPayment,
      this.cryptoPayment
    ];
    return strategies.filter(s => s.validate());
  }
}
```

**Component Usage:**
```typescript
@Component({
  selector: 'app-checkout',
  template: `
    <h2>Checkout</h2>
    <select [(ngModel)]="selectedMethod()">
      @for (method of availableMethods(); track method.constructor.name) {
        <option [value]="method.constructor.name">
          {{ method.constructor.name }}
        </option>
      }
    </select>
    <button (click)="pay()">Pay ${{ amount }}</button>
  `
})
export class CheckoutComponent implements OnInit {
  amount = 99.99;
  availableMethods = signal<PaymentStrategy[]>([]);
  selectedMethod = signal('CreditCardPayment');

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.availableMethods.set(this.paymentService.getAvailableStrategies());
  }

  async pay(): Promise<void> {
    try {
      const result = await this.paymentService.processPayment(this.amount);
      console.log('Payment successful:', result);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  }
}
```

### Benefits
✅ Easy to switch between algorithms at runtime  
✅ Eliminates conditional logic (if/else chains)  
✅ Follows Open/Closed Principle  
✅ Simplifies testing each strategy independently  

---

---

## 5. Dependency Injection (DI)

The Dependency Injection pattern is **fundamental to Angular**. Instead of classes creating their own dependencies, they receive them from an external source, promoting loose coupling and testability.

### Implementation

**Service Example:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products');
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`/api/products/${id}`);
  }
}
```

**Component Usage:**
```typescript
@Component({
  selector: 'app-products',
  template: `
    <div *ngFor="let product of products$ | async">
      {{ product.name }} - ${{ product.price }}
    </div>
  `
})
export class ProductsComponent implements OnInit {
  products$: Observable<Product[]>;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.products$ = this.productService.getProducts();
  }
}
```

### Benefits
✅ Loose coupling between components and services  
✅ Easy to test (mock dependencies)  
✅ Single responsibility per service  
✅ Service reuse across components  
✅ Centralized service configuration  

---

## 6. Observer Pattern

The Observer Pattern enables **reactive programming where multiple objects automatically receive updates when a source object changes**. Angular uses RxJS Observables to implement this pattern.

### Implementation

**Service with Observable State:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<Product[]>([]);
  public cartItems$ = this.cartItems.asObservable();

  private cartCount = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCount.asObservable();

  addToCart(product: Product): void {
    const current = this.cartItems.value;
    const updated = [...current, product];
    this.cartItems.next(updated);
    this.cartCount.next(updated.length);
  }

  removeFromCart(productId: string): void {
    const current = this.cartItems.value;
    const updated = current.filter(p => p.id !== productId);
    this.cartItems.next(updated);
    this.cartCount.next(updated.length);
  }

  getCartItems(): Observable<Product[]> {
    return this.cartItems$;
  }
}
```

**Component Observing Changes:**
```typescript
@Component({
  selector: 'app-cart',
  template: `
    <h2>Shopping Cart ({{ cartCount() }} items)</h2>
    @for (item of cartItems(); track item.id) {
      <div>
        <p>{{ item.name }} - ${{ item.price }}</p>
        <button (click)="remove(item.id)">Remove</button>
      </div>
    }
  `
})
export class CartComponent implements OnInit {
  cartItems = signal<Product[]>([]);
  cartCount = signal<number>(0);

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.cartService.getCartItems().subscribe(
      items => this.cartItems.set(items)
    );
    this.cartService.cartCount$.subscribe(
      count => this.cartCount.set(count)
    );
  }

  remove(productId: string): void {
    this.cartService.removeFromCart(productId);
  }
}
```

### Key Observable Types
```typescript
// Subject — Manual control, multicast
private subject = new Subject<Data>();

// BehaviorSubject — Emits last value to new subscribers
private behaviorSubject = new BehaviorSubject<Data>(initialValue);

// ReplaySubject — Emits n previous values
private replaySubject = new ReplaySubject<Data>(bufferSize);

// AsyncSubject — Emits only the last value on complete
private asyncSubject = new AsyncSubject<Data>();
```

### Benefits
✅ Automatic UI updates when data changes  
✅ Reactive, declarative code  
✅ Easy to handle asynchronous operations  
✅ Built-in unsubscription handling with async pipe  
✅ Multiple subscribers without duplication  

---

## 7. Decorator Pattern

The Decorator Pattern **attaches metadata or additional behavior to classes without modifying the class itself**. Angular heavily relies on decorators (@Component, @Injectable, @Directive, @Pipe) to provide metadata and functionality.

### Implementation

**Class Decorators:**
```typescript
@Component({
  selector: 'app-user-profile',
  template: `
    <div class="profile">
      <h1>{{ user.name }}</h1>
      <p>{{ user.email }}</p>
    </div>
  `,
  styles: [`
    .profile {
      padding: 20px;
      border: 1px solid #ccc;
    }
  `]
})
export class UserProfileComponent {
  user = input<User>(null!);
  userUpdated = output<User>();
}
```

**Property Decorators:**
```typescript
import { Component, input, output, viewChild, contentChild } from '@angular/core';

export class UserComponent {
  firstName = input<string>('');
  nameChanged = output<string>();
  template = viewChild<TemplateRef<any>>('template');
  card = contentChild(CardComponent);
}
```

**Method Decorators:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  @HostListener('window:resize', ['$event']) onResize(event: any) {
    console.log('Window resized:', event);
  }
}
```

**Custom Decorator Example:**
```typescript
export function LogExecution(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with args:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`${propertyKey} returned:`, result);
    return result;
  };

  return descriptor;
}

export class UserService {
  @LogExecution
  getUserById(id: string): User {
    return { id, name: 'John Doe', email: 'john@example.com' };
  }
}
```

### Built-in Angular Decorators

| API | Purpose | Angular 18+ |
|-----|---------|-----------|
| `@Component` | Marks a class as Angular component with metadata | ✓ |
| `@Injectable` | Marks a class as injectable service | ✓ |
| `@Directive` | Marks a class as Angular directive | ✓ |
| `@Pipe` | Marks a class as Angular pipe | ✓ |
| `input()` | Declares input property (replaces @Input) | ✓ Modern |
| `output()` | Declares output event (replaces @Output) | ✓ Modern |
| `viewChild()` | Queries template (replaces @ViewChild) | ✓ Modern |
| `viewChildren()` | Queries templates (replaces @ViewChildren) | ✓ Modern |
| `contentChild()` | Queries content (replaces @ContentChild) | ✓ Modern |
| `contentChildren()` | Queries contents (replaces @ContentChildren) | ✓ Modern |
| `@HostBinding` | Binds to host element property | ✓ |
| `@HostListener` | Listens to host element events | ✓ |

### Benefits
✅ Adds behavior without modifying original class  
✅ Separates concerns (presentation, logic, metadata)  
✅ Enables Angular framework features  
✅ Makes code declarative and readable  
✅ Supports custom cross-cutting concerns  

---

## Best Practices

1. **Don't Over-Engineer** — Use patterns when they solve real problems, not for theoretical perfection
2. **Keep It Simple** — Choose the simplest pattern that solves your use case
3. **Combine Patterns** — Patterns work well together (Facade + Singleton, DI + Observer)
4. **Document Your Patterns** — Make it clear why a pattern was chosen
5. **Test Early** — Patterns make code more testable; leverage this advantage
6. **Use TypeScript Strictly** — Interfaces and types help enforce pattern contracts
7. **Leverage Angular Features** — Use @Injectable, @Component, Observables as intended

---

## Pattern Selection Guide

| Scenario | Pattern | Example |
|----------|---------|---------|
| Manage global state | Singleton | Authentication service |
| Create complex objects | Factory | Notification system |
| Simplify complex subsystems | Facade | Shopping cart manager |
| Switch algorithms at runtime | Strategy | Payment methods |
| Receive updates automatically | Observer | Cart count updates |
| Decouple dependencies | DI | Service injection |
| Add metadata/behavior | Decorator | @Component, @Input |

---

## References

### Primary Sources
- [Design Patterns Every Angular Developer Should Know](https://dev.to/bytebantz/design-patterns-every-angular-developer-should-know-4llf)
- [Angular Design Patterns Explained: Real-World Examples Every Developer Should Know](https://medium.com/@sumit-ranjan/angular-design-patterns-explained-real-world-examples-every-developer-should-know-011c7a8c8785)

### Official Angular Documentation
- [Angular Dependency Injection](https://angular.io/guide/dependency-injection) - Official guide on DI system
- [Angular Services](https://angular.io/guide/architecture-services) - Service architecture and patterns
- [Angular Decorators](https://angular.io/guide/typescript#decorators) - TypeScript decorators in Angular
- [RxJS Documentation](https://rxjs.dev/) - Observable and reactive programming
- [Angular Component Interaction](https://angular.io/guide/component-interaction) - @Input, @Output patterns

### Design Pattern References
- [Gang of Four Design Patterns](https://en.wikipedia.org/wiki/Design_Patterns) - Classic software design patterns
- [Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns) - Modern pattern explanations with examples
- [Pattern Language for Architects](https://www.oreilly.com/library/view/design-patterns/0201633612/) - Original Design Patterns book

