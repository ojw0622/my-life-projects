import { z } from "zod";

/** Result returned by every form Server Action (used with useActionState). */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /**
   * Raw submitted values, returned on failure. React 19 resets uncontrolled
   * fields after every form action, so forms use these as `defaultValue`
   * to keep what the user typed when validation fails.
   */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };

/** Empty form fields arrive as "" — treat them as absent. */
export const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** A finite number field; accepts thousands separators ("1,500"). */
export const numberField = (label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.replaceAll(",", "").trim() : v),
    z.coerce
      .number({ error: `${label}을(를) 숫자로 입력하세요.` })
      .refine(Number.isFinite, { error: `${label}을(를) 숫자로 입력하세요.` }),
  );

/** Converts FormData into a plain object for schema parsing. */
export function formDataToObject(formData: FormData): Record<string, FormDataEntryValue> {
  const entries: Record<string, FormDataEntryValue> = {};
  formData.forEach((value, key) => {
    if (!key.startsWith("$ACTION")) entries[key] = value;
  });
  return entries;
}

/** Fields never echoed back to the client. */
const SECRET_FIELDS = new Set(["password"]);

/** String form values (files and secrets dropped), for echoing back on failure. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(formDataToObject(formData))) {
    if (typeof value === "string" && !SECRET_FIELDS.has(key)) values[key] = value;
  }
  return values;
}

/** Marks a failed result with the submitted values. */
export function failWith(state: ActionState, formData: FormData): ActionState {
  return { ...state, ok: false, values: formValues(formData) };
}

/** Picks a field's value to show: what was just submitted, else the fallback. */
export function fieldValue(
  state: ActionState,
  name: string,
  fallback: string | number | null | undefined = "",
): string {
  return state.values?.[name] ?? (fallback === null || fallback === undefined ? "" : String(fallback));
}

/**
 * Key for a form that echoes values into `<select>`s. React resets a select
 * to the option selected at mount, not to a later `defaultValue`, so the
 * form remounts whenever the echoed values change.
 */
export function formKey(state: ActionState): string {
  return JSON.stringify(state.values ?? null);
}

/** Flattens zod issues into `{ field: firstMessage }`. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Parses FormData with a schema into either data or an ActionState. */
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { success: true; data: z.infer<T> } | { success: false; state: ActionState } {
  const parsed = schema.safeParse(formDataToObject(formData));
  if (parsed.success) return { success: true, data: parsed.data };
  return {
    success: false,
    state: failWith({ ok: false, message: "입력값을 확인하세요.", fieldErrors: fieldErrors(parsed.error) }, formData),
  };
}
