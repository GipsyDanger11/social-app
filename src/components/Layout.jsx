import React from 'react';
import { Box, Container } from '@mui/material';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ user, children, showSidebar = true }) => {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar user={user} />
            <Box sx={{ display: 'flex', maxWidth: 1400, mx: 'auto', px: { xs: 0, md: 2 } }}>
                {showSidebar && <Sidebar />}
                <Box sx={{ flex: 1, minWidth: 0, py: 2, px: { xs: 2, md: 0 } }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default Layout;
