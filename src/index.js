import express from 'express';
import cors from 'cors';

import { assertRequiredEnv, env } from './config/env.js';
import { connectDb } from './config/db.js';

import { attachContext } from './middleware/context.js';
import { errorHandler } from './middleware/errorHandler.js';

import { adminRoutes } from './routes/adminRoutes.js';
import { healthCenterRoutes } from './routes/healthCenterRoutes.js';
import { sessionRoutes } from './routes/sessionRoutes.js';
import { patientRoutes } from './routes/patientRoutes.js';
import { auditLogRoutes } from './routes/auditLogRoutes.js';
import { aiRoutes } from './routes/aiRoutes.js';

import { activityInsightRoutes } from './routes/activityInsightRoutes.js';

import { fallInsightRoutes } from './routes/fallInsightRoutes.js';
import { trendInsightRoutes } from './routes/trendInsightRoutes.js';


const app = express();


app.use('/api/ai', trendInsightRoutes);

app.use('/api/ai', fallInsightRoutes);


app.use('/api/ai', activityInsightRoutes);

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use(attachContext);

app.get('/', (req, res) => {
  res.send('BioTrack Backend Running');
});

app.use('/api/admin', adminRoutes);
app.use('/api/healthcenters', healthCenterRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/auditlogs', auditLogRoutes);
app.use('/api/ai', aiRoutes);

app.use(errorHandler);

async function start() {
  assertRequiredEnv();
  await connectDb(env.MONGODB_URI);

  app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
  });
}

start();
