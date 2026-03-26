---
name: zod
description: Creates Zod v4 schemas and validation flows (parse/safeParse, async, refinements/superRefine, unions/discriminatedUnion, type inference, error handling, and JSON Schema/registries). Use when the user mentions `zod`, `ZodError`, `.parse`, `.safeParse`, or asks how to model/validate data with Zod.
---

# Zod

## Default assumptions

- Use **Zod 4 classic** by default: `import * as z from "zod";`
- Prefer **typed, schema-driven** solutions over ad-hoc checks.
- Prefer **`safeParse`** in request/form boundaries; prefer **`parse`** when failures should throw.

## Import patterns

### App code (Zod 4 classic)

```ts
import * as z from 'zod';
```

### Library code (Zod core shared by Zod Classic + Zod Mini)

```ts
import * as z4 from 'zod/v4/core';

// parse via z4.parse(...)
// z4.$ZodType is the common type for both Classic + Mini
```

## Schema definition rules

### Objects

- Required keys by default:
  ```ts
  const Person = z.object({ name: z.string(), age: z.number() });
  ```
- Optional keys:
  ```ts
  const Person = z.object({ age: z.number().optional() });
  ```
- Nullish:
  ```ts
  const Person = z.object({ nickname: z.string().nullish() });
  ```
- Unknown keys:
  - `z.object(...)` **strips** unknown keys by default
  - `z.strictObject(...)` **throws** on unknown keys
  - `z.looseObject(...)` allows unknown keys

### Enums

- Use `z.enum([...])` with literal inference (`as const` or inline array):
  ```ts
  const Fish = z.enum(['Salmon', 'Tuna', 'Trout'] as const);
  ```
- Avoid losing literal inference by creating non-const arrays.

### Arrays / Records

- Arrays:
  ```ts
  z.array(z.string()).min(1).max(10);
  ```
- Records:
  ```ts
  z.record(z.string(), z.number()); // Record<string, number>
  ```
- If you need partial/exhaustive behavior:
  - prefer `z.partialRecord(...)` for non-exhaustive keys
  - prefer `z.looseRecord(...)` when you want to pass through non-matching keys

## Parsing & return types

### `parse` (throws)

```ts
const out = Person.parse(input); // throws ZodError on failure
```

Use when you want failures to bubble as exceptions.

### `safeParse` (non-throwing)

```ts
const result = Person.safeParse(input);
if (!result.success) {
	// result.error is a ZodError
} else {
	// result.data is strongly typed
}
```

### Async (refinements/transforms)

- If you use **async refinements** or **async transforms/codecs**, use:
  - `.parseAsync(...)`
  - `.safeParseAsync(...)`

## Error handling patterns

### Identify errors and inspect issues

- Classic ZodError:
  ```ts
  try {
  	Person.parse(input);
  } catch (err) {
  	if (err instanceof z.ZodError) {
  		err.issues;
  	}
  }
  ```
- Prefer structured formatting utilities:
  - `z.treeifyError(zodError)`
  - `z.flattenError(zodError)` for shallow `fieldErrors`
  - `z.prettifyError(zodError)` for a human-readable string

## Refinements & custom validation

### `.refine()` (one issue)

```ts
const S = z.string().refine((val) => val.length >= 3, {
	message: 'Too short',
	path: ['fieldName'] // usually for object-level refinements
});
```

- Refinement functions should **not throw**.
- For multiple issues or richer errors, prefer `.superRefine()`.

### `.superRefine()` (multiple issues)

```ts
const S = z.array(z.string()).superRefine((val, ctx) => {
	if (val.length > 3)
		ctx.addIssue({
			code: 'too_big',
			maximum: 3,
			message: 'Too many'
		});
});
```

## Transformations and coercion

### Coercion

- Use `z.coerce.*` to coerce input types:
  ```ts
  z.coerce.number(); // Number(input)
  ```

### Preprocess (custom coercion)

```ts
const coercedInt = z.preprocess((val) => {
	if (typeof val === 'string') return Number.parseInt(val, 10);
	return val;
}, z.int());
```

### Transforms (unidirectional)

- Use `schema.transform(fn)` for forward-only transforms.
- If you use async transforms, parse with `.parseAsync`.

## Unions

### `z.union(...)` (first match wins)

```ts
const U = z.union([z.string(), z.number()]);
```

### `z.xor(...)` (exactly one matches)

```ts
const X = z.xor([z.string(), z.number()]);
```

### Discriminated unions (preferred for tagged payloads)

```ts
const MyResult = z.discriminatedUnion('status', [
	z.object({ status: z.literal('success'), data: z.string() }),
	z.object({ status: z.literal('failed'), error: z.string() })
]);
```

## Type inference

- Always extract types from schemas:
  ```ts
  type Player = z.infer<typeof PlayerSchema>;
  ```
- For differing input/output (transform pipelines), use:
  ```ts
  type In = z.input<typeof Schema>;
  type Out = z.output<typeof Schema>;
  ```

## JSON Schema conversion & registries

### Convert Zod <-> JSON Schema

```ts
const js = z.toJSONSchema(schema);
const back = z.fromJSONSchema(js);
```

Use `z.toJSONSchema(schema, { metadata: z.globalRegistry, ... })` when leveraging registered metadata.

### Metadata via registries

- Use `.meta()` / `.register()` for JSON Schema generation and docs:
  ```ts
  const Email = z.string().meta({ id: 'email', title: 'Email' });
  ```
