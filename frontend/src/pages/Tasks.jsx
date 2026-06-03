import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, IconButton, Checkbox, FormControl, InputLabel, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Snackbar, Alert, Grid, LinearProgress, Avatar } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import CheckCircle from '@mui/icons-material/CheckCircle';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import Schedule from '@mui/icons-material/Schedule';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Flag from '@mui/icons-material/Flag';
import Navbar from '../components/Navbar';
import BackToHome from '../components/BackToHome';
import { useSocket } from '../context/SocketContext';
import * as api from '../api';
import moment from 'moment';

const STATUS_META = {
    'todo': { label: 'To Do', icon: <RadioButtonUnchecked fontSize="small" />, color: '#65676b', bg: 'rgba(101,103,107,0.08)' },
    'in-progress': { label: 'In Progress', icon: <Schedule fontSize="small" />, color: '#ffa500', bg: 'rgba(255,165,0,0.08)' },
    'completed': { label: 'Completed', icon: <CheckCircle fontSize="small" />, color: '#31a24c', bg: 'rgba(49,162,76,0.08)' },
};

const PRIORITY_META = {
    low: { label: 'Low', color: '#4caf50' },
    medium: { label: 'Medium', color: '#ff9800' },
    high: { label: 'High', color: '#f02849' },
};

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [open, setOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: ''
    });
    const [toast, setToast] = useState(null);
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const { on } = useSocket();

    const loadTasks = async () => {
        try {
            const { data } = await api.fetchTasks();
            setTasks(data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        loadTasks();
    }, []);

    // Real-time: react to my own task updates from other tabs/devices
    useEffect(() => {
        const offNew = on('task:new', (task) => {
            setTasks((prev) => {
                if (prev.some((t) => t._id === task._id)) return prev;
                return [task, ...prev];
            });
        });
        const offUpd = on('task:update', (task) => {
            setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
        });
        const offDel = on('task:delete', ({ id }) => {
            setTasks((prev) => prev.filter((t) => t._id !== id));
        });
        return () => {
            offNew && offNew();
            offUpd && offUpd();
            offDel && offDel();
        };
    }, [on]);

    const handleOpen = (task = null) => {
        if (task) {
            setEditingTask(task);
            setFormData({
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate ? moment(task.dueDate).format('YYYY-MM-DD') : ''
            });
        } else {
            setEditingTask(null);
            setFormData({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' });
        }
        setOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) return;
        try {
            if (editingTask) {
                await api.updateTask(editingTask._id, formData);
                setToast({ type: 'success', message: 'Task updated' });
            } else {
                await api.createTask(formData);
                setToast({ type: 'success', message: 'Task created' });
            }
            setOpen(false);
            loadTasks();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this task?')) {
            try {
                await api.deleteTask(id);
                setToast({ type: 'info', message: 'Task deleted' });
                loadTasks();
            } catch (err) { console.error(err); }
        }
    };

    const handleStatusToggle = async (task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
        try {
            await api.updateTask(task._id, { status: newStatus });
            if (newStatus === 'completed') setToast({ type: 'success', message: '🎉 Task completed!' });
            loadTasks();
        } catch (err) { console.error(err); }
    };

    const groupedTasks = {
        todo: tasks.filter(t => t.status === 'todo'),
        'in-progress': tasks.filter(t => t.status === 'in-progress'),
        completed: tasks.filter(t => t.status === 'completed'),
    };

    const totalTasks = tasks.length;
    const completedCount = groupedTasks.completed.length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar user={currentUser} />

            {/* Hero header */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1877F2 0%, #7c4dff 100%)',
                    color: 'white',
                    py: 5,
                    px: 3,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute', top: -80, right: -80, width: 240, height: 240,
                        borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute', bottom: -60, left: '20%', width: 180, height: 180,
                        borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)',
                    }}
                />
                <Box sx={{ maxWidth: 1200, mx: 'auto', position: 'relative', zIndex: 1 }}>
                    <Box sx={{ mb: 2 }}>
                        <BackToHome label="Back" showHomeIcon={false} sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)', color: 'white', borderColor: 'rgba(255,255,255,0.5)' } }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                        <Box>
                            <Typography variant="overline" sx={{ opacity: 0.9, fontWeight: 600, letterSpacing: 1.5 }}>
                                Your Workspace
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1, mb: 1 }}>
                                ✅ My Tasks
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                Stay organized, ship more, climb the leaderboard.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Add />}
                            onClick={() => handleOpen()}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.95)',
                                color: 'primary.main',
                                borderRadius: '24px',
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 3,
                                py: 1.2,
                                fontSize: 15,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                '&:hover': { bgcolor: 'white', transform: 'translateY(-2px)', boxShadow: '0 6px 24px rgba(0,0,0,0.25)' },
                                transition: 'all 0.2s',
                            }}
                        >
                            New Task
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, mt: -3, position: 'relative', zIndex: 2 }}>
                {/* Stats row */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {[
                        { label: 'Total', value: totalTasks, color: '#1877F2', icon: <Flag /> },
                        { label: 'To Do', value: groupedTasks.todo.length, color: '#65676b', icon: <RadioButtonUnchecked /> },
                        { label: 'In Progress', value: groupedTasks['in-progress'].length, color: '#ff9800', icon: <Schedule /> },
                        { label: 'Completed', value: completedCount, color: '#31a24c', icon: <CheckCircle /> },
                    ].map((stat) => (
                        <Grid item xs={6} md={3} key={stat.label}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' },
                                }}
                            >
                                <Avatar sx={{ bgcolor: stat.color, width: 44, height: 44 }}>
                                    {stat.icon}
                                </Avatar>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        {stat.label.toUpperCase()}
                                    </Typography>
                                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
                                        {stat.value}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {/* Progress bar */}
                {totalTasks > 0 && (
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <TrendingUp sx={{ color: '#31a24c' }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                                Your Progress
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#31a24c' }}>
                                {completionRate}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={completionRate}
                            sx={{
                                height: 10,
                                borderRadius: 5,
                                bgcolor: 'action.hover',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 5,
                                    background: 'linear-gradient(90deg, #1877F2 0%, #31a24c 100%)',
                                },
                            }}
                        />
                    </Paper>
                )}

                {/* Kanban columns */}
                <Grid container spacing={2}>
                    {['todo', 'in-progress', 'completed'].map(status => {
                        const meta = STATUS_META[status];
                        return (
                            <Grid item xs={12} md={4} key={status}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        overflow: 'hidden',
                                        minHeight: 200,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 2,
                                            bgcolor: meta.bg,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}
                                    >
                                        <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: meta.color, flex: 1 }}>
                                            {meta.label}
                                        </Typography>
                                        <Chip
                                            label={groupedTasks[status].length}
                                            size="small"
                                            sx={{
                                                bgcolor: meta.color,
                                                color: 'white',
                                                fontWeight: 700,
                                                height: 22,
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ p: 1.5, maxHeight: 600, overflow: 'auto' }}>
                                        {groupedTasks[status].length === 0 ? (
                                            <Box sx={{ p: 3, textAlign: 'center', opacity: 0.6 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No tasks here yet
                                                </Typography>
                                            </Box>
                                        ) : (
                                            groupedTasks[status].map(task => {
                                                const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                                                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                                                return (
                                                    <Paper
                                                        key={task._id}
                                                        elevation={0}
                                                        sx={{
                                                            p: 2,
                                                            mb: 1.2,
                                                            borderRadius: '10px',
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                            transition: 'all 0.2s',
                                                            '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                            <Checkbox
                                                                checked={task.status === 'completed'}
                                                                onChange={() => handleStatusToggle(task)}
                                                                icon={<RadioButtonUnchecked />}
                                                                checkedIcon={<CheckCircle sx={{ color: '#31a24c' }} />}
                                                                sx={{ p: 0, mt: -0.5 }}
                                                            />
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Typography
                                                                    variant="body1"
                                                                    sx={{
                                                                        fontWeight: 600,
                                                                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                                                        color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                                                                        wordBreak: 'break-word',
                                                                    }}
                                                                >
                                                                    {task.title}
                                                                </Typography>
                                                                {task.description && (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                        {task.description}
                                                                    </Typography>
                                                                )}
                                                                <Box sx={{ display: 'flex', gap: 1, mt: 1.2, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                    <Chip
                                                                        icon={<Flag sx={{ fontSize: '12px !important' }} />}
                                                                        label={priorityMeta.label}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: priorityMeta.color,
                                                                            color: 'white',
                                                                            textTransform: 'capitalize',
                                                                            height: 20,
                                                                            fontWeight: 600,
                                                                            '& .MuiChip-icon': { color: 'white' },
                                                                        }}
                                                                    />
                                                                    {task.dueDate && (
                                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: isOverdue ? 'error.main' : 'text.secondary' }}>
                                                                            <Schedule sx={{ fontSize: 12 }} />
                                                                            <Typography variant="caption" sx={{ fontWeight: isOverdue ? 700 : 400 }}>
                                                                                {moment(task.dueDate).format('MMM D')}
                                                                                {isOverdue && ' · Overdue'}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                            <Box>
                                                                <Tooltip title="Edit">
                                                                    <IconButton size="small" onClick={() => handleOpen(task)}>
                                                                        <Edit fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Delete">
                                                                    <IconButton size="small" onClick={() => handleDelete(task._id)}>
                                                                        <Delete fontSize="small" sx={{ color: 'error.main' }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        </Box>
                                                    </Paper>
                                                );
                                            })
                                        )}
                                    </Box>
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>
            </Box>

            {/* Task Form Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '14px' } }}>
                <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider' }}>
                    {editingTask ? '✏️ Edit Task' : '✨ New Task'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Title"
                        margin="normal"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={3}
                        margin="normal"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status}
                                label="Status"
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <MenuItem value="todo">To Do</MenuItem>
                                <MenuItem value="in-progress">In Progress</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={formData.priority}
                                label="Priority"
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    <TextField
                        fullWidth
                        type="date"
                        label="Due Date"
                        margin="normal"
                        InputLabelProps={{ shrink: true }}
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={() => setOpen(false)} sx={{ borderRadius: '20px', textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 700, px: 3, bgcolor: '#1877F2' }}>
                        {editingTask ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!toast}
                autoHideDuration={3000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setToast(null)} severity={toast?.type || 'success'} sx={{ borderRadius: 2 }}>
                    {toast?.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Tasks;
