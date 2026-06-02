const fs = require('fs');
const path = require('path');
const dir = './views';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  let p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  // Fix favicon
  if (!content.includes('favicon.png')) {
    content = content.replace(/<title>/g, '<link rel="icon" type="image/png" href="/assets/favicon.png">\n  <title>');
  }

  // Replace dashboard sidebar logo
  const regexDashboard = /<div class="sidebar-logo-icon"><i data-lucide="heart-pulse"><\/i><\/div>[\s\S]*?OdontoUNERG/g;
  content = content.replace(regexDashboard, '<img src="/assets/logo-principal.png" alt="OdontoUNERG Logo" style="height: 48px; width: auto; margin-right: 10px;">');

  // Replace auth brand logo
  const regexAuth = /<div class="logo-icon"><i data-lucide="heart-pulse" style="width:28px;height:28px;"><\/i><\/div>[\s\S]*?OdontoUNERG/g;
  content = content.replace(regexAuth, '<img src="/assets/logo-principal.png" alt="OdontoUNERG Logo" style="height: 64px; width: auto; margin-bottom: 10px;">');

  fs.writeFileSync(p, content, 'utf8');
});

console.log('Update finished successfully');
