const fs = require('fs');
let p1 = fs.readFileSync('src/app/alerts/page.tsx', 'utf8');
p1 = p1.replace(/import BottomNav from ['"]@\/components\/BottomNav['"];?\n/, '');
fs.writeFileSync('src/app/alerts/page.tsx', p1);

let p2 = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
p2 = p2.replace(/import BottomNav from ['"]@\/components\/BottomNav['"];?\n/, '');
fs.writeFileSync('src/app/profile/page.tsx', p2);
