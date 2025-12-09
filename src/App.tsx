import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CommentList from './components/Comments/CommentList';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './App.scss';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/comments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CommentList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/comments" replace />} />
            <Route path="*" element={<Navigate to="/comments" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
