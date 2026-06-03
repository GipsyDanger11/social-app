import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Feed from './pages/Feed';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Account from './pages/Account';
import Chat from './pages/Chat';
import Tasks from './pages/Tasks';
import Leaderboard from './pages/Leaderboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './styles/global.css';

/**
 * PrivateRoute — guards routes that require a logged-in user.
 * Reads the user object from localStorage (written by the auth flow).
 * @param {{ children: React.ReactNode }} props
 */
const PrivateRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user ? children : <Navigate to="/auth" />;
};

/**
 * AuthRoute — inverse of PrivateRoute. Redirects already-authenticated
 * users to the feed so they don't accidentally re-render the login page.
 * @param {{ children: React.ReactNode }} props
 */
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
          path="/forgot-password"
          element={<AuthRoute><ForgotPassword /></AuthRoute>}
        />
        <Route
          path="/reset-password"
          element={<AuthRoute><ResetPassword /></AuthRoute>}
        />
        <Route
          path="/profile/:username"
          element={<PrivateRoute><Profile /></PrivateRoute>}
        />
        <Route 
          path="/account" 
          element={<PrivateRoute><Account /></PrivateRoute>} 
        />
        <Route 
          path="/chat" 
          element={<PrivateRoute><Chat /></PrivateRoute>} 
        />
        <Route 
          path="/tasks" 
          element={<PrivateRoute><Tasks /></PrivateRoute>} 
        />
        <Route 
          path="/leaderboard" 
          element={<PrivateRoute><Leaderboard /></PrivateRoute>} 
        />
        {/* Redirect empty profile to current user */}
        <Route 
          path="/profile" 
          element={<PrivateRoute><Navigate to={`/profile/${JSON.parse(localStorage.getItem('user'))?.username}`} /></PrivateRoute>} 
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
