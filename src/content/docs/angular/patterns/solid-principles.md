---
title: SOLID Principles
description: Master SOLID design principles in Angular. Learn Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion with real-world examples.
sidebar.order: 2
---

## Overview

SOLID represents **five fundamental design guidelines** introduced by Robert C. Martin that help software developers design software systems to be more flexible, maintainable, and scalable.

These principles help reduce long-term maintenance costs and improve code quality across Angular applications. While requiring additional upfront effort, they provide substantial dividends throughout the application's lifecycle.

---

## 1. Single Responsibility Principle (SRP)

**A class or module should have only one reason to change, meaning it should maintain just one responsibility.**

### Problem: Violation Example

```typescript
// ❌ VIOLATES SRP - Component does too much
@Component({
  selector: 'app-product-list',
  template: `
    <div>
      <select [(ngModel)]="selectedCategory" (change)="filterByCategory()">
        <option *ngFor="let cat of categories" [value]="cat">
          {{ cat }}
        </option>
      </select>
      <div *ngFor="let product of filteredProducts">
        <h3>{{ product.name }}</h3>
        <p>{{ product.price }}</p>
      </div>
    </div>
  `
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = [];
  selectedCategory: string = '';

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe(
      products => this.products = products
    );
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe(
      categories => this.categories = categories
    );
  }

  filterByCategory(): void {
    this.filteredProducts = this.products.filter(
      p => p.category === this.selectedCategory
    );
  }
}
```

**Issues:**
- Component handles display AND filtering
- Difficult to test filtering logic independently
- Changes to filtering affect display component

### Solution: Apply SRP

**1. Extract filtering to a service:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class ProductFilterService {
  filterByCategory(products: Product[], category: string): Product[] {
    return products.filter(p => p.category === category);
  }

  filterByPriceRange(products: Product[], min: number, max: number): Product[] {
    return products.filter(p => p.price >= min && p.price <= max);
  }
}
```

**2. Create a dedicated filter component:**
```typescript
import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-product-filter',
  template: `
    <div class="filter-controls">
      <select [(ngModel)]="selectedCategory()" (change)="onCategoryChange()">
        <option value="">All Categories</option>
        @for (cat of categories(); track cat) {
          <option [value]="cat">{{ cat }}</option>
        }
      </select>
    </div>
  `
})
export class ProductFilterComponent {
  categories = input<string[]>([]);
  categoryChanged = output<string>();
  
  selectedCategory = signal('');

  onCategoryChange(): void {
    this.categoryChanged.emit(this.selectedCategory());
  }
}
```

**3. Update list component with single responsibility:**
```typescript
import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-product-list',
  template: `
    <app-product-filter 
      [categories]="categories()"
      (categoryChanged)="onFilterChange($event)">
    </app-product-filter>
    
    <div class="product-list">
      @for (product of filteredProducts(); track product.id) {
        <div class="product-card">
          <h3>{{ product.name }}</h3>
          <p>{{ product.price | currency }}</p>
        </div>
      }
    </div>
  `
})
export class ProductListComponent implements OnInit {
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  categories = signal<string[]>([]);

  constructor(
    private productService: ProductService,
    private filterService: ProductFilterService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe(
      products => {
        this.products.set(products);
        this.filteredProducts.set(products);
      }
    );
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe(
      categories => this.categories.set(categories)
    );
  }

  onFilterChange(category: string): void {
    this.filteredProducts.set(
      category
        ? this.filterService.filterByCategory(this.products(), category)
        : this.products()
    );
  }
}
```

### Benefits
✅ Each component has a single, clear purpose  
✅ Easier to test in isolation  
✅ Changes to filtering don't affect display  
✅ Components are more reusable  
✅ Simpler to maintain and debug  

---

## 2. Open/Closed Principle (OCP)

**Software entities should be "open for extension but closed for modification," enabling new features without altering existing code.**

### Problem: Violation Example

```typescript
// ❌ VIOLATES OCP - Requires modification to add new payment methods
const paymentStrategies: Record<string, () => void> = {
  'credit-card': () => console.log('Processing credit card payment'),
  'paypal': () => console.log('Processing PayPal payment'),
  'apple-pay': () => console.log('Processing Apple Pay payment')
};

@Component({
  selector: 'app-payment',
  template: `
    <div>
      <button *ngFor="let method of paymentMethods" 
              (click)="processPayment(method)">
        {{ method }}
      </button>
    </div>
  `
})
export class PaymentComponent {
  paymentMethods = ['credit-card', 'paypal', 'apple-pay'];

  processPayment(method: string): void {
    paymentStrategies[method]?.();
  }
}
```

**Issues:**
- Adding new payment methods requires modifying the paymentStrategies object
- Component is still tightly coupled to payment logic
- Violates OCP principle (not extensible without modification)

### Solution: Apply OCP with Strategy Pattern

**1. Define payment strategy interface:**
```typescript
export interface PaymentStrategy {
  processPayment(amount: number): Promise<PaymentResult>;
  validate(): boolean;
  getName(): string;
}
```

**2. Create implementations (open for extension):**
```typescript
@Injectable({ providedIn: 'root' })
export class CreditCardPayment implements PaymentStrategy {
  getName(): string {
    return 'Credit Card';
  }

  validate(): boolean {
    return !!localStorage.getItem('card_token');
  }

  processPayment(amount: number): Promise<PaymentResult> {
    return Promise.resolve({
      success: true,
      transactionId: 'CC_' + Date.now(),
      amount,
      method: 'Credit Card'
    });
  }
}

@Injectable({ providedIn: 'root' })
export class PayPalPayment implements PaymentStrategy {
  getName(): string {
    return 'PayPal';
  }

  validate(): boolean {
    return !!localStorage.getItem('paypal_token');
  }

  processPayment(amount: number): Promise<PaymentResult> {
    return Promise.resolve({
      success: true,
      transactionId: 'PP_' + Date.now(),
      amount,
      method: 'PayPal'
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ApplePayPayment implements PaymentStrategy {
  getName(): string {
    return 'Apple Pay';
  }

  validate(): boolean {
    return !!localStorage.getItem('apple_pay_token');
  }

  processPayment(amount: number): Promise<PaymentResult> {
    return Promise.resolve({
      success: true,
      transactionId: 'AP_' + Date.now(),
      amount,
      method: 'Apple Pay'
    });
  }
}
```

**3. Closed for modification - Component uses abstraction:**
```typescript
import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-payment',
  template: `
    <div>
      @for (method of availableMethods(); track method.getName()) {
        <button (click)="processPayment(method)">
          {{ method.getName() }}
        </button>
      }
    </div>
  `
})
export class PaymentComponent implements OnInit {
  availableMethods = signal<PaymentStrategy[]>([]);

  constructor(
    private creditCardPayment: CreditCardPayment,
    private payPalPayment: PayPalPayment,
    private applePayPayment: ApplePayPayment
  ) {}

  ngOnInit(): void {
    const allMethods = [
      this.creditCardPayment,
      this.payPalPayment,
      this.applePayPayment
    ];
    
    this.availableMethods.set(allMethods.filter(m => m.validate()));
  }

  async processPayment(strategy: PaymentStrategy): Promise<void> {
    const result = await strategy.processPayment(99.99);
    console.log('Payment result:', result);
  }
}
```

### Benefits
✅ New payment methods can be added without modifying existing code  
✅ Reduced risk of breaking existing functionality  
✅ Follows strategy pattern naturally  
✅ Easy to test each payment method independently  
✅ Highly scalable for future extensions  

---

## 3. Liskov Substitution Principle (LSP)

**Subclass objects should function as substitutes for their parent class without breaking program correctness. Child classes must honor the contract established by their parent.**

### Problem: Violation Example

```typescript
// ❌ VIOLATES LSP - Bird.fly() doesn't work for Ostrich
abstract class Bird {
  abstract fly(): void;
  abstract makeSound(): void;
}

class Eagle extends Bird {
  fly(): void {
    console.log('Eagle is flying');
  }

  makeSound(): void {
    console.log('Eagle screeches');
  }
}

class Ostrich extends Bird {
  fly(): void {
    // ❌ Ostrich cannot fly, but claims to be a Bird
    throw new Error('Ostrich cannot fly!');
  }

  makeSound(): void {
    console.log('Ostrich chirps');
  }
}

// Using the Bird class - expecting all birds to fly
function makeBirdFly(bird: Bird): void {
  bird.fly(); // ❌ Throws error for Ostrich!
}
```

**Issues:**
- Ostrich violates Bird's contract
- Runtime errors occur unexpectedly
- Type system doesn't catch the problem

### Solution: Apply LSP - Honor Contracts

**1. Redesign hierarchy to match reality:**
```typescript
abstract class Bird {
  abstract makeSound(): void;
  abstract move(): void;
}

abstract class FlyingBird extends Bird {
  abstract fly(): void;

  move(): void {
    this.fly();
  }
}

abstract class GroundBird extends Bird {
  abstract run(): void;

  move(): void {
    this.run();
  }
}
```

**2. Correct implementations honor contracts:**
```typescript
class Eagle extends FlyingBird {
  fly(): void {
    console.log('Eagle is flying high');
  }

  makeSound(): void {
    console.log('Eagle screeches');
  }
}

class Ostrich extends GroundBird {
  run(): void {
    console.log('Ostrich is running fast');
  }

  makeSound(): void {
    console.log('Ostrich chirps');
  }
}

// Now works correctly with any Bird subclass
function makeMovement(bird: Bird): void {
  bird.move(); // ✅ Works for both flying and ground birds
}
```

**3. Angular component example - respecting contracts:**
```typescript
export interface DataSource {
  getData(): Observable<any[]>;
  refresh(): void;
}

@Injectable({ providedIn: 'root' })
export class ApiDataSource implements DataSource {
  constructor(private http: HttpClient) {}

  getData(): Observable<any[]> {
    return this.http.get<any[]>('/api/data');
  }

  refresh(): void {
    console.log('Refreshing from API');
  }
}

@Injectable({ providedIn: 'root' })
export class LocalStorageDataSource implements DataSource {
  getData(): Observable<any[]> {
    const data = localStorage.getItem('data');
    return of(data ? JSON.parse(data) : []);
  }

  refresh(): void {
    console.log('Refreshing from localStorage');
  }
}

@Component({
  selector: 'app-data-list',
  template: `
    <button (click)="refresh()">Refresh</button>
    @for (item of items(); track item) {
      <div>{{ item }}</div>
    }
  `
})
export class DataListComponent implements OnInit {
  items = signal<any[]>([]);

  constructor(private dataSource: DataSource) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.dataSource.getData().subscribe(
      data => this.items.set(data)
    );
  }

  refresh(): void {
    this.dataSource.refresh();
    this.loadData();
  }
}
```

### Benefits
✅ Predictable, reliable inheritance hierarchies  
✅ Prevents runtime errors from incorrect assumptions  
✅ Type system catches violations at compile time  
✅ Subclasses can be safely substituted  
✅ Clear and honest class contracts  

---

## 4. Interface Segregation Principle (ISP)

**Components should not depend on interfaces containing methods they don't use. Keep interfaces focused and minimal, segregating large interfaces into smaller, specific ones.**

### Problem: Violation Example

```typescript
// ❌ VIOLATES ISP - Component depends on unused methods
export interface DataService {
  getItems(): Observable<Item[]>;
  addItem(item: Item): Observable<Item>;
  updateItem(item: Item): Observable<Item>;
  deleteItem(id: string): Observable<void>;
  exportToCSV(): Observable<string>;
  importFromCSV(csv: string): Observable<Item[]>;
}

@Component({
  selector: 'app-item-list'
})
export class ItemListComponent {
  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // ❌ Component only uses getItems(), but depends on entire interface
    this.dataService.getItems().subscribe(items => {
      // ...
    });
  }
}
```

**Issues:**
- Component is tightly coupled to unused methods
- Changes to export/import methods affect display component
- Difficult to test with mock implementations
- Unnecessary dependencies

### Solution: Apply ISP - Segregate Interfaces

**1. Break into focused, minimal interfaces:**
```typescript
export interface ItemReader {
  getItems(): Observable<Item[]>;
}

export interface ItemWriter {
  addItem(item: Item): Observable<Item>;
  updateItem(item: Item): Observable<Item>;
  deleteItem(id: string): Observable<void>;
}

export interface ItemImportExport {
  exportToCSV(): Observable<string>;
  importFromCSV(csv: string): Observable<Item[]>;
}

@Injectable({ providedIn: 'root' })
export class ItemService implements ItemReader, ItemWriter, ItemImportExport {
  constructor(private http: HttpClient) {}

  getItems(): Observable<Item[]> {
    return this.http.get<Item[]>('/api/items');
  }

  addItem(item: Item): Observable<Item> {
    return this.http.post<Item>('/api/items', item);
  }

  updateItem(item: Item): Observable<Item> {
    return this.http.put<Item>(`/api/items/${item.id}`, item);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`/api/items/${id}`);
  }

  exportToCSV(): Observable<string> {
    return this.http.get('/api/items/export', { responseType: 'text' });
  }

  importFromCSV(csv: string): Observable<Item[]> {
    return this.http.post<Item[]>('/api/items/import', { csv });
  }
}
```

**2. Components depend only on what they use:**
```typescript
@Component({
  selector: 'app-item-list',
  template: `
    @for (item of items(); track item.id) {
      <div>{{ item.name }}</div>
    }
  `
})
export class ItemListComponent implements OnInit {
  items = signal<Item[]>([]);

  constructor(private itemReader: ItemReader) {}

  ngOnInit(): void {
    this.itemReader.getItems().subscribe(
      items => this.items.set(items)
    );
  }
}

@Component({
  selector: 'app-item-editor'
})
export class ItemEditorComponent {
  constructor(
    private itemReader: ItemReader,
    private itemWriter: ItemWriter
  ) {}

  saveItem(item: Item): void {
    this.itemWriter.updateItem(item).subscribe(() => {
      // Refresh list
    });
  }
}

@Component({
  selector: 'app-item-io'
})
export class ItemIOComponent {
  constructor(private itemIO: ItemImportExport) {}

  exportData(): void {
    this.itemIO.exportToCSV().subscribe(csv => {
      // Download CSV
    });
  }
}
```

### Benefits
✅ Reduces unnecessary coupling  
✅ Components only depend on needed methods  
✅ Easier to mock for testing  
✅ Makes interfaces clearer and more intentional  
✅ Better separation of concerns  

---

## 5. Dependency Inversion Principle (DIP)

**High-level modules should not depend on low-level implementations; both should depend on abstractions instead.**

### Problem: Violation Example

```typescript
// ❌ VIOLATES DIP - Direct dependency on concrete implementation
export class CustomerRepository {
  getCustomer(id: string): Customer {
    return this.db.query(`SELECT * FROM customers WHERE id = ${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  // High-level service depends on low-level implementation
  constructor(private customerRepository: CustomerRepository) {}

  getCustomer(id: string): Observable<Customer> {
    return of(this.customerRepository.getCustomer(id));
  }
}

@Component({
  selector: 'app-customer-detail'
})
export class CustomerDetailComponent {
  constructor(private customerService: CustomerService) {}
  // If CustomerRepository changes, everything breaks
}
```

**Issues:**
- Service depends on concrete implementation
- Difficult to test with different data sources
- Tight coupling makes refactoring risky
- Cannot swap implementations

### Solution: Apply DIP - Use Abstractions

**1. Define interface contracts:**
```typescript
export interface ICustomerRepository {
  getCustomer(id: string): Observable<Customer>;
  getAllCustomers(): Observable<Customer[]>;
  saveCustomer(customer: Customer): Observable<Customer>;
  deleteCustomer(id: string): Observable<void>;
}
```

**2. Create implementations satisfying the contract:**
```typescript
@Injectable({ providedIn: 'root' })
export class ApiCustomerRepository implements ICustomerRepository {
  constructor(private http: HttpClient) {}

  getCustomer(id: string): Observable<Customer> {
    return this.http.get<Customer>(`/api/customers/${id}`);
  }

  getAllCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>('/api/customers');
  }

  saveCustomer(customer: Customer): Observable<Customer> {
    return this.http.post<Customer>('/api/customers', customer);
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`/api/customers/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class LocalStorageCustomerRepository implements ICustomerRepository {
  getCustomer(id: string): Observable<Customer> {
    const data = localStorage.getItem(`customer_${id}`);
    return of(data ? JSON.parse(data) : null);
  }

  getAllCustomers(): Observable<Customer[]> {
    const data = localStorage.getItem('customers');
    return of(data ? JSON.parse(data) : []);
  }

  saveCustomer(customer: Customer): Observable<Customer> {
    localStorage.setItem(`customer_${customer.id}`, JSON.stringify(customer));
    return of(customer);
  }

  deleteCustomer(id: string): Observable<void> {
    localStorage.removeItem(`customer_${id}`);
    return of(void 0);
  }
}
```

**3. High-level service depends on abstraction:**
```typescript
@Injectable({ providedIn: 'root' })
export class CustomerService {
  constructor(private customerRepository: ICustomerRepository) {}

  getCustomer(id: string): Observable<Customer> {
    return this.customerRepository.getCustomer(id);
  }

  getAllCustomers(): Observable<Customer[]> {
    return this.customerRepository.getAllCustomers();
  }

  saveCustomer(customer: Customer): Observable<Customer> {
    return this.customerRepository.saveCustomer(customer);
  }

  deleteCustomer(id: string): Observable<void> {
    return this.customerRepository.deleteCustomer(id);
  }
}
```

**4. Provide the implementation at the application level:**
```typescript
// In app.config.ts or module providers
export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: ICustomerRepository,
      useClass: ApiCustomerRepository
    },
    CustomerService
  ]
};
```

**5. Components work with any implementation:**
```typescript
import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-customer-detail',
  template: `
    @if (customer(); as customer) {
      <div>
        <h2>{{ customer.name }}</h2>
        <p>{{ customer.email }}</p>
        <button (click)="delete()">Delete</button>
      </div>
    }
  `
})
export class CustomerDetailComponent implements OnInit {
  customer = signal<Customer | null>(null);
  customerId = '123';

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.customerService.getCustomer(this.customerId).subscribe(
      customer => this.customer.set(customer)
    );
  }

  delete(): void {
    this.customerService.deleteCustomer(this.customerId).subscribe(() => {
      // Navigate back to list
    });
  }
}
```

### Benefits
✅ Decouples components from concrete implementations  
✅ Enables flexible testing with mock implementations  
✅ Easy to swap implementations (API vs LocalStorage)  
✅ Makes refactoring safer  
✅ Improves code reusability  

---

## SOLID Summary Table

| Principle | Focus | Benefit | Example |
|-----------|-------|---------|---------|
| **SRP** | One responsibility per class | Easier to maintain and test | Split filter and display components |
| **OCP** | Open for extension, closed for modification | Add features without changing existing code | Payment strategy implementations |
| **LSP** | Subtypes must honor parent contracts | Predictable substitution | Flying vs Ground birds |
| **ISP** | Segregate large interfaces | Reduce unnecessary coupling | ItemReader, ItemWriter, ItemIO |
| **DIP** | Depend on abstractions, not implementations | Flexibility and testability | Depend on ICustomerRepository |

---

## Best Practices

1. **Apply Gradually** — Don't try to apply all SOLID principles at once
2. **Balance with Simplicity** — Avoid over-engineering simple features
3. **Use TypeScript Interfaces** — Enforce abstract contracts at compile time
4. **Leverage Angular DI** — Use Angular's dependency injection system properly
5. **Test-Driven Development** — SOLID principles make TDD easier
6. **Code Review** — Have peers review for SOLID violations
7. **Refactor Iteratively** — Improve code as you understand it better

---

## References

### Primary Sources
- [Applying SOLID Principles to Angular with Examples](https://sheldonrcohen.medium.com/applying-solid-principles-to-angular-with-examples-fec460ffa541)

### Official References
- [Clean Code: A Handbook of Agile Software Craftsmanship](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)

### Angular Specific
- [Angular Dependency Injection Guide](https://angular.io/guide/dependency-injection) - Official Angular DI
- [Angular Services Architecture](https://angular.io/guide/architecture-services) - Service patterns in Angular
- [Component Interaction](https://angular.io/guide/component-interaction) - Component contracts and communication
