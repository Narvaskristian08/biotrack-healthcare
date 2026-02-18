import mongoSanitize from 'express-mongo-sanitize';

const sanitize = mongoSanitize?.sanitize ?? ((value) => value);

export function noSqlSanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitize(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    sanitize(req.params);
  }
  if (req.query && typeof req.query === 'object') {
    sanitize(req.query);
  }
  next();
}

