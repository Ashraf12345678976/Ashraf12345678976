import { HttpError } from './error.js';

/**
 * Validate req[source] against a Zod schema. On success replaces the request
 * value with the parsed (and coerced) data.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(new HttpError(422, 'Validation failed', details));
    }
    req[source] = result.data;
    next();
  };
}
