import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import { ensureDemoAccounts } from './services/demoAccountService.js';

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required. Copy server/.env.example to server/.env and configure it.');
  await connectDatabase();
  const demoAccountResult = await ensureDemoAccounts();
  const changedDemoAccounts = demoAccountResult.createdCount + demoAccountResult.migratedCount + demoAccountResult.updatedCount;
  if (changedDemoAccounts > 0) console.log('Default demo accounts were synchronized.', demoAccountResult);
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}

startServer().catch((error) => {
  console.error('Unable to start server:', error.message);
  process.exit(1);
});
