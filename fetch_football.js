const fs = require('fs');
async function run() {
    const res = await fetch("https://v3.football.api-sports.io/odds?date=2026-08-15", {
        headers: {
            "x-rapidapi-key": "ccfaa672c6fe4ce7078d99bc0f5b99c3",
            "x-rapidapi-host": "v3.football.api-sports.io"
        }
    });
    const data = await res.json();
    fs.writeFileSync('football_odds.json', JSON.stringify(data, null, 2));
    console.log(data.response.length);
}
run();
