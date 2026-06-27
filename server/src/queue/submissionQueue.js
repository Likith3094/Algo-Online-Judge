const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

// Create the submission queue
const submissionQueue = new Queue('SubmissionQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: false, // Auto clean up successful jobs from redis after a while
    removeOnFail: false,
    attempts: 1,
  },
});

module.exports = submissionQueue;
