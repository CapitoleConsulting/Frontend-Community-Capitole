---
title: Guidelines
description: Practical React guidelines based on the official documentation and this project's conventions.
---

# React Guidelines

These guidelines describe the default way we build React applications in this
repository. They complement the more focused [architecture](../architecture/),
[components](../components/), [patterns](../patterns/), and
[state management](../state-management/) articles.

The guiding idea is to keep rendering predictable, state ownership explicit,
and components easy to test and compose. Prefer the simplest React feature that
solves the problem; add an abstraction only when it removes repeated
complexity.

## Start with the React way of thinking

When implementing a screen or feature:

1. Break the design into a component hierarchy.
2. Build a static version from props and existing data.
3. Identify the smallest set of values that must change over time.
4. Keep each piece of state in the closest common parent of the components
   that use it.
5. Derive the rest during render instead of storing duplicate state.
6. Add event handlers and effects only where interaction or synchronization
   requires them.

This keeps the data flow one-way: parents provide props, children communicate
through callbacks, and external data enters through an explicit boundary.

## Components and JSX

- Use function components and name them with `PascalCase`.
- Keep a component focused on one part of the UI or one user-facing
  responsibility. Split a component when its markup, state, or behavior
  becomes difficult to understand or test.
- Treat JSX as a description of the UI, not as a place for imperative
  instructions. Prefer clear conditional rendering and small helper
  functions over deeply nested expressions.
- Use semantic HTML elements before adding custom behavior. A `button` is
  preferable to a clickable `div`; a `nav`, `main`, `form`, or `dialog`
  communicates intent to browsers and assistive technology.
- Pass data and behavior through typed props. Keep a component's public API
  small and stable.
- Do not call components as ordinary functions. Render them with JSX so React
  can manage their identity and lifecycle:

  ```tsx
  // Good
  <UserCard user={user} />

  // Avoid
  UserCard({ user })
  ```

## Keep rendering pure

React may render a component more than once, in a different order, or without
committing the result. A component and its hooks must therefore be
idempotent: the same inputs should produce the same output.

- Do not perform side effects during render. Do not fetch, subscribe, write to
  browser storage, mutate the DOM, or modify module-level values from the
  component body.
- Treat props, state, hook arguments, and values already passed to JSX as
  immutable. Create a new array or object when updating data.
- Use event handlers for actions caused by a user interaction.
- Use an effect only to synchronize React with an external system, such as a
  browser API, subscription, timer, or non-React widget. If there is no
  external system, the effect is probably unnecessary.
- Keep development `StrictMode` enabled. It intentionally exposes impure
  rendering and incomplete effect cleanup.

```tsx
// Derived data belongs in render.
const visibleItems = items.filter((item) => item.name.includes(query));

// Avoid storing `visibleItems` in state and synchronizing it with an effect.
```

## State, props, and data flow

- Use props for inputs owned by a parent and state for values a component owns
  and updates.
- Keep state as local as possible. Lift it only when sibling components need
  to coordinate, and avoid putting every value in a global store.
- Store the minimal source of truth. Compute filtered lists, totals, labels,
  and other derived values from props, state, or query data.
- Do not mirror props in state unless intentionally creating an editable
  draft with a clear synchronization policy.
- Prefer a single state object only when the values change together; otherwise
  use separate state variables with meaningful names.
- Use a reducer when a component has several related transitions or complex
  update rules. Keep the reducer pure.
- Use stable, domain-specific keys when rendering collections. Do not use the
  array index when items can be inserted, removed, reordered, or filtered.

```tsx
{projects.map((project) => (
  <ProjectRow key={project.id} project={project} />
))}
```

## Hooks

Follow the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks):

- Call hooks only at the top level of a component or custom hook, never inside
  conditions, loops, callbacks, or nested functions.
- Name custom hooks with the `use` prefix and give them one clear purpose.
- Keep custom hooks focused on reusable stateful behavior, not arbitrary
  component markup.
- Declare every reactive value used by an effect, memo, or callback in its
  dependency list. Do not silence the hooks linter to make an effect run once.
- Prefer removing an unnecessary effect over adding memoization or suppressing
  dependencies.
- Use `useMemo` and `useCallback` only when they address a measured
  performance problem or preserve a required identity for a memoized child or
  external API. They are not default optimizations.
- Use refs for values that must survive renders without causing a render, or
  for imperative DOM access. Do not use refs as a second state system.

## Effects and asynchronous work

An effect is a synchronization boundary, not a general-purpose lifecycle
method. Before adding one, ask whether the work can happen during render, in
an event handler, or in the data-fetching layer instead.

- Return cleanup for subscriptions, timers, event listeners, and observers.
- Make asynchronous work safe when dependencies change or a component
  unmounts. Ignore or abort stale requests according to the API being used.
- Keep loading, error, empty, and success states explicit in the UI.
- Prefer the project's query/data layer for server state rather than
  hand-written fetch effects in every component. See the
  [TanStack Query guide](../state-management/tanstack-query/).
- Keep event-specific logic in the event handler. For example, submit a form
  from `onSubmit` instead of watching state in an effect and submitting as a
  side effect.

## Forms and accessibility

- Use controlled inputs when the UI needs to react to each value change;
  otherwise, an uncontrolled input can be simpler.
- Associate every input with a visible `label`, expose validation errors in
  text, and preserve keyboard and screen-reader access.
- Use the correct input type and native validation semantics where they fit.
- Disable or otherwise guard submission while a request is in progress, and
  show a clear result for success and failure.
- Prefer native elements and progressive enhancement over recreating browser
  behavior with ARIA. Add ARIA only when native semantics are insufficient.
- Manage focus when opening dialogs, showing validation errors, or changing
  views in a way that would otherwise disorient keyboard users.
- Test the behavior a user can observe, including keyboard interaction and
  accessible names, not implementation details.

For larger forms, follow the repository's
[React Hook Form guide](forms-1-react-hook-form/).

## TypeScript and project structure

- Type component props, hook inputs and outputs, reducer actions, and API
  boundaries. Prefer narrow unions over `string` for finite states.
- Keep domain types close to the feature that owns them. Avoid a catch-all
  shared types file that becomes a hidden dependency hub.
- Organize substantial features by capability or domain. Keep their UI,
  hooks, state, API adapters, and tests close together. See
  [Organizing by Feature](../architecture/organizing-by-feature/).
- Keep reusable shared components generic and independent of feature-specific
  business rules.
- Keep server state, client UI state, and URL state separate. Choose a store
  only when state genuinely needs to be shared beyond a component subtree.
- Keep data access out of presentational components where practical. A
  feature-level hook or query should translate server data into the shape the
  UI needs.

## Performance and reliability

- Measure before optimizing. Use React DevTools Profiler and browser
  performance tools to identify expensive renders or slow interactions.
- Avoid premature memoization and abstractions that make data flow harder to
  follow.
- Render large collections with an appropriate virtualization strategy when
  measurement shows it is needed.
- Keep stable keys and avoid creating avoidable render loops.
- Handle network failures, retries, cancellation, and stale data explicitly.
- Use error boundaries at meaningful feature or route boundaries when the
  application needs to recover from rendering errors.

## Review checklist

Before opening a pull request, verify:

- [ ] Components render from props, state, and context without render-time
      side effects.
- [ ] State is minimal, owned by the right component, and not duplicated from
      derived values.
- [ ] Effects synchronize with an external system and clean themselves up.
- [ ] Hooks follow the Rules of Hooks and have complete dependencies.
- [ ] Collections use stable keys from the domain model.
- [ ] Loading, error, empty, and success states are handled where relevant.
- [ ] Interactive elements are semantic, keyboard accessible, and labelled.
- [ ] Server state is handled by the established data layer.
- [ ] The feature's types, tests, and data-access code remain discoverable.

## References

- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- [Managing State](https://react.dev/learn/managing-state)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Rules of React](https://react.dev/reference/rules)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
