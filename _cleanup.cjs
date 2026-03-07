const fs = require('fs');
['patch.js', 'services_cleaned.txt', 'nul'].forEach(f => {
  try { fs.unlinkSync(f); console.log('deleted', f); }
  catch(e) { console.log('skip', f, e.code); }
});
