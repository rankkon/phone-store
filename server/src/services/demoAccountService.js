import User from '../models/User.js';

export const demoAccounts = [
  { fullName: 'Phone Store Admin', email: 'admin@phonestore.local', password: 'Admin@123', role: 'ADMIN' },
  { fullName: 'Phone Store Staff', email: 'staff@phonestore.local', password: 'Staff@123', role: 'STAFF' },
  { fullName: 'Phone Store Client', email: 'client@phonestore.local', password: 'Client@123', role: 'CUSTOMER' },
];

export async function ensureDemoAccounts() {
  let createdCount = 0;
  for (const account of demoAccounts) {
    const exists = await User.exists({ email: account.email });
    if (exists) continue;
    await User.create({
      fullName: account.fullName,
      email: account.email,
      passwordHash: await User.hashPassword(account.password),
      role: account.role,
    });
    createdCount += 1;
  }
  return createdCount;
}
