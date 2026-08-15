const fs = require('fs');
let content = fs.readFileSync('src/app/deck/page.tsx', 'utf8');

// Fix odds display in deck page
content = content.replace(
  /{pick\.odds > 0 \? \\\\+\\\\ : pick\.odds}/g,
  {pick.odds.toFixed(2)}
);

fs.writeFileSync('src/app/deck/page.tsx', content, 'utf8');
