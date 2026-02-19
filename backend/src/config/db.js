import mongoose from 'mongoose';
import { env } from './env.js';

function getMongoUriParams(mongoUri) {
  const queryIndex = String(mongoUri ?? '').indexOf('?');
  if (queryIndex < 0) return new URLSearchParams();
  return new URLSearchParams(String(mongoUri).slice(queryIndex + 1));
}

function uriDeclaresTlsEnabled(mongoUri) {
  const uri = String(mongoUri ?? '').trim().toLowerCase();
  if (!uri) return false;
  if (uri.startsWith('mongodb+srv://')) return true;
  const params = getMongoUriParams(uri);
  const tls = params.get('tls') ?? params.get('ssl');
  if (tls === null) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(tls).trim().toLowerCase());
}

function uriDeclaresTlsDisabled(mongoUri) {
  const params = getMongoUriParams(mongoUri);
  const tls = params.get('tls') ?? params.get('ssl');
  if (tls === null) return false;
  return ['0', 'false', 'no', 'off'].includes(String(tls).trim().toLowerCase());
}

function buildMongoConnectOptions(mongoUri) {
  const tlsFromUri = uriDeclaresTlsEnabled(mongoUri);
  const tlsDisabledInUri = uriDeclaresTlsDisabled(mongoUri);
  const tlsEnabled = env.MONGODB_TLS_ENABLED || tlsFromUri;

  if (env.MONGODB_REQUIRE_TLS && (!tlsEnabled || tlsDisabledInUri)) {
    throw new Error(
      'MongoDB TLS is required. Enable TLS in connection URI (tls=true) or set MONGODB_TLS_ENABLED=true.'
    );
  }

  const options = {
    appName: env.MONGODB_APP_NAME,
    maxPoolSize: Math.max(1, Number(env.MONGODB_MAX_POOL_SIZE ?? 20)),
    minPoolSize: Math.max(0, Number(env.MONGODB_MIN_POOL_SIZE ?? 0)),
    serverSelectionTimeoutMS: Math.max(1000, Number(env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 10000)),
    socketTimeoutMS: Math.max(1000, Number(env.MONGODB_SOCKET_TIMEOUT_MS ?? 45000)),
    maxIdleTimeMS: Math.max(1000, Number(env.MONGODB_MAX_IDLE_TIME_MS ?? 30000)),
    heartbeatFrequencyMS: Math.max(1000, Number(env.MONGODB_HEARTBEAT_FREQUENCY_MS ?? 10000)),
    autoIndex: Boolean(env.MONGODB_AUTO_INDEX),
    retryWrites: true,
  };

  if (tlsEnabled) {
    options.tls = true;
    options.tlsAllowInvalidCertificates = Boolean(env.MONGODB_TLS_ALLOW_INVALID_CERTS);
    if (env.MONGODB_TLS_CA_FILE) options.tlsCAFile = env.MONGODB_TLS_CA_FILE;
    if (env.MONGODB_TLS_CERT_KEY_FILE) options.tlsCertificateKeyFile = env.MONGODB_TLS_CERT_KEY_FILE;
  }

  return options;
}

export async function connectDb(mongoUri) {
  mongoose.set('strictQuery', true);
  mongoose.set('runValidators', true);

  const options = buildMongoConnectOptions(mongoUri);
  await mongoose.connect(mongoUri, options);
  return mongoose.connection;
}

