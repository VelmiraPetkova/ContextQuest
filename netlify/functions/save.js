const { getDb, initDb } = require("./shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };

  const { playerId, score, perfect, rankTitle } = JSON.parse(event.body || "{}");
  if (!playerId) return { statusCode: 400, body: "playerId required" };

  await initDb();
  const db = getDb();
  await db.execute({
    sql: "INSERT INTO games (player_id, score, perfect, rank_title) VALUES (?, ?, ?, ?)",
    args: [playerId, score || 0, perfect || 0, rankTitle || ""],
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ok" }),
  };
};
