import React, { useState } from 'react';
import { Paper, Box, Typography, TextField, Button, Link, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (isSignup) {
      if (!formData.username || formData.username.length < 3) return "Username must be at least 3 characters";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    }
    if (!formData.email.includes('@')) return "Invalid email address";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) return setError(validationError);

    setLoading(true);
    try {
      const { data } = isSignup ? await api.signup(formData) : await api.login(formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: '12px', width: '100%' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: '#1877F2', textAlign: 'center' }}>
          Social
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
          {isSignup ? 'Create an Account' : 'Log In'}
        </Typography>

        {error && <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>{error}</Typography>}

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <TextField
              fullWidth
              label="Username"
              margin="normal"
              required
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          )}
          <TextField
            fullWidth
            label="Email Address"
            margin="normal"
            required
            type="email"
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            fullWidth
            label="Password"
            margin="normal"
            required
            type="password"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          {isSignup && (
            <TextField
              fullWidth
              label="Confirm Password"
              margin="normal"
              required
              type="password"
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 3, mb: 2, bgcolor: '#1877F2', borderRadius: '8px', py: 1.5 }}
          >
            {loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Log In')}
          </Button>
        </form>

        <Box sx={{ textAlign: 'center' }}>
          <Link 
            component="button" 
            variant="body2" 
            onClick={() => setIsSignup(!isSignup)}
            sx={{ textDecoration: 'none' }}
          >
            {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default Auth;
