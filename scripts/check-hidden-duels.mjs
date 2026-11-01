import assert from "node:assert/strict";
import WebSocket from "ws";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
const sockets = [];
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
    const value = JSON.parse(raw.toString()),
      resolve = waiters.shift();
    if (resolve) resolve(value);
    else queue.push(value);
  });
  return {
    id: member.body.id,
    ws,
    next() {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error("Hidden duel socket timeout")),
          8000,
        );
        waiters.push((value) => {
          clearTimeout(t);
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
  for (const game of ["prism", "poison"]) {
    const host = await post("/api/rooms", { name: "Alex", game });
    assert.equal(host.status, 200);
    const code = host.body.code,
      guest = await post(`/api/rooms/${code}/join`, { name: "Sam" });
    assert.equal(guest.status, 200);
    assert.equal(
      (await post(`/api/rooms/${code}/join`, { name: "Third player" })).status,
      400,
    );
    let a = connect(host, code),
      b = connect(guest, code),
      state = (await a.next()).data;
    await b.next();
    assert.equal(state.game, game);
    async function broadcast(sender, action) {
      await sender.send(action);
      const x = await a.next(),
        y = await b.next();
      assert.equal(x.type, "state", x.error);
      assert.equal(y.type, "state", y.error);
      return [x.data, y.data];
    }
    const codeA = ["blue", "green", "red", "yellow"],
      codeB = ["red", "yellow", "blue", "green"];
    let views = await broadcast(
      a,
      game === "prism"
        ? { type: "prism-lock", match: 1, colours: codeA }
        : { type: "poison-lock", match: 1, slots: [0, 1, 2] },
    );
    assert.equal(
      views[1][game][game === "prism" ? "myCode" : "myTraps"],
      undefined,
    );
    assert.equal(
      views[1][game][game === "prism" ? "codes" : "traps"],
      undefined,
    );
    views = await broadcast(
      b,
      game === "prism"
        ? { type: "prism-lock", match: 1, colours: codeB }
        : { type: "poison-lock", match: 1, slots: [7, 8, 9] },
    );
    assert.equal(views[0][game].phase, "playing");
    await b.send({
      type: game === "prism" ? "prism-guess" : "poison-pick",
      match: 1,
      step: 0,
      colours: codeA,
      slot: 0,
    });
    assert.match((await b.next()).error, /turn/);
    if (game === "prism") {
      views = await broadcast(a, {
        type: "prism-guess",
        match: 1,
        step: 0,
        colours: codeA,
      });
      assert.equal(views[0].prism.guesses[0].correct, 0);
      assert.equal(views[0].prism.revealedCodes, undefined);
      a.ws.close();
      a = connect(host, code);
      const restored = (await a.next()).data;
      assert.deepEqual(restored.prism.myCode, codeA);
      assert.equal(restored.prism.codes, undefined);
      assert.equal(restored.prism.guesses.length, 1);
      views = await broadcast(b, {
        type: "prism-guess",
        match: 1,
        step: 1,
        colours: codeB,
      });
      await a.send({ type: "prism-guess", match: 1, step: 2, colours: codeA });
      assert.match((await a.next()).error, /already tried/);
      views = await broadcast(a, {
        type: "prism-guess",
        match: 1,
        step: 2,
        colours: codeB,
      });
      assert.equal(views[0].prism.winner, a.id);
      assert.deepEqual(views[0].prism.revealedCodes[b.id], codeB);
    } else {
      views = await broadcast(a, {
        type: "poison-pick",
        match: 1,
        step: 0,
        slot: 7,
      });
      assert.equal(views[0].poison.picks[0].poison, true);
      assert.equal(views[0].poison.revealedTraps, undefined);
      a.ws.close();
      a = connect(host, code);
      const restored = (await a.next()).data;
      assert.deepEqual(restored.poison.myTraps, [0, 1, 2]);
      assert.equal(restored.poison.traps, undefined);
      assert.equal(restored.poison.picks.length, 1);
      views = await broadcast(b, {
        type: "poison-pick",
        match: 1,
        step: 1,
        slot: 7,
      });
      assert.equal(views[0].poison.picks[1].poison, false);
      await a.send({ type: "poison-pick", match: 1, step: 2, slot: 7 });
      assert.match((await a.next()).error, /already/);
      views = await broadcast(a, {
        type: "poison-pick",
        match: 1,
        step: 2,
        slot: 8,
      });
      views = await broadcast(b, {
        type: "poison-pick",
        match: 1,
        step: 3,
        slot: 8,
      });
      views = await broadcast(a, {
        type: "poison-pick",
        match: 1,
        step: 4,
        slot: 9,
      });
      assert.equal(views[0].poison.winner, b.id);
      assert.deepEqual(views[0].poison.revealedTraps[b.id], [7, 8, 9]);
    }
    assert.equal(views[0][game].phase, "finished");
    views = await broadcast(a, { type: "rematch", match: 1 });
    assert.equal(views[0][game].match, 1);
    views = await broadcast(b, { type: "rematch", match: 1 });
    assert.equal(views[0][game].match, 2);
    assert.equal(views[0][game].turn, 1);
    assert.equal(views[0][game].phase, "setup");
    await a.send(
      game === "prism"
        ? { type: "prism-lock", match: 1, colours: codeA }
        : { type: "poison-lock", match: 1, slots: [0, 1, 2] },
    );
    assert.match((await a.next()).error, /ended/);
    a.ws.close();
    b.ws.close();
  }
  console.log(
    "PASS: Prism Code and Avoid the Poison, private setup, turn guards, duplicate rejection, reconnects, scoring, win/reveal, capacity and mutually confirmed rematches.",
  );
} finally {
  sockets.forEach((ws) => ws.close());
}
