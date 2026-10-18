/** class-transformer helpers shared by request DTOs. */
type TransformArg = { value: unknown };

export const trim = ({ value }: TransformArg) => (typeof value === 'string' ? value.trim() : value);
export const upperTrim = ({ value }: TransformArg) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
/** Query strings arrive as text: "true"/"false" → boolean. */
export const toBool = ({ value }: TransformArg) => (value === 'true' ? true : value === 'false' ? false : value);
