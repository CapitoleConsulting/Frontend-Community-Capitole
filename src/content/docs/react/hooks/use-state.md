---
title: useState
description: Manage local component state safely with React's useState Hook.
---

# `useState`: Managing Local State

`useState` lets a component remember information between renders. It is the
default choice for local interactive state such as form fields, toggles,
selected items, and temporary UI state.

```tsx
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

The call returns a pair:

1. The current state value.
2. A setter that schedules the next value and a re-render.

Call `useState` at the top level of a component or custom Hook. Do not call it
inside conditions, loops, event handlers, or nested functions.

## Choose the smallest state

State should contain the minimum information that can change over time.
Anything that can be calculated from props, state, or query data should usually
be calculated during render instead of stored separately.

```tsx
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");

// Good: derived during render.
const fullName = `${firstName} ${lastName}`.trim();

// Avoid: a second `fullName` state synchronized by an effect.
```

Duplicated state can become inconsistent. If two values always change
together, consider storing them in one state object or using `useReducer`.
If state is needed by sibling components, lift it to their closest common
parent rather than immediately introducing a global store.

## Initial state and lazy initialization

The initial value is used when the component is first mounted. Later renders
do not reset state just because the `initialState` expression produces a
different value.

```tsx
const [page, setPage] = useState(1);
```

For an expensive initial calculation, pass an initializer function. React
calls it to calculate the initial value rather than requiring the calculation
on every render:

```tsx
const [draft, setDraft] = useState(() => loadDraftFromStorage());
```

The initializer must be pure. It must not perform a request, mutate shared
data, or depend on a side effect. In development `StrictMode`, React may call
initializer functions more than once to help reveal accidental impurities.

When state should be reset because the identity of an item changes, use a
stable `key` at the appropriate boundary instead of manually mirroring props:

```tsx
<Editor key={document.id} document={document} />
```

## State is a snapshot

Calling a setter does not change the state variable in the current render.
It requests a new render. Event handlers keep the snapshot from the render in
which they were created:

```tsx
function Example() {
  const [message, setMessage] = useState("Before");

  function handleClick() {
    setMessage("After");
    console.log(message); // "Before"
  }

  return <button onClick={handleClick}>{message}</button>;
}
```

React generally batches state updates from the same event. Do not rely on a
setter being synchronous or read the variable immediately after setting it to
obtain the next value.

## Use updater functions for dependent updates

When the next value depends on the previous value, pass a function to the
setter. This is essential when making multiple updates in one event or when an
update may be scheduled later:

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  function incrementThreeTimes() {
    setCount((current) => current + 1);
    setCount((current) => current + 1);
    setCount((current) => current + 1);
  }

  return (
    <button type="button" onClick={incrementThreeTimes}>
      {count}
    </button>
  );
}
```

Using `setCount(count + 1)` three times would calculate the same next value
from the current render's snapshot.

## Update objects and arrays immutably

State objects and arrays should be treated as read-only snapshots. Create a
new object or array when updating them so React can detect the change by
reference:

```tsx
type Profile = {
  name: string;
  email: string;
};

const [profile, setProfile] = useState<Profile>({
  name: "",
  email: "",
});

function handleNameChange(name: string) {
  setProfile((current) => ({ ...current, name }));
}
```

For arrays, use non-mutating operations such as `map`, `filter`, and spread:

```tsx
setTasks((current) =>
  current.map((task) =>
    task.id === taskId ? { ...task, completed: !task.completed } : task,
  ),
);

setTasks((current) => current.filter((task) => task.id !== taskId));
```

Avoid `push`, `pop`, `splice`, direct property assignment, and sorting the
existing state array in place. Mutating the existing value and passing the same
reference back can prevent the update from being detected and can corrupt the
snapshot used by another render.

For deeply nested updates, use a reducer or an established immutable update
utility when it makes the update clearer.

## Store one value or several values?

Separate state variables are useful when values change independently:

```tsx
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState("");
```

An object is useful when fields represent one coherent value, but update it
with a functional update and preserve fields that did not change:

```tsx
const [form, setForm] = useState({
  email: "",
  password: "",
});

setForm((current) => ({ ...current, email: nextEmail }));
```

`useState` does not merge object state automatically. Calling
`setForm({ email: nextEmail })` replaces the whole object and removes
`password`.

## Common use cases

### Controlled form fields

```tsx
function SearchBox({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label>
        Search
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button type="submit">Search</button>
    </form>
  );
}
```

### UI state

Use local state for values such as whether a menu is open, which tab is
selected, or whether a disclosure is expanded. Keep transient UI state close
to the component that renders it.

### Optimistic local interaction

For a small interaction, state can temporarily represent the UI while an
operation is pending. For server state shared across screens, use the
established query or data layer instead of building a cache with `useState`.

## Common mistakes

### Mirroring props unnecessarily

```tsx
// Usually wrong: this value can be read directly from props.
function Heading({ title }: { title: string }) {
  const [currentTitle] = useState(title);
  return <h1>{currentTitle}</h1>;
}
```

This only uses the first `title` value and will not follow later prop changes.
Render `title` directly, or make the component an intentionally editable
draft with a documented reset or synchronization rule.

### Setting state during render

Calling a setter unconditionally in the component body causes an infinite
render loop. Event handlers, reducers, and carefully justified effects are
the appropriate places for updates.

### Using state for derived values

Do not add state and an effect for a filtered list, total, or formatted label
that can be calculated from existing inputs. This adds an unnecessary render
and creates another synchronization path.

### Expecting a setter to return the next state

Setters return `undefined`. If an event needs the next value, calculate it
locally and use it for both the update and the action:

```tsx
function handleChange(nextQuery: string) {
  setQuery(nextQuery);
  trackSearchInput(nextQuery);
}
```

### Sharing state through module variables

Module-level mutable variables are not component state. They are shared by
every instance, do not trigger re-renders, and can produce surprising results
with server rendering or multiple mounted instances.

## When `useState` is not the right tool

- Use props when a parent owns the value.
- Use `useReducer` when transitions are numerous, related, or easier to
  describe as actions.
- Use context when a value must be available deeply without passing props
  through every layer. Context does not replace thoughtful state ownership.
- Use a query library for server state, caching, synchronization, and request
  lifecycles.
- Use an external store when state must be shared across unrelated parts of
  the application and local state or context is no longer appropriate.
- Use a ref for a mutable value that should persist between renders without
  causing a render, such as an interval ID or DOM node.

## Review checklist

- [ ] The state represents a value that genuinely changes over time.
- [ ] Derived values are calculated instead of duplicated in state.
- [ ] Updater functions are used when the next value depends on previous state.
- [ ] Objects and arrays are updated without mutation.
- [ ] Initializers are pure, and expensive initialization is lazy.
- [ ] State is owned by the nearest component that needs to coordinate it.
- [ ] Loading and error state is explicit for asynchronous interactions.
- [ ] The chosen tool fits the state: local UI, server data, URL, or shared
      application state.

## References

- [useState API reference](https://react.dev/reference/react/useState)
- [Adding Interactivity](https://react.dev/learn/adding-interactivity)
- [State: A Component's Memory](https://react.dev/learn/state-a-components-memory)
- [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- [Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
