const express = require('express');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRY = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Rate limiter for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 auth requests per minute
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait a minute before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const setCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
};

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role } = req.body;

    // Input validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    // Normalize input
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Validate username
    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 30 characters.',
      });
    }

    // Validate email format
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address.',
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    // Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or username already exists.',
      });
    }

    // Create new user, allowing frontend to dictate the role
    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash: password,
      role: role === 'creator' ? 'creator' : 'user',
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Set secure httpOnly cookie
    setCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.',
    });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user and include passwordHash for comparison
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Set secure httpOnly cookie
    setCookie(res, token);

    return res.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.',
    });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not fetch user information.',
    });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const Submission = require('../models/Submission');
    const Problem = require('../models/Problem');

    const userObj = await User.findById(req.user.id);
    if (!userObj) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get total submissions count for the user
    const totalSubmissions = await Submission.countDocuments({ userId: req.user.id });

    // Get number of solved questions (distinct problems with AC verdict)
    const solvedProblemIds = await Submission.distinct('problemId', {
      userId: req.user.id,
      verdict: 'AC'
    });
    const totalSolved = solvedProblemIds.length;

    // Get difficulty breakdowns for solved problems
    const solvedProblems = await Problem.find({ _id: { $in: solvedProblemIds } }, 'difficulty');
    const difficultyStats = {
      Easy: 0,
      Medium: 0,
      Hard: 0
    };
    solvedProblems.forEach(p => {
      if (difficultyStats[p.difficulty] !== undefined) {
        difficultyStats[p.difficulty]++;
      }
    });

    // Get total unique problems submitted to
    const totalAttempted = (await Submission.distinct('problemId', { userId: req.user.id })).length;

    // Calculate submission verdicts breakdown
    const submissions = await Submission.find({ userId: req.user.id }, 'verdict');
    const verdictStats = { AC: 0, WA: 0, TLE: 0, RE: 0, CE: 0 };
    submissions.forEach(sub => {
      if (verdictStats[sub.verdict] !== undefined) {
        verdictStats[sub.verdict]++;
      }
    });

    // Get user's contest registrations and statuses
    const Contest = require('../models/Contest');
    const registeredContests = await Contest.find({ registeredUsers: req.user.id }, 'title startTime endTime');
    
    const now = new Date();
    const contestHistory = registeredContests.map(c => {
      let status = 'Upcoming';
      if (now >= new Date(c.startTime) && now <= new Date(c.endTime)) {
        status = 'Ongoing';
      } else if (now > new Date(c.endTime)) {
        status = 'Completed';
      }
      return {
        id: c._id,
        title: c.title,
        startTime: c.startTime,
        endTime: c.endTime,
        status
      };
    });

    // If user is a creator, aggregate creator-specific metrics
    let creatorStats = null;
    if (userObj.role === 'creator') {
      const createdContests = await Contest.find({ creatorId: req.user.id })
        .populate('problems', 'title')
        .select('title startTime endTime registeredUsers');
      
      const authoredProblems = await Problem.find({ authorId: req.user.id }, 'title difficulty points createdAt');

      creatorStats = {
        contestsCreatedCount: createdContests.length,
        problemsAuthoredCount: authoredProblems.length,
        contests: createdContests.map(c => {
          let status = 'Upcoming';
          if (now >= new Date(c.startTime) && now <= new Date(c.endTime)) {
            status = 'Ongoing';
          } else if (now > new Date(c.endTime)) {
            status = 'Completed';
          }
          return {
            id: c._id,
            title: c.title,
            startTime: c.startTime,
            endTime: c.endTime,
            registrationsCount: c.registeredUsers?.length || 0,
            problemsCount: c.problems?.length || 0,
            status
          };
        }),
        problems: authoredProblems
      };
    }

    return res.json({
      success: true,
      profile: {
        username: userObj.username,
        email: userObj.email,
        role: userObj.role,
        createdAt: userObj.createdAt,
        stats: {
          totalSubmissions,
          totalSolved,
          totalAttempted,
          difficulty: difficultyStats,
          verdicts: verdictStats,
          contests: contestHistory,
          creator: creatorStats
        }
      }
    });
  } catch (error) {
    console.error('Fetch profile stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not fetch profile statistics.'
    });
  }
});

module.exports = router;
