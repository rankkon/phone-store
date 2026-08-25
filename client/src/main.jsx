import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { FeedbackProvider } from './context/FeedbackContext';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider><FavoritesProvider><NotificationsProvider><FeedbackProvider><App /></FeedbackProvider></NotificationsProvider></FavoritesProvider></AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
