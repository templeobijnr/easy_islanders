import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes';

import { attachRequestContext } from './api/middleware/request-context.middleware';
import { traceIdMiddleware } from './middleware/traceId.middleware';
import { maintenanceMiddleware } from './middleware/maintenance.middleware';
import { circuitBreakerMiddleware } from './middleware/circuitBreaker.middleware';

const app = express();

// Security & Parsing Middleware
app.use(helmet());
app.use(cors({ origin: true })); // Allow all origins for dev; restrict in prod
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Needed for Twilio form posts

// OBS-02: Trace ID (MUST be first for logging correlation)
app.use(traceIdMiddleware);

// HUM-04: Maintenance Mode Kill Switch (MUST be before business logic)
app.use(maintenanceMiddleware);

// CASC-03B: Circuit Breaker (MUST be after maintenance, before routes)
app.use(circuitBreakerMiddleware);

app.use(attachRequestContext);

// Legacy API Routes (intentionally NOT mounted under /v1)
app.use('/legacy', router);
app.use('/v1', router); // Alias: Client expects /v1/chat/message to map to legacy router

// Health Check Endpoint (Essential for "God Mode" monitoring later)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        system: 'Easy Islanders Backend',
        timestamp: new Date().toISOString()
    });
});

export default app;
