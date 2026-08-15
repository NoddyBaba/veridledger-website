const fs = require('fs');
const data = JSON.parse(fs.readFileSync('football_odds.json', 'utf8'));
if (data.response.length > 0) {
    const fixture = data.response[0];
    console.log(JSON.stringify(fixture.fixture, null, 2));
    console.log(JSON.stringify(fixture.bookmakers[0], null, 2));
}
