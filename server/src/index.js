const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contests');
const problemRoutes = require('./routes/problems');
const testcaseRoutes = require('./routes/testcases');
const aiRoutes = require('./routes/ai');
const jobsRoutes = require('./routes/jobs');
require('./queue/submissionWorker'); // Start the background worker

const startCleanupJob = require('./utils/cleanup');
const { verifyDockerSandbox } = require('./utils/startupChecks');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/testcases', testcaseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/jobs', jobsRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Server is running' }));

// Global Express Error Handler
app.use((err, req, res, next) => {
  console.error('[Express Error]', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Process-level unhandled exception/rejection catchers to prevent PM2 restart loops
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✓ Server listening on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      verifyDockerSandbox();
      startCleanupJob();
    });
  })
  .catch((error) => {
    console.error('✗ Unable to start server:', error.message);
    process.exit(1);
  });
