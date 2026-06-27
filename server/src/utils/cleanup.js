const fs = require('fs');
const path = require('path');

const codesDir = path.join(__dirname, '../../codes');
const inputsDir = path.join(__dirname, '../../inputs');

const cleanupOldFiles = async (dir) => {
  if (!fs.existsSync(dir)) return;
  try {
    const files = await fs.promises.readdir(dir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.promises.stat(filePath);
      // Delete files older than 1 hour (3600000 ms)
      if (now - stat.mtimeMs > 3600000) {
        await fs.promises.unlink(filePath).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`Failed to cleanup directory ${dir}:`, err.message);
  }
};

const startCleanupJob = () => {
  console.log('✓ File cleanup job initialized (runs every 1 hour)');
  setInterval(() => {
    cleanupOldFiles(codesDir);
    cleanupOldFiles(inputsDir);
  }, 60 * 60 * 1000);
};

module.exports = startCleanupJob;
