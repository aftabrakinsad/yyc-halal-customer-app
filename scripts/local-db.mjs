// Runs a local PostgreSQL-compatible server (PGlite) for development when Docker/Postgres
// isn't installed. Production uses a real PostgreSQL database shared with the Store app.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
const db = await PGlite.create("./.pglite");
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
await server.start();
console.log(`Local database ready: postgresql://postgres:postgres@localhost:${port}/postgres`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
