
import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import './admin.css';
import './orders.css';
import App from './App';
import AdminDashboard from './AdminDashboard';
import OrderManagement from './OrderManagement';
import AdminGate from './AdminGate';
import './auth.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname === '/admin/orders' ? <AdminGate><OrderManagement /></AdminGate> : window.location.pathname === '/admin'
      ? <AdminGate><AdminDashboard /></AdminGate>
      : <App />}
  </React.StrictMode>
);
