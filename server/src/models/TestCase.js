const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem ID is required'],
      index: true,
    },
    inputData: {
      type: String,
      required: [true, 'Input data is required'],
    },
    expectedOutput: {
      type: String,
      required: [true, 'Expected output is required'],
    },
    isSample: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
testCaseSchema.index({ problemId: 1, isSample: 1 });

module.exports = mongoose.model('TestCase', testCaseSchema);
