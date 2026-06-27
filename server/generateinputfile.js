const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dirInputs = path.join(__dirname, 'inputs');

if (!fs.existsSync(dirInputs)) {
    fs.mkdirSync(dirInputs, { recursive: true });
}

// Creates a temporary file with user's input data
const generateInputFile = async (input) => {
    const jobID = crypto.randomUUID();
    const input_filename = `${jobID}.txt`;
    const input_filePath = path.join(dirInputs, input_filename);
    
    // Normalize line endings to UNIX (\n) to prevent \r carriage return issues in Linux execution
    const sanitizedInput = input ? input.toString().replace(/\r\n/g, '\n') : '';
    
    await fs.promises.writeFile(input_filePath, sanitizedInput);
    return input_filePath;
};

module.exports = {
    generateInputFile,
};
