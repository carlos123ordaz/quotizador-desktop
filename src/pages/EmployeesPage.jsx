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
    Card,
    CardContent,
    Avatar,
    CircularProgress,
    Skeleton,
    Fade,
    LinearProgress,
    Toolbar,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Backdrop,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';

const EmployeesPage = () => {

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
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const { user } = useContext(MainContext);
    const [stats, setStats] = useState({
        total: 0,
        activos: 0,
        inactivos: 0,
    });

    const { control, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            codigo: '',
            nombre: '',
            activo: true,
        },
    });
    useEffect(() => {
        loadEmployees();
    }, [page, rowsPerPage, searchTerm, filterActivo]);
    useEffect(() => {
        loadStats();
    }, []);
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(0);
        }, 500);

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
            reset({
                codigo: employee.codigo || '',
                nombre: employee.nombre || '',
                activo: employee.activo !== false,
            });
        } else {
            setEditingEmployee(null);
            reset({
                codigo: '',
                nombre: '',
                activo: true,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingEmployee(null);
        reset();
    };

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            if (editingEmployee) {
                await axios.put(`${CONFIG.uri}/employees/${editingEmployee._id}`, data);
                showSnackbar('Empleado actualizado exitosamente', 'success');
            } else {
                await axios.post(`${CONFIG.uri}/employees`, data);
                showSnackbar('Empleado creado exitosamente', 'success');
            }
            handleCloseDialog();
            loadEmployees();
            loadStats();
        } catch (error) {
            console.error('Error al guardar empleado:', error);
            const errorMessage = error.response?.data?.detail || 'Error al guardar el empleado';
            showSnackbar(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDeleteDialog = (employee) => {
        setEmployeeToDelete(employee);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        try {
            setLoading(true);

            if (employeeToDelete) {
                await axios.delete(`${CONFIG.uri}/employees/${employeeToDelete._id}`);
                showSnackbar('Empleado eliminado exitosamente', 'success');
                setDeleteDialogOpen(false);
                setEmployeeToDelete(null);
                loadEmployees();
                loadStats();
            }
        } catch (error) {
            console.error('Error al eliminar empleado:', error);
            showSnackbar('Error al eliminar el empleado', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleRefresh = () => {
        loadEmployees();
        loadStats();
    };

    const handleExport = () => {
        showSnackbar('Exportando a Excel...', 'info');
    };
    const renderSkeletonRows = () => {
        return Array.from(new Array(rowsPerPage)).map((_, index) => (
            <TableRow key={index}>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
            </TableRow>
        ));
    };

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', padding: 1.5, overflow: 'hidden', boxSizing: 'border-box' }}>
            {loading && !initialLoading && (
                <LinearProgress
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 9999
                    }}
                />
            )}
            <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Typography variant="body2" color="text.secondary">
                    {totalEmployees} vendedores • Administra el personal de la empresa
                </Typography>
            </Box>
            <Grid container spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': {
                                boxShadow: 1,
                            }
                        }}
                    >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={50} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'primary.main',
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        <PersonIcon fontSize="small" />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 300,
                                                fontSize: '1.5rem',
                                                lineHeight: 1.2
                                            }}
                                        >
                                            {stats.total}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ mt: 0.25 }}
                                        >
                                            Total de Vendedores
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': {
                                boxShadow: 1,
                            }
                        }}
                    >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={50} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'success.main',
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        <CheckCircleIcon fontSize="small" />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 300,
                                                fontSize: '1.5rem',
                                                lineHeight: 1.2,
                                                color: 'success.main'
                                            }}
                                        >
                                            {stats.activos}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ mt: 0.25 }}
                                        >
                                            Vendedores Activos
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': {
                                boxShadow: 1,
                            }
                        }}
                    >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={50} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'warning.main',
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        <CancelIcon fontSize="small" />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 300,
                                                fontSize: '1.5rem',
                                                lineHeight: 1.2,
                                                color: 'warning.main'
                                            }}
                                        >
                                            {stats.inactivos}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ mt: 0.25 }}
                                        >
                                            Vendedores Inactivos
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            <Paper
                elevation={0}
                sx={{
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    flexShrink: 0,
                }}
            >
                <Toolbar sx={{ gap: 2, flexWrap: 'wrap', minHeight: { xs: 'auto', sm: 56 }, py: { xs: 1.5, sm: 0 } }}>
                    <TextField
                        placeholder="Buscar vendedores..."
                        size="small"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        sx={{
                            flexGrow: 1,
                            minWidth: 200,
                            maxWidth: 400,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'background.paper'
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            value={filterActivo}
                            label="Estado"
                            onChange={(e) => {
                                setFilterActivo(e.target.value);
                                setPage(0);
                            }}
                        >
                            <MenuItem value="all">Todos</MenuItem>
                            <MenuItem value="active">Activos</MenuItem>
                            <MenuItem value="inactive">Inactivos</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />

                    <Stack direction="row" spacing={1}>
                        <IconButton
                            onClick={handleRefresh}
                            disabled={loading}
                            size="small"
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                        {
                            user && user.es_lider && (
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenDialog()}
                                    disableElevation
                                >
                                    Crear
                                </Button>
                            )
                        }
                    </Stack>
                </Toolbar>
            </Paper>

            {/* Tabla de empleados - Estilo SAP Fiori */}
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    minHeight: 0,
                    maxHeight: '100%',
                }}
            >
                <TableContainer sx={{
                    flexGrow: 1,
                    flexShrink: 1,
                    overflow: 'auto',
                    minHeight: 0,
                    // Ocultar scrollbar
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}>
                    <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: '20%', py: 1 }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: '60%', py: 1 }}>Nombre</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: '20%', py: 1 }}>Estado</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {initialLoading ? (
                                renderSkeletonRows()
                            ) : employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                                        <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            {searchTerm || filterActivo !== 'all'
                                                ? 'No se encontraron vendedores'
                                                : 'No hay vendedores registrados'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {searchTerm || filterActivo !== 'all'
                                                ? 'Intenta ajustar los filtros de búsqueda'
                                                : 'Comienza creando un nuevo empleado'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.map((employee) => (
                                    <TableRow
                                        key={employee._id}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                            '& .MuiTableCell-root': {
                                                py: 1.25
                                            }
                                        }}
                                        onClick={() => handleOpenDialog(employee)}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                                                {employee.codigo}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                                {employee.nombre}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={employee.activo ? 'Activo' : 'Inactivo'}
                                                color={employee.activo ? 'success' : 'default'}
                                                size="small"
                                                sx={{ fontWeight: 500, height: 24, fontSize: '0.75rem' }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider sx={{ flexShrink: 0 }} />

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    component="div"
                    count={totalEmployees}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
                    }
                    sx={{
                        borderTop: 'none',
                        flexShrink: 0,
                        '.MuiTablePagination-toolbar': {
                            minHeight: 48,
                            py: 0.5,
                        }
                    }}
                />
            </Paper>

            {/* Diálogo de crear/editar empleado */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                TransitionComponent={Fade}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" fontWeight={400}>
                            {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
                        </Typography>
                        <IconButton onClick={handleCloseDialog} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <Divider />
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent sx={{ pt: 3 }}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="codigo"
                                    control={control}
                                    rules={{ required: 'El ID es requerido' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="ID"
                                            fullWidth
                                            size="small"
                                            error={!!errors.codigo}
                                            helperText={errors.codigo?.message}
                                            disabled={!!editingEmployee}
                                            placeholder="Ej: EMP001"
                                        />
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
                                            label="Nombre Completo"
                                            fullWidth
                                            size="small"
                                            error={!!errors.nombre}
                                            helperText={errors.nombre?.message}
                                            placeholder="Ej: Juan Pérez García"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="activo"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Estado"
                                            fullWidth
                                            size="small"
                                            select
                                        >
                                            <MenuItem value={true}>Activo</MenuItem>
                                            <MenuItem value={false}>Inactivo</MenuItem>
                                        </TextField>
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
                                    onClick={() => {
                                        handleCloseDialog();
                                        handleOpenDeleteDialog(editingEmployee);
                                    }}
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<DeleteIcon />}
                                    disabled={loading}
                                >
                                    Eliminar
                                </Button>
                            )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button onClick={handleCloseDialog} variant="outlined" size="small">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                size="small"
                                disableElevation
                                disabled={loading}
                            >
                                {editingEmployee ? 'Actualizar' : 'Crear'}
                            </Button>
                        </Stack>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Diálogo de confirmación de eliminación */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" fontWeight={400}>
                        Confirmar Eliminación
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Esta acción no se puede deshacer
                    </Alert>
                    <Typography variant="body2">
                        ¿Estás seguro de que deseas eliminar al empleado{' '}
                        <strong>{employeeToDelete?.nombre}</strong> (ID: {employeeToDelete?.codigo})?
                    </Typography>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        variant="outlined"
                        size="small"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleDelete}
                        variant="contained"
                        color="error"
                        size="small"
                        disableElevation
                        disabled={loading}
                    >
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Backdrop de carga */}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={loading && openDialog}
            >
                <CircularProgress color="inherit" />
            </Backdrop>

            {/* Snackbar de notificaciones */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                    elevation={6}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EmployeesPage;