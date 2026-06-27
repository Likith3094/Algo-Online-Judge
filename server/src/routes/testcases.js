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

    // Verify the problem exists and the creator is the author
    const Problem = require('../models/Problem');
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found.' });
    }
    if (problem.authorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only add test cases to your own problems.' });
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
