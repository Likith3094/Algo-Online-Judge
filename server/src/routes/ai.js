const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const AiUsage = require('../models/AiUsage');
const Problem = require('../models/Problem');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const AI_USAGE_LIMIT = 3;

// Rate limit AI requests to prevent abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 requests per IP per minute
  message: {
    success: false,
    message: 'Too many AI requests. Please wait a minute before trying again.'
  },
});

// Helper to get or create AiUsage
const getUsage = async (userId, problemId) => {
  let usage = await AiUsage.findOne({ userId, problemId });
  if (!usage) {
    usage = new AiUsage({ userId, problemId, requestCount: 0 });
    await usage.save();
  }
  return usage;
};

// GET /api/ai/problems/:id/usage - Get current usage count for the problem
router.get('/problems/:id/usage', authenticateToken, async (req, res) => {
  try {
    const usage = await getUsage(req.user.id, req.params.id);
    return res.json({
      success: true,
      count: usage.requestCount,
      limit: AI_USAGE_LIMIT,
    });
  } catch (error) {
    console.error('AI usage check error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching usage.' });
  }
});

// POST /api/ai/problems/:id/help - Request AI hints for the problem
router.post('/problems/:id/help', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    const problemId = req.params.id;

    if (!code || !language) {
      return res.status(400).json({ success: false, message: 'Code and language are required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ success: false, message: 'AI features are not configured on this server.' });
    }

    // 1. Check Usage Limits
    const usage = await getUsage(req.user.id, problemId);
    if (usage.requestCount >= AI_USAGE_LIMIT) {
      return res.status(403).json({
        success: false,
        message: `You have reached the limit of ${AI_USAGE_LIMIT} AI requests for this problem.`,
      });
    }

    // 2. Fetch Problem
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found.' });
    }

    // 3. Increment Usage
    usage.requestCount += 1;
    await usage.save();

    // 4. Construct Prompt
    const prompt = `
You are an expert programming tutor assisting a student with an algorithmic coding problem.
Your goal is to guide the student towards the correct answer WITHOUT giving them the direct solution or writing the code for them.

**Problem Statement:**
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.description}
Sample Input: ${problem.sampleInput || ''}
Sample Output: ${problem.sampleOutput || ''}

**Student's Current Code (${language}):**
\`\`\`${language}
${code}
\`\`\`

**Instructions:**
1. Briefly summarize what their code is currently doing (if anything).
2. Point out any logical flaws, edge cases missed, or syntax errors in their current code.
3. Provide a hint or suggest a better algorithmic approach.
4. DO NOT provide the complete corrected code. It's okay to show small snippets of syntax if they are struggling with language features, but not the algorithm itself.
5. Format your response beautifully in Markdown.
`;

    // 5. Call Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // We use gemini-2.5-flash as the default fast and cost-effective model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const hint = response.text;

    return res.json({
      success: true,
      hint,
      usage: usage.requestCount,
      limit: AI_USAGE_LIMIT,
    });
  } catch (error) {
    console.error('AI hint error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while generating the hint.' });
  }
});

module.exports = router;
