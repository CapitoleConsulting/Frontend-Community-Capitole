---
title: "Zustand: Setup"
description: "Complete guide to setup Zustand in React with TypeScript, with stores, selectors, middleware and practical examples."
sidebar.order: 4
---

# Zustand: Setup guide to manage state with almost no boilerplate

Before getting into the practical setup, I want to start with the idea that makes **Zustand** so attractive: it does not try to force a huge architecture on top of your application.

If you've worked with **Redux**, you already know the feeling of creating slices, actions, selectors, providers, middleware configuration, and sometimes sagas just to manage a piece of state that is not even that complex. That structure is extremely powerful when the application really needs it, but many times it feels like we're paying the architectural cost too early.

**Zustand** goes in the opposite direction. It gives us a tiny API, lets us create stores as hooks, and allows components to subscribe only to the part of the state they actually need. No `Provider`, no `dispatch`, no reducers unless we decide to model things that way ourselves.

And that's exactly why I like it so much: **it feels like global `useState`, but with selectors, actions, middleware and a much better scaling story**.

---

## What is Zustand?

**Zustand** is a lightweight state management library for **React**. Its core idea is very simple:

- You create a store with `create`.
- That store becomes a hook.
- Components consume the hook with selectors.
- Actions live inside the store and modify the state.

The smallest possible example looks like this:

```typescript
import { create } from "zustand";

type CounterStore = {
  count: number;
  increment: () => void;
};

export const useCounterStore = create<CounterStore>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

And from any component:

```tsx
const count = useCounterStore((state) => state.count);
const increment = useCounterStore((state) => state.increment);
```

That's it. No provider wrapping the app, no action creators, no reducer switch, no extra ceremony.

This does not mean Zustand is only useful for small examples. It means the entry point is extremely small, and then we can add structure as the application asks for it.

---

## Installation

We'll assume we already have a **React** application initialized with **TypeScript**.

```bash
npm install zustand
```

That gives us the base package, the React bindings, and the official middleware utilities we'll use later.

---

## Recommended Directory Structure

Zustand is not strict about structure, and that's both one of its biggest advantages and one of the things that can become dangerous if we don't agree on conventions.

For small applications, I usually prefer something very direct:

```txt
src/
├── hooks/
│   └── useSyncFocusTitle.ts
├── stores/
│   └── focus.store.ts
├── App.tsx
└── main.tsx
```

For larger applications, I would normally organize stores by domain or feature. There is no universal rule here. The important thing is avoiding a giant `global.store.ts` with everything inside. That is the fastest way to turn Zustand into a messy Redux without the useful conventions of Redux.

In my opinion, **Zustand works best when stores are small, focused and named after the problem they solve**.

---

## Example: A Focus Board

To make the examples easier to follow, we'll use a small focus board: blocks of work with a title, an estimated duration, a completed state, filters, derived progress and persistence in `localStorage`. It is small enough to understand quickly, but with enough features to show state, actions, selectors, derived state and middleware.

---

## Defining the Store Types

First, we define the domain types:

```typescript
export type FocusBlock = {
  id: string;
  title: string;
  minutes: number;
  done: boolean;
};

export type FocusFilter = "all" | "pending" | "done";
```

Then, I like separating the state from the actions:

```typescript
type FocusState = {
  blocks: FocusBlock[];
  activeFilter: FocusFilter;
  hydrated: boolean;
};

type FocusActions = {
  addBlock: (title: string, minutes: number) => void;
  toggleBlock: (blockId: FocusBlock["id"]) => void;
  removeBlock: (blockId: FocusBlock["id"]) => void;
  clearDone: () => void;
  setFilter: (filter: FocusFilter) => void;
  resetBoard: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export type FocusStore = FocusState & FocusActions;
```

This is not mandatory, but I find it much clearer. The state represents what the store knows, and the actions represent what the rest of the application is allowed to do with it.

That last part is important: **components should not be deciding how the state changes internally**. Components should call actions with clear names.

---

## Creating the Store

The basic store starts with `create`:

```typescript
import { create } from "zustand";

export const useFocusStore = create<FocusStore>()((set) => ({
  blocks: initialBlocks,
  activeFilter: "all",
  hydrated: false,

  addBlock: (title, minutes) =>
    set((state) => ({
      blocks: [...state.blocks, createBlock(title, minutes)],
    })),

  toggleBlock: (blockId) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === blockId ? { ...block, done: !block.done } : block,
      ),
    })),
}));
```

Notice how direct this is. We define the state and the actions in the same place, and `set` receives either an object or a function with the current state.

There is no `dispatch`. The action itself is just a function. This is one of the reasons I enjoy using Zustand: **the code reads very close to the business intention**.

---

## Middleware: Persist, DevTools and Subscribe

Zustand has official middleware that we can compose around the store. The three I use most often are:

- `persist`: to store part of the state in `localStorage`.
- `devtools`: to inspect actions in Redux DevTools.
- `subscribeWithSelector`: to subscribe to specific slices of state outside React.

```typescript
import {
  createJSONStorage,
  devtools,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
```

The setup looks like this:

```typescript
export const useFocusStore = create<FocusStore>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        blocks: initialBlocks,
        activeFilter: "all",
        hydrated: false,

        addBlock: (title, minutes) => set(
          (state) => ({ blocks: [...state.blocks, createBlock(title, minutes)] }),
          false,
          "focus/addBlock",
        ),
      })),
      {
        name: "zustand-focus-board",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          activeFilter: state.activeFilter,
          blocks: state.blocks,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
      },
    ),
    { name: "FocusStore" },
  ),
);
```

There are several important details here.

`partialize` lets us decide what part of the store should be persisted:

```typescript
partialize: (state) => ({
  activeFilter: state.activeFilter,
  blocks: state.blocks,
}),
```

We don't want to persist everything. Actions do not need to be stored, and the `hydrated` flag is just runtime information.

The third argument we pass to `set`, like `"focus/addBlock"`, is the action name that appears in Redux DevTools. This gives us traceability without adopting the entire Redux architecture.

---

## Selectors

Selectors are functions that receive the full store and return only the data we need.

```typescript
export const selectBlocks = (state: FocusStore) => state.blocks;
export const selectActiveFilter = (state: FocusStore) => state.activeFilter;
export const selectIsHydrated = (state: FocusStore) => state.hydrated;
```

Then we use them in components:

```tsx
const blocks = useFocusStore(selectBlocks);
```

This is very important for performance. A component should not subscribe to the whole store if it only needs one value. It's one of those things that sounds obvious when you read it, but it's easy to forget when you're moving fast.

We can also create selectors with filtering logic:

```typescript
export const selectVisibleBlocks = (state: FocusStore) => {
  if (state.activeFilter === "pending") {
    return state.blocks.filter((block) => !block.done);
  }

  if (state.activeFilter === "done") {
    return state.blocks.filter((block) => block.done);
  }

  return state.blocks;
};
```

And consume them directly:

```tsx
const blocks = useFocusStore(selectVisibleBlocks);
```

The component will re-render when the selected value changes, not when any random value in the store changes.

---

## Derived Selectors

Just like in Redux or Jotai, we often need values that can be calculated from existing state.

In this case, we don't store `progress` directly. We calculate it from the block list.

```typescript
export const selectTotalMinutes = (state: FocusStore) =>
  state.blocks.reduce((total, block) => total + block.minutes, 0);

export const selectDoneMinutes = (state: FocusStore) =>
  state.blocks.reduce(
    (total, block) => total + (block.done ? block.minutes : 0),
    0,
  );

export const selectProgress = (state: FocusStore) => {
  const totalMinutes = selectTotalMinutes(state);

  if (totalMinutes === 0) {
    return 0;
  }

  return Math.round((selectDoneMinutes(state) / totalMinutes) * 100);
};
```

This is a good general rule: **if a value can be derived from existing state, don't duplicate it in the store**.

---

## Selectors That Return Objects

Sometimes we want to group several values into a single selector:

```typescript
export const selectFocusSummary = (state: FocusStore) => ({
  activeFilter: selectActiveFilter(state),
  doneMinutes: selectDoneMinutes(state),
  hydrated: selectIsHydrated(state),
  progress: selectProgress(state),
  totalBlocks: selectBlocks(state).length,
  totalMinutes: selectTotalMinutes(state),
});
```

If the selector returns a new object, we should use `useShallow`:

```tsx
import { useShallow } from "zustand/react/shallow";

const summary = useFocusStore(useShallow(selectFocusSummary));
```

Why? Because `selectFocusSummary` returns a new object every time it's called. `useShallow` compares the properties of that object superficially and avoids unnecessary renders when the values have not actually changed.

The same idea works well for grouping actions:

```typescript
export const selectFocusActions = (state: FocusStore) => ({
  addBlock: state.addBlock,
  clearDone: state.clearDone,
  removeBlock: state.removeBlock,
  resetBoard: state.resetBoard,
  setFilter: state.setFilter,
  toggleBlock: state.toggleBlock,
});
```

```tsx
const { addBlock, toggleBlock } = useFocusStore(
  useShallow(selectFocusActions),
);
```

For one action, selecting it directly is perfectly fine: `const addBlock = useFocusStore((state) => state.addBlock)`.

---

## Multiple Stores

One of the biggest philosophical differences between **Redux** and **Zustand** is that Zustand does not force a single store.

In Redux, the standard model is one application store with multiple slices. In Zustand, the natural model is often **multiple focused stores**.

```txt
src/
└── stores/
    ├── auth.store.ts
    ├── focus.store.ts
    ├── theme.store.ts
    └── notifications.store.ts
```

Each store owns a specific problem:

```typescript
export const useThemeStore = create<ThemeStore>()((set) => ({
  mode: "light",
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === "light" ? "dark" : "light",
    })),
}));
```

This is one of the things I like most about Zustand. Instead of building a huge state tree and then slicing it, we can start with small stores and only connect things when there's a real reason.

My recommendation is simple: one store per domain or feature, state and actions typed separately, selectors exported near the store, and not too much communication between stores. If two stores are constantly talking to each other, maybe they are actually one store.

---

## Subscribing Outside React

Zustand stores can be used outside components. This is useful for effects that do not belong to a specific render tree.

```typescript
import { useEffect } from "react";
import { selectProgress, useFocusStore } from "../stores/focus.store";

export function useSyncFocusTitle() {
  useEffect(() => {
    const unsubscribe = useFocusStore.subscribe(
      selectProgress,
      (progress) => {
        document.title =
          progress > 0 ? `Progress ${progress}% | Focus Board` : "Focus Board";
      },
      { fireImmediately: true },
    );

    return () => {
      unsubscribe();
      document.title = "Focus Board";
    };
  }, []);
}
```

This works because we added `subscribeWithSelector`. With it, we can say: "run this callback only when this derived value changes".

I wouldn't abuse this. If something belongs in the UI, keep it in React. But for external synchronization, analytics or browser APIs, it's very clean.

---

## What About Async Logic?

Async logic in Zustand is intentionally simple. Actions can be async functions.

```typescript
export const useBookStore = create<BookStore>()((set) => ({
  books: [],
  isLoading: false,

  fetchBooks: async () => {
    set({ isLoading: true });
    const response = await fetch("/api/books");
    const books = await response.json();
    set({ books, isLoading: false });
  },
}));
```

That's perfectly valid. But here's where I want to stop a second, because this is something that still makes me think.

**I would not use Zustand as my main server-state solution**. For API data, cache, invalidation, retries, refetching, pagination, mutations and all that world, I would reach for **TanStack Query**.

The combination I end up recommending most is:

- **TanStack Query** for server state.
- **Zustand** for client/UI state.

In theory it's a clean separation. In practice, the line is not always obvious. Where does the selected item in a list live, is it UI state or derived from server state? What about filters that need to persist but also influence what you fetch? I've had more than one conversation with teammates about where something belongs, and there's rarely a perfect answer. My rule of thumb: if the data comes from an API and has a lifecycle tied to the server, it's TanStack Query. If it's purely about what the user is doing in the interface at this moment, it's Zustand. When in doubt, start with TanStack Query and only pull something into Zustand when you have a real reason.

That separation keeps responsibilities clean and prevents the Zustand stores from becoming a manual API cache.

---

## Why I Like Zustand

I'll be honest: I've gone back and forth on state management libraries more times than I'd like to admit. Redux felt like too much ceremony for most projects. Context API is fine until it isn't. Jotai is interesting but requires a different mental model. Zustand keeps landing as my default because the things it does well are exactly the things I run into every day.

**Very low boilerplate**: creating a store is fast and the code is easy to read.

**No Provider needed**: the store is a hook and can be consumed directly from anywhere.

**Great performance model**: components subscribe to selected slices, not the entire store. This is the same point I made in the selectors section, but it's worth repeating because it's what prevents the subtle performance problems you don't notice until the app gets bigger.

**Multiple stores by design**: very comfortable for feature-oriented architecture. One store per domain, small and focused.

**Good middleware**: persistence, devtools and selector subscriptions cover most real use cases without needing extra packages.

The main thing to watch out for is that Zustand's flexibility can work against you if the team doesn't agree on conventions. It's easy to end up with inconsistent stores if everyone structures things differently. That's not a problem with the library, it's just something you have to manage intentionally.

---

## Conclusion

**Zustand is probably my favorite option for client-side state management in React right now**.

Not because it's the most powerful library in every scenario. It isn't. **Redux + Redux Saga** still wins when the application has very complex flows, many teams working in parallel, and a real need for strict architecture. **Jotai** is also extremely interesting when we want a more atomic and reactive model.

But for a huge percentage of real applications, Zustand hits the sweet spot: simple setup, almost no boilerplate, good performance, enough structure if we define it properly, and middleware for the things we usually need.

The important thing is using that simplicity responsibly. Small focused stores, clear actions, selectors for reads, derived values instead of duplicated state, and persistence only where it makes sense.

If I had to start a medium-sized React project today, I'd probably go with **TanStack Query for server state and Zustand for client state**. It's a combination that scales well and lets the team move fast, as long as everyone agrees on where the line between the two sits.