import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Feed from './pages/Feed';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Account from './pages/Account';
import './styles/global.css';

const PrivateRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user ? children : <Navigate to="/auth" />;
};

const AuthRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  return !user ? children : <Navigate to="/" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={<PrivateRoute><Feed /></PrivateRoute>} 
        />
        <Route 
          path="/auth" 
          element={<AuthRoute><Auth /></AuthRoute>} 
        />
        <Route 
          path="/profile/:username" 
          element={<PrivateRoute><Profile /></PrivateRoute>} 
        />
        <Route 
          path="/account" 
          element={<PrivateRoute><Account /></PrivateRoute>} 
        />
        {/* Redirect empty profile to current user */}
        <Route 
          path="/profile" 
          element={<PrivateRoute><Navigate to={`/profile/${JSON.parse(localStorage.getItem('user'))?.username}`} /></PrivateRoute>} 
        />
        
        {/* Placeholder routes for other sidebar items */}
        <Route path="/tasks" element={<Navigate to="/" />} />
        <Route path="/leaderboard" element={<Navigate to="/" />} />
        <Route path="/chat" element={<Navigate to="/" />} />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
