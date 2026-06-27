const express = require('express');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const TestCase = require('../models/TestCase');
const Contest = require('../models/Contest');
const Submission = require('../models/Submission');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for execution and submission endpoints to prevent DoS via Docker containers
const executionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // limit each IP to 15 execution requests per minute
  message: {
    success: false,
    message: 'Too many compilation requests. Please wait a minute before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// POST / - Create a new problem (Creator only)
router.post('/', authenticateToken, requireRole('creator'), async (req, res) => {
  try {
    const { title, description, constraints, difficulty, tags, sampleInput, sampleOutput, authorCode, points, isPrivateContestProblem, testCases, timeLimit, memoryLimit } =
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
      timeLimit: Math.min(Math.max(Number(timeLimit) || 2, 1), 10),
      memoryLimit: Math.min(Math.max(Number(memoryLimit) || 256, 128), 1024),
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

    // Save additional test cases if provided
    if (Array.isArray(testCases) && testCases.length > 0) {
      const tcObjs = testCases.map((tc) => ({
        problemId: problem._id,
        inputData: tc.inputData,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isSample === true || tc.isSample === 'true',
      }));
      await TestCase.insertMany(tcObjs);
    }

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
    const safeLimitVal = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const safeSkipVal = Math.max(parseInt(skip, 10) || 0, 0);
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
      // Escape special regex characters to prevent ReDoS attacks
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const problems = await Problem.find(filter)
      .select('-authorCode')
      .populate('authorId', 'username')
      .limit(safeLimitVal)
      .skip(safeSkipVal)
      .sort({ createdAt: -1 });

    const total = await Problem.countDocuments(filter);

    let solvedProblemIds = new Set();
    let attemptedProblemIds = new Set();

    if (req.user) {
      const submissions = await Submission.find({
        userId: req.user.id,
        problemId: { $in: problems.map((p) => p._id) },
      }).select('problemId verdict');

      submissions.forEach((sub) => {
        const pIdStr = sub.problemId.toString();
        if (sub.verdict === 'AC') {
          solvedProblemIds.add(pIdStr);
        } else {
          attemptedProblemIds.add(pIdStr);
        }
      });
    }

    const problemsWithStatus = problems.map((problem) => {
      const pIdStr = problem._id.toString();
      const probObj = problem.toObject();
      probObj.status = solvedProblemIds.has(pIdStr)
        ? 'solved'
        : attemptedProblemIds.has(pIdStr)
        ? 'attempted'
        : 'unsolved';
      return probObj;
    });

    return res.json({
      success: true,
      problems: problemsWithStatus,
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

    const problem = await Problem.findById(id).populate('authorId', 'username');

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
      } else if (req.user) {
        const now = new Date();
        // Allow access if there exists any contest containing this problem where:
        // 1. The contest has already ended
        // OR
        // 2. The contest is currently active AND the user is registered
        const allowedContest = await Contest.findOne({
          problems: problem._id,
          $or: [
            { endTime: { $lt: now } },
            {
              startTime: { $lte: now },
              endTime: { $gte: now },
              registeredUsers: req.user.id,
            }
          ]
        });
        if (allowedContest) {
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

    let userStatus = 'unsolved';
    if (req.user) {
      const submissions = await Submission.find({
        userId: req.user.id,
        problemId: problem._id,
      }).select('verdict');

      const hasAC = submissions.some((sub) => sub.verdict === 'AC');
      if (hasAC) {
        userStatus = 'solved';
      } else if (submissions.length > 0) {
        userStatus = 'attempted';
      }
    }

    const problemObj = problem.toObject();
    // Only expose authorCode to the problem's author
    const isAuthor = req.user && problem.authorId && req.user.id === problem.authorId.toString();
    if (!isAuthor) {
      delete problemObj.authorCode;
    }

    return res.json({
      success: true,
      problem: problemObj,
      sampleTestCases: testCases,
      status: userStatus,
    });
  } catch (error) {
    console.error('Fetch problem error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch problem details.',
    });
  }
});

// POST /:id/submit - Execute user code against test cases in Docker sandbox
router.post('/:id/submit', authenticateToken, executionLimiter, async (req, res) => {
  const { id } = req.params;
  const { code, language, contestId } = req.body;

  if (!code || !language) {
    return res.status(400).json({ success: false, message: 'Code and language are required.' });
  }

  if (code.length > 100000) {
    return res.status(400).json({ success: false, message: 'Code size exceeds the maximum allowed limit (100KB).' });
  }

  if (language !== 'cpp' && language !== 'python' && language !== 'java') {
    return res.status(400).json({ success: false, message: 'Currently, only C++, Python, and Java code submissions are supported with Docker sandboxing.' });
  }

  // Validate contestId if provided
  if (contestId) {
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({ success: false, message: 'Invalid contest ID.' });
    }
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found.' });
    }
    const now = new Date();
    if (now < contest.startTime || now > contest.endTime) {
      return res.status(400).json({ success: false, message: 'Contest is not currently active.' });
    }
    if (!contest.registeredUsers.some(uid => uid.toString() === req.user.id)) {
      return res.status(403).json({ success: false, message: 'You are not registered for this contest.' });
    }
  }

  try {
    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found.' });
    }

    const submissionQueue = require('../queue/submissionQueue');
    const job = await submissionQueue.add('submit-job', {
      type: 'submit',
      code,
      language,
      problemId: id,
      userId: req.user.id,
      contestId: contestId || null
    });

    return res.json({
      success: true,
      message: 'Submission added to queue',
      jobId: job.id
    });

  } catch (error) {
    console.error('Queue submission error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error queuing code execution.' });
  }
});

// POST /:id/run - Compile and run user code against a custom input in Docker sandbox (Via Queue)
router.post('/:id/run', authenticateToken, executionLimiter, async (req, res) => {
  const { id } = req.params;
  const { code, language, customInput } = req.body;

  if (!code || !language) {
    return res.status(400).json({ success: false, message: 'Code and language are required.' });
  }

  if (code.length > 100000) {
    return res.status(400).json({ success: false, message: 'Code size exceeds the maximum allowed limit.' });
  }

  try {
    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found.' });
    }

    const submissionQueue = require('../queue/submissionQueue');
    const job = await submissionQueue.add('run-job', {
      type: 'run',
      code,
      language,
      problemId: id,
      userId: req.user.id,
      customInput: customInput || ''
    });

    return res.json({
      success: true,
      message: 'Run task added to queue',
      jobId: job.id
    });

  } catch (error) {
    console.error('Queue run error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error queuing code execution.' });
  }
});

// DELETE /:id - Delete a problem (Creator only)
router.delete('/:id', authenticateToken, requireRole('creator'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid problem ID.' });
    }

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found.' });
    }

    if (problem.authorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only delete your own problems.' });
    }

    await Problem.findByIdAndDelete(id);
    await TestCase.deleteMany({ problemId: id });
    await Submission.deleteMany({ problemId: id });

    return res.json({ success: true, message: 'Problem deleted successfully.' });
  } catch (error) {
    console.error('Delete problem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete problem.' });
  }
});

module.exports = router;
