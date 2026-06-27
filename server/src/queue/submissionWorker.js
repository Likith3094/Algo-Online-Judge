const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const fs = require('fs');
const mongoose = require('mongoose');
const { executeCpp } = require('../../executecpp');
const { executePy } = require('../../executepy');
const { executeJava } = require('../../executejava');
const { generateFile } = require('../../generatefile');
const { generateInputFile } = require('../../generateinputfile');
const Submission = require('../models/Submission');
const TestCase = require('../models/TestCase');
const Problem = require('../models/Problem');

const processJob = async (job) => {
  const { code, language, type, problemId, userId, customInput, contestId } = job.data;
  let executionTime = 0;
  let verdict = 'AC';
  let failedTestCase = null;
  let finalOutput = ''; // used for 'run' type

  // Fetch problem & test cases if it's a submission or run-against-testcases
  let testCases = [];
  let problem = null;
  if (problemId) {
    problem = await Problem.findById(problemId);
  }

  if (type === 'submit' && problemId) {
    testCases = await TestCase.find({ problemId });
    if (testCases.length === 0 && problem) {
      testCases = [
        {
          inputData: problem.sampleInput,
          expectedOutput: problem.sampleOutput,
          isSample: true,
        }
      ];
    }
  } else if (type === 'run') {
    // If user provided custom input, run against that. Otherwise, run against sample test cases.
    if (customInput !== undefined && customInput !== null && customInput.trim() !== '') {
      testCases = [
        {
          inputData: customInput,
          expectedOutput: null, // we don't assert, we just return output
          isSample: false,
          isCustom: true,
        }
      ];
    } else if (problemId) {
      const foundCases = await TestCase.find({ problemId, isSample: true });
      if (foundCases.length === 0 && problem) {
        testCases = [
          {
            inputData: problem.sampleInput,
            expectedOutput: null,
            isSample: true,
            isCustom: true, // Act like custom input (no AC/WA check)
          }
        ];
      } else {
        testCases = foundCases.map(tc => ({
          inputData: tc.inputData,
          expectedOutput: null,
          isSample: true,
          isCustom: true, // Act like custom input
        }));
      }
    }
  }

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    let filepath, inputPath;
    try {
      const fileExt = language === 'cpp' ? 'cpp' : language === 'python' ? 'py' : 'java';
      filepath = await generateFile(fileExt, code);
      inputPath = await generateInputFile(tc.inputData);

      const timeLimit = problem ? (problem.timeLimit || 2) : 2;
      const memoryLimit = problem ? (problem.memoryLimit || 256) : 256;

      const startTime = Date.now();
      let stdout;
      if (language === 'cpp') {
        stdout = await executeCpp(filepath, inputPath, timeLimit, memoryLimit);
      } else if (language === 'python') {
        stdout = await executePy(filepath, inputPath, timeLimit, memoryLimit);
      } else {
        stdout = await executeJava(filepath, inputPath, timeLimit, memoryLimit);
      }
      const duration = Date.now() - startTime;
      if (duration > executionTime) executionTime = duration;

      if (tc.isCustom) {
        if (testCases.length > 1) {
          finalOutput += `--- Sample ${i + 1} ---\n${stdout}\n\n`;
        } else {
          finalOutput = stdout;
        }
        verdict = 'Success';
      } else {
        const cleanOutput = stdout.toString().trim().replace(/\r\n/g, '\n').replace(/\n$/, '');
        const cleanExpected = tc.expectedOutput ? tc.expectedOutput.toString().trim().replace(/\r\n/g, '\n').replace(/\n$/, '') : '';

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
      }
    } catch (err) {
      if (err === 'Time Limit Exceeded (TLE)') {
        verdict = 'TLE';
      } else if (err === 'Output Limit Exceeded (OLE)') {
        verdict = 'OLE';
      } else {
        const errorMsg = typeof err === 'string' ? err : (err.stderr || err.message || '');
        if (language === 'cpp' && errorMsg.includes('error:')) {
          verdict = 'CE';
        } else if (language === 'python' && (errorMsg.includes('SyntaxError') || errorMsg.includes('IndentationError') || errorMsg.includes('TabError'))) {
          verdict = 'CE';
        } else if (language === 'java' && errorMsg.includes('error:')) {
          verdict = 'CE';
        } else {
          verdict = 'RE';
        }
      }
      
      let rawError = typeof err === 'string' ? err : (err.stderr || err.message || 'Execution error');
      let cleanError = rawError
        .replace(/\/app\/codes\/[a-f0-9\-]+\.(cpp|py|java)/g, 'solution.$1')
        .replace(/\/app\/codes\//g, '')
        .replace(/\/tmp\/[a-f0-9\-]+\.out/g, 'solution.out')
        .replace(/\/tmp\/Solution\.java/g, 'Solution.java')
        .replace(/\/app\/inputs\/[a-f0-9\-]+\.txt/g, 'input.txt')
        .replace(/\/home\/[a-z0-9]+\/aports\/[^\s]+?\/libstdc\+\+-v3\/include\//g, '');
        
      if (tc.isCustom) {
        if (testCases.length > 1) {
          finalOutput += `--- Sample ${i + 1} ---\n${cleanError}\n\n`;
        } else {
          finalOutput = cleanError;
        }
        // Keep verdict as CE/RE/TLE/OLE
      } else {
        failedTestCase = {
          index: i + 1,
          input: tc.isSample ? tc.inputData : null,
          expected: tc.isSample ? tc.expectedOutput : null,
          error: cleanError,
          isSample: tc.isSample || false,
        };
      }
      break;
    } finally {
      try {
        if (filepath) await fs.promises.access(filepath).then(() => fs.promises.unlink(filepath)).catch(() => {});
        if (inputPath) await fs.promises.access(inputPath).then(() => fs.promises.unlink(inputPath)).catch(() => {});
      } catch (e) {}
    }
  }

  // If this was a real submit, save to DB
  let submissionObj = null;
  if (type === 'submit' && userId && problemId) {
    const submission = new Submission({
      userId,
      problemId,
      contestId: contestId || null,
      code,
      language,
      verdict,
      executionTime,
      memoryUsage: 0,
    });
    await submission.save();
    submissionObj = submission;
  }

  return {
    success: true,
    verdict,
    executionTime,
    submission: submissionObj,
    failedTestCase,
    output: finalOutput
  };
};

const submissionWorker = new Worker('SubmissionQueue', processJob, {
  connection: redisConnection,
  concurrency: 5, // Process up to 5 jobs concurrently
});

submissionWorker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with verdict ${result.verdict}`);
});

submissionWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed natively:`, err);
});

module.exports = submissionWorker;
