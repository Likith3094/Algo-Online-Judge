const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Problem = require('../models/Problem');
const TestCase = require('../models/TestCase');
const Contest = require('../models/Contest');
const Submission = require('../models/Submission');
const { generateFile } = require('../../generatefile');
const { generateInputFile } = require('../../generateinputfile');
const { executeCpp } = require('../../executecpp');
const { executePy } = require('../../executepy');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

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
      timeLimit: Number(timeLimit) || 2,
      memoryLimit: Number(memoryLimit) || 256,
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

// POST /:id/submit - Execute user code against test cases in Docker sandbox
router.post('/:id/submit', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { code, language, contestId } = req.body;

  if (!code || !language) {
    return res.status(400).json({
      success: false,
      message: 'Code and language are required.',
    });
  }

  if (language !== 'cpp' && language !== 'python') {
    return res.status(400).json({
      success: false,
      message: 'Currently, only C++ and Python code submissions are supported with Docker sandboxing.',
    });
  }

  try {
    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found.',
      });
    }

    // Fetch all test cases for this problem
    let testCases = await TestCase.find({ problemId: id });
    
    // If no test cases are registered, fall back to the problem's sample case
    if (testCases.length === 0) {
      testCases = [
        {
          inputData: problem.sampleInput,
          expectedOutput: problem.sampleOutput,
          isSample: true,
        }
      ];
    }

    let verdict = 'AC';
    let executionTime = 0;
    let failedTestCase = null;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      let filepath;
      let inputPath;

      try {
        const fileExt = language === 'cpp' ? 'cpp' : 'py';
        filepath = await generateFile(fileExt, code);
        inputPath = await generateInputFile(tc.inputData);

        const timeLimit = problem.timeLimit || 2;
        const memoryLimit = problem.memoryLimit || 256;

        const startTime = Date.now();
        let stdout;
        if (language === 'cpp') {
          stdout = await executeCpp(filepath, inputPath, timeLimit, memoryLimit);
        } else {
          stdout = await executePy(filepath, inputPath, timeLimit, memoryLimit);
        }
        const duration = Date.now() - startTime;
        if (duration > executionTime) {
          executionTime = duration;
        }

        const cleanOutput = stdout.toString().trim().replace(/\r\n/g, '\n').replace(/\n$/, '');
        const cleanExpected = tc.expectedOutput.toString().trim().replace(/\r\n/g, '\n').replace(/\n$/, '');

        if (cleanOutput !== cleanExpected) {
          verdict = 'WA';
          failedTestCase = {
            index: i + 1,
            input: tc.isSample ? tc.inputData : null,
            expected: tc.isSample ? tc.expectedOutput : null,
            actual: tc.isSample ? cleanOutput : null,
            isSample: tc.isSample || false,
          };
          break;
        }
      } catch (err) {
        if (err === 'Time Limit Exceeded (TLE)') {
          verdict = 'TLE';
        } else {
          const errorMsg = typeof err === 'string' ? err : (err.stderr || err.message || '');
          if (language === 'cpp' && errorMsg.includes('error:')) {
            verdict = 'CE';
          } else if (language === 'python' && (errorMsg.includes('SyntaxError') || errorMsg.includes('IndentationError') || errorMsg.includes('TabError'))) {
            verdict = 'CE';
          } else {
            verdict = 'RE';
          }
        }
        failedTestCase = {
          index: i + 1,
          input: tc.isSample ? tc.inputData : null,
          expected: tc.isSample ? tc.expectedOutput : null,
          error: typeof err === 'string' ? err : (err.stderr || err.message || 'Execution error'),
          isSample: tc.isSample || false,
        };
        break;
      } finally {
        try {
          if (filepath && fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
          if (inputPath && fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
          }
          if (filepath && language === 'cpp') {
            const jobId = path.basename(filepath).split('.')[0];
            const outPath = path.join(__dirname, '..', '..', 'outputs', `${jobId}.out`);
            if (fs.existsSync(outPath)) {
              fs.unlinkSync(outPath);
            }
          }
        } catch (cleanupErr) {
          console.error('File cleanup error:', cleanupErr);
        }
      }
    }

    const submission = new Submission({
      userId: req.user.id,
      problemId: id,
      contestId: contestId || null,
      code,
      language,
      verdict,
      executionTime,
      memoryUsage: 0,
    });

    await submission.save();

    return res.json({
      success: true,
      verdict,
      executionTime,
      submission,
      failedTestCase,
    });

  } catch (error) {
    console.error('Submission execution error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during code execution.',
    });
  }
});

module.exports = router;
