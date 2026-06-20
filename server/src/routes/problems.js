const express = require('express');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const TestCase = require('../models/TestCase');
const Contest = require('../models/Contest');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST / - Create a new problem (Creator only)
router.post('/', authenticateToken, requireRole('creator'), async (req, res) => {
  try {
    const { title, description, constraints, difficulty, tags, sampleInput, sampleOutput, authorCode, points, isPrivateContestProblem } =
      req.body;

    if (!title || !description || !constraints || !difficulty || !sampleInput || !sampleOutput || !authorCode || !points) {
      return res.status(400).json({
        success: false,
        message: 'All problem fields are required.',
      });
    }

    if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty must be Easy, Medium, or Hard.',
      });
    }

    if (typeof points !== 'number' || points < 1 || points > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Points must be a number between 1 and 1000.',
      });
    }

    const problem = new Problem({
      title: title.trim(),
      description: description.trim(),
      constraints: constraints.trim(),
      difficulty,
      tags: Array.isArray(tags) ? tags.filter((tag) => tag.trim()) : [],
      sampleInput,
      sampleOutput,
      authorCode,
      points,
      authorId: req.user.id,
      isPrivateContestProblem: isPrivateContestProblem === true || isPrivateContestProblem === 'true',
    });

    await problem.save();

    // Optionally register sample cases in test cases table
    const sampleTestCase = new TestCase({
      problemId: problem._id,
      inputData: sampleInput,
      expectedOutput: sampleOutput,
      isSample: true
    });
    await sampleTestCase.save();

    return res.status(201).json({
      success: true,
      message: 'Problem created successfully.',
      problem: problem.toObject(),
    });
  } catch (error) {
    console.error('Create problem error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create problem. Please try again later.',
    });
  }
});

// GET / - List all problems (Public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { difficulty, tags, search, limit = 10, skip = 0 } = req.query;
    const filter = {};
    if (!req.user || req.user.role !== 'creator') {
      filter.isPrivateContestProblem = false;
    }

    if (difficulty) {
      if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid difficulty filter.',
        });
      }
      filter.difficulty = difficulty;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const problems = await Problem.find(filter)
      .populate('authorId', 'username email')
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10))
      .sort({ createdAt: -1 });

    const total = await Problem.countDocuments(filter);

    return res.json({
      success: true,
      problems,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
      },
    });
  } catch (error) {
    console.error('List problems error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch problems.',
    });
  }
});

// GET /:id - Fetch a single problem (Public)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid problem ID.',
      });
    }

    const problem = await Problem.findById(id).populate('authorId', 'username email');

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found.',
      });
    }

    // Access control for private contest problems
    if (problem.isPrivateContestProblem) {
      let hasAccess = false;
      if (req.user && req.user.role === 'creator') {
        hasAccess = true;
      } else {
        const now = new Date();
        const activeContest = await Contest.findOne({
          startTime: { $lte: now },
          endTime: { $gte: now },
          problems: problem._id,
        });
        if (activeContest) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This is a private contest problem.',
        });
      }
    }

    const testCases = await TestCase.find({ problemId: id, isSample: true });

    return res.json({
      success: true,
      problem: problem.toObject(),
      sampleTestCases: testCases,
    });
  } catch (error) {
    console.error('Fetch problem error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch problem details.',
    });
  }
});

module.exports = router;
