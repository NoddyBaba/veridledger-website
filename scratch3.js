const fs = require('fs');
let c = fs.readFileSync('src/app/deck/page.tsx', 'utf8');
c = c.replace('import { format } from "date-fns";\n', '');
fs.writeFileSync('src/app/deck/page.tsx', c);
