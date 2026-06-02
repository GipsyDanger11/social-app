import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, IconButton, Checkbox, FormControl, InputLabel, Select, MenuItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Snackbar, Alert } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import * as api from '../api';
import moment from 'moment';

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
            } else {
                await api.createTask(formData);
            }
            setOpen(false);
            loadTasks();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this task?')) {
            try {
                await api.deleteTask(id);
                loadTasks();
            } catch (err) { console.error(err); }
        }
    };

    const handleStatusToggle = async (task) => {
        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
        try {
            await api.updateTask(task._id, { status: newStatus });
            loadTasks();
        } catch (err) { console.error(err); }
    };

    const groupedTasks = {
        todo: tasks.filter(t => t.status === 'todo'),
        'in-progress': tasks.filter(t => t.status === 'in-progress'),
        completed: tasks.filter(t => t.status === 'completed')
    };

    const priorityColor = (p) => p === 'high' ? '#f02849' : p === 'medium' ? '#ffa500' : '#4caf50';

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar user={currentUser} />
            <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Tasks</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ borderRadius: '20px', bgcolor: '#1877F2' }}>
                        New Task
                    </Button>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                    {['todo', 'in-progress', 'completed'].map(status => (
                        <Paper key={status} elevation={0} sx={{ p: 2, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textTransform: 'capitalize' }}>
                                {status.replace('-', ' ')} ({groupedTasks[status].length})
                            </Typography>
                            {groupedTasks[status].map(task => (
                                <Paper key={task._id} elevation={0} sx={{ p: 2, mb: 1.5, borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <Checkbox 
                                            checked={task.status === 'completed'} 
                                            onChange={() => handleStatusToggle(task)}
                                            sx={{ p: 0, mt: -0.5 }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography 
                                                variant="body1" 
                                                sx={{ 
                                                    fontWeight: 500, 
                                                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                                    color: task.status === 'completed' ? 'text.secondary' : 'text.primary'
                                                }}
                                            >
                                                {task.title}
                                            </Typography>
                                            {task.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    {task.description}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                                                <Chip 
                                                    label={task.priority} 
                                                    size="small" 
                                                    sx={{ bgcolor: priorityColor(task.priority), color: 'white', textTransform: 'capitalize', height: 20 }} 
                                                />
                                                {task.dueDate && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Due: {moment(task.dueDate).format('MMM D')}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpen(task)}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(task._id)}>
                                                <Delete fontSize="small" color="error" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Paper>
                            ))}
                        </Paper>
                    ))}
                </Box>
            </Box>

            {/* Task Form Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
                <DialogContent>
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
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: '#1877F2' }}>
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
