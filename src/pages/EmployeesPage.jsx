import { useState, useEffect, useContext } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Alert,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    InputAdornment,
    Stack,
    Grid,
    Avatar,
    CircularProgress,
    Skeleton,
    Fade,
    LinearProgress,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Backdrop,
    Chip,
    Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Sync as SyncIcon,
    Edit as EditIcon,
    PeopleAlt as PeopleAltIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';
import { corporateColors, getAreaTone } from '../theme/tokens';

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const HEADER_CELL_SX = {
    fontWeight: 600,
    fontSize: '0.7rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'text.secondary',
    borderBottom: '2px solid',
    borderBottomColor: 'divider',
    py: 1.5,
    px: 2,
    whiteSpace: 'nowrap',
};

const getDepChipStyle = (value) => getAreaTone(value);

const getInitials = (nombre) => {
    if (!nombre) return '?';
    const parts = nombre.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = [
    corporateColors.brand,
    corporateColors.primary,
    corporateColors.accentTeal,
    corporateColors.info,
    corporateColors.primaryHover,
    '#2F4858',
];

const getAvatarColor = (nombre) => {
    if (!nombre) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) hash = (hash + nombre.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[hash];
};

// ─── Tarjeta de métrica ────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon, accentColor, active, onClick, loading }) => {
    const theme = useTheme();
    return (
        <Tooltip title={`Filtrar: ${label}`} placement="top" arrow>
            <Paper
                elevation={0}
                onClick={onClick}
                sx={{
                    border: '1px solid',
                    borderColor: active ? accentColor : 'divider',
                    borderLeft: `3px solid ${active ? accentColor : theme.palette.divider}`,
                    borderRadius: 2,
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    bgcolor: active ? alpha(accentColor, 0.04) : 'background.paper',
                    '&:hover': {
                        borderColor: accentColor,
                        borderLeftColor: accentColor,
                        bgcolor: alpha(accentColor, 0.04),
                        boxShadow: `0 2px 8px ${alpha(accentColor, 0.15)}`,
                    },
                    userSelect: 'none',
                }}
            >
                {loading ? (
                    <Box>
                        <Skeleton variant="text" width="40%" height={36} />
                        <Skeleton variant="text" width="60%" height={18} sx={{ mt: 0.5 }} />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography
                                variant="h4"
                                fontWeight={700}
                                sx={{
                                    lineHeight: 1,
                                    color: active ? accentColor : 'text.primary',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {value ?? '—'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 500 }}>
                                {label}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1.5,
                                bgcolor: active ? alpha(accentColor, 0.12) : alpha(accentColor, 0.07),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: accentColor,
                                transition: 'all 0.18s ease',
                                flexShrink: 0,
                            }}
                        >
                            {icon}
                        </Box>
                    </Box>
                )}
            </Paper>
        </Tooltip>
    );
};

// ─── Componente principal ──────────────────────────────────────────────────────

const EmployeesPage = () => {
    const theme = useTheme();
    const pagePalette = {
        softHover: alpha(theme.palette.primary.main, 0.04),
        softStrong: alpha(theme.palette.primary.main, 0.12),
    };

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterActivo, setFilterActivo] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const { user } = useContext(MainContext);
    const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0 });
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [syncDialogOpen, setSyncDialogOpen] = useState(false);

    const { control, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: { codigo: '', nombre: '', activo: true },
    });

    useEffect(() => { loadEmployees(); }, [page, rowsPerPage, searchTerm, filterActivo]);
    useEffect(() => { loadStats(); }, []);
    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(0); }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const params = {
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                ...(searchTerm && { search: searchTerm }),
                ...(filterActivo !== 'all' && { activo: filterActivo === 'active' }),
            };
            const response = await axios.get(`${CONFIG.uri}/employees`, { params });
            setEmployees(response.data.empleados || []);
            setTotalEmployees(response.data.total || 0);
        } catch (error) {
            console.error('Error al cargar empleados:', error);
            showSnackbar('Error al cargar los empleados', 'error');
            setEmployees([]);
            setTotalEmployees(0);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await axios.get(`${CONFIG.uri}/employees/stats`);
            setStats(response.data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    };

    const handleOpenDialog = (employee = null) => {
        if (!(user && user.es_lider)) return;
        if (employee) {
            setEditingEmployee(employee);
            reset({ codigo: employee.codigo || '', nombre: employee.nombre || '', activo: employee.activo !== false });
        } else {
            setEditingEmployee(null);
            reset({ codigo: '', nombre: '', activo: true });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => { setOpenDialog(false); setEditingEmployee(null); reset(); };

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            if (editingEmployee) {
                await axios.put(`${CONFIG.uri}/employees/${editingEmployee._id}`, data);
                showSnackbar('Vendedor actualizado exitosamente', 'success');
            } else {
                await axios.post(`${CONFIG.uri}/employees`, data);
                showSnackbar('Vendedor creado exitosamente', 'success');
            }
            handleCloseDialog();
            loadEmployees();
            loadStats();
        } catch (error) {
            console.error('Error al guardar empleado:', error);
            showSnackbar(error.response?.data?.detail || 'Error al guardar el vendedor', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDeleteDialog = (employee) => { setEmployeeToDelete(employee); setDeleteDialogOpen(true); };

    const handleDelete = async () => {
        try {
            setLoading(true);
            if (employeeToDelete) {
                await axios.delete(`${CONFIG.uri}/employees/${employeeToDelete._id}`);
                showSnackbar('Vendedor eliminado exitosamente', 'success');
                setDeleteDialogOpen(false);
                setEmployeeToDelete(null);
                loadEmployees();
                loadStats();
            }
        } catch (error) {
            console.error('Error al eliminar empleado:', error);
            showSnackbar('Error al eliminar el vendedor', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (_, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
    const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));
    const handleRefresh = () => { loadEmployees(); loadStats(); };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await axios.post(`${CONFIG.uri}/employees/sync-bitrix`);
            setSyncResult(response.data);
            setSyncDialogOpen(true);
            if (response.data.insertados > 0) { loadEmployees(); loadStats(); }
        } catch (error) {
            showSnackbar(error.response?.data?.detail || 'Error al sincronizar con Bitrix24', 'error');
        } finally {
            setSyncing(false);
        }
    };

    // ─── Sub-renders ────────────────────────────────────────────────────────────

    const colSpan = user?.es_lider ? 5 : 4;
    const skeletonCount = Math.min(rowsPerPage, 12);

    const renderSkeletonRows = () =>
        Array.from({ length: skeletonCount }).map((_, i) => (
            <TableRow key={i} sx={{ '& .MuiTableCell-root': { py: 1.5, px: 2 } }}>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Skeleton variant="text" width="70%" height={18} />
                            <Skeleton variant="text" width="40%" height={14} />
                        </Box>
                    </Box>
                </TableCell>
                <TableCell><Skeleton variant="text" width="45%" /></TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Skeleton variant="rounded" width={64} height={20} />
                        <Skeleton variant="rounded" width={48} height={20} />
                    </Box>
                </TableCell>
                <TableCell><Skeleton variant="rounded" width={60} height={22} /></TableCell>
                {user?.es_lider && <TableCell />}
            </TableRow>
        ));

    const renderEmptyState = () => {
        const isFiltered = searchTerm || filterActivo !== 'all';
        return (
            <TableRow>
                <TableCell colSpan={colSpan} sx={{ border: 'none', p: 0 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, px: 3 }}>
                        <Box sx={{
                            width: 60, height: 60, borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.06),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                        }}>
                            <PersonIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={600} color="text.primary" gutterBottom>
                            {isFiltered ? 'Sin resultados' : 'Sin vendedores registrados'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 360, lineHeight: 1.6 }}>
                            {isFiltered
                                ? 'No encontramos vendedores con esos criterios. Prueba ajustando la búsqueda o los filtros.'
                                : 'Aún no hay vendedores registrados. Puedes crearlos manualmente o sincronizar desde Bitrix24.'}
                        </Typography>
                        {!isFiltered && (
                            <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
                                    onClick={handleSync}
                                    disabled={syncing}
                                    sx={{ borderRadius: 1.5 }}
                                >
                                    Sincronizar con Bitrix
                                </Button>
                                {user?.es_lider && (
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenDialog()}
                                        disableElevation
                                        sx={{ borderRadius: 1.5, fontWeight: 600 }}
                                    >
                                        Crear vendedor
                                    </Button>
                                )}
                            </Stack>
                        )}
                    </Box>
                </TableCell>
            </TableRow>
        );
    };

    // ─── JSX ────────────────────────────────────────────────────────────────────

    return (
        <Box
            sx={{
                height: 'calc(100vh - 64px)',
                display: 'flex',
                flexDirection: 'column',
                p: { xs: 2, md: 3 },
                gap: 2.5,
                overflow: 'hidden',
                boxSizing: 'border-box',
            }}
        >
            {loading && !initialLoading && (
                <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 2 }} />
            )}

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0, gap: 2 }}>
                <Box>
                    <Typography
                        variant="h5"
                        fontWeight={700}
                        color="text.primary"
                        sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}
                    >
                        Gestión de Vendedores
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Administra el equipo de ventas y sincroniza con Bitrix24
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Tooltip title="Recargar">
                        <IconButton
                            onClick={handleRefresh}
                            disabled={loading}
                            size="small"
                            sx={{
                                border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 0.875,
                                '&:hover': { bgcolor: pagePalette.softHover },
                            }}
                        >
                            <RefreshIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>

                    <Button
                        variant="outlined"
                        startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
                        onClick={handleSync}
                        disabled={syncing || loading}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            px: 1.75,
                            borderColor: alpha(theme.palette.primary.main, 0.16),
                            bgcolor: alpha(theme.palette.primary.main, 0.018),
                            '&:hover': {
                                borderColor: alpha(theme.palette.primary.main, 0.28),
                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                            },
                        }}
                    >
                        Sincronizar
                    </Button>

                    {user?.es_lider && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                            disableElevation
                            sx={{
                                borderRadius: 1.5,
                                fontWeight: 600,
                                px: 2.5,
                                py: 0.875,
                                fontSize: '0.875rem',
                                boxShadow: 'none',
                                '&:hover': { boxShadow: 'none' },
                            }}
                        >
                            Crear vendedor
                        </Button>
                    )}
                </Stack>
            </Box>



            {/* ── Barra de filtros ─────────────────────────────────────────────── */}
            <Grid container spacing={2} flexShrink={0}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.045)} 0%, rgba(255,255,255,0) 100%)` }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                                    Total
                                </Typography>
                                <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color: 'primary.main' }}>
                                    {(stats.total ?? 0).toLocaleString()}
                                </Typography>
                            </Box>
                            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}>
                                <PeopleAltIcon fontSize="small" />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, background: `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.045)} 0%, rgba(255,255,255,0) 100%)` }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                                    Activos
                                </Typography>
                                <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color: 'success.main' }}>
                                    {(stats.activos ?? 0).toLocaleString()}
                                </Typography>
                            </Box>
                            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.success.main, 0.08), color: 'success.main' }}>
                                <CheckCircleIcon fontSize="small" />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, background: `linear-gradient(180deg, ${alpha(theme.palette.grey[600], 0.08)} 0%, rgba(255,255,255,0) 100%)` }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                                    Inactivos
                                </Typography>
                                <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color: 'text.primary' }}>
                                    {(stats.inactivos ?? 0).toLocaleString()}
                                </Typography>
                            </Box>
                            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.grey[600], 0.12), color: 'text.secondary' }}>
                                <CancelIcon fontSize="small" />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.75, flexShrink: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1.5}>
                    <TextField
                        placeholder="Buscar por nombre o código..."
                        size="small"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        sx={{
                            flexGrow: 1, minWidth: 200, maxWidth: 440,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.grey[500], 0.03),
                                '&:hover': { bgcolor: 'background.paper' },
                                '&.Mui-focused': { bgcolor: 'background.paper' },
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchInput ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" edge="end" onClick={() => { setSearchInput(''); setSearchTerm(''); setPage(0); }}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 170 }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            value={filterActivo}
                            label="Estado"
                            onChange={(e) => { setFilterActivo(e.target.value); setPage(0); }}
                            sx={{ borderRadius: 1.5 }}
                        >
                            <MenuItem value="all">Todos los estados</MenuItem>
                            <MenuItem value="active">Activos</MenuItem>
                            <MenuItem value="inactive">Inactivos</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />

                    {!initialLoading && (
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {totalEmployees.toLocaleString()} {totalEmployees === 1 ? 'vendedor' : 'vendedores'}
                        </Typography>
                    )}
                </Stack>
            </Paper>

            {/* ── Tabla ────────────────────────────────────────────────────────── */}
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid', borderColor: 'divider', borderRadius: 2,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    flexGrow: 1, minHeight: 0,
                }}
            >
                <TableContainer sx={{
                    flexGrow: 1, overflow: 'auto',
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none', msOverflowStyle: 'none',
                }}>
                    <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '35%' }}>Vendedor</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '13%' }}>Código</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '38%' }}>Departamentos</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '10%' }}>Estado</TableCell>
                                {user?.es_lider && <TableCell sx={{ ...HEADER_CELL_SX, width: '8%' }} />}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {initialLoading ? (
                                renderSkeletonRows()
                            ) : employees.length === 0 ? (
                                renderEmptyState()
                            ) : (
                                employees.map((employee, index) => (
                                    <TableRow
                                        key={employee._id}
                                        hover
                                        onClick={() => handleOpenDialog(employee)}
                                        sx={{
                                            cursor: user?.es_lider ? 'pointer' : 'default',
                                            bgcolor: index % 2 !== 0 ? alpha(theme.palette.grey[500], 0.02) : 'transparent',
                                            transition: 'background-color 0.18s ease',
                                            '&:hover': { bgcolor: pagePalette.softHover },
                                            '& .MuiTableCell-root': {
                                                py: 1.375, px: 2,
                                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                            },
                                            '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
                                        }}
                                    >
                                        {/* Vendedor (avatar + nombre) */}
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar
                                                    sx={{
                                                        width: 32, height: 32,
                                                        fontSize: '0.75rem', fontWeight: 700,
                                                        bgcolor: employee.activo
                                                            ? getAvatarColor(employee.nombre)
                                                            : alpha(theme.palette.grey[500], 0.3),
                                                        color: employee.activo ? 'common.white' : 'text.disabled',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {getInitials(employee.nombre)}
                                                </Avatar>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={500}
                                                    noWrap
                                                    sx={{
                                                        fontSize: '0.8125rem',
                                                        color: employee.activo ? 'text.primary' : 'text.secondary',
                                                    }}
                                                >
                                                    {employee.nombre || '—'}
                                                </Typography>
                                            </Box>
                                        </TableCell>

                                        {/* Código */}
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    fontFamily: '"Roboto Mono", "Courier New", monospace',
                                                    color: 'text.secondary',
                                                    letterSpacing: '0.02em',
                                                }}
                                            >
                                                {employee.codigo}
                                            </Typography>
                                        </TableCell>

                                        {/* Departamentos */}
                                        <TableCell>
                                            {employee.departamentos && employee.departamentos.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {employee.departamentos.map((dep) => (
                                                        <Chip
                                                            key={dep}
                                                            label={dep}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: '0.7rem',
                                                                fontWeight: 500,
                                                                borderRadius: 0.75,
                                                                '& .MuiChip-label': { px: 0.875 },
                                                                ...getDepChipStyle(dep),
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>—</Typography>
                                            )}
                                        </TableCell>

                                        {/* Estado */}
                                        <TableCell>
                                            <Chip
                                                label={employee.activo ? 'Activo' : 'Inactivo'}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: '0.72rem',
                                                    fontWeight: 600,
                                                    borderRadius: 1,
                                                    '& .MuiChip-label': { px: 1 },
                                                    ...(employee.activo
                                                        ? { backgroundColor: alpha(theme.palette.success.main, 0.12), color: theme.palette.text.primary }
                                                        : { backgroundColor: alpha(theme.palette.grey[500], 0.1), color: 'text.secondary' }
                                                    ),
                                                }}
                                            />
                                        </TableCell>

                                        {/* Acciones (solo líder) */}
                                        {user?.es_lider && (
                                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    <Tooltip title="Editar" placement="top">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDialog(employee); }}
                                                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: pagePalette.softStrong, borderColor: alpha(theme.palette.primary.main, 0.2) } }}
                                                        >
                                                            <EditIcon sx={{ fontSize: 15 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Eliminar" placement="top">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(employee); }}
                                                            sx={{ border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.18), borderRadius: 1.5, color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08), borderColor: alpha(theme.palette.error.main, 0.26) } }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 15 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider sx={{ flexShrink: 0 }} />

                <TablePagination
                    rowsPerPageOptions={[15, 25, 50, 100]}
                    component="div"
                    count={totalEmployees}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}–${to} de ${count !== -1 ? count.toLocaleString() : `más de ${to}`}`
                    }
                    sx={{
                        flexShrink: 0, borderTop: 'none',
                        '.MuiTablePagination-toolbar': { minHeight: 52, px: 2 },
                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '0.8125rem', color: 'text.secondary' },
                    }}
                />
            </Paper>

            {/* ── Diálogo crear / editar ───────────────────────────────────────── */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                TransitionComponent={Fade}
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                {editingEmployee ? 'Editar vendedor' : 'Nuevo vendedor'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {editingEmployee
                                    ? `Modificando: ${editingEmployee.nombre}`
                                    : 'Completa los campos para registrar un vendedor'}
                            </Typography>
                        </Box>
                        <IconButton onClick={handleCloseDialog} size="small" sx={{ mt: -0.5, color: 'text.secondary' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <Divider sx={{ mt: 2.5 }} />

                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent sx={{ pt: 3, px: 3, pb: 2 }}>
                        <Grid container spacing={2.5}>
                            <Grid size={{ xs: 12 }} sm={5}>
                                <Controller
                                    name="codigo"
                                    control={control}
                                    rules={{ required: 'El código es requerido' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Código"
                                            fullWidth
                                            size="small"
                                            placeholder="Ej: EMP001"
                                            error={!!errors.codigo}
                                            helperText={errors.codigo?.message}
                                            disabled={!!editingEmployee}
                                            InputProps={{ sx: { fontFamily: '"Roboto Mono", "Courier New", monospace', fontSize: '0.875rem' } }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }} sm={7}>
                                <Controller
                                    name="activo"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Estado</InputLabel>
                                            <Select {...field} label="Estado">
                                                <MenuItem value={true}>Activo</MenuItem>
                                                <MenuItem value={false}>Inactivo</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="nombre"
                                    control={control}
                                    rules={{ required: 'El nombre es requerido' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Nombre completo"
                                            fullWidth
                                            size="small"
                                            placeholder="Ej: Juan Pérez García"
                                            error={!!errors.nombre}
                                            helperText={errors.nombre?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>

                    <Divider />

                    <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                        <Box>
                            {editingEmployee && (
                                <Button
                                    onClick={() => { handleCloseDialog(); handleOpenDeleteDialog(editingEmployee); }}
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<DeleteIcon />}
                                    disabled={loading}
                                    sx={{ borderRadius: 1.5 }}
                                >
                                    Eliminar
                                </Button>
                            )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button onClick={handleCloseDialog} variant="outlined" size="small" sx={{ borderRadius: 1.5 }}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                size="small"
                                disableElevation
                                disabled={loading}
                                sx={{ borderRadius: 1.5, fontWeight: 600, minWidth: 90 }}
                            >
                                {editingEmployee ? 'Actualizar' : 'Crear'}
                            </Button>
                        </Stack>
                    </DialogActions>
                </form>
            </Dialog>

            {/* ── Diálogo confirmar eliminación ────────────────────────────────── */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
                    <Typography variant="h6" fontWeight={700}>Eliminar vendedor</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Esta acción no se puede deshacer</Typography>
                </DialogTitle>

                <Divider sx={{ mt: 2.5 }} />

                <DialogContent sx={{ pt: 2.5, px: 3 }}>
                    <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 1.5, fontSize: '0.8125rem', borderColor: alpha(theme.palette.warning.main, 0.28), bgcolor: alpha(theme.palette.warning.main, 0.05), color: 'text.primary' }}>
                        Se eliminará permanentemente este vendedor del sistema.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        ¿Confirmas que deseas eliminar a{' '}
                        <Box component="span" fontWeight={700} color="text.primary">{employeeToDelete?.nombre}</Box>
                        {' '}(código: <Box component="span" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{employeeToDelete?.codigo}</Box>)?
                    </Typography>
                </DialogContent>

                <Divider />

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" size="small" sx={{ borderRadius: 1.5 }}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDelete}
                        variant="contained"
                        color="error"
                        size="small"
                        disableElevation
                        disabled={loading}
                        sx={{ borderRadius: 1.5, fontWeight: 600, minWidth: 90 }}
                    >
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Diálogo resultado de sincronización ─────────────────────────── */}
            <Dialog
                open={syncDialogOpen}
                onClose={() => setSyncDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                Sincronización completada
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Resultado de la sincronización con Bitrix24
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setSyncDialogOpen(false)} size="small" sx={{ mt: -0.5, color: 'text.secondary' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <Divider sx={{ mt: 2.5 }} />

                <DialogContent sx={{ pt: 2.5, px: 3, pb: 2 }}>
                    {syncResult && (
                        <Stack spacing={0}>
                            {[
                                { label: 'Usuarios en Bitrix24', value: syncResult.total_bitrix },
                                { label: 'Ya existían en sistema', value: syncResult.ya_existentes },
                                { label: 'Nuevos insertados', value: syncResult.insertados, highlight: syncResult.insertados > 0 },
                            ].map(({ label, value, highlight }) => (
                                <Box
                                    key={label}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        py: 1.25,
                                        borderBottom: '1px solid',
                                        borderColor: alpha(theme.palette.divider, 0.6),
                                        '&:last-of-type': { borderBottom: 'none' },
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                                    <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        color={highlight ? 'success.main' : 'text.primary'}
                                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                                    >
                                        {value}
                                    </Typography>
                                </Box>
                            ))}

                            {syncResult.detalle && syncResult.detalle.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Nuevos usuarios ({syncResult.detalle.length})
                                    </Typography>
                                    <Box
                                        sx={{
                                            maxHeight: 160,
                                            overflowY: 'auto',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1.5,
                                            bgcolor: alpha(theme.palette.grey[500], 0.03),
                                        }}
                                    >
                                        {syncResult.detalle.map((u, i) => (
                                            <Box
                                                key={u.codigo}
                                                sx={{
                                                    display: 'flex',
                                                    gap: 1.5,
                                                    px: 1.5,
                                                    py: 0.875,
                                                    borderBottom: i < syncResult.detalle.length - 1 ? '1px solid' : 'none',
                                                    borderColor: alpha(theme.palette.divider, 0.5),
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.secondary', flexShrink: 0 }}>
                                                    {u.codigo}
                                                </Typography>
                                                <Typography variant="caption" color="text.primary" noWrap>
                                                    {u.nombre}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {syncResult.insertados === 0 && (
                                <Alert severity="info" variant="outlined" sx={{ mt: 2, borderRadius: 1.5, fontSize: '0.8125rem', borderColor: alpha(theme.palette.info.main, 0.24), bgcolor: alpha(theme.palette.info.main, 0.045), color: 'text.primary' }}>
                                    No hay usuarios nuevos por agregar. El sistema ya está actualizado.
                                </Alert>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <Divider />

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setSyncDialogOpen(false)} variant="contained" size="small" disableElevation sx={{ borderRadius: 1.5, fontWeight: 600 }}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Backdrop de carga en dialog */}
            <Backdrop sx={{ color: '#fff', zIndex: (t) => t.zIndex.drawer + 1, bgcolor: alpha(corporateColors.brand, 0.34) }} open={loading && openDialog}>
                <CircularProgress color="inherit" size={32} />
            </Backdrop>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="outlined" sx={{ width: '100%', borderRadius: 1.5, bgcolor: 'background.paper', color: 'text.primary', borderColor: snackbar.severity === 'error' ? alpha(theme.palette.error.main, 0.28) : alpha(theme.palette.primary.main, 0.2) }} elevation={6}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EmployeesPage;
