const fs = require('fs');
const content = fs.readFileSync('src/app/api/odds/sync/route.ts', 'utf8');
const newContent = content.replace(
    'const events = await response.json();',
    'const allEvents = await response.json();\n    const events = allEvents.filter((e: any) => !e.sport_key.toLowerCase().includes("soccer"));'
);
fs.writeFileSync('src/app/api/odds/sync/route.ts', newContent, 'utf8');
