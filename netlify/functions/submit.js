const { evaluate } = require("./shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method not allowed" };

  const { level, bag } = JSON.parse(event.body || "{}");
  const result = evaluate(level, bag || []);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  };
};
