import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Layout.scss';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <div className="logo">
            <h1>Comment System</h1>
          </div>
          
          <nav className="nav">
            <div className="user-info">
              <span className="welcome-message">
                Welcome, {user?.username}!
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-logout"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="layout-main">
        {children}
      </main>

      <footer className="layout-footer">
        <div className="footer-content">
          <p>&copy; 2025 Comment System. Built with MERN stack.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
