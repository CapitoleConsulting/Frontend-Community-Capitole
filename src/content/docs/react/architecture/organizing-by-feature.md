---
title: "React Architecture: Organizing by Feature"
description: "A practical approach to organizing React applications, with feature boundaries, components, data access, state ownership and room to grow."
sidebar:
  order: 1
---

# React Application Architecture: Organizing by Feature

At some point, every React project ends up having the same conversation: where do we put this file?

The first few components are easy. We create `components`, maybe `hooks`, a `services` folder for requests, and keep moving. A few months later, changing the book search means opening six directories, nobody knows whether `utils` and `helpers` are different things, and a component from the account page is importing something from the checkout page.

Everything still builds. That's part of the problem, actually. The compiler doesn't care that finding the code takes longer than changing it.

I want to explain an approach I find comfortable for React applications: **organizing around features, keeping related code close, and being explicit about what each part owns**. We'll continue with the book examples from the other articles, this time imagining a small library application with a catalog, loans and an account page.

This is a proposal, with trade-offs. React doesn't require this structure, and renaming your folders won't fix responsibilities that are already mixed together. But having a place where each change naturally belongs helps quite a lot.

## Start With the Application You Have

For a catalog page with a search field and a couple of components, this is completely reasonable:

```txt
src/
├── App.tsx
├── BookCatalog.tsx
├── BookCard.tsx
├── books.api.ts
├── book.types.ts
└── main.tsx
```

You can understand it in a minute. I wouldn't create five layers around it because the application might eventually become large.

The pressure to reorganize comes when we add different areas. Book availability, loan renewals, account settings, maybe a librarian dashboard. Now a single `components` folder tells us what kind of files it contains, but very little about which part of the application they belong to.

A global `hooks` folder has the same problem. `useBookSearch`, `useRenewLoan` and `useAccountSettings` all being hooks doesn't make them related.

I'd start grouping by feature when those areas become recognizable. There isn't a component count that tells us when to do it. If a small change keeps sending you across the entire source tree, that's a useful signal.

## A Structure We Can Work With

Here's how I'd organize that growing application:

```txt
src/
├── app/
│   ├── App.tsx
│   ├── AppProviders.tsx
│   └── pages/
│       └── LibraryPage.tsx
├── features/
│   ├── catalog/
│   │   ├── BookCatalog.tsx
│   │   ├── BookCard.tsx
│   │   ├── books.api.ts
│   │   ├── book.types.ts
│   │   └── index.ts
│   ├── loans/
│   │   ├── LoanList.tsx
│   │   ├── loans.api.ts
│   │   ├── loan.rules.ts
│   │   ├── loan.rules.test.ts
│   │   ├── loan.types.ts
│   │   └── index.ts
│   └── account/
│       ├── AccountSettings.tsx
│       └── index.ts
├── shared/
│   └── ui/
│       ├── Button.tsx
│       └── Dialog.tsx
└── main.tsx
```

Notice that the features are fairly flat. There's no requirement for every one to have `components`, `hooks`, `services`, `models` and `utils` inside it.

If `catalog` grows to twenty components, sure, give its components a folder. Until then, opening the feature and seeing the relevant files directly is comfortable enough.

The three main areas have different responsibilities:

- **app** connects the application: pages, navigation, layout and providers.
- **features** contains the behavior users recognize: browsing books, managing loans, editing an account.
- **shared** contains code with a genuinely shared purpose, such as a generic dialog.

That's the basic agreement. I'd rather have the team understand those three responsibilities than memorize a much larger directory convention.

Also, a feature doesn't have to match a backend entity. `Book` is a data concept. Browsing the catalog and managing a loan are different activities, even though both involve books. We can start with those boundaries and adjust them when the product becomes clearer.

## Let's Follow One Feature

The catalog needs book data, a list and a search field. We'll separate the network request from rendering, but keep both inside `catalog` because they serve the same feature.

First, the data our catalog actually needs:

```typescript
// features/catalog/book.types.ts
export type Book = {
  id: string;
  title: string;
  author: string;
};
```

This doesn't need to represent every column in the backend's book table. The catalog doesn't care about acquisition invoices or internal librarian notes.

I would also avoid a root `types.ts` containing every type in the application. It starts conveniently and becomes another place where unrelated changes meet. Put a type near the code that owns its meaning.

Now the request. For this example, `/api/books` returns an array of objects with those three string fields:

```typescript
// features/catalog/books.api.ts
import type { Book } from "./book.types";

function isBook(value: unknown): value is Book {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value && typeof value.id === "string" &&
    "title" in value && typeof value.title === "string" &&
    "author" in value && typeof value.author === "string"
  );
}

export async function getBooks(signal?: AbortSignal): Promise<Book[]> {
  const response = await fetch("/api/books", { signal });

  if (!response.ok) {
    throw new Error(`Could not load books (${response.status})`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data) || !data.every(isBook)) {
    throw new Error("Unexpected book response");
  }

  return data;
}
```

The runtime check is small because the contract is small. If the application already uses Zod, this is a good place for a schema instead. The important detail is that `response.json() as Book[]` wouldn't validate anything, however reassuring it looks in the editor.

This function knows the endpoint and the expected response. It doesn't know about a loading spinner, React state, toast notifications or which page called it.

If the backend later sends `book_id` instead of `id`, we can map that response here. The rest of the catalog can keep using its existing model. I wouldn't add a separate mapper file for three assignments unless there was enough mapping work to justify it.

## Components Can Stay Fairly Ordinary

Our card receives data and renders a selection button:

```tsx
// features/catalog/BookCard.tsx
import type { Book } from "./book.types";

type BookCardProps = {
  book: Book;
  onSelect: (bookId: string) => void;
};

export function BookCard({ book, onSelect }: BookCardProps) {
  return (
    <article>
      <h2>{book.title}</h2>
      <p>{book.author}</p>
      <button type="button" onClick={() => onSelect(book.id)}>
        View book
      </button>
    </article>
  );
}
```

Then the catalog composes the cards and owns its search input:

```tsx
// features/catalog/BookCatalog.tsx
import { useState } from "react";
import { BookCard } from "./BookCard";
import type { Book } from "./book.types";

type BookCatalogProps = {
  books: Book[];
  onSelectBook: (bookId: string) => void;
};

export function BookCatalog({ books, onSelectBook }: BookCatalogProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visibleBooks = books.filter((book) =>
    book.title.toLowerCase().includes(query),
  );

  return (
    <section aria-label="Book catalog">
      <label>
        Search books
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <p>{visibleBooks.length} books found</p>
      <ul>
        {visibleBooks.map((book) => (
          <li key={book.id}>
            <BookCard book={book} onSelect={onSelectBook} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

The search belongs here because this is the only place that currently needs it. We don't need a global store just because the rest of the project uses Zustand or Redux.

`visibleBooks` is calculated from the current inputs. Keeping it in another state variable would give us synchronization work without adding useful information.

I also wouldn't extract `useBookCatalog` just to move these few lines out of the component. If the hook eventually coordinates pagination, selection and keyboard navigation, extracting it could make the component easier to read. At this size, the code is already quite direct.

## Where Does Loading Happen?

We've deliberately left fetching out of `BookCatalog`. Something above it needs to call `getBooks`, handle pending and error states, and provide the result.

That something depends on the application. With a route loader, the route can own loading. In a client application using TanStack Query, a catalog query hook can own the subscription to cached data. A server-rendered application may fetch on the server and pass the result to the interactive catalog.

These are alternatives, not three layers we need to stack together.

For a client application that already uses TanStack Query, the feature might add this file:

```typescript
// features/catalog/useBooks.ts
import { useQuery } from "@tanstack/react-query";
import { getBooks } from "./books.api";

export function useBooks() {
  return useQuery({
    queryKey: ["catalog", "books"],
    queryFn: ({ signal }) => getBooks(signal),
  });
}
```

That example assumes a `QueryClientProvider` is already configured above the consumer. We aren't setting up the library in this article.

The query function forwards cancellation to the request. The key identifies this data in the cache. If the request later depends on a search term or a page number, those inputs also need to be represented in the key.

The component consuming `useBooks` should show initial loading and error states before rendering the catalog. It should also decide what happens during background refreshes when previous data already exists. Those are interface decisions; `getBooks` shouldn't be choosing them.

I'd keep the query hook inside `catalog`, next to the request. Moving every query into a global `queries` folder would scatter the feature again under a different name.

## Keep Business Rules Somewhere We Can Read Them

Loans bring a different kind of logic. Suppose the product rule says a loan can be renewed if it is active, has fewer than two renewals and nobody else has reserved the book.

We can put that rule in a plain function:

```typescript
// features/loans/loan.types.ts
export type Loan = {
  id: string;
  status: "active" | "returned";
  renewalCount: number;
  reservedByAnotherReader: boolean;
};
```

```typescript
// features/loans/loan.rules.ts
import type { Loan } from "./loan.types";

export function canRenewLoan(loan: Loan): boolean {
  return (
    loan.status === "active" &&
    loan.renewalCount < 2 &&
    !loan.reservedByAnotherReader
  );
}
```

Now the list and the loan detail can use the same rule. It doesn't import React, read a store or make a request. We can understand it without mounting anything.

This is enough separation for this rule. I wouldn't create a `LoanRenewalPolicyFactory` to return it.

The backend still has to enforce the renewal policy when processing the request. A button being disabled doesn't authorize or prevent a server operation, and availability can change after the page loads. The frontend rule is useful feedback; the server makes the final decision.

When the rules get complicated, a dedicated domain area inside the feature can make sense. Until then, `loan.rules.ts` says exactly what we need.

## Give Features a Small Public Surface

The catalog has internal files, but the rest of the application doesn't need to know about all of them.

An explicit entry point helps:

```typescript
// features/catalog/index.ts
export { BookCatalog } from "./BookCatalog";
export { getBooks } from "./books.api";
export type { Book } from "./book.types";
```

If we adopt the query hook, we can export `useBooks` too. Export what another part of the application actually uses.

The application can now import from the feature boundary:

```tsx
import { BookCatalog } from "../../features/catalog";
```

Inside the feature, use direct relative imports, like `./BookCard`. Importing the feature's own `index.ts` from its internal files can create circular paths unnecessarily.

I prefer explicit exports over `export *` here. When every internal helper is automatically exported, the entry point stops communicating what is intended for outside use.

This is a convention, though. An `index.ts` doesn't prevent someone importing `features/catalog/BookCard` directly. If that becomes a recurring issue, add import restrictions to the project's lint configuration. For a monorepo, workspace boundaries can do more. A TypeScript path alias only shortens an import; it doesn't enforce ownership.

And don't create barrel files for every directory just for symmetry. The useful boundary here is the feature.

## Connecting Features Without Tangling Them Together

Imagine the library page shows the catalog and a loan summary. A selection in the catalog should update the page's selected book.

The application can coordinate that interaction:

```tsx
// app/pages/LibraryPage.tsx
import { useState } from "react";
import { BookCatalog, type Book } from "../../features/catalog";

export function LibraryPage({ books }: { books: Book[] }) {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  return (
    <main>
      <h1>Library</h1>
      <BookCatalog books={books} onSelectBook={setSelectedBookId} />
      {selectedBookId && <p>Selected book ID: {selectedBookId}</p>}
    </main>
  );
}
```

The final paragraph is just a placeholder for a detail or reservation section. The important part is that the catalog reports a selection and the page decides what to do with it.

The catalog doesn't import the account store to check permissions, then import a loan component to open a dialog, then ask that dialog to update the catalog. That kind of chain is where changes start getting surprisingly expensive.

My default dependency direction is that `app` can compose features, features can consume shared code, and shared code knows nothing about either of them.

Sometimes one feature really does need another feature's public functionality. I'd allow a deliberate one-way dependency if the ownership is clear. But if `catalog` imports `loans` and `loans` imports `catalog`, stop and look at the relationship. Perhaps the application should coordinate them, or perhaps they share a domain concept that deserves its own owner.

Don't introduce an event bus just to avoid passing a callback. We would be replacing a visible connection with one that is harder to trace.

## The shared Folder Is Where We Need Some Restraint

Two components looking similar doesn't automatically make them the same component.

A catalog card and a loan card might both have a title, an image and a button. Then the loan card needs a due date, renewal restrictions and an overdue warning. Our universal `Card` starts collecting flags until nobody knows which combinations are valid.

I would keep those components in their features and share smaller pieces when there is a clear common behavior. A button, a dialog with focus handling, a consistent field error. Something with a purpose that stays the same across its consumers.

The same applies to functions. `formatDate` may be shared. `calculateRenewalEligibility` belongs with loans, even if two loan screens use it.

Types deserve the same discussion. Don't move `Book` to `shared/types` simply because another feature also uses an object called a book. A loan might only need a `bookId` and a display title. It doesn't necessarily need the catalog's entire model.

If several features genuinely depend on the same book contract and rules, a shared domain module can be sensible. Give it a specific name and an owner. A giant `shared` directory with everything vaguely reusable is just the old global folder problem returning.

## State Ownership Matters More Than Store Location

We've covered state libraries elsewhere, so I won't repeat the comparison. The architectural question here is who owns each value and how long it needs to survive.

For this library application, I would start with these choices:

- An expanded card or an open dialog: state in the component that controls it.
- A draft used by several steps of one form: their common parent, or a provider scoped to that form.
- Search and pagination that should survive refresh and be shareable: the URL.
- API responses: the existing route data or query cache mechanism.
- Client state shared across distant areas: a focused store or context when needed.

Our catalog's local search was appropriate for the first version. Once sharing a filtered URL becomes a requirement, I'd move ownership to the routing layer and pass the search value and change callback into the catalog.

I wouldn't keep a local search, a URL search and a store search all synchronized by effects. Pick the owner and derive the other views from it.

With Redux, the application can configure the store while individual features own their slices and selectors. With Zustand, a feature store can live directly inside that feature. A file living under `features` doesn't make its state component-local, though. A module-level store can outlive a page.

Reset behavior needs an explicit decision: leaving a route, closing a workflow and logging out are different events. User-specific cached data also needs the appropriate handling when the active account changes.

## Providers and Routes Belong in the Conversation

`AppProviders` is useful for providers needed throughout the application. Put it under `app`, where that wiring is expected.

The order should follow real dependencies. A provider that reads routing information needs to be inside the router. A provider for one editor doesn't need to wrap the entire application just because we already have a provider file.

Routing has a similar split. A route decides what screen is being visited, reads route inputs and composes the relevant features. The catalog shouldn't have to know the application's entire URL structure to render a book list.

Routes are also a reasonable place to introduce code splitting when a screen is expensive. Use the router or framework's loading mechanisms and give users meaningful loading and error states. Moving code into `features` alone doesn't make it lazy-loaded.

## What Changes With a Framework?

The examples here use a generic `src/app` directory. That name has no special behavior in this proposal.

If you're using Next.js, its `app` directory does have framework meaning. Keep its route conventions and place feature code where it fits around them. The same principle applies to React Router's framework conventions. Don't fight the router's file structure to reproduce this tree exactly.

React's documentation recommends starting new applications with a framework, while also documenting building from scratch when appropriate. That choice affects data loading, deployment and rendering. It deserves a decision before arguing about folder names.

With Server Components, the server/client boundary matters as much as the feature boundary. A feature may contain both server data access and interactive client UI, but a client module must not import server-only code.

In that situation, I would avoid a single barrel that mixes database access and client components. Separate the entry points according to where they can run. Also, server-side state and caches need request-aware handling; copying a browser singleton store into server code can share data between users.

Feature organization still helps. It just doesn't replace the framework's execution model.

## Testing Should Follow the Behavior

Keeping a rule close to its feature makes it easy to test without rendering React. Using Vitest in an application that already has it, our loan rule could have this small check:

```typescript
// features/loans/loan.rules.test.ts
import { expect, it } from "vitest";
import { canRenewLoan } from "./loan.rules";
import type { Loan } from "./loan.types";

it("allows eligible loans and rejects each renewal restriction", () => {
  const loan: Loan = {
    id: "loan-1",
    status: "active",
    renewalCount: 1,
    reservedByAnotherReader: false,
  };

  expect(canRenewLoan(loan)).toBe(true);
  expect(canRenewLoan({ ...loan, status: "returned" })).toBe(false);
  expect(canRenewLoan({ ...loan, renewalCount: 2 })).toBe(false);
  expect(canRenewLoan({ ...loan, reservedByAnotherReader: true })).toBe(false);
});
```

For the catalog, I'd test searching and selecting through the rendered interface. For the loading integration, I'd simulate the network boundary and check success and failure. For the whole application, a critical flow might be finding a book and completing a reservation.

We don't need a test for every folder or every forwarding function. The structure should make important behavior easier to test, not manufacture extra things to mock.

## Moving an Existing Project Toward This

I wouldn't move the entire repository in one pull request. Pick a feature you're already changing and gather its files together.

Update its consumers, establish its public exports and run the relevant checks. Keep unrelated behavior changes separate so the review stays readable. The next feature can move when there's a reason to touch it.

During the transition, old global folders and new feature folders can coexist. It's a little untidy, but manageable. What I'd avoid is maintaining duplicate implementations in both structures just to keep the migration looking symmetrical.

After moving a couple of features, look at the imports. If nearly every file still reaches into several other features, the folder move hasn't solved the actual coupling. That's useful feedback about where the boundaries need work.

## Conclusion

What I like about organizing by feature is being able to open `loans` and find the loan behavior there. The types, the request, the rules, the components and their tests are close enough to change together.

There will still be awkward decisions. Some behavior genuinely spans features, some shared components will turn out to be a bad fit, and the first boundaries won't survive every product change. I'd rather adjust those when we understand the problem than make every feature follow a structure it doesn't need.

For a growing React application, this is where I'd start: small feature folders, a clear place for application wiring, a restrained shared area and state with an identifiable owner. Add stronger boundaries when the team needs them, and keep checking whether an ordinary change is actually getting easier.

## References

- [React: Thinking in React](https://react.dev/learn/thinking-in-react)
- [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Redux Style Guide: Structure Files as Feature Folders](https://redux.js.org/style-guide/#structure-files-as-feature-folders-with-single-file-logic)
- [TanStack Query: Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [React: Creating a React App](https://react.dev/learn/creating-a-react-app)
- [React: The use client Directive](https://react.dev/reference/rsc/use-client)
