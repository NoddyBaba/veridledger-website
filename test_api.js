async function run() {
  const url = "https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us,uk,eu,au&markets=h2h,spreads,totals&oddsFormat=decimal&apiKey=de5675bad8047ae87ed53e9daa98de76";
  const res = await fetch(url);
  const data = await res.json();
  const game = data.find(d => d.sport_title === "K League 1"); // Sangju Sangmu
  if(game) {
      console.log(JSON.stringify(game.bookmakers[0].markets.find(m => m.key === 'h2h'), null, 2));
  } else {
      console.log(JSON.stringify(data[0].bookmakers[0].markets.find(m => m.key === 'h2h'), null, 2));
  }
}
run();
