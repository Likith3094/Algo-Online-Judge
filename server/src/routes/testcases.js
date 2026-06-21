const express = require('express');
const TestCase = require('../models/TestCase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Protect all endpoints in this file with JWT and creator role requirements
router.use(authenticateToken);
router.use(requireRole('creator'));

// POST / - Creates a hidden or sample test case entry for a specific problem ID
router.post('/', async (req, res) => {
  try {
    const { problemId, inputData, expectedOutput, isSample } = req.body;

    if (!problemId || inputData === undefined || expectedOutput === undefined) {
      return res.status(400).json({
        success: false,
        message: 'problemId, inputData, and expectedOutput are required.',
      });
    }

    const testCase = new TestCase({
      problemId,
      inputData,
      expectedOutput,
      isSample: isSample === true || isSample === 'true',
    });

    await testCase.save();

    return res.status(201).json({
      success: true,
      message: 'Test case created successfully.',
      testCase,
    });
  } catch (error) {
    console.error('Create test case error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create test case.',
    });
  }
});

module.exports = router;
