const express = require('express');
const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const Problem = require('../models/Problem');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST / - Create a new contest (Creator only)
router.post('/', authenticateToken, requireRole('creator'), async (req, res) => {
  try {
    const { title, description, startTime, endTime, problems = [] } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, startTime, and endTime are required.',
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start <= now) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be in the future.',
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time.',
      });
    }

    if (Array.isArray(problems) && problems.length > 0) {
      const validProblems = problems.every((id) => mongoose.Types.ObjectId.isValid(id));

      if (!validProblems) {
        return res.status(400).json({
          success: false,
          message: 'One or more problem IDs are invalid.',
        });
      }

      const validProblemCount = await Problem.countDocuments({ _id: { $in: problems } });

      if (validProblemCount !== problems.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected problems do not exist.',
        });
      }
    }

    const contest = new Contest({
      title: title.trim(),
      description: description ? description.trim() : '',
      creatorId: req.user.id,
      startTime: start,
      endTime: end,
      problems: Array.isArray(problems) ? problems : [],
      status: start > now ? 'upcoming' : 'ongoing',
    });

    await contest.save();
    await contest.populate('creatorId', 'username email');
    await contest.populate('problems', 'title difficulty points');

    return res.status(201).json({
      success: true,
      message: 'Contest created successfully.',
      contest: contest.toObject(),
    });
  } catch (error) {
    console.error('Create contest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create contest. Please try again later.',
    });
  }
});

// GET / - List active and upcoming contests (Public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { skip = 0, limit = 10 } = req.query;

    // Fetch active (ongoing) and upcoming contests
    const contests = await Contest.find({
      status: { $in: ['upcoming', 'ongoing'] }
    })
      .populate('creatorId', 'username email')
      .populate('problems', 'title difficulty points')
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10))
      .sort({ startTime: 1 });

    const total = await Contest.countDocuments({
      status: { $in: ['upcoming', 'ongoing'] }
    });

    return res.json({
      success: true,
      contests,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
      },
    });
  } catch (error) {
    console.error('List contests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contests.',
    });
  }
});

// POST /:id/register - Register for a contest (User only)
router.post('/:id/register', authenticateToken, requireRole('user'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest ID.',
      });
    }

    const contest = await Contest.findById(id);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found.',
      });
    }

    if (contest.registeredUsers.includes(req.user.id)) {
      return res.status(409).json({
        success: false,
        message: 'You are already registered for this contest.',
      });
    }

    if (new Date() > contest.endTime) {
      return res.status(400).json({
        success: false,
        message: 'This contest has already ended.',
      });
    }

    contest.registeredUsers.push(req.user.id);

    // Initialize leaderboard slot
    contest.leaderboard.push({
      userId: req.user.id,
      score: 0,
      totalTime: 0,
    });

    await contest.save();

    return res.json({
      success: true,
      message: 'Successfully registered for the contest.',
    });
  } catch (error) {
    console.error('Register contest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register for contest.',
    });
  }
});

module.exports = router;
