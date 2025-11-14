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

const fioriTheme = {
    palette: {
        primary: {
            main: '#0A6ED1',
        },
        success: {
            main: '#107E3E',
        },
        warning: {
            main: '#D48806',
        },
        error: {
            main: '#B3261E',
        },
        background: {
            default: '#F5F5F5',
        },
    },
};

const ReportHistory = () => {
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

    const handleDelete = async () => {
        try {
            if (reportToDelete) {
                setReports((prev) => prev.filter((r) => r._id !== reportToDelete._id));
                setDeleteDialogOpen(false);
                setReportToDelete(null);
                // Recargar para actualizar el total
                loadReports();
            }
        } catch (error) {
            console.error('Error al eliminar reporte:', error);
        }
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
        setPage(0); // Reset a la primera página al filtrar
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
                        bgcolor: '#D1E7DD',
                        color: fioriTheme.palette.success.main,
                        fontWeight: 600,
                        '& .MuiChip-icon': {
                            color: fioriTheme.palette.success.main,
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
                    bgcolor: '#F8D7DA',
                    color: fioriTheme.palette.error.main,
                    fontWeight: 600,
                    '& .MuiChip-icon': {
                        color: fioriTheme.palette.error.main,
                    },
                }}
            />
        );
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: fioriTheme.palette.background.default,
            py: 4,
        }}>
            <Container maxWidth="xl">
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography
                            variant="body1"
                            sx={{
                                color: '#6B7280',
                                fontSize: '14px',
                            }}
                        >
                            Visualiza y gestiona todos los reportes generados
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={loading}
                            sx={{
                                fontWeight: 600,
                                fontSize: '14px',
                                textTransform: 'none',
                                borderColor: '#D1D5DB',
                                color: '#1F2937',
                                '&:hover': {
                                    borderColor: '#9CA3AF',
                                    bgcolor: '#F9FAFB',
                                },
                            }}
                        >
                            Actualizar
                        </Button>
                    </Box>
                </Box>

                {/* Tarjetas de estadísticas */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                bgcolor: '#FFFFFF',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#6B7280',
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
                                            color: fioriTheme.palette.primary.main,
                                        }}
                                    >
                                        {stats.total}
                                    </Typography>
                                </Box>
                                <AssessmentIcon
                                    sx={{
                                        fontSize: 40,
                                        color: fioriTheme.palette.primary.main,
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
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                bgcolor: '#FFFFFF',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#6B7280',
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
                                            color: fioriTheme.palette.success.main,
                                        }}
                                    >
                                        {stats.success}
                                    </Typography>
                                </Box>
                                <CheckCircleIcon
                                    sx={{
                                        fontSize: 40,
                                        color: fioriTheme.palette.success.main,
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
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                bgcolor: '#FFFFFF',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#6B7280',
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
                                            color: fioriTheme.palette.error.main,
                                        }}
                                    >
                                        {stats.errors}
                                    </Typography>
                                </Box>
                                <ErrorIcon
                                    sx={{
                                        fontSize: 40,
                                        color: fioriTheme.palette.error.main,
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
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        bgcolor: '#FFFFFF',
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
                                            <SearchIcon sx={{ color: '#9CA3AF' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '6px',
                                        bgcolor: '#F9FAFB',
                                        '& fieldset': {
                                            borderColor: '#E5E7EB',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: '#D1D5DB',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: fioriTheme.palette.primary.main,
                                        },
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
                                    borderColor: '#D1D5DB',
                                    color: filterStatus !== 'all' ? fioriTheme.palette.primary.main : '#1F2937',
                                    '&:hover': {
                                        borderColor: '#9CA3AF',
                                        bgcolor: '#F9FAFB',
                                    },
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
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        bgcolor: '#FFFFFF',
                    }}
                >
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        color: '#1F2937',
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
                                        color: '#1F2937',
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
                                        color: '#1F2937',
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
                                        color: '#1F2937',
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
                                        color: '#1F2937',
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
                                        color: '#1F2937',
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
                                        <CircularProgress size={40} sx={{ color: fioriTheme.palette.primary.main }} />
                                        <Typography variant="body2" sx={{ mt: 2, color: '#6B7280' }}>
                                            Cargando reportes...
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8 }}>
                                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                                            No se encontraron reportes
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReports.map((report) => (
                                    <TableRow
                                        key={report._id}
                                        sx={{
                                            borderBottom: '1px solid #E5E7EB',
                                            '&:hover': {
                                                bgcolor: '#F9FAFB',
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ py: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <FileIcon
                                                    sx={{
                                                        color: fioriTheme.palette.primary.main,
                                                        mr: 1,
                                                        fontSize: 20,
                                                    }}
                                                />
                                                <Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: '#1F2937',
                                                        }}
                                                    >
                                                        {report.filename}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            color: '#9CA3AF',
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
                                                    color: '#1F2937',
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
                                                    color: fioriTheme.palette.primary.main,
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
                                                        color: '#1F2937',
                                                    }}
                                                >
                                                    {moment.utc(report.created_at).local().format('DD/MM/YYYY HH:mm')}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: '#9CA3AF',
                                                    }}
                                                >
                                                    {formatRelativeDate(report.createdAt)}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 1.5 }}>
                                            <Tooltip title="Más opciones">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleOpenMenu(e, report)}
                                                    sx={{
                                                        color: '#6B7280',
                                                        '&:hover': {
                                                            bgcolor: 'rgba(10, 110, 209, 0.08)',
                                                            color: fioriTheme.palette.primary.main,
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
                            borderTop: '1px solid #E5E7EB',
                            '& .MuiTablePagination-selectLabel': {
                                color: '#6B7280',
                                fontSize: '13px',
                            },
                            '& .MuiTablePagination-displayedRows': {
                                color: '#6B7280',
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
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
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
                    <Divider sx={{ my: 0.5 }} />
                    {
                        user && user.es_lider && (
                            <MenuItem
                                onClick={() => handleOpenDeleteDialog(selectedReport)}
                                sx={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: fioriTheme.palette.error.main,
                                    '& .MuiSvgIcon-root': {
                                        fontSize: 18,
                                        mr: 1,
                                        color: fioriTheme.palette.error.main,
                                    },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                                Eliminar
                            </MenuItem>
                        )
                    }
                </Menu>

                {/* Diálogo de detalles */}
                <Dialog
                    open={detailsDialogOpen}
                    onClose={() => setDetailsDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: '8px',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            p: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #E5E7EB',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1F2937' }}>
                            Detalles del Reporte
                        </Typography>
                        <IconButton
                            onClick={() => setDetailsDialogOpen(false)}
                            size="small"
                            sx={{ color: '#6B7280' }}
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
                                            color: '#6B7280',
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
                                            color: '#1F2937',
                                            fontFamily: 'monospace',
                                            fontSize: '12px',
                                        }}
                                    >
                                        {selectedReport._id}
                                    </Typography>
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                {/* Nombre del Archivo */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#6B7280',
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
                                            bgcolor: '#F9FAFB',
                                            borderRadius: '6px',
                                            border: '1px solid #E5E7EB',
                                        }}
                                    >
                                        <FileIcon
                                            sx={{
                                                color: fioriTheme.palette.primary.main,
                                                mr: 1,
                                                fontSize: 18,
                                            }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: '#1F2937',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {selectedReport.filename}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                {/* Estado */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#6B7280',
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

                                <Divider sx={{ my: 1 }} />

                                {/* Estadísticas */}
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: '#6B7280',
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
                                                    color: fioriTheme.palette.primary.main,
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
                                                    color: '#6B7280',
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
                                                        ? fioriTheme.palette.error.main
                                                        : '#9CA3AF',
                                                }}
                                            >
                                                {selectedReport.files_with_errors || 0}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                {/* Total de Registros */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#6B7280',
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
                                            color: '#1F2937',
                                        }}
                                    >
                                        {selectedReport.total_records?.toLocaleString() || '0'}
                                    </Typography>
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                {/* Información técnica */}
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6 }}>
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: '#6B7280',
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
                                                    color: '#1F2937',
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
                                                    color: '#6B7280',
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
                                                    color: '#1F2937',
                                                }}
                                            >
                                                {selectedReport.processing_time > 0 ? `${selectedReport.processing_time}s` : '-'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1 }} />

                                {/* Fecha de Generación */}
                                <Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#6B7280',
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
                                            color: '#1F2937',
                                        }}
                                    >
                                        {moment(selectedReport.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#9CA3AF',
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
                            borderTop: '1px solid #E5E7EB',
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
                                borderColor: '#D1D5DB',
                                color: '#1F2937',
                                '&:hover': {
                                    borderColor: '#9CA3AF',
                                    bgcolor: '#F9FAFB',
                                },
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
                                    bgcolor: fioriTheme.palette.success.main,
                                    '&:hover': {
                                        bgcolor: '#096B31',
                                    },
                                }}
                            >
                                Descargar
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>

                {/* Diálogo de confirmación de eliminación */}
                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    maxWidth="xs"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: '8px',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            p: 2.5,
                            borderBottom: '1px solid #E5E7EB',
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1F2937' }}>
                            Confirmar Eliminación
                        </Typography>
                    </DialogTitle>

                    <DialogContent sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                            <Alert
                                severity="warning"
                                sx={{
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                }}
                            >
                                Esta acción no se puede deshacer
                            </Alert>
                            <Typography variant="body2" sx={{ color: '#6B7280' }}>
                                ¿Estás seguro de que deseas eliminar el reporte{' '}
                                <strong>{reportToDelete?.filename}</strong>?
                            </Typography>
                        </Stack>
                    </DialogContent>

                    <DialogActions
                        sx={{
                            p: 2.5,
                            borderTop: '1px solid #E5E7EB',
                            gap: 1,
                        }}
                    >
                        <Button
                            onClick={() => setDeleteDialogOpen(false)}
                            variant="outlined"
                            sx={{
                                fontWeight: 600,
                                fontSize: '14px',
                                textTransform: 'none',
                                borderColor: '#D1D5DB',
                                color: '#1F2937',
                                '&:hover': {
                                    borderColor: '#9CA3AF',
                                    bgcolor: '#F9FAFB',
                                },
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDelete}
                            variant="contained"
                            sx={{
                                fontWeight: 600,
                                fontSize: '14px',
                                textTransform: 'none',
                                bgcolor: fioriTheme.palette.error.main,
                                '&:hover': {
                                    bgcolor: '#A01F1A',
                                },
                            }}
                        >
                            Eliminar
                        </Button>
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
                            borderRadius: '8px',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            p: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #E5E7EB',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircleIcon
                                sx={{
                                    color: fioriTheme.palette.success.main,
                                    mr: 1.5,
                                    fontSize: 24,
                                }}
                            />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1F2937' }}>
                                Archivo guardado exitosamente
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={handleCloseDownloadDialog}
                            sx={{ color: '#6B7280' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ p: 2.5 }}>
                        <Stack spacing={2}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    bgcolor: '#F9FAFB',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <DescriptionIcon
                                        sx={{
                                            fontSize: 32,
                                            color: fioriTheme.palette.success.main,
                                            mr: 1.5,
                                        }}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                color: '#1F2937',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {downloadDialog.filename}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: '#6B7280' }}
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
                                        color: '#6B7280',
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
                                        bgcolor: '#F9FAFB',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontFamily: 'monospace',
                                        fontSize: '12px',
                                        color: '#4B5563',
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
                            borderTop: '1px solid #E5E7EB',
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
                                borderColor: '#D1D5DB',
                                color: '#1F2937',
                                '&:hover': {
                                    borderColor: '#9CA3AF',
                                    bgcolor: '#F9FAFB',
                                },
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
                                bgcolor: fioriTheme.palette.success.main,
                                '&:hover': {
                                    bgcolor: '#096B31',
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