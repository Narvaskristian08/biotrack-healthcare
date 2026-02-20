import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';

import { assertRequiredEnv, env } from './config/env.js';
import { connectDb } from './config/db.js';
import { bootstrapDefaultAdmin } from './services/bootstrap.service.js';

import { attachContext } from './middleware/context.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrf.js';
import { noSqlSanitize } from './middleware/noSqlSanitize.js';

import { adminRoutes } from './routes/adminRoutes.js';
import { healthCenterRoutes } from './routes/healthCenterRoutes.js';
import { sessionRoutes } from './routes/sessionRoutes.js';
import { patientRoutes } from './routes/patientRoutes.js';
import { auditLogRoutes } from './routes/auditLogRoutes.js';
import { aiRoutes } from './routes/aiRoutes.js';
import { authRoutes } from './routes/authRoutes.js';

import { activityInsightRoutes } from './routes/activityInsightRoutes.js';

import { fallInsightRoutes } from './routes/fallInsightRoutes.js';

import { trendInsightRoutes } from './routes/trendInsightRoutes.js';

import { summaryInsightRoutes } from './routes/summaryInsightRoutes.js';

import { alertRoutes } from './routes/alertRoutes.js';

const app = express();
if (env.TRUST_PROXY) app.set('trust proxy', 1);

function parseCorsOrigins(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isPrivateDevOrigin(origin) {
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (host.startsWith('10.') || host.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

const configuredOrigins = parseCorsOrigins(env.CORS_ORIGIN);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser or same-origin requests may have no origin header.
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes('*')) return callback(null, true);
      if (configuredOrigins.includes(origin)) return callback(null, true);

      // In local development allow localhost/private-network origins to avoid
      // localhost vs 127.0.0.1 mismatches during manual QA.
      if (env.NODE_ENV !== 'production' && isPrivateDevOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(noSqlSanitize);
app.use(hpp());
app.use(attachContext);
app.use(csrfProtection);

app.get('/', (req, res) => {
  res.send('BioTrack Backend Running');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/healthcenters', healthCenterRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/auditlogs', auditLogRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai', activityInsightRoutes);
app.use('/api/ai', fallInsightRoutes);
app.use('/api/ai', trendInsightRoutes);
app.use('/api/ai', summaryInsightRoutes);
app.use('/api/ai', alertRoutes);

app.use(errorHandler);

async function start() {
  assertRequiredEnv();
  await connectDb(env.MONGODB_URI);
  await bootstrapDefaultAdmin();

  app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });
}

start();
