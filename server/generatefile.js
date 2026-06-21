const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dirCodes = path.join(__dirname, 'codes');

if (!fs.existsSync(dirCodes)) {
    fs.mkdirSync(dirCodes, { recursive: true });
}

// Creates a temporary file with user's code content
const generateFile = async (format, content) => {
    const jobID = crypto.randomUUID();
    const filename = `${jobID}.${format}`;
    const filePath = path.join(dirCodes, filename);
    await fs.writeFileSync(filePath, content);
    return filePath;
};

module.exports = {
    generateFile,
};
