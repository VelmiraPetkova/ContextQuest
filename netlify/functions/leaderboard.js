const { getDb, initDb } = require("./shared");

exports.handler = async () => {
  await initDb();
  const db = getDb();

  const result = await db.execute(`
    SELECT p.name, MAX(g.score) as score, g.perfect, g.rank_title as rankTitle,
           MAX(g.played_at) as playedAt
    FROM games g JOIN players p ON p.id = g.player_id
    GROUP BY g.player_id
    ORDER BY score DESC, g.perfect DESC
    LIMIT 20
  `);

  const entries = result.rows.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    perfect: row.perfect,
    rankTitle: row.rankTitle,
    playedAt: row.playedAt,
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entries),
  };
};
