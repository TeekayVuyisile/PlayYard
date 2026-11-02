import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
async function post(path, body, cookie) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return {
    status: r.status,
    body: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0] || cookie,
  };
}
const created = await post("/api/rooms", {
  name: "Entry host",
  game: "timer",
  targetMs: 1000,
  hidden: false,
});
assert.equal(created.status, 200);
const code = created.body.code;
const wrong = await post(`/api/rooms/${code}/join`, {
  name: "Wrong card",
  expectedGame: "chess",
});
assert.equal(wrong.status, 400);
assert.match(wrong.body.error, /different game/);
const joined = await post(`/api/rooms/${code}/join`, {
  name: "Right card",
  expectedGame: "timer",
});
assert.equal(
  joined.status,
  200,
  "A rejected card-specific join must not consume a seat.",
);
assert.equal(
  (
    await post(
      `/api/rooms/${code}/join`,
      { name: "Reconnect", expectedGame: "timer" },
      joined.cookie,
    )
  ).status,
  200,
);
assert.equal(
  (
    await post(
      `/api/rooms/${code}/join`,
      { name: "Wrong reconnect", expectedGame: "answer" },
      joined.cookie,
    )
  ).status,
  400,
);
const generic = await post("/api/rooms", {
  name: "Generic host",
  game: "chess",
});
assert.equal(generic.status, 200);
assert.equal(
  (await post(`/api/rooms/${generic.body.code}/join`, { name: "Generic join" }))
    .status,
  200,
);
console.log(
  "PASS: card-specific room validation, no seat consumed by a wrong-game code, reconnect validation and generic invitation joins.",
);
