/* RELAYS — real WebSocket publishing. Honest failures.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
function publishToRelays(relays, event, timeoutMs = 5000) {
  return Promise.all(
    relays.map((url) =>
      new Promise((resolve) => {
        let ws, done = false;
        const finish = (ok, detail) => { if (done) return; done = true; try { ws && ws.close(); } catch {} resolve({ relay: url, ok, detail }); };
        const timer = setTimeout(() => finish(false, "timed out"), timeoutMs);
        try {
          ws = new WebSocket(url);
          ws.onopen = () => { try { ws.send(JSON.stringify(["EVENT", event])); } catch (e) { clearTimeout(timer); finish(false, "send failed"); } };
          ws.onmessage = (msg) => {
            try { const data = JSON.parse(msg.data);
              if (data[0] === "OK" && data[1] === event.id) { clearTimeout(timer); finish(!!data[2], data[3] || (data[2] ? "accepted" : "rejected")); }
            } catch {}
          };
          ws.onerror = () => { clearTimeout(timer); finish(false, "connection error"); };
        } catch (e) { clearTimeout(timer); finish(false, "blocked: " + (e && e.message ? e.message : "WebSocket unavailable")); }
      })
    )
  );
}

function probeRelay(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    let ws, done = false;
    const finish = (status) => { if (done) return; done = true; try { ws && ws.close(); } catch {} resolve(status); };
    const timer = setTimeout(() => finish("unreachable"), timeoutMs);
    try {
      ws = new WebSocket(url);
      ws.onopen = () => { clearTimeout(timer); finish("connected"); };
      ws.onerror = () => { clearTimeout(timer); finish("unreachable"); };
    } catch { clearTimeout(timer); finish("blocked"); }
  });
}

// Subscribe to listing events (kind 30402) across every relay. Calls onEvent(rawEvent)
// for each one and onEose(done, total) as relays finish sending their backlog.
// Returns a function that closes the subscription.
function subscribeListings(relays, onEvent, onEose) {
  const subId = "lb-list-" + Math.random().toString(36).slice(2, 8);
  const sockets = [];
  let eose = 0;
  (relays || []).forEach((url) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return; }
    sockets.push(ws);
    ws.onopen = () => { try { ws.send(JSON.stringify(["REQ", subId, { kinds: [30402, 5], limit: 500 }])); } catch {} };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId && data[2]) onEvent(data[2]);
        else if (data[0] === "EOSE" && data[1] === subId) { eose++; if (onEose) onEose(eose, (relays || []).length); }
      } catch {}
    };
    ws.onerror = () => {};
  });
  return () => { sockets.forEach((ws) => { try { ws.send(JSON.stringify(["CLOSE", subId])); ws.close(); } catch {} }); };
}

// Subscribe to a single author's replaceable app-data event (NIP-78 kind 30078)
// carrying this user's synced prefs (read receipts, blocks, hidden listings).
function subscribeUserData(relays, pubHex, dTag, onEvent, onEose) {
  const subId = "lb-ud-" + Math.random().toString(36).slice(2, 8);
  const sockets = [];
  let eose = 0;
  (relays || []).forEach((url) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return; }
    sockets.push(ws);
    ws.onopen = () => { try { ws.send(JSON.stringify(["REQ", subId, { kinds: [30078], authors: [pubHex], "#d": [dTag], limit: 5 }])); } catch {} };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId && data[2]) onEvent(data[2]);
        else if (data[0] === "EOSE" && data[1] === subId) { eose++; if (onEose) onEose(eose, (relays || []).length); }
      } catch {}
    };
    ws.onerror = () => {};
  });
  return () => { sockets.forEach((ws) => { try { ws.send(JSON.stringify(["CLOSE", subId])); ws.close(); } catch {} }); };
}

// Subscribe to ALL users' vouch lists (NIP-78 kind 30078, d="localbuys-vouches"),
// so we can count vouches per seller and power "people you trust vouched too".
function subscribeVouches(relays, onEvent, onEose) {
  const subId = "lb-vou-" + Math.random().toString(36).slice(2, 8);
  const sockets = [];
  let eose = 0;
  (relays || []).forEach((url) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return; }
    sockets.push(ws);
    ws.onopen = () => { try { ws.send(JSON.stringify(["REQ", subId, { kinds: [30078], "#d": ["localbuys-vouches"], limit: 2000 }])); } catch {} };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId && data[2]) onEvent(data[2]);
        else if (data[0] === "EOSE" && data[1] === subId) { eose++; if (onEose) onEose(eose, (relays || []).length); }
      } catch {}
    };
    ws.onerror = () => {};
  });
  return () => { sockets.forEach((ws) => { try { ws.send(JSON.stringify(["CLOSE", subId])); ws.close(); } catch {} }); };
}

// Read this user's existing follow list (kind 3) — READ ONLY, never written.
function subscribeFollows(relays, pubHex, onEvent, onEose) {
  const subId = "lb-fol-" + Math.random().toString(36).slice(2, 8);
  const sockets = [];
  let eose = 0;
  (relays || []).forEach((url) => {
    let ws;
    try { ws = new WebSocket(url); } catch { return; }
    sockets.push(ws);
    ws.onopen = () => { try { ws.send(JSON.stringify(["REQ", subId, { kinds: [3], authors: [pubHex], limit: 3 }])); } catch {} };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId && data[2]) onEvent(data[2]);
        else if (data[0] === "EOSE" && data[1] === subId) { eose++; if (onEose) onEose(eose, (relays || []).length); }
      } catch {}
    };
    ws.onerror = () => {};
  });
  return () => { sockets.forEach((ws) => { try { ws.send(JSON.stringify(["CLOSE", subId])); ws.close(); } catch {} }); };
}

export { publishToRelays, probeRelay, subscribeListings, subscribeUserData, subscribeVouches, subscribeFollows };
