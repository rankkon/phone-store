import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import BrandsPage from './pages/admin/BrandsPage';
import ProductFormPage from './pages/admin/ProductFormPage';
import ProductsPage from './pages/admin/ProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';
import DashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import VouchersPage from './pages/admin/VouchersPage';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

function AdminIndexRedirect() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <Navigate to="dashboard" replace />;
  }
  return <Navigate to="orders" replace />;
}
import RegisterPage from './pages/auth/RegisterPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import ProductListPage from './pages/customer/ProductListPage';
import ProfilePage from './pages/customer/ProfilePage';
import MyVouchersPage from './pages/customer/MyVouchersPage';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route element={<ProtectedRoute />}><Route path="profile" element={<ProfilePage />} /></Route>
        <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/success/:orderCode" element={<OrderSuccessPage />} />
          <Route path="orders/:orderCode" element={<OrderDetailPage />} />
          <Route path="my-vouchers" element={<MyVouchersPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['ADMIN', 'STAFF']} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminIndexRedirect />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:id/edit" element={<ProductFormPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="vouchers" element={<VouchersPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
