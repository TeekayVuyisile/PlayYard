import assert from "node:assert/strict";
import WebSocket from "ws";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
  sockets = [];
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
function connect(member, code) {
  const ws = new WebSocket(
    base.replace(/^http/, "ws") + `/api/rooms/${code}/socket`,
    { headers: { Cookie: member.cookie, Origin: base } },
  );
  sockets.push(ws);
  const queue = [],
    waiters = [];
  ws.on("error", () => {});
  ws.on("message", (raw) => {
    const v = JSON.parse(raw.toString()),
      next = waiters.shift();
    if (next) next(v);
    else queue.push(v);
  });
  return {
    id: member.body.id,
    ws,
    next(timeout = 25000) {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error("Timed game socket timeout")),
          timeout,
        );
        waiters.push((v) => {
          clearTimeout(t);
          resolve(v);
        });
      });
    },
    async state(test) {
      for (let i = 0; i < 25; i++) {
        const v = await this.next();
        assert.equal(v.type, "state", v.error);
        if (test(v.data)) return v.data;
      }
      throw Error("Expected timed game state not found");
    },
    async send(a) {
      await new Promise((r) => setTimeout(r, 320));
      ws.send(JSON.stringify(a));
    },
  };
}
try {
  const host = await post("/api/rooms", { name: "Memory A", game: "memory" });
  assert.equal(host.status, 200);
  const code = host.body.code,
    guest = await post(`/api/rooms/${code}/join`, { name: "Memory B" });
  assert.equal(guest.status, 200);
  let a = connect(host, code),
    b = connect(guest, code);
  await a.next();
  await b.next();
  for (let round = 1; round <= 5; round++) {
    await a.send({
      type: "memory-ready",
      match: 1,
      round: round === 1 ? 1 : round - 1,
    });
    await a.state((s) => s.memory.ready.includes(a.id));
    await b.state((s) => s.memory.ready.includes(a.id));
    await b.send({
      type: "memory-ready",
      match: 1,
      round: round === 1 ? 1 : round - 1,
    });
    let [as, bs] = await Promise.all([
      a.state((s) => s.memory.phase === "countdown"),
      b.state((s) => s.memory.phase === "countdown"),
    ]);
    assert.equal(as.memory.pattern, undefined);
    // No user input: Durable Object alarms must open and close the viewing window.
    [as, bs] = await Promise.all([
      a.state((s) => s.memory.phase === "memorize"),
      b.state((s) => s.memory.phase === "memorize"),
    ]);
    const pattern = as.memory.pattern;
    assert.equal(pattern.length, round + 3);
    assert.deepEqual(bs.memory.pattern, pattern);
    [as, bs] = await Promise.all([
      a.state((s) => s.memory.phase === "recall"),
      b.state((s) => s.memory.phase === "recall"),
    ]);
    assert.equal(as.memory.pattern, undefined);
    assert.equal(bs.memory.pattern, undefined);
    await a.send({ type: "memory-submit", match: 1, round, colours: pattern });
    as = await a.state((s) => s.memory.answers[a.id]?.submitted);
    bs = await b.state((s) => s.memory.answers[a.id]?.submitted);
    assert.deepEqual(bs.memory.answers[a.id], { submitted: true });
    if (round === 1) {
      a.ws.close();
      a = connect(host, code);
      as = (await a.next()).data;
      assert.deepEqual(as.memory.answers[a.id].colours, pattern);
      assert.equal(as.memory.pattern, undefined);
    }
    await b.send({ type: "memory-submit", match: 1, round, colours: pattern });
    [as, bs] = await Promise.all([
      a.state((s) => ["review", "finished"].includes(s.memory.phase)),
      b.state((s) => ["review", "finished"].includes(s.memory.phase)),
    ]);
    assert.equal(as.memory.history.length, round);
  }
  assert.equal(
    (await post(`/api/rooms/${code}/join`, { name: "Still here" }, host.cookie))
      .status,
    200,
  );
  await a.next();
  await b.next();
  for (const c of [a, b]) {
    await c.send({ type: "rematch", match: 1, round: 5 });
    await a.next();
    await b.next();
  }
  a.ws.close();
  b.ws.close();
  const fuseHost = await post("/api/rooms", { name: "Fuse A", game: "fuse" });
  assert.equal(fuseHost.status, 200);
  const fc = fuseHost.body.code,
    members = [fuseHost];
  for (let i = 1; i < 8; i++)
    members.push(await post(`/api/rooms/${fc}/join`, { name: `Fuse ${i}` }));
  assert.equal(
    (await post(`/api/rooms/${fc}/join`, { name: "Ninth" })).status,
    400,
  );
  const clients = members.slice(0, 3).map((m) => connect(m, fc));
  await Promise.all(clients.map((c) => c.next()));
  await clients[0].send({ type: "fuse-start", match: 1 });
  let states = await Promise.all(
      clients.map((c) => c.state((s) => s.fuse.phase === "live")),
    ),
    g = states[0].fuse;
  assert.equal(Object.keys(g.lives).length, 8);
  assert.ok(g.deadline - states[0].serverNow <= 20000);
  assert.equal(
    (await post(`/api/rooms/${fc}/join`, { name: "Late" })).status,
    400,
  );
  // Connect whoever received the random first bomb and pass once. Passing must not reset its deadline.
  let holder = clients.find((c) => c.id === g.holderId);
  if (!holder) {
    holder = connect(
      members.find((m) => m.body.id === g.holderId),
      fc,
    );
    await holder.next();
  }
  const target = clients.find((c) => c.id !== holder.id),
    deadline = g.deadline;
  await holder.send({
    type: "fuse-pass",
    match: 1,
    round: g.round,
    revision: g.revision,
    playerId: target.id,
  });
  states = await Promise.all(
    clients.map((c) => c.state((s) => s.fuse.holderId === target.id)),
  );
  g = states[0].fuse;
  assert.equal(g.deadline, deadline);
  // Chat refreshes room activity but must not overwrite the game alarm.
  await clients[0].send({ type: "chat", text: "Keep the fuse burning." });
  await Promise.all(
    clients.map((c) => c.state((s) => s.messages.length === 1)),
  );
  states = await Promise.all(
    clients.map((c) => c.state((s) => s.fuse.phase === "between")),
  );
  g = states[0].fuse;
  assert.equal(g.history.length, 1);
  assert.equal(g.lives[target.id], 2);
  assert.equal(g.history[0].explodedAt, deadline);
  states = await Promise.all(
    clients.map((c) =>
      c.state((s) => s.fuse.phase === "live" && s.fuse.round === 2),
    ),
  );
  assert.equal(states[0].fuse.history.length, 1);
  assert.equal(states[0].fuse.lives[target.id], 2);
  target.ws.close();
  const reconnected = connect(
    members.find((m) => m.body.id === target.id),
    fc,
  );
  const restored = (await reconnected.next()).data;
  assert.equal(restored.fuse.lives[target.id], 2);
  assert.equal(restored.fuse.round, 2);
  console.log(
    "PASS: Memory Duo five timed rounds, synchronized hidden patterns, private recall, reconnect and draw/rematch; Fuse Rush eight-player capacity, fixed deadline after pass/chat, autonomous explosion, next fuse and reconnect.",
  );
} finally {
  sockets.forEach((ws) => ws.close());
}
