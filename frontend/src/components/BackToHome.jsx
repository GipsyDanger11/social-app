import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Box } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Home from '@mui/icons-material/Home';

/**
 * Floating "Back to Home" button used at the top of internal pages.
 * Pass `fallbackPath` to control where it navigates when there's no history.
 */
const BackToHome = ({ fallbackPath = '/', label = 'Back to Home', showHomeIcon = true, sx = {} }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(fallbackPath);
        }
    };

    return (
        <Button
            onClick={handleBack}
            startIcon={<ArrowBack />}
            endIcon={showHomeIcon ? <Home sx={{ fontSize: 16, ml: -0.5 }} /> : null}
            variant="outlined"
            sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '20px',
                px: 2.5,
                py: 0.8,
                borderColor: 'divider',
                color: 'text.primary',
                bgcolor: 'background.paper',
                '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'action.hover',
                    transform: 'translateX(-2px)',
                },
                transition: 'all 0.2s',
                ...sx,
            }}
        >
            {label}
        </Button>
    );
};

export default BackToHome;
