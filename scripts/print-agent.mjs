// YYC Halal POS print agent — run on a computer in the store, next to the receipt printer.
//
// Polls the store backend for queued receipts (new paid orders, reprints, refunds) and sends
// them to a network ESC/POS thermal printer (most Epson/Star/Bixolon printers listen on port 9100).
//
//   APP_URL=https://orders.yychalal.ca PRINT_AGENT_TOKEN=... PRINTER_HOST=192.168.1.50 node scripts/print-agent.mjs
//
// Set PRINTER_HOST=stdout to print to the terminal instead (for testing).
import net from "node:net";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.PRINT_AGENT_TOKEN;
const HOST = process.env.PRINTER_HOST ?? "stdout";
const PORT = Number(process.env.PRINTER_PORT ?? 9100);
const INTERVAL = Number(process.env.POLL_SECONDS ?? 3) * 1000;

if (!TOKEN) {
  console.error("Set PRINT_AGENT_TOKEN (the same value as on the server).");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}` };
const ESC = "\x1b";
const GS = "\x1d";

function escpos(text) {
  // Initialise, print, feed, partial cut.
  return Buffer.concat([Buffer.from(`${ESC}@`), Buffer.from(text, "latin1"), Buffer.from(`\n\n\n${GS}V\x42\x00`)]);
}

function send(data) {
  if (HOST === "stdout") {
    process.stdout.write(data.toString("latin1").replace(/[\x1b\x1d][^\n]{0,3}/g, "") + "\n");
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port: PORT }, () => socket.end(data));
    socket.setTimeout(10_000, () => socket.destroy(new Error("Printer timed out")));
    socket.on("close", (hadError) => (hadError ? null : resolve()));
    socket.on("error", reject);
  });
}

async function report(id, status, error) {
  await fetch(`${APP_URL}/api/store/print-jobs/${id}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ status, error }),
  });
}

async function tick() {
  const res = await fetch(`${APP_URL}/api/store/print-jobs`, { headers });
  if (!res.ok) throw new Error(`Queue request failed: ${res.status}`);
  const { jobs } = await res.json();
  for (const job of jobs) {
    try {
      const text = await (await fetch(`${APP_URL}/api/store/print-jobs/${job.id}`, { headers })).text();
      await send(escpos(text));
      await report(job.id, "PRINTED");
      console.log(new Date().toLocaleTimeString(), "printed", job.kind, job.orderNumber);
    } catch (err) {
      await report(job.id, "FAILED", String(err.message ?? err)).catch(() => {});
      console.error("print failed", job.orderNumber, err.message ?? err);
    }
  }
}

console.log(`Print agent: ${APP_URL} → ${HOST === "stdout" ? "terminal" : `${HOST}:${PORT}`}`);
for (;;) {
  await tick().catch((e) => console.error(e.message));
  await new Promise((r) => setTimeout(r, INTERVAL));
}
