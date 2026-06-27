const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const submissionQueue = require('../queue/submissionQueue');

const router = express.Router();

// GET /api/jobs/:id - Poll for job status
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const job = await submissionQueue.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    if (job.data.userId && job.data.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const state = await job.getState();
    
    // waiting, active, completed, failed, delayed, paused
    if (state === 'completed') {
      return res.json({
        success: true,
        state,
        result: job.returnvalue
      });
    } else if (state === 'failed') {
      return res.json({
        success: false,
        state,
        message: job.failedReason || 'Job failed.'
      });
    } else {
      return res.json({
        success: true,
        state, // 'waiting' or 'active'
      });
    }
  } catch (error) {
    console.error('Job fetch error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching job status.' });
  }
});

module.exports = router;
