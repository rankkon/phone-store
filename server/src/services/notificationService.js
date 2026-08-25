import Notification from '../models/Notification.js';
import User from '../models/User.js';

function normalizePayload({ type = 'SYSTEM', title, message, link = '' }) {
  return { type, title: String(title || '').slice(0, 160), message: String(message || '').slice(0, 1000), link: String(link || '').slice(0, 500) };
}

export async function createNotification({ userId, ...payload }) {
  if (!userId) return null;
  try {
    return await Notification.create({ userId, ...normalizePayload(payload) });
  } catch (error) {
    console.error('Unable to create notification:', error.message);
    return null;
  }
}

export async function createNotificationsForRoles(roles, payload) {
  try {
    const users = await User.find({ role: { $in: roles }, status: 'ACTIVE' }).select('_id').lean();
    if (users.length === 0) return [];
    const data = normalizePayload(payload);
    return await Notification.insertMany(users.map((user) => ({ userId: user._id, ...data })), { ordered: false });
  } catch (error) {
    console.error('Unable to create role notifications:', error.message);
    return [];
  }
}
