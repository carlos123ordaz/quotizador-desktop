import { useState, useEffect, useContext } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Assessment as AssessmentIcon,
    CheckCircle as CheckCircleIcon,
    CloudDownload as CloudDownloadIcon,
    Delete as DeleteIcon,
    Error as ErrorIcon,
    FolderOpen as FolderOpenIcon,
    History as HistoryIcon,
    InsertDriveFile as FileIcon,
    OpenInNew as OpenInNewIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import moment from 'moment';
import axios from 'axios';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';

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

const StatCard = ({ label, value, icon, color, tone }) => (
    <Paper
        elevation={0}
        sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 2,
            height: '100%',
            background: `linear-gradient(180deg, ${tone} 0%, rgba(255,255,255,0) 100%)`,
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box>
                <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}
                >
                    {label}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color }}>
                    {value.toLocaleString()}
                </Typography>
            </Box>
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(color, 0.1),
                    color,
                }}
            >
                {icon}
            </Box>
        </Box>
    </Paper>
);

const SectionPanel = ({ title, children }) => {
    const theme = useTheme();

    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
            <Box
                sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: alpha(theme.palette.grey[500], 0.04),
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}
                >
                    {title}
                </Typography>
            </Box>
            <Box sx={{ p: 2 }}>{children}</Box>
        </Box>
    );
};

const DataRow = ({ label, value, mono = false }) => {
    const theme = useTheme();

    if (!value && value !== 0) return null;

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 2,
                py: 0.85,
                borderBottom: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.5),
                '&:last-child': { borderBottom: 'none', pb: 0 },
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography
                variant="body2"
                fontWeight={600}
                align="right"
                sx={{
                    color: 'text.primary',
                    fontFamily: mono ? '"Roboto Mono", monospace' : 'inherit',
                    fontSize: mono ? '0.8rem' : '0.8125rem',
                    wordBreak: 'break-word',
                }}
            >
                {value}
            </Typography>
        </Box>
    );
};

const ReportHistory = () => {
    const theme = useTheme();
    const { user } = useContext(MainContext);

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [totalReports, setTotalReports] = useState(0);
    const [stats, setStats] = useState({ total: 0, success: 0, partial: 0, errors: 0 });

    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    const [selectedReport, setSelectedReport] = useState(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [downloadDialog, setDownloadDialog] = useState({ open: false, filename: '', savedPath: '' });

    useEffect(() => {
        loadReports();
    }, [page, rowsPerPage, searchTerm, filterStatus]);

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput.trim());
            setPage(0);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadReports = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${CONFIG.uri}/reports/history`, {
                params: {
                    skip: page * rowsPerPage,
                    limit: rowsPerPage,
                    ...(searchTerm && { search: searchTerm }),
                    ...(filterStatus !== 'all' && { status: filterStatus }),
                },
            });

            setReports(response.data.reports || []);
            setTotalReports(response.data.total || 0);
        } catch (error) {
            console.error('Error al cargar reportes:', error);
            setReports([]);
            setTotalReports(0);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await axios.get(`${CONFIG.uri}/reports/stats`);
            setStats({
                total: response.data.total || 0,
                success: response.data.success || 0,
                partial: response.data.partial || 0,
                errors: response.data.errors || 0,
            });
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    };

    const handleRefresh = async () => {
        await Promise.all([loadReports(), loadStats()]);
    };

    const handleChangePage = (_, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleOpenDetails = (report) => {
        setSelectedReport(report);
        setDetailsDialogOpen(true);
    };

    const handleOpenDeleteDialog = (report) => {
        setReportToDelete(report);
        setDeleteDialogOpen(true);
    };

    const handleDeleteReport = async () => {
        if (!reportToDelete) return;

        try {
            await axios.delete(`${CONFIG.uri}/reports/${reportToDelete._id}`);
            setDeleteDialogOpen(false);
            setReportToDelete(null);

            if (reports.length === 1 && page > 0) {
                setPage((prev) => prev - 1);
            } else {
                await loadReports();
            }

            await loadStats();
        } catch (error) {
            console.error('Error eliminando reporte:', error);
            alert(error.response?.data?.detail || 'Error al eliminar el reporte');
        }
    };

    const handleDownload = async (report) => {
        if (!report.download_url) {
            alert('No hay URL de descarga disponible');
            return;
        }

        try {
            const response = await tauriFetch(report.download_url);
            const blob = await response.blob();
            const fileName = report.filename || 'reporte.xlsx';
            const filePath = await save({
                defaultPath: fileName,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }],
            });

            if (!filePath) return;

            const buffer = await blob.arrayBuffer();
            await writeFile(filePath, new Uint8Array(buffer));
            setDownloadDialog({ open: true, filename: fileName, savedPath: filePath });
        } catch (error) {
            console.error('Error descargando archivo:', error);
            alert('Error al descargar el archivo');
        }
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

    const handleCloseDownloadDialog = () => {
        setDownloadDialog({ open: false, filename: '', savedPath: '' });
    };

    const formatFileSize = (mbValue) => {
        if (!mbValue || mbValue <= 0) return '0 MB';
        return `${Number(mbValue).toFixed(2)} MB`;
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return '-';
        if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
        return `${Number(seconds).toFixed(seconds < 10 ? 2 : 1)} s`;
    };

    const getStatusConfig = (status) => {
        if (status === 'success') {
            return {
                label: 'Exitoso',
                color: '#15803D',
                backgroundColor: '#F0FDF4',
                icon: <CheckCircleIcon sx={{ fontSize: 14 }} />,
            };
        }

        if (status === 'partial') {
            return {
                label: 'Parcial',
                color: '#B45309',
                backgroundColor: '#FFFBEB',
                icon: <WarningAmberIcon sx={{ fontSize: 14 }} />,
            };
        }

        return {
            label: 'Error',
            color: '#BE123C',
            backgroundColor: '#FFF1F2',
            icon: <ErrorIcon sx={{ fontSize: 14 }} />,
        };
    };

    const renderStatusChip = (status) => {
        const config = getStatusConfig(status);

        return (
            <Chip
                icon={config.icon}
                label={config.label}
                size="small"
                sx={{
                    height: 24,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: 1,
                    color: config.color,
                    bgcolor: config.backgroundColor,
                    '& .MuiChip-icon': { color: config.color, ml: 0.75 },
                    '& .MuiChip-label': { px: 1.25 },
                }}
            />
        );
    };

    const skeletonCount = Math.min(rowsPerPage, 12);

    const renderSkeletonRows = () =>
        Array.from({ length: skeletonCount }).map((_, index) => (
            <TableRow key={index} sx={{ '& .MuiTableCell-root': { py: 1.5, px: 2 } }}>
                <TableCell>
                    <Skeleton variant="text" width="72%" height={20} />
                    <Skeleton variant="text" width="46%" height={15} />
                </TableCell>
                <TableCell><Skeleton variant="rounded" width={88} height={24} /></TableCell>
                <TableCell><Skeleton variant="text" width="48%" /></TableCell>
                <TableCell><Skeleton variant="text" width="56%" /></TableCell>
                <TableCell><Skeleton variant="text" width="44%" /></TableCell>
                <TableCell>
                    <Skeleton variant="text" width="58%" />
                    <Skeleton variant="text" width="38%" />
                </TableCell>
                <TableCell align="right"><Skeleton variant="rounded" width={112} height={32} /></TableCell>
            </TableRow>
        ));

    const renderEmptyState = () => {
        const isFiltered = searchTerm || filterStatus !== 'all';

        return (
            <TableRow>
                <TableCell colSpan={7} sx={{ border: 'none', p: 0 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 10,
                            px: 3,
                        }}
                    >
                        <Box
                            sx={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2,
                            }}
                        >
                            <HistoryIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={600} color="text.primary" gutterBottom>
                            {isFiltered ? 'Sin resultados' : 'Sin reportes generados'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 420, lineHeight: 1.6 }}>
                            {isFiltered
                                ? 'No encontramos reportes con esos criterios. Ajusta la búsqueda o cambia el estado.'
                                : 'Los reportes consolidados aparecerán aquí con su estado, métricas y accesos de descarga.'}
                        </Typography>
                    </Box>
                </TableCell>
            </TableRow>
        );
    };

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

            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexShrink: 0 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                        Historial reportes
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Registro de reportes Excel generados desde el consolidador
                    </Typography>
                </Box>

                <Tooltip title="Recargar">
                    <IconButton
                        onClick={handleRefresh}
                        disabled={loading}
                        size="small"
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1.5,
                            p: 0.875,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        }}
                    >
                        <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            <Grid container spacing={2} flexShrink={0}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        label="Total"
                        value={stats.total}
                        icon={<AssessmentIcon fontSize="small" />}
                        color={theme.palette.primary.main}
                        tone={alpha(theme.palette.primary.main, 0.06)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        label="Exitosos"
                        value={stats.success}
                        icon={<CheckCircleIcon fontSize="small" />}
                        color={theme.palette.success.main}
                        tone={alpha(theme.palette.success.main, 0.06)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        label="Parciales"
                        value={stats.partial}
                        icon={<WarningAmberIcon fontSize="small" />}
                        color={theme.palette.warning.dark}
                        tone={alpha(theme.palette.warning.main, 0.08)}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard
                        label="Con errores"
                        value={stats.errors}
                        icon={<ErrorIcon fontSize="small" />}
                        color={theme.palette.error.main}
                        tone={alpha(theme.palette.error.main, 0.06)}
                    />
                </Grid>
            </Grid>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.75, flexShrink: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1.5}>
                    <TextField
                        placeholder="Buscar por nombre de archivo o ID..."
                        size="small"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        sx={{
                            flexGrow: 1,
                            minWidth: 220,
                            maxWidth: 420,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.grey[500], 0.04),
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
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 170 }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            value={filterStatus}
                            label="Estado"
                            onChange={(event) => {
                                setFilterStatus(event.target.value);
                                setPage(0);
                            }}
                            sx={{ borderRadius: 1.5 }}
                        >
                            <MenuItem value="all">Todos los estados</MenuItem>
                            <MenuItem value="success">Exitosos</MenuItem>
                            <MenuItem value="partial">Parciales</MenuItem>
                            <MenuItem value="error">Con errores</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />

                    {!initialLoading && (
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {totalReports.toLocaleString()} {totalReports === 1 ? 'reporte' : 'reportes'}
                        </Typography>
                    )}
                </Stack>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    minHeight: 0,
                }}
            >
                <TableContainer sx={{ flexGrow: 1, minHeight: 0 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'background.paper' } }}>
                                <TableCell sx={{ ...HEADER_CELL_SX, minWidth: 260 }}>Archivo</TableCell>
                                <TableCell sx={HEADER_CELL_SX}>Estado</TableCell>
                                <TableCell sx={HEADER_CELL_SX}>Archivos</TableCell>
                                <TableCell sx={HEADER_CELL_SX}>Registros</TableCell>
                                <TableCell sx={HEADER_CELL_SX}>Tamaño</TableCell>
                                <TableCell sx={HEADER_CELL_SX}>Fecha</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, textAlign: 'right', width: 160 }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {initialLoading ? (
                                renderSkeletonRows()
                            ) : reports.length === 0 ? (
                                renderEmptyState()
                            ) : (
                                reports.map((report) => (
                                    <TableRow
                                        key={report._id}
                                        hover
                                        sx={{
                                            '& .MuiTableCell-root': {
                                                py: 1.375,
                                                px: 2,
                                                borderBottomColor: alpha(theme.palette.divider, 0.6),
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                                <Box
                                                    sx={{
                                                        width: 34,
                                                        height: 34,
                                                        borderRadius: 1.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                        color: 'primary.main',
                                                        flexShrink: 0,
                                                        mt: 0.2,
                                                    }}
                                                >
                                                    <FileIcon sx={{ fontSize: 18 }} />
                                                </Box>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }} noWrap>
                                                        {report.filename || 'Sin nombre'}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: 'block', mt: 0.35, fontFamily: '"Roboto Mono", monospace' }}
                                                    >
                                                        {report._id}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>

                                        <TableCell>{renderStatusChip(report.status)}</TableCell>

                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {report.files_processed || 0}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {report.files_with_errors || 0} con error
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {(report.total_records || 0).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDuration(report.processing_time)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                {formatFileSize(report.file_size)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Tooltip title={moment.utc(report.created_at).local().format('DD/MM/YYYY HH:mm:ss')} placement="left">
                                                <Box>
                                                    <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                                        {moment.utc(report.created_at).local().format('DD/MM/YY')}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.disabled">
                                                        {moment.utc(report.created_at).local().format('HH:mm')}
                                                    </Typography>
                                                </Box>
                                            </Tooltip>
                                        </TableCell>

                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                <Tooltip title="Ver detalles">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDetails(report)}
                                                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                                                    >
                                                        <VisibilityIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>

                                                {user?.es_lider && report.status !== 'error' && report.download_url && (
                                                    <Tooltip title="Descargar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDownload(report)}
                                                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                                                        >
                                                            <CloudDownloadIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                {user?.es_lider && (
                                                    <Tooltip title="Eliminar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenDeleteDialog(report)}
                                                            sx={{
                                                                border: '1px solid',
                                                                borderColor: alpha(theme.palette.error.main, 0.2),
                                                                borderRadius: 1.5,
                                                                color: 'error.main',
                                                            }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
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
                    count={totalReports}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} de ${count !== -1 ? count.toLocaleString() : `más de ${to}`}`
                    }
                    sx={{
                        flexShrink: 0,
                        borderTop: 'none',
                        '.MuiTablePagination-toolbar': { minHeight: 52, px: 2 },
                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                            fontSize: '0.8125rem',
                            color: 'text.secondary',
                        },
                    }}
                />
            </Paper>

            <Dialog
                open={detailsDialogOpen}
                onClose={() => setDetailsDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                Detalles del reporte
                            </Typography>
                            {selectedReport && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {selectedReport.filename}
                                </Typography>
                            )}
                        </Box>
                        {selectedReport && renderStatusChip(selectedReport.status)}
                    </Box>
                </DialogTitle>

                <Divider sx={{ mt: 2.5 }} />

                <DialogContent sx={{ pt: 3, px: 3 }}>
                    {selectedReport && (
                        <Stack spacing={2}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <SectionPanel title="Información general">
                                        <DataRow label="ID" value={selectedReport._id} mono />
                                        <DataRow label="Archivo" value={selectedReport.filename} />
                                        <DataRow
                                            label="Generado"
                                            value={moment.utc(selectedReport.created_at).local().format('DD/MM/YYYY HH:mm:ss')}
                                        />
                                        <DataRow label="Tiempo de proceso" value={formatDuration(selectedReport.processing_time)} />
                                        <DataRow label="Tamaño" value={formatFileSize(selectedReport.file_size)} />
                                    </SectionPanel>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                    <SectionPanel title="Métricas de consolidación">
                                        <DataRow label="Archivos procesados" value={selectedReport.files_processed || 0} />
                                        <DataRow label="Archivos con error" value={selectedReport.files_with_errors || 0} />
                                        <DataRow label="Total de registros" value={(selectedReport.total_records || 0).toLocaleString()} />
                                        <DataRow label="Estado" value={getStatusConfig(selectedReport.status).label} />
                                    </SectionPanel>
                                </Grid>
                            </Grid>

                            {selectedReport.error_message && (
                                <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                                    {selectedReport.error_message}
                                </Alert>
                            )}

                            {selectedReport.errors?.length > 0 && (
                                <SectionPanel title="Detalle de errores por archivo">
                                    <Stack spacing={1.25}>
                                        {selectedReport.errors.map((errorItem, index) => (
                                            <Box
                                                key={`${errorItem.file}-${index}`}
                                                sx={{
                                                    border: '1px solid',
                                                    borderColor: alpha(theme.palette.error.main, 0.16),
                                                    borderRadius: 1.5,
                                                    p: 1.5,
                                                    bgcolor: alpha(theme.palette.error.main, 0.03),
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', mb: 0.5 }}>
                                                    {errorItem.file}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ fontSize: '0.8125rem', lineHeight: 1.6 }}
                                                >
                                                    {errorItem.error}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </SectionPanel>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <Divider />

                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button onClick={() => setDetailsDialogOpen(false)} variant="outlined" size="small" sx={{ borderRadius: 1.5 }}>
                        Cerrar
                    </Button>
                    {user?.es_lider && selectedReport?.status !== 'error' && selectedReport?.download_url && (
                        <Button
                            variant="contained"
                            startIcon={<CloudDownloadIcon />}
                            onClick={() => {
                                handleDownload(selectedReport);
                                setDetailsDialogOpen(false);
                            }}
                            size="small"
                            sx={{ borderRadius: 1.5 }}
                        >
                            Descargar
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ pt: 3, px: 3, pb: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                        Eliminar reporte
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {reportToDelete
                            ? `Se eliminará el reporte ${reportToDelete.filename}. Esta acción no se puede deshacer.`
                            : 'Esta acción no se puede deshacer.'}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" size="small" sx={{ borderRadius: 1.5 }}>
                        Cancelar
                    </Button>
                    <Button onClick={handleDeleteReport} color="error" variant="contained" size="small" sx={{ borderRadius: 1.5 }}>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={downloadDialog.open}
                onClose={handleCloseDownloadDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                Archivo guardado
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                El reporte se descargó correctamente.
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <Divider />

                <DialogContent sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                p: 1.5,
                                bgcolor: alpha(theme.palette.success.main, 0.03),
                            }}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <FileIcon sx={{ color: 'success.main' }} />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-all' }}>
                                        {downloadDialog.filename}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Archivo Excel
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>

                        <Box>
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}
                            >
                                Guardado en
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    p: 1.25,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: alpha(theme.palette.grey[500], 0.04),
                                    fontFamily: '"Roboto Mono", monospace',
                                    fontSize: '0.78rem',
                                    color: 'text.secondary',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {downloadDialog.savedPath}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<FolderOpenIcon />}
                        onClick={handleShowInFolder}
                        fullWidth
                        sx={{ py: 1, borderRadius: 1.5 }}
                    >
                        Mostrar en carpeta
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<OpenInNewIcon />}
                        onClick={handleOpenFile}
                        fullWidth
                        sx={{ py: 1, borderRadius: 1.5 }}
                    >
                        Abrir archivo
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReportHistory;
