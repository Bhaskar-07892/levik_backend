import type { ValueTransformer } from 'typeorm';

/** Postgres returns bigint/numeric as strings; amounts here always fit in a JS number. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
