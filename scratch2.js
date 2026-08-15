const fs = require('fs');
['src/app/alerts/page.tsx', 'src/app/profile/page.tsx'].forEach(p => {
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('import BottomNav')) {
    c = c.replace(/import \{.*\} from (['"]lucide-react['"]);/, "import $&\nimport BottomNav from '@/components/BottomNav';");
  }
  if (!c.includes('<BottomNav />')) {
    c = c.replace(/    <\/div>\n  \);\n}\s*$/, '      <BottomNav />\n    </div>\n  );\n}');
  }
  fs.writeFileSync(p, c);
});
