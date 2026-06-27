const { execSync } = require('child_process');

const verifyDockerSandbox = () => {
  const imageName = process.env.DOCKER_IMAGE_NAME || 'judge-sandbox';
  
  try {
    // Check if docker is available
    execSync('docker --version', { stdio: 'ignore' });
  } catch (err) {
    console.warn(`[WARNING] Docker is not installed or not running. Code execution will fail!`);
    return;
  }

  try {
    // Check if the image exists
    const result = execSync(`docker images -q ${imageName}`).toString().trim();
    if (!result) {
      console.warn(`[WARNING] Docker image '${imageName}' not found. Please run: docker build -t ${imageName} .`);
    } else {
      console.log(`✓ Docker sandbox image '${imageName}' found.`);
    }
  } catch (err) {
    console.warn(`[WARNING] Failed to verify Docker sandbox image '${imageName}'.`);
  }
};

module.exports = { verifyDockerSandbox };
