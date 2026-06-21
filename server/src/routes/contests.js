const express = require('express');
const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const Submission = require('../models/Submission');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes in this file
router.use(authenticateToken);

// GET / - List all contests with optional status filter
router.get('/', async (req, res) => {
  try {
    const { status, limit = 10, skip = 0 } = req.query;
    const now = new Date();
    const filter = {};

    if (status === 'upcoming') {
      filter.startTime = { $gt: now };
    } else if (status === 'ongoing') {
      filter.startTime = { $lte: now };
      filter.endTime = { $gte: now };
    } else if (status === 'completed') {
      filter.endTime = { $lt: now };
    }

    const contests = await Contest.find(filter)
      .populate('creatorId', 'username email')
      .populate('problems', 'title difficulty points')
      .limit(parseInt(limit, 10))
      .skip(parseInt(skip, 10))
      .sort({ startTime: 1 });

    const sanitizedContests = contests.map((contest) => {
      const contestObj = contest.toObject();
      const isCreator = req.user && req.user.id === contest.creatorId.toString();
      if (!isCreator && now < contest.startTime) {
        contestObj.problems = [];
      }
      return contestObj;
    });

    const total = await Contest.countDocuments(filter);

    return res.json({
      success: true,
      contests: sanitizedContests,
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

// GET /:id - Get full contest details (including dynamic leaderboard calculations)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest ID.',
      });
    }

    const contest = await Contest.findById(id)
      .populate('creatorId', 'username email')
      .populate('problems')
      .populate('registeredUsers', 'username email');

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found.',
      });
    }

    // Calculate leaderboard based on AC submissions for this contest
    const submissions = await Submission.find({ contestId: id, verdict: 'AC' })
      .populate('userId', 'username')
      .populate('problemId', 'points');

    const contestStart = new Date(contest.startTime);
    const userMap = {};

    for (const sub of submissions) {
      if (!sub.userId) continue;
      const userIdStr = sub.userId._id.toString();
      const probIdStr = sub.problemId._id.toString();
      const points = sub.problemId.points || 100;
      const timeDiffMin = Math.max(0, Math.floor((new Date(sub.submittedAt) - contestStart) / (1000 * 60)));

      if (!userMap[userIdStr]) {
        userMap[userIdStr] = {
          userId: {
            _id: sub.userId._id,
            username: sub.userId.username,
          },
          score: 0,
          totalTime: 0,
          solvedProblems: {},
        };
      }

      const userEntry = userMap[userIdStr];
      if (userEntry.solvedProblems[probIdStr] === undefined) {
        userEntry.solvedProblems[probIdStr] = {
          points: points,
          time: timeDiffMin,
        };
      } else {
        if (timeDiffMin < userEntry.solvedProblems[probIdStr].time) {
          userEntry.solvedProblems[probIdStr].time = timeDiffMin;
        }
      }
    }

    const leaderboard = Object.values(userMap).map(userEntry => {
      let score = 0;
      let totalTime = 0;
      for (const prob of Object.values(userEntry.solvedProblems)) {
        score += prob.points;
        totalTime += prob.time;
      }
      return {
        userId: userEntry.userId,
        score,
        totalTime,
      };
    });

    // Sort leaderboard by score descending, then by totalTime ascending
    leaderboard.sort((a, b) => b.score - a.score || a.totalTime - b.totalTime);

    // Compute status field dynamically for the frontend
    const now = new Date();
    let status = 'upcoming';
    if (now >= contest.startTime && now <= contest.endTime) {
      status = 'ongoing';
    } else if (now > contest.endTime) {
      status = 'completed';
    }

    const contestObj = contest.toObject();
    contestObj.status = status;
    contestObj.leaderboard = leaderboard;

    // Hide problems and leaderboard if contest has not started yet and user is not the creator
    const isCreator = req.user && req.user.id === contest.creatorId.toString();
    if (!isCreator && now < contest.startTime) {
      contestObj.problems = [];
      contestObj.leaderboard = [];
    }

    return res.json({
      success: true,
      contest: contestObj,
    });
  } catch (error) {
    console.error('Get contest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve contest details.',
    });
  }
});

// POST /:id/register - Register for a contest (User only)
router.post('/:id/register', requireRole('user'), async (req, res) => {
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

    const now = new Date();
    if (now > new Date(contest.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Contest has already ended.',
      });
    }

    // Check if user is already registered
    const isAlreadyRegistered = contest.registeredUsers.some(
      (userId) => userId.toString() === req.user.id
    );

    if (isAlreadyRegistered) {
      return res.status(409).json({
        success: false,
        message: 'You are already registered for this contest.',
      });
    }

    contest.registeredUsers.push(req.user.id);
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

// POST / - Creates a contest configuration profile (Creator only)
router.post('/', requireRole('creator'), async (req, res) => {
  try {
    const { title, description, startTime, endTime, problems } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, startTime, and endTime are required.',
      });
    }

    const contest = new Contest({
      title,
      description: description || '',
      creatorId: req.user.id,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      problems: Array.isArray(problems) ? problems : [],
      registeredUsers: [],
    });

    await contest.save();

    return res.status(201).json({
      success: true,
      message: 'Contest created successfully.',
      contest,
    });
  } catch (error) {
    console.error('Create contest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create contest.',
    });
  }
});

// PUT /:id - Creator-only update endpoint (Creator only)
router.put('/:id', requireRole('creator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, problems } = req.body;

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

    // Ensure only the creator of the contest can modify it
    if (contest.creatorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own contests.',
      });
    }

    if (title !== undefined) contest.title = title;
    if (description !== undefined) contest.description = description;
    if (startTime !== undefined) contest.startTime = new Date(startTime);
    if (endTime !== undefined) contest.endTime = new Date(endTime);
    if (problems !== undefined) contest.problems = Array.isArray(problems) ? problems : [];

    await contest.save();

    return res.json({
      success: true,
      message: 'Contest updated successfully.',
      contest,
    });
  } catch (error) {
    console.error('Update contest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update contest.',
    });
  }
});

// DELETE /:id - Creator-only deletion endpoint (Creator only)
router.delete('/:id', requireRole('creator'), async (req, res) => {
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

    // Ensure only the creator of the contest can delete it
    if (contest.creatorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own contests.',
      });
    }

    await Contest.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Contest deleted successfully.',
    });
  } catch (error) {
    console.error('Delete contest error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete contest.',
    });
  }
});

module.exports = router;
