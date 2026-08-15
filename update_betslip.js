const fs = require('fs');
let content = fs.readFileSync('src/components/BetSlipDrawer.tsx', 'utf8');

// Replace calculateCombinedOdds
content = content.replace(
  /const calculateCombinedOdds = \(\) => {[\s\S]*?return Math\.round\(combinedAmerican\);\n  };/,
  const calculateCombinedOdds = () => {
    if (selections.length === 0) return 0;
    
    let decimalOdds = 1;
    selections.forEach(sel => {
      decimalOdds *= sel.odds;
    });
    
    return decimalOdds;
  };
);

// Replace displayOdds
content = content.replace(
  /const combinedOdds = calculateCombinedOdds\(\);\n  const displayOdds = combinedOdds > 0 \? \\+\\\\ : combinedOdds;/,
  const combinedOdds = calculateCombinedOdds();
  const displayOdds = combinedOdds.toFixed(2);
);

// Replace calculatePayout
content = content.replace(
  /const calculatePayout = \(\) => {[\s\S]*?return stake \+ profit;\n  };/,
  const calculatePayout = () => {
    if (combinedOdds === 0 || stake <= 0) return 0;
    return stake * combinedOdds;
  };
);

// Replace odds display in list
content = content.replace(
  /<span className="font-mono text-xs text-muted-foreground">{sel\.odds > 0 \? \\+\\\\ : sel\.odds}<\/span>/g,
  <span className="font-mono text-xs text-muted-foreground">{sel.odds.toFixed(2)}</span>
);

// Replace Stake Amount (₦) with Stake (Units)
content = content.replace(
  /<span>Stake Amount \(₦\)<\/span>\s*<span className="text-foreground font-semibold">₦{stake\.toLocaleString\(\)}<\/span>/,
  <span>Stake Amount (Units)</span>
                  <span className="text-foreground font-semibold">{stake.toLocaleString()} U</span>
);

// Replace input adornment ₦ with U
content = content.replace(
  /<span className="absolute left-3 top-1\/2 -translate-y-1\/2 text-muted-foreground font-bold">₦<\/span>/,
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">U</span>
);

// Replace Quick Chips
content = content.replace(
  /₦{amt\.toLocaleString\(\)}/g,
  {amt.toLocaleString()} U
);

// Replace Potential Win
content = content.replace(
  /<span className="text-muted-foreground">Potential Win:<\/span>\s*<span className="text-secondary text-lg">₦{calculatePayout\(\)\.toLocaleString\(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}\)}<\/span>/,
  <span className="text-muted-foreground">Implied Return:</span>
              <span className="text-secondary text-lg">{calculatePayout().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} U</span>
);

fs.writeFileSync('src/components/BetSlipDrawer.tsx', content, 'utf8');
