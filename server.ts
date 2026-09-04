// server.ts
import 'dotenv/config';
import http from 'node:http';
import app, { appPronto } from './src/app.js';

const port = Number(process.env.APP_PORT ?? 7340);

await appPronto;

const httpServer = http.createServer(app);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escutando em http://localhost:${port}`);
});