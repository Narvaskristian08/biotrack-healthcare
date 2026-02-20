export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        message: 'Request payload exceeded the allowed size limit',
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  }
  const status = err.statusCode ?? 500;
  return res.status(status).json({
    error: {
      message: err.message ?? 'Internal Server Error',
      code: err.code ?? 'INTERNAL_ERROR',
    },
  });
}

