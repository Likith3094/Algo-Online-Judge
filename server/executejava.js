const { spawn } = require("child_process");
const path = require("path");

const executeJava = (filepath, inputPath, timeLimit = 2, memoryLimit = 256) => {
  const codeFile = path.basename(filepath);
  const inputFile = path.basename(inputPath);

  return new Promise((resolve, reject) => {
    const rootDir = path.resolve(__dirname).replace(/\\/g, "/");
    const args = [
      "run",
      "--rm",
      "--init",
      "--network", "none",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      `--memory=${memoryLimit}m`,
      "--cpus=0.5",
      "--pids-limit=100",
      "--read-only",
      "--user", "judgeuser",
      "--tmpfs", "/tmp:rw,exec,size=64m",
      "-v", `${rootDir}/codes/${codeFile}:/app/codes/${codeFile}:ro`,
      "-v", `${rootDir}/inputs/${inputFile}:/app/inputs/${inputFile}:ro`,
      process.env.DOCKER_IMAGE_NAME || "judge-sandbox",
      "timeout", `${Math.ceil(timeLimit) + 3}s`,
      "bash", "-c", `cp /app/codes/${codeFile} /tmp/Solution.java && javac /tmp/Solution.java && cd /tmp && java Solution < /app/inputs/${inputFile}`
    ];

    const child = spawn("docker", args);

    let stdoutData = "";
    let stderrData = "";
    let limitExceeded = false;

    // 10MB output limit safeguard
    const MAX_OUTPUT_LIMIT = 10 * 1024 * 1024;

    child.stdout.on("data", (data) => {
      stdoutData += data.toString();
      if (stdoutData.length > MAX_OUTPUT_LIMIT) {
        limitExceeded = true;
        child.kill();
        reject("Output Limit Exceeded (OLE)");
      }
    });

    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    child.on("close", (code) => {
      if (limitExceeded) return;
      if (code !== 0) {
        if (code === 124 || code === 143) {
          reject("Time Limit Exceeded (TLE)");
        } else {
          reject({ error: new Error(`Process exited with code ${code}`), stderr: stderrData });
        }
      } else {
        resolve(stdoutData);
      }
    });

    child.on("error", (err) => {
      if (limitExceeded) return;
      reject({ error: err, stderr: stderrData });
    });
  });
};

module.exports = {
  executeJava,
};
