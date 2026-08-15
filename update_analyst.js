const fs = require('fs');
let content = fs.readFileSync('src/app/analyst/[username]/page.tsx', 'utf8');

// Fix text truncation on selection
content = content.replace(
  /<div className="text-base font-bold text-foreground">{pick\.selection}<\/div>/g,
  <div className="text-base font-bold text-foreground break-words line-clamp-3">{pick.selection}</div>
);

// Fix flex container to allow min-w-0
content = content.replace(
  /<div className="space-y-1">/g,
  <div className="space-y-1 flex-1 min-w-0 pr-4">
);

// Fix odd formatting
content = content.replace(
  /{pick\.odds > 0 \? \\\\+\\\\ : pick\.odds}/g,
  {pick.odds.toFixed(2)}
);

fs.writeFileSync('src/app/analyst/[username]/page.tsx', content, 'utf8');
