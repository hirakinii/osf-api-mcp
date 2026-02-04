#!/usr/bin/env node
import { OsfApiMcpServer } from './server.js';

async function main() {
  const server = new OsfApiMcpServer();
  await server.initialize();
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
