---
title: "React Query: Managing Server State"
description: "A practical TanStack Query guide covering queries, cache freshness, search, pagination, mutations and optimistic UI with TypeScript."
sidebar:
  order: 5
---

# React Query: The Save Worked. Why Is the List Still Wrong?

The PATCH returns 200. The response contains the new book title. The editor says "Saved". Close it, look at the catalog, and the old title is still there.

Refresh the browser and it looks right. So the backend saved it. Somewhere in the frontend, we're still reading an earlier response.

That's the problem I want to work through here. Fetching the catalog is part of it, but the interesting bit comes after we change something: which copy gets updated, which requests run again, and what the user sees while that happens.

We'll use **TanStack Query**, also known as React Query. Its cache holds our API responses, and components subscribe to those entries. Saving a book is a separate operation. The library doesn't infer that our PATCH changed the result of three different searches; we have to connect those things.

The code uses the **v5 API**, React and TypeScript. We'll build the catalog query first, then the search and editor. Later snippets extend or replace earlier ones. The API itself is assumed to exist.

## There Is More Than One Copy of That Book

Suppose book 42 appears in the unfiltered catalog, in a search for "React", and on its detail page. Those are three query results. The same book ID can appear in all three without the results sharing one JavaScript object.

Change its title to "Learning TypeScript" and replacing the text isn't even enough. It may no longer belong in the React search. Its position in an alphabetically sorted list may change too.

This is the awkward part of **server state**: we're displaying copies of data and query results whose authoritative version lives on the server. Another user can change them as well.

The Redux and Zustand articles explain how to share values across components. Here we'll give the API responses to the query cache, including their loading and refresh behavior. `fetch` will still make the requests.

Keep that title change in mind. It will explain why the mutation later updates one cache entry directly but asks the server for the lists again.

## Installation and a Stable QueryClient

In the React application where we're building this example:

```bash
npm install @tanstack/react-query@5
```

The cache is managed by a `QueryClient`. We make it available through a provider:

```tsx
// main.tsx, for a browser-only application
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

I've set thirty seconds of freshness and one retry for this catalog. One retry means a failed request gets another attempt before we show the error. These settings can be overridden by individual queries.

The important part here is that we don't create a new client every time a component renders. A new client means a different cache. That can make a perfectly reasonable query look as if caching doesn't work.

This module-level instance is for a browser application. In server rendering, follow the framework's integration and isolate server clients appropriately per request. Sharing a server singleton across users is a very different situation.

## The Catalog Endpoint

We'll assume an API with these contracts: `GET /api/books?q=...&page=...` returns `{ items, hasMore }`, and `PATCH /api/books/:id` accepts `{ title }` and returns the complete updated book. Pages start at one.

First, our types and a small response check:

```typescript
// features/catalog/books.api.ts
export type Book = {
  id: string;
  title: string;
  author: string;
};

export type BookPage = {
  items: Book[];
  hasMore: boolean;
};

export type BookFilters = { search: string; page: number };

function isBook(value: unknown): value is Book {
  return typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" &&
    "title" in value && typeof value.title === "string" &&
    "author" in value && typeof value.author === "string";
}

export async function getBooks(
  filters: BookFilters,
  signal?: AbortSignal,
): Promise<BookPage> {
  const params = new URLSearchParams({
    q: filters.search,
    page: String(filters.page),
  });
  const response = await fetch(`/api/books?${params}`, { signal });
  if (!response.ok) throw new Error("Could not load books.");

  const data: unknown = await response.json();
  if (
    typeof data !== "object" || data === null ||
    !("items" in data) || !Array.isArray(data.items) ||
    !data.items.every(isBook) ||
    !("hasMore" in data) || typeof data.hasMore !== "boolean"
  ) {
    throw new Error("Unexpected catalog response.");
  }
  return { items: data.items, hasMore: data.hasMore };
}
```

If the project already uses a schema library, use it here instead of writing checks by hand. A TypeScript assertion on `response.json()` wouldn't check the response at runtime.

Also notice the `response.ok` check. `fetch` doesn't reject just because the server returns a 500. Our query function needs to reject or throw for TanStack Query to treat the operation as an error.

Returning an empty array from a catch block would give us a particularly misleading result here: a failed request followed by "No books found". Let the error reach the query.

## A Query Is Data With an Identity

Now we connect that request to a query:

```typescript
// features/catalog/book.queries.ts
import { useQuery } from "@tanstack/react-query";
import { getBooks, type BookFilters } from "./books.api";

export const bookKeys = {
  all: ["books"] as const,
  lists: () => ["books", "list"] as const,
  list: (filters: BookFilters) => ["books", "list", filters] as const,
  detail: (id: string) => ["books", "detail", id] as const,
};

export function useBooks(filters: BookFilters) {
  return useQuery({
    queryKey: bookKeys.list(filters),
    queryFn: ({ signal }) => getBooks(filters, signal),
  });
}
```

The key identifies the result. All inputs that change which data we're asking for need to participate in it. Here that means search and page.

If every page used `["books"]`, they would compete for the same cache entry. Putting `page` in the request URL wouldn't fix the identity of the query.

Keys are arrays and can include serializable objects. We don't need to memoize `filters` just to keep a new object reference from creating a new cache entry: keys are hashed by their contents. Keep values consistent, though. Page `1` and page `"1"` aren't interchangeable key values.

Two components using the same key under the same client observe the same cached result. They can share an in-flight request, too. This doesn't mean that key is fetched only once forever; freshness and refetch triggers still apply.

The key functions will be reused by the save operation. Keeping them together avoids having to match strings by eye across the query and mutation files.

## Two ways on showing loading state

For the first screen, we can use a fixed filter:

```tsx
import { useBooks } from "./book.queries";

export function BookList() {
  const query = useBooks({ search: "", page: 1 });

  if (query.data === undefined) {
    if (query.isError) {
      return (
        <div role="alert">
          <p>{query.error.message}</p>
          <button onClick={() => void query.refetch()}>Try again</button>
        </div>
      );
    }
    return <p role="status">Waiting for books...</p>;
  }

  return (
    <section aria-label="Books">
      {query.isFetching && <p role="status">Updating books...</p>}
      {query.isError && <p role="alert">Refresh failed. Showing saved results.</p>}
      {query.data.items.length === 0 && <p>No books found.</p>}
      <ul>
        {query.data.items.map((book) => <li key={book.id}>{book.title}</li>)}
      </ul>
    </section>
  );
}
```

The initial request has no data to show. A background refresh can have useful data already available. Replacing the whole list with a spinner in both cases makes the page feel much less stable than it needs to.

For this screen, the useful distinction is whether we have data and whether a request is running. `isFetching` covers the request, including a background refresh. The v5 names can take a moment to get used to: `isPending` corresponds to the pending status, and `isLoading` means pending and fetching together. A query that has ended in an error isn't pending, even if it has no data.

A background error can coexist with previously fetched data. That's why this component checks whether data exists before deciding to replace the list with an error screen.

The searchable version below also gives a paused request its own message, so waiting for connectivity doesn't look like a slow server.

## Fresh, Stale and Gone From Memory

There are two settings worth understanding early: `staleTime` and `gcTime`.

`staleTime` describes how long fetched data is considered fresh. In our setup, that's thirty seconds. During that window, the usual stale-driven refetch triggers can reuse it without starting another request.

Once stale, the data is still available. Stale doesn't mean deleted, and the clock reaching thirty seconds doesn't itself start a request. Refetching needs a trigger, such as a new observer mounting, reconnecting or returning to the window.

`gcTime` concerns unused cache entries. Inactive queries are kept for a while and then garbage-collected; the browser default is five minutes. It doesn't decide whether active data is fresh.

By default, query data is stale immediately, and failed browser queries retry three times. We've changed those defaults in the client above. Mutations don't retry by default.

For our catalog, this gives a concrete sequence. Open the page and it fetches. Leave and return ten seconds later: the cached result is still fresh. Return after a minute, while the entry is still cached: the result can appear immediately and a background request checks it. That second visit is where the small "Updating books..." message earns its place.

## Search and Pagination Without a Refetch Effect

Let's replace the fixed filter with a search form and pagination. This component reports a selected book to its parent so the parent can open an editor later:

```tsx
import { useState, type FormEvent } from "react";
import { useBooks } from "./book.queries";
import type { Book } from "./books.api";

export function BookCatalog({ onEdit }: { onEdit: (book: Book) => void }) {
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState({ search: "", page: 1 });
  const query = useBooks(filters);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ search: draftSearch.trim(), page: 1 });
  }

  return (
    <section aria-label="Book catalog">
      <form onSubmit={handleSearch}>
        <label>
          Search books
          <input value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} />
        </label>
        <button type="submit">Search</button>
      </form>
      {query.isFetching && <p role="status">Loading results...</p>}
      {query.fetchStatus === "paused" && <p>Waiting for a connection.</p>}
      {query.isError && (
        <div role="alert">
          <p>{query.data ? "Refresh failed. Results may be outdated." : query.error.message}</p>
          <button onClick={() => void query.refetch()}>Try again</button>
        </div>
      )}
      {query.data && (
        <>
          {query.data.items.length === 0 && <p>No books found.</p>}
          <ul>
            {query.data.items.map((book) => (
              <li key={book.id}>
                {book.title}
                <button onClick={() => onEdit(book)}>Edit {book.title}</button>
              </li>
            ))}
          </ul>
          <p>Page {filters.page}</p>
          <button disabled={filters.page === 1} onClick={() =>
            setFilters((current) => ({ ...current, page: current.page - 1 }))
          }>Previous</button>
          <button disabled={!query.data.hasMore || query.isFetching} onClick={() =>
            setFilters((current) => ({ ...current, page: current.page + 1 }))
          }>Next</button>
        </>
      )}
    </section>
  );
}
```

Changing filters changes the key. The query follows that identity. There's no effect calling `refetch` whenever the search changes, and `refetch` isn't how we pass a different page to the request.

The two search values have different jobs: one is what we're typing, the other is what we've submitted. This example intentionally searches on submit. For live search, debounce the committed search value if needed; caching alone doesn't prevent a request for every distinct keystroke.

If the filters should survive refresh or be shareable, let the URL own the submitted values instead.

## Keeping the Previous Page Visible

An uncached page initially has no data. We can choose to keep displaying the previous result during that transition by adding this option to `useBooks`:

```typescript
import { keepPreviousData } from "@tanstack/react-query";

// Additional option inside useQuery:
placeholderData: keepPreviousData,
```

With that change, the UI must account for `query.isPlaceholderData`. Disable Next while it's true, disable editing placeholder rows, and label the list as previous results while the requested page loads. Otherwise we may display page one's books underneath a heading that confidently says page two.

The helper also carries results across a search change. Search for "TypeScript" after "React" and the React results may remain visible during the request. The transition label needs to explain that, too. For this example, I've left the option out of the full component so the result and the submitted filter always correspond once data is displayed.

Placeholder data is temporary observer data, not a successful response cached for the new key. It also isn't a guarantee that the previous page stays visible if the new request ultimately fails.

## Saving a Book With a Mutation

Reading and writing need different behavior. A query observes data; a mutation performs an operation when we ask it to.

Add the update function to `books.api.ts`, reusing `isBook`:

```typescript
export type UpdateBookInput = { id: string; title: string };

export async function updateBook({ id, title }: UpdateBookInput): Promise<Book> {
  const response = await fetch(`/api/books/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Could not save the book.");
  const data: unknown = await response.json();
  if (!isBook(data)) throw new Error("Unexpected saved book response.");
  return data;
}
```

Then define a mutation hook:

```typescript
// features/catalog/useUpdateBook.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBook } from "./books.api";
import { bookKeys } from "./book.queries";

export function useUpdateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBook,
    onSuccess: async (savedBook) => {
      queryClient.setQueryData(bookKeys.detail(savedBook.id), savedBook);
      await queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}
```

Calling the hook doesn't save anything. We call `mutate` from the interaction that should save.

The response contains the complete saved book, so we can put it directly in its detail entry. This doesn't automatically update every list containing that book. TanStack Query doesn't normalize our entities across unrelated keys for us.

A changed title can affect search membership and ordering, so we invalidate the list family and let the server recalculate it. Manually replacing a title in every cached page wouldn't necessarily put the book in the right page.

## Back to the Title That Wouldn't Change

`invalidateQueries` marks matching queries stale. By default, matching active queries refetch in the background. Inactive matches are marked stale and normally fetch when used again, rather than all being downloaded immediately.

Our prefix matches all catalog list filters while leaving detail entries alone. This is the missing connection from the opening example: a successful PATCH now causes the active catalog to ask for a new result.

If book 42 no longer matches "React", it disappears from that search after the refresh. That's correct. Updating its title in place would have left a book in a result where it no longer belonged.

Returning or awaiting the invalidation promise from `onSuccess` keeps the mutation pending while that callback completes. It's useful when the interface should wait for active lists to refresh before enabling another save.

A successful save and a successful refresh are still separate events. With the default invalidation error behavior, a failed refetch doesn't turn a completed server write into a failed write. Keep the list's refresh error visible instead of telling the user the save never happened.

Also, invalidation isn't communication between browsers. Another user's save needs a later refetch, polling or a server event if our screen should learn about it.

## Wiring Up the Editor

The editor starts with the selected book's title and submits the draft through `mutate`:

```tsx
import { useState } from "react";
import type { Book } from "./books.api";
import { useUpdateBook } from "./useUpdateBook";

export function BookEditor({ book }: { book: Book }) {
  const [title, setTitle] = useState(book.title);
  const mutation = useUpdateBook();

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!title.trim() || mutation.isPending) return;
      mutation.mutate({ id: book.id, title: title.trim() });
    }}>
      <label>
        Title
        <input value={title} disabled={mutation.isPending}
          onChange={(event) => {
            setTitle(event.target.value);
            mutation.reset();
          }} />
      </label>
      <button disabled={mutation.isPending || !title.trim()}>
        {mutation.isPending ? "Saving..." : "Save"}
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message} Your draft is still here.</p>}
      {mutation.isSuccess && <p role="status">Saved.</p>}
    </form>
  );
}
```

The parent can store the book passed by `onEdit` as the initial editor snapshot and render `<BookEditor key={selectedBook.id} book={selectedBook} />`. That snapshot is a deliberate starting point for a draft, not another cache to keep synchronized.

Using the ID as a key resets the draft when selecting a different book. Switching away discards unsaved edits in this version; add an explicit confirmation if the product needs it.

A background refresh shouldn't silently overwrite text someone is typing. Keeping the draft independent is intentional. Handling edits from another user may need server version checks or a conflict message, and no cache library can choose that policy for us.

`mutate` is convenient for event handlers. If you use `mutateAsync` to await a larger workflow, handle its rejected promise with `try/catch`.

## Making an Update Feel Immediate

Saving currently leaves us waiting for the PATCH and the list refresh. During that wait, we can preview the submitted title and mark it as unconfirmed. That's an optimistic update scoped to one piece of the interface.

Add this inside `BookEditor`, before its return:

```tsx
const previewTitle = mutation.isPending
  ? mutation.variables.title
  : mutation.isSuccess
    ? mutation.data.title
    : book.title;
```

Then render this alongside the form fields:

```tsx
<p aria-live="polite">
  Preview: {previewTitle}
  {mutation.isPending && " (waiting for confirmation)"}
</p>
```

During the request, it previews the submitted title. Success uses the server's response, including any normalization. On failure, the preview falls back to the supplied book snapshot and the draft stays in the input for another attempt.

This doesn't optimistically change the catalog or detail cache. Only this editor needs the preview, so that scope is useful. The earlier mutation still reconciles the cache after success.

If several components need the optimistic value, cache updates are another option. The usual approach is to cancel relevant queries, snapshot the previous data in `onMutate`, update it immutably with `setQueryData`, restore the snapshot in `onError`, and invalidate after settlement.

The troublesome case is two edits to the same book. The first snapshots "React Basics", the second previews "Advanced React", then the first fails and restores its snapshot. We've just erased the second preview. Disabling this editor during submission prevents repeat saves here, but doesn't coordinate a second editor elsewhere.

That's why the catalog in this article waits for the server result. Reproducing its sorting, filtering and concurrent edits in the browser would be quite a detour from fixing our stale title.

## A Note About the Request We Left Behind

Our query forwards the provided `AbortSignal` to `fetch`. That allows TanStack Query cancellation to stop the request when appropriate, rather than leaving the network work disconnected from the query lifecycle.

Submit one search, then another before the first finishes. With the signal connected, a request whose query becomes unused can be cancelled. Without consuming it, that request can finish and populate its cache entry. Either way, the different search keys keep the results separate.

Cancelling a read doesn't undo a server write. Closing the editor while a PATCH is in flight isn't a reliable way to reverse it.

## Reproduce the Original Bug Before Moving On

Open a filtered catalog, edit one of its titles so it no longer matches, and save. Keep the network panel open. You should see the PATCH followed by the active list's GET, and then the row should disappear from that search. No browser refresh.

If that doesn't happen, check the keys first. The optional React Query Devtools show the actual cache entries and which have observers. Compare the list key with the prefix passed to invalidation. Also check that both hooks sit under the same client.

Then try the less pleasant case: let the PATCH succeed and make the following GET fail. The editor should report a saved book while the catalog explains that its refresh failed. That combination looks odd the first time, but it tells the truth about the two requests.

Those two flows are worth keeping as integration tests. Give each test a fresh `QueryClient`, disable retries for predictable failure timing, and mock the HTTP responses. Test the visible result rather than asserting that a particular hook called another function.

## The Save and the Screen Now Agree

The title wasn't stuck because React couldn't render it. The list was still reading a valid cache entry containing an older response. Our save handler had never told that entry it needed refreshing.

Now the relationship is visible in `useUpdateBook`: store the returned detail, invalidate the list family, and wait for the active lists to refresh. The editor owns the draft; the query cache owns the fetched results.

The next time a save succeeds but a screen looks wrong, there's a concrete place to look: which query is that screen reading, and what happened to it after the write? That question gets us further than adding another refresh callback to the page.

## References

- [Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults): freshness, inactive cache retention and the default retry behavior discussed after the first list example.
- [Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys): how key values identify queries, including serializable objects and request dependencies.
- [Paginated Queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries): the `keepPreviousData` helper and `isPlaceholderData` used in the optional pagination change.
- [Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation): prefix matching and the default refetch behavior behind the title-update fix.
- [Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates): the distinction between displaying mutation variables locally and changing cached data with rollback.
- [Query Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation): what consuming the supplied `AbortSignal` changes when a query becomes unused.
