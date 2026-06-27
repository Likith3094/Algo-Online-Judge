const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
      index: true,
    },
    requestCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index to quickly find a user's usage for a specific problem
aiUsageSchema.index({ userId: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.model('AiUsage', aiUsageSchema);
