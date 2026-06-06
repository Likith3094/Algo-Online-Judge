const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Problem title is required'],
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Problem description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
    },
    constraints: {
      type: String,
      required: [true, 'Problem constraints are required'],
    },
    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: 'Difficulty must be Easy, Medium, or Hard',
      },
      required: [true, 'Difficulty level is required'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A problem can have at most 10 tags',
      },
    },
    sampleInput: {
      type: String,
      required: [true, 'Sample input is required'],
    },
    sampleOutput: {
      type: String,
      required: [true, 'Sample output is required'],
    },
    authorCode: {
      type: String,
      required: [true, 'Author solution code is required'],
    },
    points: {
      type: Number,
      required: [true, 'Points for solving are required'],
      min: [1, 'Points must be at least 1'],
      max: [1000, 'Points must not exceed 1000'],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author ID is required'],
    },
    isPrivateContestProblem: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
problemSchema.index({ difficulty: 1, tags: 1 });
problemSchema.index({ authorId: 1 });
problemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Problem', problemSchema);
