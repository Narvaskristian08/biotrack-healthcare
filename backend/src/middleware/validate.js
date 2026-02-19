function makeValidator(schema, sourceKey, fallbackMessage) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[sourceKey] ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(', ');
      return res.status(400).json({
        error: {
          message: message || fallbackMessage,
          code: 'VALIDATION_ERROR',
        },
      });
    }

    req[sourceKey] = parsed.data;
    return next();
  };
}

export function validateBody(schema) {
  return makeValidator(schema, 'body', 'Invalid request body');
}

export function validateQuery(schema) {
  return makeValidator(schema, 'query', 'Invalid query parameters');
}

export function validateParams(schema) {
  return makeValidator(schema, 'params', 'Invalid route parameters');
}

