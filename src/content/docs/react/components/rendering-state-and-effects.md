---
title: "React: Rendering, State and Effects"
description: "Understanding React renders, state snapshots, batching, component identity and effects, with practical TypeScript examples."
sidebar:
  order: 1
---

# React: Understanding Rendering, State and Effects

When we are making an application in React, we are really bulding an ecosystem, many libraries, many packages. All useful tools, and all built around something we sometimes rush through when learning React: what actually happens when state changes.

You can configure a store, write selectors and connect an API without having a clear answer to that question. Then a counter refuses to increment, an input loses its value or a `useEffect` starts making requests forever. Suddenly the problem has very little to do with which state library we chose.

I want to spend some time on that part. We'll use small examples, mostly around a book list, and look at what React is doing and why. The examples assume a React application with **TypeScript** already running. There's nothing to install for this one.

## What Does Rendering Actually Mean?

When React renders a function component, it calls the function to calculate the interface we want to show. That's what the JSX describes.

```tsx
function BookHeading({ title }: { title: string }) {
  console.log("Rendering BookHeading");

  return <h2>{title}</h2>;
}
```

Seeing that log means the function ran. It does not necessarily mean React replaced the heading in the browser.

There are two separate pieces here: **rendering**, where React calculates the next UI, and **committing**, where it applies the necessary changes to the DOM. If the heading still says the same thing, there's no text change to apply. The browser then handles displaying the result.

This distinction matters when debugging. Ten logs in the console are not proof that React rebuilt the entire page ten times. They do tell us the component ran, which can still be expensive if we're doing a lot of work inside it. But we need to know what we're measuring before trying to fix it.

Rendering also needs to stay pure. Calculating a filtered list is fine. Sending a request, changing a shared object or subscribing to a socket in the component body is a problem. React can repeat rendering work, and some rendering attempts can be discarded before they reach the DOM. We don't want a discarded attempt to have submitted something to our backend.

The [official explanation of render and commit](https://react.dev/learn/render-and-commit) is a useful reference for these separate stages.

## What Causes a Component to Render?

The first render happens when the component enters the tree. After that, the usual reasons are:

- Its own state updates.
- Its parent renders and React continues into its children.
- A context it consumes changes.
- An external store subscription, such as a selected Redux or Zustand value, reports a change.

The parent case is the one I would pay attention to first:

```tsx
import { useState } from "react";

function BookHeading({ title }: { title: string }) {
  console.log("Rendering BookHeading");
  return <h2>{title}</h2>;
}

export function BookPage() {
  const [notes, setNotes] = useState("");

  return (
    <section>
      <BookHeading title="The Hobbit" />
      <label>
        Notes
        <input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
    </section>
  );
}
```

Typing updates `BookPage`, and in this plain example React also calls `BookHeading`, even though its title has not changed. **A child does not need different props to render again.** It can render because its parent did.

There are ways to skip work, including `memo` and compiler optimizations. They don't change the underlying idea. A memoized component can still render because its own state or a consumed context changed.

Also, setting state to the same value can let React skip an update. React uses `Object.is` for that comparison. This is why mutating an existing object and passing the same reference back is unreliable:

```tsx
// Don't mutate the existing state object.
book.title = "A different title";
setBook(book);

// Create the next version instead.
setBook((current) => ({ ...current, title: "A different title" }));
```

These are alternative snippets inside a component with `book` state. The second one gives React a new object and leaves the previous version intact. The same reasoning applies to arrays: use `map`, `filter` or a spread when updating them, rather than modifying the stored array directly.

## State Is a Snapshot

Let's start with a button that tracks how many books we've read:

```tsx
import { useState } from "react";

export function ReadingCounter() {
  const [readCount, setReadCount] = useState(0);

  function handleRead() {
    setReadCount(readCount + 1);
    console.log(readCount);
  }

  return <button onClick={handleRead}>Books read: {readCount}</button>;
}
```

On the first click, the console shows `0`. The button then displays `1`.

`setReadCount` requests an update. It doesn't rewrite the `readCount` variable in the function that is already executing. That handler belongs to the render where `readCount` was `0`. The next render receives `1` and creates a handler with that value.

This is what React means by a **snapshot**. Each render has its own props, state values and functions. Keeping this in mind is more useful than just saying "state is asynchronous", because waiting doesn't change which snapshot a function captured.

For example, replace the handler with this:

```tsx
function handleRead() {
  setReadCount(readCount + 1);

  setTimeout(() => {
    console.log(readCount);
  }, 2000);
}
```

Click once from zero and wait. It still logs `0`. The timeout callback was created with that render's value. It doesn't go back to React two seconds later and ask for the latest count.

This can be exactly what we want. A delayed confirmation might need to remember which book the user chose when they clicked, even if they select another book before it appears. Capturing an older value only becomes a bug when the operation needs something newer. See [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) for more examples of this behavior.

## Batching and Updating the Same Value Several Times

Now imagine a button to add three finished books at once:

```tsx
function handleReadThree() {
  setReadCount(readCount + 1);
  setReadCount(readCount + 1);
  setReadCount(readCount + 1);
}
```

Starting from zero, this gives us **one**. All three calls read the same snapshot and request the value `1`.

We need updater functions when the next value depends on the pending previous value:

```tsx
function handleReadThree() {
  setReadCount((current) => current + 1);
  setReadCount((current) => current + 1);
  setReadCount((current) => current + 1);
}
```

React processes these in order: `0` becomes `1`, then `2`, then `3`. Each updater receives the result of the previous update in the queue.

Separately, React **batches updates** to avoid committing an intermediate interface after every setter. Multiple state changes in an event handler can be processed together. Modern React roots also support automatic batching in promises and timeouts, so it isn't limited to React click handlers.

That doesn't mean every update across an entire async function belongs to one batch. In particular, don't rely on updates before and after an `await` committing together. Separate intentional clicks are also handled separately.

I use the callback form whenever I'm calculating from the previous state. For a replacement like `setSelectedBookId(book.id)`, the direct value is perfectly clear.

One more detail: **updater functions must be pure**. Don't send a request or show a notification inside `setReadCount((current) => ...)`. React may call updaters twice during development checks. Keep the updater responsible for returning the next state. The [update queue guide](https://react.dev/learn/queueing-a-series-of-state-updates) explains how replacement values and updater functions interact.

## What Should Actually Be State?

Let's go back to the book list. We want a search input and a matching count.

It's easy to create state for the books, the search, the filtered books and the count. Then add effects to keep everything synchronized. It works until one path updates a value and forgets the others.

I'd start with this:

```tsx
import { useState } from "react";

type Book = {
  id: string;
  title: string;
  author: string;
};

export function BookList({ books }: { books: Book[] }) {
  const [search, setSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const visibleBooks = books.filter((book) =>
    book.title.toLowerCase().includes(query),
  );
  const selectedBook = books.find((book) => book.id === selectedBookId);

  return (
    <section>
      <label>
        Search books
        <input value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <p>{visibleBooks.length} books found</p>
      <ul>
        {visibleBooks.map((book) => (
          <li key={book.id}>
            <button onClick={() => setSelectedBookId(book.id)}>
              {book.title}
            </button>
          </li>
        ))}
      </ul>
      {selectedBook && <p>Selected: {selectedBook.title}</p>}
    </section>
  );
}
```

The user gives us `search` and `selectedBookId`. Everything else comes from those values and the `books` prop. If the parent sends an updated title, the selected book's title updates too. We haven't stored a second copy that can become outdated.

This is the same reasoning behind the derived selectors in the Zustand article and derived atoms in Jotai. **If we can calculate a value from the current inputs, we usually don't need separate state for it.**

Filtering happens on each render here. That's fine for an ordinary small list. If it becomes expensive, measure it and consider `useMemo`. Memoization can avoid repeating a calculation; it doesn't make the calculated result a new source of truth.

There are valid exceptions. An editable draft may deliberately start with a book's title and then diverge from it. That is independent state because the user can change it without changing the saved book. Which brings us to another behavior that can be confusing.

## Component Identity: Why Is My Draft Still There?

Consider this editor, using the `Book` type above:

```tsx
import { useState } from "react";

function BookNotes({ book }: { book: Book }) {
  const [draft, setDraft] = useState("");

  return (
    <label>
      Notes for {book.title}
      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
    </label>
  );
}
```

The parent renders it like this:

```tsx
{selectedBook && <BookNotes book={selectedBook} />}
```

Write a note for one book, then switch directly to another. The title changes, but the note remains.

React still sees the same component type in the same position under the same parent. Different props don't automatically create a new component instance. React preserves its state.

Likewise, `useState(book.title)` would only use that prop for initialization. It wouldn't reset the draft every time the prop changes.

If our intention is a fresh editor whenever the selected book changes, we can express that with a `key`:

```tsx
{selectedBook && (
  <BookNotes key={selectedBook.id} book={selectedBook} />
)}
```

Now a different book ID means a different identity. React removes the previous editor and mounts a new one, resetting its state and running the relevant cleanup and setup work.

Be careful with what that means for the product: switching away discards the draft. Returning to the first book won't restore it. If drafts should survive navigation between books, keep them higher up, indexed by book ID. A key isn't a cache.

## Keys Are Doing More Than Removing a Warning

In a list, stable keys let React associate a component with the same item when siblings move:

```tsx
{books.map((book) => (
  <BookNotes key={book.id} book={book} />
))}
```

If we reorder these books, each editor can keep the draft belonging to its book. With `key={index}`, identity follows the position instead. Insert a book at the beginning and an existing draft can appear next to the wrong title.

Random keys have the opposite problem. `key={Math.random()}` changes on every render, so React keeps creating new instances. Inputs can lose focus and local state disappears.

Keys only need to be unique among siblings, and React doesn't pass `key` as a normal prop. Also, the component type and parent still matter. Moving a keyed component to a different parent doesn't guarantee preservation.

For the same reason, avoid defining a component function inside another component. That creates a new type on every parent render. Put `BookNotes` at module scope, as we've done here.

The [guide to preserving and resetting state](https://react.dev/learn/preserving-and-resetting-state) goes deeper into how type, position and keys work together.

## So What Is useEffect For?

At this point we've handled filtering, selection, counters and resetting an editor without an effect.

`useEffect` becomes useful when the component needs to **synchronize with something outside React**: a browser event listener, a connection, a timer, a third-party widget. These things have their own behavior beyond the JSX we return.

For example, suppose our book panel should close when the user presses Escape:

```tsx
import { useEffect } from "react";

export function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
}
```

Call this hook at the top level of the panel component. While the panel is mounted, it listens to the browser. When it goes away, it stops listening.

Effects run on the client after a commit. They don't run during server rendering. They also aren't a general "the browser has definitely painted" callback, since timing relative to paint can vary for interaction-driven updates. For this listener, that distinction doesn't affect our implementation.

I find it useful to describe each effect in terms of the connection it maintains. Here it's "this panel listens for Escape using the current close handler". That gives us a concrete reason for both the setup and the dependency. See [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects).

## Cleanup Happens Before the Next Setup Too

The function returned from an effect is its cleanup. It isn't only for unmounting.

In our example, if `onClose` changes, React first removes the listener installed by the previous effect, then installs one using the new handler. When the panel unmounts, React removes the final listener.

Each cleanup closes over the values from its own setup. That's why `removeEventListener` receives the same `handleKeyDown` function that was originally registered.

For a timer, cleanup clears the timer. For a subscription, it unsubscribes. For fetching, cleanup needs to prevent obsolete results from affecting the current screen, often by aborting the request or ignoring its response. A request for book A can finish after a request for book B, even if A started first. Leaving both free to update the same detail view is a race condition.

With **Strict Mode at the root**, React also performs an extra setup and cleanup cycle for effects during development. The listener example survives that because it removes what it adds. If we forget cleanup, duplicate listeners make the problem visible.

Disabling Strict Mode can hide the symptom. I'd check the cleanup first. A "has already run" ref used to skip setup can also hide the bug and leave the component without its subscription after cleanup.

## Dependencies Aren't a Schedule We Choose

The dependency array tells React which reactive values the effect uses. Props, state and functions declared in the component can all be dependencies.

In the Escape example, removing `onClose` from the array doesn't make the hook more efficient in a useful way. It means the listener can keep calling an old callback after the component receives a new one.

The common forms are:

- No array: setup runs after every commit of the component, with cleanup before subsequent setups.
- `[]`: no reactive dependencies, but setup still happens on mounting and participates in development checks.
- `[onClose]`: setup runs initially and again when that dependency changes.

React compares each dependency with `Object.is`. Objects and functions created during rendering have new identities, which can explain an effect running more often than expected.

For example, this object doesn't need to exist outside the effect:

```tsx
// Inside a component that receives bookId and uses an imported subscribeToBook.
useEffect(() => {
  const subscription = subscribeToBook({ bookId });
  return () => subscription.unsubscribe();
}, [bookId]);
```

`subscribeToBook` here represents our application's subscription API. Creating its options inside the effect keeps the actual dependency clear. We don't need to memoize an options object just to stop it changing on every render.

Keep the hooks linter enabled. When it asks for a dependency, look at what the effect reads before deleting the warning. The [dependency guide](https://react.dev/learn/removing-effect-dependencies) has useful examples of restructuring effects when dependencies feel awkward.

## Stale Closures, With a Timer That Gets Stuck

A closure is a function retaining access to the values from where it was created. We've already seen one in the delayed console log.

Here's a broken reading timer inside a component with `seconds` state:

```tsx
useEffect(() => {
  const intervalId = window.setInterval(() => {
    setSeconds(seconds + 1);
  }, 1000);

  return () => window.clearInterval(intervalId);
}, []);
```

If `seconds` starts at zero, that callback keeps requesting `1`. It captured zero, and we've told the effect it has no dependencies. The linter should complain about the missing `seconds` dependency.

We could add it and recreate the interval after every tick. But we don't need to read `seconds` from the closure at all:

```tsx
import { useEffect, useState } from "react";

export function ReadingTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return <p>Reading ticks: {seconds}</p>;
}
```

The updater receives the pending state, so this interval can stay installed. The state setter has a stable identity and doesn't need to be added to this array.

This counts timer callbacks, by the way. Browsers can delay intervals, especially in background tabs. An accurate elapsed-time display would calculate from timestamps instead.

Sometimes a callback really needs to read changing information without recreating a subscription. A ref can hold a mutable value, but updating it doesn't cause a render. I wouldn't reach for refs automatically to silence dependency warnings. First check whether an updater, a correctly declared dependency or splitting the effect solves the actual problem.

## Events and Effects Have Different Jobs

Suppose we want to save the user's notes. Our application provides an async `saveNotes` function, and the component has `bookId`, `draft`, `isSaving` and `error` state.

The save belongs in the submit handler:

```tsx
async function handleSave() {
  setIsSaving(true);
  setError(null);

  try {
    await saveNotes(bookId, draft);
  } catch {
    setError("Could not save your notes. Please try again.");
  } finally {
    setIsSaving(false);
  }
}
```

Connect it to a button disabled while saving and show `error` in the form. Clicking Save causes the operation. The handler uses the book and draft from that interaction, even if the user edits something while the request is running.

An effect watching a `shouldSave` flag would add another render and another piece of state just to reach the same request. It also makes the cause harder to follow. For a normal explicit Save action, I prefer keeping the request next to the interaction.

An autosave feature would be a different requirement. Then we'd intentionally synchronize the changing draft with the server, with decisions about debouncing, failures and overlapping saves. The fact that both features send a request doesn't mean they belong in the same place.

The same distinction helps with derived data. An effect that watches `books` and `search` just to call `setFilteredBooks` is maintaining a second copy of something we already know how to calculate. Our earlier list example doesn't need that extra step. React's [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) is worth reading when a component starts accumulating this kind of synchronization.

## Where This Leaves Our State Libraries

The selectors in Redux and Zustand, and the atoms in Jotai, help decide which data a component subscribes to. They don't remove the rest of React's rendering behavior. A component with a very narrow selector can still render because its parent rendered.

The same applies to effects. Moving a value into a store doesn't make a callback stop capturing the values it received during rendering. And adding another store won't fix two copies of the same data getting out of sync.

When something behaves strangely, I'd follow the value through the component first: where it comes from, which render created the callback, whether the component kept its identity, and what each effect is synchronizing. Those questions usually give us somewhere concrete to look.

Once that part is clear, the [state management comparison](../../state-management/) is a useful next step. Choosing how to share state gets much easier when we already know what React will do with it.
