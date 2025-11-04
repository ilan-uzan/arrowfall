const { initDatabase } = require('./db');

async function main() {
  console.log('Initializing database...');
  await initDatabase();
  process.exit(0);
}

main().catch(console.error);

