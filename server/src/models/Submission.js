const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', default: null },
  code: { type: String, required: true },
  language: { type: String, required: true, enum: ['cpp', 'python', 'java'] },
  verdict: { type: String, required: true, enum: ['AC', 'WA', 'TLE', 'RE', 'CE', 'OLE'] },
  executionTime: { type: Number, default: 0 },
  memoryUsage: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Submission', submissionSchema);
