const fs = require('fs');




module.exports = ({github, context}) => {
  const { PACKAGE_PATH } = process.env;

  if (!PACKAGE_PATH) {
    console.error('ERROR: Missing Package Path');
    process.exit(1);
  }

  // Load the File
  let content = '';
  
  try {
    content = fs.readFileSync(PACKAGE_PATH, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('File not found at:', filePath);
    }
    
    return '';
  }

  // Split the file up by H2 Headers
  const sections = content.split('## ');

  if (sections.length === 0) {
    console.error('ERROR: No Changelog Found');
    process.exit(1);
  }

  // Return the first section
  return `## ${sections[0]}`
}