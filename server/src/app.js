import cors from 'cors';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import productRoutes from './routes/productRoutes.js';
import adminBrandRoutes from './routes/adminBrandRoutes.js';
import adminProductRoutes from './routes/adminProductRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import voucherRoutes from './routes/voucherRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import managementOrderRoutes from './routes/managementOrderRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ message: 'Phone Store API is running.' }));
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin/brands', adminBrandRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/management/orders', managementOrderRoutes);
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
