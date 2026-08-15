const fs = require('fs');
let content = fs.readFileSync('src/components/BetSlipDrawer.tsx', 'utf8');

content = content.replace(
  /selections\.map\(s => \\\\ \(\\\\)\\)/g,
  selections.map(s => \\ (\)\)
);

fs.writeFileSync('src/components/BetSlipDrawer.tsx', content, 'utf8');
