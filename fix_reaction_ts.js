const fs = require('fs');
let content = fs.readFileSync('src/components/feed/ReactionActionBar.tsx', 'utf8');

content = content.replace(/await supabase\n        \.from/g, 'await supabase!\n        .from');
content = content.replace(/await supabase\n        \.rpc/g, 'await supabase!\n        .rpc');

fs.writeFileSync('src/components/feed/ReactionActionBar.tsx', content, 'utf8');
