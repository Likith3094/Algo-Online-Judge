const { exec } = require("child_process");
const path = require("path");

const executeCpp = (filepath, inputPath, timeLimit = 2, memoryLimit = 256) => {
  const jobId = path.basename(filepath).split(".")[0];

  return new Promise((resolve, reject) => {
    const rootDir = path.resolve(__dirname).replace(/\\/g, "/");
    const command = `docker run --rm --network none --memory="${memoryLimit}m" --cpus="0.5" -v "${rootDir}/codes:/app/codes:ro" -v "${rootDir}/inputs:/app/inputs:ro" -v "${rootDir}/outputs:/app/outputs" judge-sandbox timeout ${timeLimit}s bash -c "g++ /app/codes/${path.basename(filepath)} -o /app/outputs/${jobId}.out && /app/outputs/${jobId}.out < /app/inputs/${path.basename(inputPath)}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 124) {
          reject("Time Limit Exceeded (TLE)");
        } else {
          reject({ error, stderr });
        }
      } else if (stderr) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
};

module.exports = {
  executeCpp,
};
