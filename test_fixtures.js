const fs = require('fs');
async function run() {
    const today = new Date().toISOString().split('T')[0];
    const API_FOOTBALL_KEY = "ccfaa672c6fe4ce7078d99bc0f5b99c3";
    const fixturesUrl = "https://v3.football.api-sports.io/fixtures?date=" + today;
    const response = await fetch(fixturesUrl, {
        headers: {
            "x-rapidapi-key": API_FOOTBALL_KEY,
            "x-rapidapi-host": "v3.football.api-sports.io"
        }
    });
    const data = await response.json();
    console.log("Fixtures returned:", data.response?.length);
    if(data.response?.length > 0) {
        console.log("First fixture teams:", data.response[0].teams);
    }
}
run();
