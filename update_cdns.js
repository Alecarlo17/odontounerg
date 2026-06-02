const fs = require('fs');
const path = require('path');

const directories = ['.', './views', './html'];

const replacements = [
  { search: '/js/libs/supabase-js.js', replace: '/js/libs/supabase-js.js' },
  { search: '/js/libs/lucide.js', replace: '/js/libs/lucide.js' },
  { search: '/js/libs/chart.umd.min.js', replace: '/js/libs/chart.umd.min.js' },
  { search: '/js/libs/jspdf.umd.min.js', replace: '/js/libs/jspdf.umd.min.js' }
];

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) continue;
    
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      for (const req of replacements) {
        if (content.includes(req.search)) {
          content = content.split(req.search).join(req.replace);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated CDNs in: ${filePath}`);
      }
    }
  }
}

directories.forEach(processDir);
console.log('CDN replacement complete.');
