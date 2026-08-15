const fs = require('fs');
let c = fs.readFileSync('src/app/deck/page.tsx', 'utf8');

c = c.replace(/const \[stats, setStats\] = useState\([^)]*\);/, 
  "const [stats, setStats] = useState<any>({ roi: '+0.0%', winRate: '0%', streak: '0W', mrr: 0, totalGraded: 0 });");

const repl = \let streakCount=0;
      let currentStreak='W';
      for(let p of data){
        if(p.status === 'LOCKED' || p.status === 'PUSH') continue;
        if(streakCount === 0){
          currentStreak = p.status === 'WIN' ? 'W' : 'L';
          streakCount=1;
        } else if((p.status === 'WIN' && currentStreak === 'W') || (p.status === 'LOSS' && currentStreak === 'L')){
          streakCount++;
        } else { break; }
      }
      setStats({
        roi: computed.roi > 0 ? \+\%\ : \\%\,
        winRate: \\%\,
        streak: \\\\,
        mrr: 2500,
        totalGraded: computed.totalGraded
      });\;

c = c.replace(/setStats\(\{[\s\S]*?mrr: 2500, \/\/ mock MRR for now\s*\}\);/, repl);

fs.writeFileSync('src/app/deck/page.tsx', c);
