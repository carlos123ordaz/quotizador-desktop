import React, { useState, useEffect, useContext } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Stack,
    Grid,
    Card,
    CardContent,
    Avatar,
    IconButton,
    Collapse,
    Toolbar,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Skeleton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import {
    Search as SearchIcon,
    History as HistoryIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Add as AddIcon,
    Edit as EditIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Refresh as RefreshIcon,
    FilterList as FilterListIcon,
    Info as InfoIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    AttachMoney as MoneyIcon,
    Inventory as InventoryIcon,
    Description as DescriptionIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { CONFIG } from '../config';
import { ExportDialog } from '../components/ExportDialog';
import { MainContext } from '../contexts/MainContext';
import moment from 'moment';

export const BitrixHistory = () => {
    // Estados principales
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [totalHistory, setTotalHistory] = useState(0);
    const { user } = useContext(MainContext);
    // Estados de filtros y búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterTipo, setFilterTipo] = useState('all');
    const [filterEstado, setFilterEstado] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Estados de estadísticas
    const [stats, setStats] = useState({
        total_envios: 0,
        exitosos: 0,
        errores: 0,
        creaciones: 0,
        actualizaciones: 0,
    });

    // Estado para filas expandidas
    const [expandedRows, setExpandedRows] = useState({});

    // Estado para diálogo de detalles
    const [detailDialog, setDetailDialog] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState(null);

    // Estado para diálogo de exportación
    const [exportDialog, setExportDialog] = useState(false);

    // Colores SAP Fiori
    const fioriColors = {
        primary: '#0070F2',
        secondary: '#6E6E6E',
        success: '#2B7D2B',
        warning: '#E76500',
        error: '#BB0000',
        background: '#F5F5F5',
        cardBg: '#FFFFFF',
        border: '#D9D9D9'
    };

    // Cargar historial al montar y cuando cambian los filtros
    useEffect(() => {
        loadHistory();
    }, [page, rowsPerPage, searchTerm, filterTipo, filterEstado]);

    // Cargar estadísticas
    useEffect(() => {
        loadStats();
    }, []);

    // Debounce para búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(0);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadHistory = async () => {
        try {
            setLoading(true);

            const params = {
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                ...(searchTerm && { search: searchTerm }),
                ...(filterTipo !== 'all' && { tipo_operacion: filterTipo }),
                ...(filterEstado !== 'all' && { estado: filterEstado }),
            };

            const response = await axios.get(`${CONFIG.uri}/history`, { params });

            setHistory(response.data.historial || []);
            setTotalHistory(response.data.total || 0);

        } catch (error) {
            console.error('Error al cargar historial:', error);
            setHistory([]);
            setTotalHistory(0);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await axios.get(`${CONFIG.uri}/history/statistics`);
            setStats(response.data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRefresh = () => {
        loadHistory();
        loadStats();
    };

    const toggleRowExpansion = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleOpenDetail = (historyItem) => {
        setSelectedHistory(historyItem);
        setDetailDialog(true);
    };

    const handleCloseDetail = () => {
        setDetailDialog(false);
        setSelectedHistory(null);
    };


    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    // Renderizar skeleton loader durante carga inicial
    const renderSkeletonRows = () => {
        return Array.from(new Array(rowsPerPage)).map((_, index) => (
            <TableRow key={index}>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
                <TableCell><Skeleton variant="text" /></TableCell>
            </TableRow>
        ));
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Indicador de carga global */}
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

            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    {totalHistory} registros • Historial de envíos a Bitrix24
                </Typography>
            </Box>

            {/* Tarjetas de estadísticas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 1 }
                        }}
                    >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={60} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                                        <HistoryIcon />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h4" sx={{ fontWeight: 300, fontSize: '1.75rem', lineHeight: 1.2 }}>
                                            {stats.total_envios}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Total Envíos
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 1 }
                        }}
                    >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={60} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                                        <CheckCircleIcon />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h4" sx={{ fontWeight: 300, fontSize: '1.75rem', lineHeight: 1.2, color: 'success.main' }}>
                                            {stats.exitosos}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Exitosos
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 1 }
                        }}
                    >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={60} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: 'error.main', width: 48, height: 48 }}>
                                        <ErrorIcon />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h4" sx={{ fontWeight: 300, fontSize: '1.75rem', lineHeight: 1.2, color: 'error.main' }}>
                                            {stats.errores}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Con Errores
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 1 }
                        }}
                    >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={60} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                                        <AddIcon />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h4" sx={{ fontWeight: 300, fontSize: '1.75rem', lineHeight: 1.2, color: 'info.main' }}>
                                            {stats.creaciones}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Creaciones
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 1 }
                        }}
                    >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {initialLoading ? (
                                <Skeleton variant="rectangular" height={60} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                                        <EditIcon />
                                    </Avatar>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography variant="h4" sx={{ fontWeight: 300, fontSize: '1.75rem', lineHeight: 1.2, color: 'warning.main' }}>
                                            {stats.actualizaciones}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            Actualizaciones
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Toolbar de filtros */}
            <Paper
                elevation={0}
                sx={{
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                }}
            >
                <Toolbar sx={{ gap: 2, flexWrap: 'wrap', minHeight: { xs: 'auto', sm: 64 }, py: { xs: 2, sm: 0 } }}>
                    <TextField
                        placeholder="Buscar en historial..."
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
                        <InputLabel>Tipo</InputLabel>
                        <Select
                            value={filterTipo}
                            label="Tipo"
                            onChange={(e) => {
                                setFilterTipo(e.target.value);
                                setPage(0);
                            }}
                        >
                            <MenuItem value="all">Todos</MenuItem>
                            <MenuItem value="crear">Creaciones</MenuItem>
                            <MenuItem value="actualizar">Actualizaciones</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            value={filterEstado}
                            label="Estado"
                            onChange={(e) => {
                                setFilterEstado(e.target.value);
                                setPage(0);
                            }}
                        >
                            <MenuItem value="all">Todos</MenuItem>
                            <MenuItem value="exitoso">Exitosos</MenuItem>
                            <MenuItem value="error">Con Errores</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />

                    {
                        user && user.es_lider && (
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={() => setExportDialog(true)}
                                sx={{ textTransform: 'none' }}
                            >
                                Exportar
                            </Button>
                        )
                    }

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
                </Toolbar>
            </Paper>

            {/* Tabla de historial */}
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
                }}
            >
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper', width: 50 }}></TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Deal / Quote</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Oferta</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Estado</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Usuario</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Fecha</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {initialLoading ? (
                                renderSkeletonRows()
                            ) : history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                        <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            {searchTerm || filterTipo !== 'all' || filterEstado !== 'all'
                                                ? 'No se encontraron registros'
                                                : 'No hay historial registrado'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {searchTerm || filterTipo !== 'all' || filterEstado !== 'all'
                                                ? 'Intenta ajustar los filtros de búsqueda'
                                                : 'Los envíos a Bitrix aparecerán aquí'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((item) => (
                                    <React.Fragment key={item._id}>
                                        <TableRow
                                            hover
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    bgcolor: 'action.hover',
                                                },
                                            }}
                                        >
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleRowExpansion(item._id)}
                                                >
                                                    {expandedRows[item._id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    Deal #{item.num_deal}
                                                </Typography>
                                                {item.quote_id && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Quote #{item.quote_id}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                                                    {item.nombre_oferta}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.nombre_archivo}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.tipo_operacion === 'crear' ? 'Creación' : 'Actualización'}
                                                    size="small"
                                                    color={item.tipo_operacion === 'crear' ? 'info' : 'warning'}
                                                    icon={item.tipo_operacion === 'crear' ? <AddIcon /> : <EditIcon />}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={item.estado === 'exitoso' ? 'Exitoso' : 'Error'}
                                                    size="small"
                                                    color={item.estado === 'exitoso' ? 'success' : 'error'}
                                                    icon={item.estado === 'exitoso' ? <CheckCircleIcon /> : <ErrorIcon />}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {item.usuario_envio}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {moment.utc(item.created_at).local().format('DD/MM/YYYY HH:mm')}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>

                                        {/* Fila expandida con más información */}
                                        <TableRow>
                                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                                                <Collapse in={expandedRows[item._id]} timeout="auto" unmountOnExit>
                                                    <Box sx={{ margin: 2 }}>
                                                        <Grid container spacing={2}>
                                                            <Grid size={{ xs: 12, md: 6 }}>
                                                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <PersonIcon fontSize="small" />
                                                                        Usuarios Involucrados
                                                                    </Typography>
                                                                    <Divider sx={{ my: 1 }} />
                                                                    <Stack spacing={0.5}>
                                                                        <Typography variant="body2">
                                                                            <strong>Preparado:</strong> {item.preparado}
                                                                        </Typography>
                                                                        {item.preparado_unva && (
                                                                            <Typography variant="body2">
                                                                                <strong>Preparado UNVA:</strong> {item.preparado_unva}
                                                                            </Typography>
                                                                        )}
                                                                        {item.preparado_unai && (
                                                                            <Typography variant="body2">
                                                                                <strong>Preparado UNAI:</strong> {item.preparado_unai}
                                                                            </Typography>
                                                                        )}
                                                                        <Typography variant="body2">
                                                                            <strong>Responsable:</strong> {item.responsable}
                                                                        </Typography>
                                                                        {item.visto_bueno && (
                                                                            <Typography variant="body2">
                                                                                <strong>Visto Bueno:</strong> {item.visto_bueno}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                </Paper>
                                                            </Grid>

                                                            <Grid size={{ xs: 12, md: 6 }}>
                                                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <MoneyIcon fontSize="small" />
                                                                        Información Financiera
                                                                    </Typography>
                                                                    <Divider sx={{ my: 1 }} />
                                                                    <Stack spacing={0.5}>
                                                                        <Typography variant="body2">
                                                                            <strong>Utilidad:</strong> {(item.utilidad * 100).toFixed(2)}%
                                                                        </Typography>
                                                                        <Typography variant="body2">
                                                                            <strong>Productos:</strong> {item.total_productos}
                                                                        </Typography>
                                                                        {item.costo_auma > 0 && (
                                                                            <Typography variant="body2">
                                                                                <strong>Costo AUMA:</strong> {formatCurrency(item.costo_auma)}
                                                                            </Typography>
                                                                        )}
                                                                        {item.costo_msa > 0 && (
                                                                            <Typography variant="body2">
                                                                                <strong>Costo MSA:</strong> {formatCurrency(item.costo_msa)}
                                                                            </Typography>
                                                                        )}
                                                                        {item.costo_valmet > 0 && (
                                                                            <Typography variant="body2">
                                                                                <strong>Costo Valmet:</strong> {formatCurrency(item.costo_valmet)}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                </Paper>
                                                            </Grid>

                                                            {item.totales_por_area && Object.keys(item.totales_por_area).length > 0 && (
                                                                <Grid size={{ xs: 12 }}>
                                                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                                                        <Typography variant="subtitle2" gutterBottom>
                                                                            Totales por Área
                                                                        </Typography>
                                                                        <Divider sx={{ my: 1 }} />
                                                                        <Grid container spacing={1}>
                                                                            {Object.entries(item.totales_por_area).map(([area, total]) => (
                                                                                total > 0 && (
                                                                                    <Grid size={{ xs: 6, sm: 4, md: 2 }} key={area}>
                                                                                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'white' }}>
                                                                                            <Typography variant="caption" color="textSecondary">
                                                                                                {area}
                                                                                            </Typography>
                                                                                            <Typography variant="body2" fontWeight="bold">
                                                                                                {formatCurrency(total)}
                                                                                            </Typography>
                                                                                        </Paper>
                                                                                    </Grid>
                                                                                )
                                                                            ))}
                                                                        </Grid>
                                                                    </Paper>
                                                                </Grid>
                                                            )}

                                                            {item.estado === 'error' && item.error_mensaje && (
                                                                <Grid size={{ xs: 12 }}>
                                                                    <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                                                                        <Typography variant="subtitle2" gutterBottom>
                                                                            Mensaje de Error
                                                                        </Typography>
                                                                        <Typography variant="body2">
                                                                            {item.error_mensaje}
                                                                        </Typography>
                                                                    </Paper>
                                                                </Grid>
                                                            )}
                                                        </Grid>
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider />

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalHistory}
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
                        '.MuiTablePagination-toolbar': {
                            minHeight: 52,
                        }
                    }}
                />
            </Paper>

            {/* Diálogo de exportación */}
            <ExportDialog
                open={exportDialog}
                onClose={() => setExportDialog(false)}
            />

            <Dialog
                open={detailDialog}
                onClose={handleCloseDetail}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6" fontWeight={400}>
                        Detalles del Envío
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent>
                    {selectedHistory && (
                        <Stack spacing={2}>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DescriptionIcon fontSize="small" />
                                    Información General
                                </Typography>
                                <Divider sx={{ my: 1 }} />
                                <Grid container spacing={1}>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="body2"><strong>Deal:</strong> #{selectedHistory.num_deal}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography variant="body2"><strong>Quote:</strong> #{selectedHistory.quote_id || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Typography variant="body2"><strong>Oferta:</strong> {selectedHistory.nombre_oferta}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Typography variant="body2"><strong>Archivo:</strong> {selectedHistory.nombre_archivo}</Typography>
                                    </Grid>
                                    {selectedHistory.rubrica && (
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="body2"><strong>Rúbrica:</strong> {selectedHistory.rubrica}</Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>

                            {selectedHistory.tipo_operacion === 'crear' && (
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CalendarIcon fontSize="small" />
                                        Fechas
                                    </Typography>
                                    <Divider sx={{ my: 1 }} />
                                    <Stack spacing={0.5}>
                                        {selectedHistory.fecha_correo && (
                                            <Typography variant="body2"><strong>Correo:</strong> {selectedHistory.fecha_correo}</Typography>
                                        )}
                                        {selectedHistory.fecha_inicio && (
                                            <Typography variant="body2"><strong>Inicio:</strong> {selectedHistory.fecha_inicio}</Typography>
                                        )}
                                        {selectedHistory.fecha_envio && (
                                            <Typography variant="body2"><strong>Envío:</strong> {selectedHistory.fecha_envio}</Typography>
                                        )}
                                        {selectedHistory.fecha_cierre && (
                                            <Typography variant="body2"><strong>Cierre:</strong> {selectedHistory.fecha_cierre}</Typography>
                                        )}
                                    </Stack>
                                </Paper>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleCloseDetail} variant="outlined" size="small">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};