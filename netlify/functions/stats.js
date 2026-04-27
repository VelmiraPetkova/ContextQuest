const { getDb, initDb } = require("./shared");

exports.handler = async () => {
  await initDb();
  const db = getDb();

  const [players, games, avg, top] = await Promise.all([
    db.execute("SELECT COUNT(*) as c FROM players"),
    db.execute("SELECT COUNT(*) as c FROM games"),
    db.execute("SELECT COALESCE(AVG(score),0) as c FROM games"),
    db.execute("SELECT COALESCE(MAX(score),0) as c FROM games"),
  ]);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      totalPlayers: players.rows[0].c,
      totalGames: games.rows[0].c,
      avgScore: Math.round(avg.rows[0].c),
      topScore: top.rows[0].c,
    }),
  };
};
