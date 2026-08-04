import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';

export const demoAccounts = [
  { fullName: 'Phone Store Admin', email: 'admin@gmail.com', password: 'admin123', role: 'ADMIN' },
  { fullName: 'Phone Store Staff', email: 'staff@gmail.com', password: 'staff123', role: 'STAFF' },
  { fullName: 'Phone Store Customer', email: 'customer@gmail.com', password: 'customer123', role: 'CUSTOMER' },
];

const legacyDemoEmails = ['admin@phonestore.local', 'staff@phonestore.local', 'client@phonestore.local'];

async function applyDemoAccountDetails(user, account) {
  let changed = false;
  if (user.fullName !== account.fullName) { user.fullName = account.fullName; changed = true; }
  if (user.role !== account.role) { user.role = account.role; changed = true; }
  if (user.status !== 'ACTIVE') { user.status = 'ACTIVE'; changed = true; }
  if (!user.isEmailVerified) { user.isEmailVerified = true; user.emailVerifiedAt = new Date(); changed = true; }
  if (!(await user.comparePassword(account.password))) {
    user.passwordHash = await User.hashPassword(account.password);
    changed = true;
  }
  if (changed) await user.save();
  return changed;
}

async function moveLegacyUserData(legacyUser, targetUser) {
  const [legacyCart, targetCart] = await Promise.all([
    Cart.findOne({ userId: legacyUser._id }),
    Cart.findOne({ userId: targetUser._id }),
  ]);

  if (legacyCart && targetCart) {
    const itemMap = new Map();
    for (const item of [...targetCart.items, ...legacyCart.items]) {
      const key = `${item.productId}:${item.variantId}`;
      const existing = itemMap.get(key);
      itemMap.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item.toObject());
    }
    targetCart.items = [...itemMap.values()];
    await Promise.all([targetCart.save(), legacyCart.deleteOne()]);
  } else if (legacyCart) {
    legacyCart.userId = targetUser._id;
    await legacyCart.save();
  }

  await Promise.all([
    Order.updateMany({ userId: legacyUser._id }, { $set: { userId: targetUser._id } }),
    Order.updateMany(
      { 'statusHistory.changedBy': legacyUser._id },
      { $set: { 'statusHistory.$[entry].changedBy': targetUser._id } },
      { arrayFilters: [{ 'entry.changedBy': legacyUser._id }] },
    ),
  ]);
}

export async function ensureDemoAccounts() {
  const result = { createdCount: 0, migratedCount: 0, updatedCount: 0 };

  for (let index = 0; index < demoAccounts.length; index += 1) {
    const account = demoAccounts[index];
    const legacyEmail = legacyDemoEmails[index];
    let user = await User.findOne({ email: account.email }).select('+passwordHash');
    const legacyUser = await User.findOne({ email: legacyEmail }).select('+passwordHash');

    if (!user && legacyUser) {
      legacyUser.email = account.email;
      const updated = await applyDemoAccountDetails(legacyUser, account);
      if (!updated) await legacyUser.save();
      result.migratedCount += 1;
      continue;
    }

    if (!user) {
      user = await User.create({
        fullName: account.fullName,
        email: account.email,
        passwordHash: await User.hashPassword(account.password),
        role: account.role,
      });
      result.createdCount += 1;
    } else if (await applyDemoAccountDetails(user, account)) {
      result.updatedCount += 1;
    }

    if (legacyUser) {
      await moveLegacyUserData(legacyUser, user);
      await legacyUser.deleteOne();
      result.migratedCount += 1;
    }
  }
  return result;
}
