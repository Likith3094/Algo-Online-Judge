const { exec } = require("child_process");
const path = require("path");

const executePy = (filepath, inputPath, timeLimit = 2, memoryLimit = 256) => {
  return new Promise((resolve, reject) => {
    const rootDir = path.resolve(__dirname).replace(/\\/g, "/");
    const command = `docker run --rm --network none --memory="${memoryLimit}m" --cpus="0.5" -v "${rootDir}/codes:/app/codes:ro" -v "${rootDir}/inputs:/app/inputs:ro" -v "${rootDir}/outputs:/app/outputs" judge-sandbox timeout ${timeLimit}s bash -c "python3 /app/codes/${path.basename(filepath)} < /app/inputs/${path.basename(inputPath)}"`;

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
  executePy,
};
