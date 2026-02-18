export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(', ');
      return res.status(400).json({
        error: {
          message: message || 'Invalid request body',
          code: 'VALIDATION_ERROR',
        },
      });
    }
    req.body = parsed.data;
    return next();
  };
}

