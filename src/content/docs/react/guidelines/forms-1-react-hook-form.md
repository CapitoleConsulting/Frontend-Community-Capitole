---
title: "React Forms: React Hook Forms"
description: "Complete guide on how RHF works and how to setup it, using Zod for validations."
sidebar.order: 1
---


# Building Better Forms with React Hook Form

## Reducing boilerplate without losing control of validation and user feedback

Forms usually start as one of the easiest parts of a React feature.

A couple of inputs, a submit button and a small object in state are enough for a first version. The problem appears when the form starts behaving like a real form. Fields become required, validation rules depend on each other, API errors need to be displayed, some sections are conditional and the submit button must react to loading and success states.

At that point, the difficult part is no longer rendering the inputs. It is coordinating all the state around them.

React Hook Form provides a practical way to handle that complexity without moving every field change into React state. It works particularly well with native HTML inputs, supports controlled component libraries when needed and keeps most of the form logic behind a small API.

This article covers the main patterns needed to use it in a real project, from a basic form to schema validation, dynamic fields and server errors.

---

## Why Forms Become Difficult

A basic controlled form is not necessarily a problem. React already provides everything required to build one:

```tsx
import { useState } from "react";

type PolicyFormValues = {
  policyholder: string;
  email: string;
  coverageAmount: string;
};

export const PolicyForm = () => {
  const [values, setValues] = useState<PolicyFormValues>({
    policyholder: "",
    email: "",
    coverageAmount: "",
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  return (
    <form>
      <label htmlFor="policyholder">Policyholder</label>
      <input
        id="policyholder"
        name="policyholder"
        value={values.policyholder}
        onChange={handleChange}
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
      />

      <label htmlFor="coverageAmount">Coverage amount</label>
      <input
        id="coverageAmount"
        name="coverageAmount"
        type="number"
        value={values.coverageAmount}
        onChange={handleChange}
      />

      <button type="submit">Create policy</button>
    </form>
  );
};
```

This is still readable, but it only manages values. A production form usually needs more:

* Validation rules and error messages.
* Touched and dirty state.
* Loading and submission state.
* Default values and reset behavior.
* Conditional fields.
* Errors returned by the API.
* Integration with a component library.

All of this can be implemented manually, but the component grows quickly and the same logic tends to be repeated in every form.

React Hook Form does not remove the complexity of the business rules. It removes most of the repetitive coordination required to apply them.

---

## Setting Up React Hook Form

The library can be installed with any common package manager:

```bash
npm install react-hook-form
```

The main entry point is the `useForm` hook:

```tsx
import { useForm, type SubmitHandler } from "react-hook-form";

type PolicyFormValues = {
  policyholder: string;
  email: string;
  coverageAmount: number;
};

export const PolicyForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PolicyFormValues>({
    defaultValues: {
      policyholder: "",
      email: "",
      coverageAmount: 10000,
    },
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<PolicyFormValues> = async (
    values,
  ) => {
    await createPolicy(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="policyholder">Policyholder</label>
      <input
        id="policyholder"
        aria-invalid={Boolean(errors.policyholder)}
        {...register("policyholder")}
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        aria-invalid={Boolean(errors.email)}
        {...register("email")}
      />

      <label htmlFor="coverageAmount">Coverage amount</label>
      <input
        id="coverageAmount"
        type="number"
        aria-invalid={Boolean(errors.coverageAmount)}
        {...register("coverageAmount", {
          valueAsNumber: true,
        })}
      />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating policy..." : "Create policy"}
      </button>
    </form>
  );
};
```

There are three important pieces here:

* `register` connects an input to the form and gives React Hook Form access to its name, value, blur event and reference.
* `handleSubmit` validates the form before calling the submit function.
* `formState` exposes the state needed by the UI, such as errors, dirty fields and submission status.

The form values are also typed. A misspelled field name in `register` becomes a TypeScript error instead of a bug discovered at runtime.

Providing `defaultValues` from the beginning is also important. React Hook Form uses them to calculate whether the form or an individual field is dirty, and they give the form a clear initial state.

---

## Adding Validation

Validation rules can be defined directly when registering a field. The API follows familiar HTML concepts such as `required`, `min`, `maxLength` and `pattern`, while also supporting custom validation functions.

```tsx
<input
  id="policyholder"
  aria-invalid={Boolean(errors.policyholder)}
  {...register("policyholder", {
    required: "Enter the policyholder name",
    minLength: {
      value: 2,
      message: "The name must contain at least two characters",
    },
  })}
/>

{errors.policyholder && (
  <p role="alert">{errors.policyholder.message}</p>
)}
```

The email and coverage fields can follow the same pattern:

```tsx
<input
  id="email"
  type="email"
  aria-invalid={Boolean(errors.email)}
  {...register("email", {
    required: "Enter a contact email",
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Enter a valid email address",
    },
  })}
/>

{errors.email && (
  <p role="alert">{errors.email.message}</p>
)}

<input
  id="coverageAmount"
  type="number"
  aria-invalid={Boolean(errors.coverageAmount)}
  {...register("coverageAmount", {
    valueAsNumber: true,
    required: "Enter a coverage amount",
    min: {
      value: 1000,
      message: "The minimum coverage is 1,000",
    },
  })}
/>

{errors.coverageAmount && (
  <p role="alert">{errors.coverageAmount.message}</p>
)}
```

The error message should explain what needs to be corrected. A generic `Invalid value` may be technically accurate, but it does not help the user continue.

The validation mode also affects the experience:

```ts
useForm({ mode: "onSubmit" });
useForm({ mode: "onBlur" });
useForm({ mode: "onChange" });
useForm({ mode: "onTouched" });
```

`onSubmit` is the default and performs the least work while the user is typing. `onBlur` is often a good compromise because the field is validated after the user leaves it. `onChange` gives immediate feedback, but it can be noisy and causes more validation work during editing.

There is no mode that works best for every form. A login form, a long onboarding flow and a search filter have different needs.

---

## Moving Validation to a Schema

Inline rules work well while the form is small. They become harder to follow when validation is reused, several fields depend on each other or the submitted value needs to be transformed.

In those cases, a schema library such as Zod keeps the validation rules together and gives the form a single source of truth.

```bash
npm install zod @hookform/resolvers
```

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type SubmitHandler,
} from "react-hook-form";
import { z } from "zod";

const policySchema = z.object({
  policyholder: z
    .string()
    .trim()
    .min(2, "Enter the policyholder name"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address"),
  coverageAmount: z.coerce
    .number()
    .min(1000, "The minimum coverage is 1,000"),
});

type PolicyFormInput = z.input<typeof policySchema>;
type PolicyFormOutput = z.output<typeof policySchema>;

export const PolicyForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    PolicyFormInput,
    unknown,
    PolicyFormOutput
  >({
    resolver: zodResolver(policySchema),
    defaultValues: {
      policyholder: "",
      email: "",
      coverageAmount: "",
    },
  });

  const onSubmit: SubmitHandler<PolicyFormOutput> = (
    values,
  ) => {
    console.log(values.coverageAmount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input {...register("policyholder")} />
      {errors.policyholder && (
        <p role="alert">{errors.policyholder.message}</p>
      )}

      <input type="email" {...register("email")} />
      {errors.email && (
        <p role="alert">{errors.email.message}</p>
      )}

      <input type="number" {...register("coverageAmount")} />
      {errors.coverageAmount && (
        <p role="alert">{errors.coverageAmount.message}</p>
      )}

      <button type="submit">Create policy</button>
    </form>
  );
};
```

The input and output types are intentionally separated. The browser provides the coverage amount as a string, while the schema transforms it into a number before `onSubmit` receives it.

This distinction is useful when a schema trims text, converts dates, applies defaults or transforms API values. The submit function works with validated domain data instead of raw input strings.

Schema validation should not be added automatically to every form. For three simple fields, inline rules may be easier to read. It becomes valuable when the schema represents real business behavior or is shared with another layer of the application.

---

## Working with Controlled Components

React Hook Form is designed around native and uncontrolled inputs, but real applications often use component libraries such as MUI, Ant Design or React Select.

These components usually expose their value through custom props and expect to be controlled. `Controller` connects them to the form without forcing the rest of the fields into the same model.

```tsx
import { MenuItem, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";

type PolicyFormValues = {
  riskLevel: "low" | "medium" | "high";
};

export const RiskLevelField = () => {
  const { control } = useForm<PolicyFormValues>({
    defaultValues: {
      riskLevel: "medium",
    },
  });

  return (
    <Controller
      name="riskLevel"
      control={control}
      rules={{
        required: "Select a risk level",
      }}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          select
          fullWidth
          label="Risk level"
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
        >
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
        </TextField>
      )}
    />
  );
};
```

The `field` object contains the value, name, reference and event handlers expected by the form. The component remains controlled, but React Hook Form owns its place inside the complete form state.

A common mistake is registering the same field twice:

```tsx
<Controller
  name="riskLevel"
  control={control}
  render={({ field }) => (
    <TextField
      {...field}
      {...register("riskLevel")}
    />
  )}
/>
```

`Controller` already performs the registration. Combining both APIs on the same field creates two competing connections and should be avoided.

---

## Conditional Fields with `useWatch`

Some forms change depending on previous answers. A policy may be submitted directly or through a broker, and the broker email should only appear in the second case.

`useWatch` subscribes to the fields needed by a component without making the entire form depend on every value change.

```tsx
import { useForm, useWatch } from "react-hook-form";

type PolicyFormValues = {
  hasBroker: boolean;
  brokerEmail?: string;
};

export const BrokerSection = () => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PolicyFormValues>({
    defaultValues: {
      hasBroker: false,
      brokerEmail: "",
    },
    shouldUnregister: true,
  });

  const hasBroker = useWatch({
    control,
    name: "hasBroker",
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <label>
        <input
          type="checkbox"
          {...register("hasBroker")}
        />
        This policy is managed by a broker
      </label>

      {hasBroker && (
        <div>
          <label htmlFor="brokerEmail">Broker email</label>
          <input
            id="brokerEmail"
            type="email"
            {...register("brokerEmail", {
              required: "Enter the broker email",
            })}
          />

          {errors.brokerEmail && (
            <p role="alert">
              {errors.brokerEmail.message}
            </p>
          )}
        </div>
      )}

      <button type="submit">Continue</button>
    </form>
  );
};
```

With `shouldUnregister: true`, the broker email is removed from the submitted data when its field is unmounted. Without it, React Hook Form keeps the value by default, which may be useful in a multi-step form where a section can temporarily disappear and return later.

`watch()` can also read values, but watching the complete form from its root is easy to overuse. `useWatch` is usually a better fit when only one section needs to react to a small group of fields.

---

## Dynamic Lists with `useFieldArray`

Dynamic fields are another common source of manual state management. Examples include insured assets, passengers, beneficiaries or contact methods.

`useFieldArray` provides stable identifiers and operations for adding, removing and reordering entries.

```tsx
import {
  useFieldArray,
  useForm,
} from "react-hook-form";

type PolicyFormValues = {
  insuredAssets: Array<{
    description: string;
    value: number;
  }>;
};

export const InsuredAssetsForm = () => {
  const {
    register,
    control,
    handleSubmit,
  } = useForm<PolicyFormValues>({
    defaultValues: {
      insuredAssets: [
        {
          description: "",
          value: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "insuredAssets",
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      {fields.map((field, index) => (
        <fieldset key={field.id}>
          <legend>Asset {index + 1}</legend>

          <label htmlFor={`asset-${index}-description`}>
            Description
          </label>
          <input
            id={`asset-${index}-description`}
            {...register(
              `insuredAssets.${index}.description`,
              {
                required: "Enter a description",
              },
            )}
          />

          <label htmlFor={`asset-${index}-value`}>
            Estimated value
          </label>
          <input
            id={`asset-${index}-value`}
            type="number"
            {...register(
              `insuredAssets.${index}.value`,
              {
                valueAsNumber: true,
                min: 1,
              },
            )}
          />

          <button
            type="button"
            onClick={() => remove(index)}
          >
            Remove asset
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            description: "",
            value: 0,
          })
        }
      >
        Add another asset
      </button>

      <button type="submit">Save assets</button>
    </form>
  );
};
```

The generated `field.id` should be used as the React key. Using the array index as the key can mix input state when rows are inserted, removed or reordered.

It is also worth keeping each row in a separate component once the markup becomes larger. The form hook should simplify the feature, not become an excuse to place a complete business flow in one file.

---

## Handling Submission and Server Errors

Client validation can reject obviously invalid values, but it cannot replace the server. A policy number may already exist, a user may have lost permission or the request may fail for a business rule that only the API knows.

`setError` can connect those failures back to the form:

```tsx
import {
  useForm,
  type SubmitHandler,
} from "react-hook-form";

type PolicyFormValues = {
  policyNumber: string;
  policyholder: string;
};

export const CreatePolicyForm = () => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: {
      errors,
      isSubmitting,
      isSubmitSuccessful,
    },
  } = useForm<PolicyFormValues>({
    defaultValues: {
      policyNumber: "",
      policyholder: "",
    },
  });

  const onSubmit: SubmitHandler<PolicyFormValues> = async (
    values,
  ) => {
    try {
      await createPolicy(values);
      reset();
    } catch (error) {
      if (isDuplicatedPolicyNumber(error)) {
        setError("policyNumber", {
          type: "server",
          message: "This policy number already exists",
        });

        return;
      }

      setError("root.server", {
        type: "server",
        message:
          "The policy could not be created. Try again later.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label htmlFor="policyNumber">Policy number</label>
      <input
        id="policyNumber"
        {...register("policyNumber", {
          required: "Enter the policy number",
        })}
      />
      {errors.policyNumber && (
        <p role="alert">{errors.policyNumber.message}</p>
      )}

      <label htmlFor="policyholder">Policyholder</label>
      <input
        id="policyholder"
        {...register("policyholder", {
          required: "Enter the policyholder name",
        })}
      />

      {errors.root?.server && (
        <p role="alert">{errors.root.server.message}</p>
      )}

      {isSubmitSuccessful && (
        <p role="status">Policy created successfully</p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Create policy"}
      </button>
    </form>
  );
};
```

Field errors should be used when the user can correct a specific value. Root errors are more appropriate for general failures that do not belong to one input.

The async request should still be handled explicitly. `handleSubmit` validates and invokes the callback, but it does not hide exceptions produced inside the submit function.

---

## Performance Without the Myths

Performance is one of the main reasons React Hook Form became popular, but it should be explained carefully.

A traditional controlled form updates React state on every change. That does not automatically make it slow. Most small forms will work perfectly well with controlled inputs, and moving a login form to a library only to save a few renders is rarely a meaningful optimization.

React Hook Form becomes more interesting when forms are large, validation is complex or many components subscribe to different parts of the form state. Native inputs can keep their current value in the DOM, and the library can notify only the parts that need to react.

There are still several ways to lose that advantage:

* Validating every field on every change without a UX reason.
* Watching the complete form from the root component.
* Reading large parts of `formState` in components that do not need them.
* Wrapping every native input in `Controller`.
* Rebuilding large validation objects during every render.

For larger forms, `useWatch` and `useFormState` can keep subscriptions close to the section that needs them. The goal is not to reach zero renders. It is to avoid making unrelated parts of the form update for every keystroke.

In practice, the biggest benefit is often not a benchmark. It is having less custom state, fewer duplicated handlers and a consistent way to manage validation and submission across the project.

---

## Organizing Larger Forms

A large form should not become a large component just because one `useForm` call can technically manage everything.

A practical structure is to separate:

* The validation schema and form types.
* Reusable input components from the design system.
* Form sections with a clear business purpose.
* Mapping between form values and API payloads.
* The request and server error handling.

`FormProvider` and `useFormContext` are useful when deeply nested sections need access to the same form without passing `register`, `control` and `errors` through every level.

```tsx
import {
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";

type PolicyFormValues = {
  policyholder: string;
  email: string;
};

const ContactSection = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<PolicyFormValues>();

  return (
    <section>
      <h2>Contact details</h2>

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        {...register("email", {
          required: "Enter a contact email",
        })}
      />

      {errors.email && (
        <p role="alert">{errors.email.message}</p>
      )}
    </section>
  );
};

export const PolicyForm = () => {
  const methods = useForm<PolicyFormValues>({
    defaultValues: {
      policyholder: "",
      email: "",
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(console.log)}>
        <ContactSection />
        <button type="submit">Create policy</button>
      </form>
    </FormProvider>
  );
};
```

Context is helpful for real nesting, but it should not be introduced only to avoid passing one prop to a direct child. As with the rest of the library, the simplest API that keeps the form clear is usually the right one.

---

## Testing the Form

React Hook Form should not change the way a form is tested. The test should interact with the fields and verify the behavior visible to the user.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("submits a valid policy", async () => {
  const user = userEvent.setup();
  const createPolicy = jest.fn().mockResolvedValue(undefined);

  render(<PolicyForm onSubmit={createPolicy} />);

  await user.type(
    screen.getByRole("textbox", {
      name: "Policyholder",
    }),
    "Jessica Pearson",
  );

  await user.type(
    screen.getByRole("textbox", {
      name: "Email",
    }),
    "jessica@example.com",
  );

  await user.clear(
    screen.getByRole("spinbutton", {
      name: "Coverage amount",
    }),
  );

  await user.type(
    screen.getByRole("spinbutton", {
      name: "Coverage amount",
    }),
    "25000",
  );

  await user.click(
    screen.getByRole("button", {
      name: "Create policy",
    }),
  );

  expect(createPolicy).toHaveBeenCalledWith({
    policyholder: "Jessica Pearson",
    email: "jessica@example.com",
    coverageAmount: 25000,
  });
});
```

There is no need to test `register`, `handleSubmit` or the internal state of the library. The useful behavior is that the user can complete the form, receives clear validation feedback and sends the expected data.

---

## Conclusion

React Hook Form is not necessary for every form. A small search box or a couple of controlled inputs may be clearer with plain React state.

It becomes valuable when the form has enough behavior to justify a dedicated model: validation, reusable sections, dynamic fields, asynchronous submission and multiple sources of errors.

The native input model keeps the basic case simple. `Controller` covers external controlled components, schema resolvers keep complex validation together, and focused subscriptions help larger forms avoid unnecessary updates.

The library should reduce form code, not hide it behind abstractions. Keep the field names typed, provide clear default values, show errors where users can act on them and leave business rules in a schema or domain layer when they no longer belong in the component.

A good form is not the one with the fewest renders or the smallest number of lines. It is the one users can complete without confusion and developers can change without being afraid of breaking its state.

## References

- [React Hook Form docs](https://react-hook-form.com/)
- [Zod: schema validation lib](https://zod.dev/)
- [Yup: alternative to Zod](https://yup-docs.vercel.app/docs/intro)
