import { useState, useEffect, useContext } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    Chip,
    Alert,
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
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Divider,
    Container,
    CircularProgress,
    useTheme,
} from '@mui/material';
import {
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
    MoreVert as MoreVertIcon,
    Description as DescriptionIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    FilterList as FilterListIcon,
    Refresh as RefreshIcon,
    Assessment as AssessmentIcon,
    CloudDownload as CloudDownloadIcon,
    Close as CloseIcon,
    InsertDriveFile as FileIcon,
    FolderOpen as FolderOpenIcon,
    OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import moment from 'moment';
import axios from 'axios';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';

const ReportHistory = () => {
    const theme = useTheme();
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalReports, setTotalReports] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const { user } = useContext(MainContext);
    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        errors: 0,
        totalFiles: 0,
    });
    const [loading, setLoading] = useState(false);

    // Estado para el diálogo de descarga
    const [downloadDialog, setDownloadDialog] = useState({
        open: false,
        filename: '',
        savedPath: '',
    });

    // Cargar reportes cuando cambie la página o el límite de filas
    useEffect(() => {
        loadReports();
    }, [page, rowsPerPage]);

    // Filtrado local (mantenerlo para búsqueda y filtro de estado)
    useEffect(() => {
        let filtered = reports;

        if (filterStatus !== 'all') {
            filtered = filtered.filter((report) => report.status === filterStatus);
        }

        if (searchTerm !== '') {
            filtered = filtered.filter(
                (report) =>
                    report.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    report._id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setFilteredReports(filtered);
    }, [searchTerm, filterStatus, reports]);

    // Actualizar estadísticas
    useEffect(() => {
        if (reports && reports.length > 0) {
            setStats({
                total: totalReports,
                success: reports.filter((r) => r.status === 'success').length,
                errors: reports.filter((r) => r.status === 'error').length,
                totalFiles: reports.reduce((acc, r) => acc + (r.files_processed || 0), 0),
            });
        }
    }, [reports, totalReports]);

    const loadReports = async () => {
        try {
            setLoading(true);
            const skip = page * rowsPerPage;
            const limit = rowsPerPage;

            const response = await axios.get(`${CONFIG.uri}/reports/history`, {
                params: {
                    skip,
                    limit
                }
            });

            setReports(response.data.reports || []);
            setFilteredReports(response.data.reports || []);
            setTotalReports(response.data.total || 0);
        } catch (error) {
            console.error('Error al cargar reportes:', error);
            setReports([]);
            setFilteredReports([]);
            setTotalReports(0);
        } finally {
            setLoading(false);
        }
    };

    // Función de descarga con Tauri
    const handleDownload = async (report) => {
        if (!report.download_url) {
            alert('No hay URL de descarga disponible');
            handleCloseMenu();
            return;
        }

        try {
            const downloadUrl = report.download_url;
            const response = await tauriFetch(downloadUrl);
            const blob = await response.blob();
            const fileName = report.filename || 'reporte.xlsx';

            const filePath = await save({
                defaultPath: fileName,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }],
            });

            if (filePath) {
                const buffer = await blob.arrayBuffer();
                await writeFile(filePath, new Uint8Array(buffer));
                setDownloadDialog({
                    open: true,
                    filename: fileName,
                    savedPath: filePath,
                });
            }
        } catch (error) {
            console.error('Error descargando archivo:', error);
            alert('Error al descargar el archivo');
        }
        handleCloseMenu();
    };

    // Funciones para el diálogo de descarga
    const handleCloseDownloadDialog = () => {
        setDownloadDialog({ open: false, filename: '', savedPath: '' });
    };

    const handleOpenFile = async () => {
        try {
            await openPath(downloadDialog.savedPath);
        } catch (error) {
            console.error('Error abriendo archivo:', error);
        }
    };

    const handleShowInFolder = async () => {
        try {
            await revealItemInDir(downloadDialog.savedPath);
        } catch (error) {
            console.error('Error mostrando carpeta:', error);
        }
    };

    const handleViewDetails = (report) => {
        setSelectedReport(report);
        setDetailsDialogOpen(true);
        handleCloseMenu();
    };

    const handleOpenDeleteDialog = (report) => {
        setReportToDelete(report);
        setDeleteDialogOpen(true);
        handleCloseMenu();
    };

    const handleOpenMenu = (event, report) => {
        setAnchorEl(event.currentTarget);
        setSelectedReport(report);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleOpenFilterMenu = (event) => {
        setFilterAnchorEl(event.currentTarget);
    };

    const handleCloseFilterMenu = () => {
        setFilterAnchorEl(null);
    };

    const handleFilterChange = (status) => {
        setFilterStatus(status);
        handleCloseFilterMenu();
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRefresh = () => {
        setPage(0);
        loadReports();
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatRelativeDate = (date) => {
        return moment(date).fromNow();
    };

    const getStatusBadge = (status) => {
        if (status === 'success') {
            return (
                <Chip
                    icon={<CheckCircleIcon />}
                    label="Exitoso"
                    size="small"
                    sx={{
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(16, 126, 62, 0.2)' : '#D1E7DD',
                        color: 'success.main',
                        fontWeight: 600,
                        '& .MuiChip-icon': {
                            color: 'success.main',
                        },
                    }}
                />
            );
        }
        return (
            <Chip
                icon={<ErrorIcon />}
                label="Error"
                size="small"
                sx={{
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(179, 38, 30, 0.2)' : '#F8D7DA',
                    color: 'error.main',
                    fontWeight: 600,
                    '& .MuiChip-icon': {
                        color: 'error.main',
                    },
                }}
            />
        );
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
        }}>
            <Container maxWidth="xl">

                {/* Tarjetas de estadísticas */}
                <Grid container spacing={2} sx={{ mb: 4, pt: 3 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Total de Reportes
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: 'primary.main',
                                        }}
                                    >
                                        {stats.total}
                                    </Typography>
                                </Box>
                                <AssessmentIcon
                                    sx={{
                                        fontSize: 40,
                                        color: 'primary.main',
                                        opacity: 0.1,
                                    }}
                                />
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Exitosos
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: 'success.main',
                                        }}
                                    >
                                        {stats.success}
                                    </Typography>
                                </Box>
                                <CheckCircleIcon
                                    sx={{
                                        fontSize: 40,
                                        color: 'success.main',
                                        opacity: 0.1,
                                    }}
                                />
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Con Errores
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: 'error.main',
                                        }}
                                    >
                                        {stats.errors}
                                    </Typography>
                                </Box>
                                <ErrorIcon
                                    sx={{
                                        fontSize: 40,
                                        color: 'error.main',
                                        opacity: 0.1,
                                    }}
                                />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Barra de búsqueda y filtros */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        mb: 3,
                    }}
                >
                    <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TextField
                                placeholder="Buscar por nombre o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                fullWidth
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1.5,
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                    },
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Button
                                variant="outlined"
                                startIcon={<FilterListIcon />}
                                onClick={handleOpenFilterMenu}
                                fullWidth
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    textTransform: 'none',
                                    color: filterStatus !== 'all' ? 'primary.main' : 'text.primary',
                                }}
                            >
                                {filterStatus === 'all' ? 'Filtrar por Estado' : `Estado: ${filterStatus}`}
                            </Button>
                            <Menu
                                anchorEl={filterAnchorEl}
                                open={Boolean(filterAnchorEl)}
                                onClose={handleCloseFilterMenu}
                            >
                                <MenuItem
                                    onClick={() => handleFilterChange('all')}
                                    selected={filterStatus === 'all'}
                                >
                                    Todos
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleFilterChange('success')}
                                    selected={filterStatus === 'success'}
                                >
                                    Exitosos
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleFilterChange('error')}
                                    selected={filterStatus === 'error'}
                                >
                                    Con Errores
                                </MenuItem>
                            </Menu>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Tabla de reportes */}
                <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Table>
                        <TableHead>
                            <TableRow sx={{
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                borderBottom: 2,
                                borderColor: 'divider'
                            }}>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        fontSize: '13px',
                                        py: 1.5,
                                    }}
                                >
                                    Archivo
                                </TableCell>
                                <TableCell
                                    align="center"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        fontSize: '13px',
                                        py: 1.5,
                                    }}
                                >
                                    Estado
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        fontSize: '13px',
                                        py: 1.5,
                                    }}
                                >
                                    Archivos
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        fontSize: '13px',
                                        py: 1.5,
                                    }}
                                >
                                    Registros
                                </TableCell>
                                <TableCell
                                    align="center"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        fontSize: '13px',
                                        py: 1.5,
                                    }}
                                >
                                    Fecha
                                </TableCell>
                                <TableCell
                                    align="center"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        fontSize: '13px',
                                        py: 1.5,
                                    }}
                                >
                                    Acciones
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8 }}>
                                        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
                                        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                            Cargando reportes...
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8 }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            No se encontraron reportes
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReports.map((report) => (
                                    <TableRow
                                        key={report._id}
                                        sx={{
                                            borderBottom: 1,
                                            borderColor: 'divider',
                                            '&:hover': {
                                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <FileIcon
                                                    sx={{
                                                        color: 'primary.main',
                                                        mr: 1,
                                                        fontSize: 20,
                                                    }}
                                                />
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: 'text.primary',
                                                        }}
                                                    >
                                                        {report.filename}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: 'text.secondary',
                                                        }}
                                                    >
                                                        #{report._id}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            {getStatusBadge(report.status)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {report.files_processed || 0}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'primary.main',
                                                }}
                                            >
                                                {report.total_records?.toLocaleString() || '0'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: 'text.primary',
                                                    }}
                                                >
                                                    {moment.utc(report.created_at).local().format('DD/MM/YYYY HH:mm')}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            <Tooltip title="Más opciones">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleOpenMenu(e, report)}
                                                    sx={{
                                                        color: 'text.secondary',
                                                        '&:hover': {
                                                            bgcolor: 'action.hover',
                                                            color: 'primary.main',
                                                        },
                                                    }}
                                                >
                                                    <MoreVertIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50, 100]}
                        component="div"
                        count={totalReports}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Filas por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
                        sx={{
                            borderTop: 1,
                            borderColor: 'divider',
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                color: 'text.secondary',
                                fontSize: '13px',
                            },
                        }}
                    />
                </TableContainer>

                {/* Menú de acciones */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    PaperProps={{
                        sx: {
                            borderRadius: 2,
                        },
                    }}
                >
                    <MenuItem
                        onClick={() => handleViewDetails(selectedReport)}
                        sx={{
                            fontSize: '14px',
                            fontWeight: 500,
                            '& .MuiSvgIcon-root': {
                                fontSize: 18,
                                mr: 1,
                            },
                        }}
                    >
                        <VisibilityIcon fontSize="small" />
                        Ver Detalles
                    </MenuItem>
                    {user && user.es_lider && selectedReport?.status === 'success' && (
                        <MenuItem
                            onClick={() => handleDownload(selectedReport)}
                            sx={{
                                fontSize: '14px',
                                fontWeight: 500,
                                '& .MuiSvgIcon-root': {
                                    fontSize: 18,
                                    mr: 1,
                                },
                            }}
                        >
                            <CloudDownloadIcon fontSize="small" />
                            Descargar
                        </MenuItem>
                    )}
                </Menu>

                {/* Diálogo de detalles */}
                <Dialog
                    open={detailsDialogOpen}
                    onClose={() => setDetailsDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 2,
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            p: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Detalles del Reporte
                        </Typography>
                        <IconButton
                            onClick={() => setDetailsDialogOpen(false)}
                            size="small"
                            sx={{ color: 'text.secondary' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ p: 2.5 }}>
                        {selectedReport && (
                            <Stack spacing={2}>
                                {/* ID del Reporte */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        ID del Reporte
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            color: 'text.primary',
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                        }}
                                    >
                                        {selectedReport._id}
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Nombre del Archivo */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Nombre del Archivo
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            p: 1,
                                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                            borderRadius: 1.5,
                                            border: 1,
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <FileIcon
                                            sx={{
                                                color: 'primary.main',
                                                mr: 1,
                                                fontSize: 18,
                                            }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: 'text.primary',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {selectedReport.filename}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Divider />

                                {/* Estado */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Estado
                                    </Typography>
                                    <Box sx={{ mb: 1 }}>
                                        {getStatusBadge(selectedReport.status)}
                                    </Box>
                                    {selectedReport.errorMessage && (
                                        <Alert severity="error" sx={{ fontSize: '13px' }}>
                                            {selectedReport.errorMessage}
                                        </Alert>
                                    )}
                                </Box>

                                <Divider />

                                {/* Estadísticas */}
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Archivos Procesados
                                            </Typography>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: 'primary.main',
                                                }}
                                            >
                                                {selectedReport.files_processed || 0}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Con Errores
                                            </Typography>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: selectedReport.files_with_errors > 0
                                                        ? 'error.main'
                                                        : 'text.secondary',
                                                }}
                                            >
                                                {selectedReport.files_with_errors || 0}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Divider />

                                {/* Total de Registros */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Total de Registros
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 700,
                                            color: 'text.primary',
                                        }}
                                    >
                                        {selectedReport.total_records?.toLocaleString() || '0'}
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Información técnica */}
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Tamaño del Archivo
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {selectedReport.file_size > 0 ? formatFileSize(selectedReport.file_size) : '-'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'text.secondary',
                                                    display: 'block',
                                                    mb: 0.5,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Tiempo de Procesamiento
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {selectedReport.processing_time > 0 ? `${selectedReport.processing_time}s` : '-'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Divider />

                                {/* Fecha de Generación */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mb: 0.5,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Fecha de Generación
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            color: 'text.primary',
                                        }}
                                    >
                                        {moment(selectedReport.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'text.secondary',
                                            display: 'block',
                                            mt: 0.5,
                                        }}
                                    >
                                        ({formatRelativeDate(selectedReport.createdAt)})
                                    </Typography>
                                </Box>
                            </Stack>
                        )}
                    </DialogContent>

                    <DialogActions
                        sx={{
                            p: 2.5,
                            borderTop: 1,
                            borderColor: 'divider',
                            gap: 1,
                        }}
                    >
                        <Button
                            onClick={() => setDetailsDialogOpen(false)}
                            variant="outlined"
                            sx={{
                                fontWeight: 600,
                                fontSize: '14px',
                                textTransform: 'none',
                            }}
                        >
                            Cerrar
                        </Button>
                        {user && user.es_lider && selectedReport?.status === 'success' && (
                            <Button
                                variant="contained"
                                startIcon={<CloudDownloadIcon />}
                                onClick={() => {
                                    handleDownload(selectedReport);
                                    setDetailsDialogOpen(false);
                                }}
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    textTransform: 'none',
                                    bgcolor: 'success.main',
                                    '&:hover': {
                                        bgcolor: 'success.dark',
                                    },
                                }}
                            >
                                Descargar
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>

                {/* Diálogo de descarga exitosa */}
                <Dialog
                    open={downloadDialog.open}
                    onClose={handleCloseDownloadDialog}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 2,
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            p: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircleIcon
                                sx={{
                                    color: 'success.main',
                                    mr: 1.5,
                                    fontSize: 24,
                                }}
                            />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                Archivo guardado exitosamente
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={handleCloseDownloadDialog}
                            sx={{ color: 'text.secondary' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <DescriptionIcon
                                        sx={{
                                            fontSize: 32,
                                            color: 'success.main',
                                            mr: 1.5,
                                        }}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: 'text.primary',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {downloadDialog.filename}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            Archivo Excel
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                            <Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        display: 'block',
                                        mb: 1,
                                        fontWeight: 500,
                                    }}
                                >
                                    Guardado en:
                                </Typography>
                                <Box
                                    sx={{
                                        p: 1,
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        color: 'text.secondary',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {downloadDialog.savedPath}
                                </Box>
                            </Box>
                        </Stack>
                    </DialogContent>

                    <DialogActions
                        sx={{
                            p: 2.5,
                            borderTop: 1,
                            borderColor: 'divider',
                            gap: 1,
                        }}
                    >
                        <Button
                            variant="outlined"
                            startIcon={<FolderOpenIcon />}
                            onClick={handleShowInFolder}
                            fullWidth
                            sx={{
                                py: 1,
                                fontWeight: 600,
                                fontSize: '14px',
                                textTransform: 'none',
                            }}
                        >
                            Mostrar en carpeta
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<OpenInNewIcon />}
                            onClick={handleOpenFile}
                            fullWidth
                            sx={{
                                py: 1,
                                fontWeight: 600,
                                fontSize: '14px',
                                textTransform: 'none',
                                bgcolor: 'success.main',
                                '&:hover': {
                                    bgcolor: 'success.dark',
                                },
                            }}
                        >
                            Abrir archivo
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default ReportHistory;