import React, { useState } from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Box, IconButton, Drawer, useMediaQuery, useTheme } from '@mui/material';
import Home from '@mui/icons-material/Home';
import Assignment from '@mui/icons-material/Assignment';
import Public from '@mui/icons-material/Public';
import Leaderboard from '@mui/icons-material/Leaderboard';
import Chat from '@mui/icons-material/Chat';
import MenuIcon from '@mui/icons-material/Menu';
import Close from '@mui/icons-material/Close';
import { useLocation, useNavigate } from 'react-router-dom';

const Sidebar = ({ variant = 'permanent' }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const menuItems = [
        { text: 'Home Feed', icon: <Home />, path: '/' },
        { text: 'Tasks', icon: <Assignment />, path: '/tasks' },
        { text: 'Social Feed', icon: <Public />, path: '/' },
        { text: 'Leaderboard', icon: <Leaderboard />, path: '/leaderboard' },
        { text: 'Chat', icon: <Chat />, path: '/chat' },
    ];

    const content = (
        <Box sx={{ width: 240, p: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, mb: 1 }}>
                <Box sx={{ fontWeight: 'bold', fontSize: 20, color: '#1877F2' }}>Menu</Box>
                {isMobile && (
                    <IconButton size="small" onClick={() => setMobileOpen(false)}>
                        <Close />
                    </IconButton>
                )}
            </Box>
            <List>
                {menuItems.map((item) => {
                    const isActive = item.path === '/' 
                        ? (location.pathname === '/' && item.text === 'Home Feed')
                        : location.pathname.startsWith(item.path);
                    
                    return (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton 
                                selected={isActive}
                                onClick={() => {
                                    navigate(item.path);
                                    if (isMobile) setMobileOpen(false);
                                }}
                                sx={{
                                    borderRadius: '10px',
                                    mb: 0.5,
                                    '&.Mui-selected': {
                                        bgcolor: '#1877F2',
                                        color: 'white',
                                        '& .MuiListItemIcon-root': { color: 'white' },
                                    },
                                    '&:hover': {
                                        bgcolor: isActive ? '#1877F2' : 'action.hover',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'white' : 'text.secondary' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    if (variant === 'mobile') {
        return (
            <>
                <IconButton 
                    onClick={() => setMobileOpen(true)}
                    sx={{ position: 'fixed', top: 70, left: 16, zIndex: 1000, bgcolor: 'background.paper', boxShadow: 2 }}
                >
                    <MenuIcon />
                </IconButton>
                <Drawer
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    PaperProps={{ sx: { bgcolor: 'background.paper' } }}
                >
                    {content}
                </Drawer>
            </>
        );
    }

    return (
        <Box sx={{ 
            width: 240, 
            flexShrink: 0,
            display: { xs: 'none', md: 'block' },
            position: 'sticky',
            top: 80,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto'
        }}>
            {content}
        </Box>
    );
};

export default Sidebar;
