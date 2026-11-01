import assert from "node:assert/strict";
import WebSocket from "ws";
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
const sockets = [];
function connect(member, code) {
  const ws = new WebSocket(
    base.replace(/^http/, "ws") + `/api/rooms/${code}/socket`,
    { headers: { Cookie: member.cookie, Origin: base } },
  );
  sockets.push(ws);
  const queue = [],
    waiters = [];
  ws.on("message", (raw) => {
    const value = JSON.parse(raw.toString()),
      resolve = waiters.shift();
    if (resolve) resolve(value);
    else queue.push(value);
  });
  ws.on("error", () => {});
  return {
    ws,
    id: member.body.id,
    next() {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Party game socket timeout")),
          8000,
        );
        waiters.push((value) => {
          clearTimeout(timer);
          resolve(value);
        });
      });
    },
    async send(action) {
      await new Promise((r) => setTimeout(r, 280));
      ws.send(JSON.stringify(action));
    },
  };
}
try {
  assert.equal(
    (
      await post("/api/rooms", {
        name: "Invalid",
        game: "imposter",
        mode: "other",
        rounds: 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await post("/api/rooms", {
        name: "Invalid",
        game: "imposter",
        mode: "words",
        rounds: 6,
      })
    ).status,
    400,
  );
  for (const mode of ["words", "drawing"]) {
    const host = await post("/api/rooms", {
      name: "Host",
      game: "imposter",
      mode,
      rounds: 2,
    });
    assert.equal(host.status, 200);
    const code = host.body.code;
    const members = [host];
    for (let i = 1; i < 3; i++)
      members.push(
        await post(`/api/rooms/${code}/join`, { name: `Player ${i}` }),
      );
    const clients = members.map((m) => connect(m, code));
    let snapshots = await Promise.all(clients.map((c) => c.next()));
    async function broadcast(sender, action) {
      await sender.send(action);
      snapshots = await Promise.all(clients.map((c) => c.next()));
      assert.ok(
        snapshots.every((s) => s.type === "state"),
        JSON.stringify(snapshots),
      );
      return snapshots[0].data;
    }
    await clients[1].send({ type: "imposter-start", match: 1 });
    assert.match((await clients[1].next()).error, /host/);
    await broadcast(clients[0], { type: "imposter-start", match: 1 });
    assert.equal(
      (await post(`/api/rooms/${code}/join`, { name: "Too late" })).status,
      400,
    );
    const impIndex = snapshots.findIndex(
      (s) => s.data.imposter.role === "imposter",
    );
    assert.ok(impIndex >= 0);
    assert.equal(snapshots[impIndex].data.imposter.word, undefined);
    assert.equal(snapshots[impIndex].data.imposter.imposterId, undefined);
    assert.equal(snapshots.filter((s) => s.data.imposter.word).length, 2);
    // One member reconnects during the match with the same private role.
    const role = snapshots[1].data.imposter.role;
    clients[1].ws.close();
    clients[1] = connect(members[1], code);
    assert.equal((await clients[1].next()).data.imposter.role, role);
    let state = snapshots[0].data;
    for (let i = 0; i < 6; i++) {
      const g = state.imposter,
        action = {
          type: mode === "words" ? "imposter-clue" : "imposter-stroke",
          match: 1,
          round: g.round,
          turn: g.turn,
          ...(mode === "words"
            ? { spoken: true }
            : {
                points: [
                  [0, 0],
                  [1000, 1000],
                ],
              }),
        };
      if (i === 0) {
        await clients[1].send(action);
        assert.match((await clients[1].next()).error, /turn/);
      }
      state = await broadcast(clients[g.turn], action);
    }
    assert.equal(state.imposter.phase, "voting");
    assert.equal(state.imposter.clues.length, 6);
    const impId = clients[impIndex].id,
      crew = clients.filter((c) => c.id !== impId);
    state = await broadcast(crew[0], {
      type: "imposter-vote",
      match: 1,
      playerId: impId,
    });
    assert.equal(state.imposter.votes, undefined);
    state = await broadcast(crew[1], {
      type: "imposter-vote",
      match: 1,
      playerId: impId,
    });
    state = await broadcast(clients[impIndex], {
      type: "imposter-vote",
      match: 1,
      playerId: crew[0].id,
    });
    assert.equal(state.imposter.winner, "crew");
    assert.equal(state.imposter.imposterId, impId);
    assert.ok(state.imposter.word);
    state = await broadcast(clients[0], { type: "imposter-start", match: 1 });
    assert.equal(state.imposter.match, 2);
    assert.equal(state.imposter.winner, undefined);
    clients.forEach((c) => c.ws.close());
  }
  // Eight seats in the lobby; the ninth player is rejected.
  const full = await post("/api/rooms", {
    name: "Host",
    game: "imposter",
    mode: "words",
    rounds: 1,
  });
  for (let i = 1; i < 8; i++)
    assert.equal(
      (await post(`/api/rooms/${full.body.code}/join`, { name: `Player ${i}` }))
        .status,
      200,
    );
  assert.equal(
    (await post(`/api/rooms/${full.body.code}/join`, { name: "Ninth" })).status,
    400,
  );
  const host = await post("/api/rooms", { name: "White", game: "chess" });
  assert.equal(host.status, 200);
  const code = host.body.code,
    guest = await post(`/api/rooms/${code}/join`, { name: "Black" });
  const a = connect(host, code),
    b = connect(guest, code);
  let state = (await a.next()).data;
  await b.next();
  assert.equal(state.chess.legalMoves.length, 20);
  await a.send({ type: "chess-move", match: 1, ply: 0, from: "e2", to: "e5" });
  assert.match((await a.next()).error, /legal/);
  for (const [i, from, to] of [
    [0, "f2", "f3"],
    [1, "e7", "e5"],
    [2, "g2", "g4"],
    [3, "d8", "h4"],
  ]) {
    await (i % 2 ? b : a).send({
      type: "chess-move",
      match: 1,
      ply: i,
      from,
      to,
    });
    state = (await a.next()).data;
    await b.next();
  }
  assert.equal(state.chess.result, "Checkmate");
  assert.equal(state.chess.winner, b.id);
  a.ws.close();
  const restored = connect(host, code);
  assert.equal((await restored.next()).data.chess.history.length, 4);
  for (const c of [restored, b]) {
    await c.send({ type: "rematch", match: 1 });
    state = (await restored.next()).data;
    await b.next();
  }
  assert.equal(state.chess.match, 2);
  assert.equal(state.chess.whiteId, b.id);
  assert.equal(state.chess.result, undefined);
  console.log(
    "PASS: Imposter words and drawing, three-player rounds, private roles/votes, reconnects, eight-player capacity, one-vote result, rematches; chess legality, checkmate, reconnect and colour-swapped rematch.",
  );
} finally {
  sockets.forEach((ws) => ws.close());
}
