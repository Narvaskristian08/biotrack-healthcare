import { env } from '../config/env.js';

function mapDuplicateKeyError(err) {
  if (Number(err?.code) !== 11000) return null;
  const keyValue = err?.keyValue ?? {};
  const duplicateFields = Object.keys(keyValue);
  const firstField = duplicateFields[0] ?? '';

  if (firstField === 'email') {
    return { message: 'Email already taken', code: 'DUPLICATE_EMAIL', field: firstField };
  }
  if (firstField === 'contactNumber') {
    return { message: 'Contact number already taken', code: 'DUPLICATE_CONTACT_NUMBER', field: firstField };
  }
  if (firstField === 'blockchainIdentity.walletAddress') {
    return { message: 'Wallet address already linked to another account', code: 'DUPLICATE_WALLET_ADDRESS', field: firstField };
  }

  return { message: 'Duplicate value already exists', code: 'DUPLICATE_KEY', field: firstField };
}

export function errorHandler(err, req, res, next) {
  if (env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error({
      name: err?.name,
      code: err?.code,
      statusCode: err?.statusCode,
    });
  } else {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        message: 'Request payload exceeded the allowed size limit',
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  }

  const duplicateError = mapDuplicateKeyError(err);
  if (duplicateError) {
    return res.status(409).json({
      error: {
        message: duplicateError.message,
        code: duplicateError.code,
        field: duplicateError.field,
      },
    });
  }

  const status = err.statusCode ?? 500;
  const isServerError = status >= 500;
  const message = isServerError ? 'Internal Server Error' : (err.message ?? 'Request failed');
  const code = err.code ?? (isServerError ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');
  return res.status(status).json({
    error: {
      message,
      code,
    },
  });
}
