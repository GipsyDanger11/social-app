import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, Link, Stack } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import * as api from '../api';

/**
 * /forgot-password
 * Lets a user request a password-reset email.
 * In dev mode (no SMTP) the backend returns the reset URL in `devResetUrl`
 * and we surface a "Open reset link" button.
 */
const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [devUrl, setDevUrl] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.forgotPassword(email.trim());
            setSent(true);
            if (data.devResetUrl) setDevUrl(data.devResetUrl);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1877F2 0%, #7c4dff 100%)',
                p: 2,
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    width: '100%',
                    maxWidth: 440,
                    p: 4,
                    borderRadius: '16px',
                }}
            >
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/auth')}
                    sx={{ mb: 1, textTransform: 'none', color: 'text.secondary' }}
                >
                    Back to login
                </Button>

                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Forgot password?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    No worries. Enter the email address tied to your account and we'll send you a link to reset your password.
                </Typography>

                {sent ? (
                    <Stack spacing={2}>
                        <Alert severity="success">
                            If that email is registered, a reset link has been sent. Check your inbox.
                        </Alert>
                        {devUrl && (
                            <Alert severity="info">
                                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Dev mode — SMTP not configured
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Use the button below to simulate clicking the link in the email.
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => navigate(devUrl.replace(/^https?:\/\/[^/]+/, ''))}
                                    sx={{ borderRadius: '20px', textTransform: 'none', bgcolor: '#1877F2' }}
                                >
                                    Open reset link
                                </Button>
                            </Alert>
                        )}
                        <Button variant="outlined" onClick={() => navigate('/auth')} sx={{ borderRadius: '20px', textTransform: 'none' }}>
                            Back to login
                        </Button>
                    </Stack>
                ) : (
                    <Box component="form" onSubmit={handleSubmit}>
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                        <TextField
                            fullWidth
                            label="Email address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            sx={{ mb: 2 }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading || !email.trim()}
                            sx={{
                                py: 1.2,
                                borderRadius: '20px',
                                textTransform: 'none',
                                fontWeight: 700,
                                bgcolor: '#1877F2',
                                '&:hover': { bgcolor: '#166fe5' },
                            }}
                        >
                            {loading ? 'Sending…' : 'Send reset link'}
                        </Button>
                    </Box>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
                    Don't have an account?{' '}
                    <Link component={RouterLink} to="/auth" sx={{ fontWeight: 700 }}>
                        Sign up
                    </Link>
                </Typography>
            </Paper>
        </Box>
    );
};

export default ForgotPassword;
