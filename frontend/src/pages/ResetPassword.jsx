import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, Alert, Link, Stack, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import * as api from '../api';

/**
 * /reset-password?token=...
 * Validates the token with the server, then lets the user set a new password.
 */
const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [username, setUsername] = useState(null);
    const [validating, setValidating] = useState(true);
    const [valid, setValid] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!token) {
            setValidating(false);
            setValid(false);
            return;
        }
        (async () => {
            try {
                const { data } = await api.validateResetToken(token);
                setValid(true);
                setUsername(data.username);
            } catch (err) {
                setValid(false);
            } finally {
                setValidating(false);
            }
        })();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setSubmitting(true);
        try {
            await api.resetPassword(token, newPassword);
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not reset password. The link may have expired.');
        }
        setSubmitting(false);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                p: 2,
            }}
        >
            <Paper elevation={6} sx={{ width: '100%', maxWidth: 440, p: 4, borderRadius: '16px' }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/auth')}
                    sx={{ mb: 1, textTransform: 'none', color: 'text.secondary' }}
                >
                    Back to login
                </Button>

                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Set a new password
                </Typography>

                {validating ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                        <CircularProgress size={20} />
                        <Typography color="text.secondary">Validating reset link…</Typography>
                    </Box>
                ) : !valid ? (
                    <Stack spacing={2}>
                        <Alert severity="error">This reset link is invalid or has expired.</Alert>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/forgot-password')}
                            sx={{ borderRadius: '20px', textTransform: 'none', bgcolor: '#1877F2' }}
                        >
                            Request a new link
                        </Button>
                    </Stack>
                ) : done ? (
                    <Stack spacing={2}>
                        <Alert severity="success">Your password has been updated. You can now log in.</Alert>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/auth')}
                            sx={{ borderRadius: '20px', textTransform: 'none', bgcolor: '#1877F2' }}
                        >
                            Go to login
                        </Button>
                    </Stack>
                ) : (
                    <Box component="form" onSubmit={handleSubmit}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Hi <strong>@{username}</strong>, choose a new password below.
                        </Typography>
                        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                        <TextField
                            fullWidth
                            label="New password"
                            type={showPwd ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            autoFocus
                            sx={{ mb: 2 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPwd((s) => !s)} edge="end" size="small">
                                            {showPwd ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Confirm new password"
                            type={showPwd ? 'text' : 'password'}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={submitting}
                            sx={{
                                py: 1.2,
                                borderRadius: '20px',
                                textTransform: 'none',
                                fontWeight: 700,
                                bgcolor: '#1877F2',
                                '&:hover': { bgcolor: '#166fe5' },
                            }}
                        >
                            {submitting ? 'Saving…' : 'Update password'}
                        </Button>
                    </Box>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
                    Need help?{' '}
                    <Link component={RouterLink} to="/auth" sx={{ fontWeight: 700 }}>
                        Sign in
                    </Link>
                </Typography>
            </Paper>
        </Box>
    );
};

export default ResetPassword;
