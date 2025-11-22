import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes';

const app = express();

// Security & Parsing Middleware
app.use(helmet());
app.use(cors({ origin: true })); // Allow all origins for dev; restrict in prod
app.use(express.json());

// API Routes
app.use('/v1', router);

// Health Check Endpoint (Essential for "God Mode" monitoring later)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        system: 'Easy Islanders Backend',
        timestamp: new Date().toISOString()
    });
});

export default app;
