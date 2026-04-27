const crypto = require("crypto");
const { getDb, initDb } = require("./shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };

  const { name } = JSON.parse(event.body || "{}");
  if (!name) return { statusCode: 400, body: "Name required" };

  await initDb();
  const id = crypto.randomBytes(12).toString("hex");
  const db = getDb();
  await db.execute({ sql: "INSERT OR IGNORE INTO players (id, name) VALUES (?, ?)", args: [id, name] });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: id, name }),
  };
};
