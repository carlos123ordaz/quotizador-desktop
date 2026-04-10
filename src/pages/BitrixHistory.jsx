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
    IconButton,
    Collapse,
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
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Search as SearchIcon,
    History as HistoryIcon,
    Add as AddIcon,
    Edit as EditIcon,
    ExpandMore as ExpandMoreIcon,
    Refresh as RefreshIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    AttachMoney as MoneyIcon,
    Description as DescriptionIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { CONFIG } from '../config';
import { ExportDialog } from '../components/ExportDialog';
import { MainContext } from '../contexts/MainContext';
import moment from 'moment';

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

// ─── SectionPanel (para fila expandida) ──────────────────────────────────────

const SectionPanel = ({ title, icon, children }) => {
    const theme = useTheme();
    return (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', height: '100%' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1.25,
                    bgcolor: alpha(theme.palette.grey[500], 0.04),
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                {icon && React.cloneElement(icon, { sx: { fontSize: 14, color: 'text.disabled' } })}
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

// ─── DataRow (clave-valor) ────────────────────────────────────────────────────

const DataRow = ({ label, value, mono }) => {
    const theme = useTheme();
    if (!value && value !== 0) return null;
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 2,
                py: 0.75,
                borderBottom: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.5),
                '&:last-child': { borderBottom: 'none', pb: 0 },
            }}
        >
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
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
                }}
            >
                {value}
            </Typography>
        </Box>
    );
};

// ─── Componente principal ──────────────────────────────────────────────────────

export const BitrixHistory = () => {
    const theme = useTheme();
    const { user } = useContext(MainContext);
    const pagePalette = {
        softHover: alpha(theme.palette.primary.main, 0.04),
        softStrong: alpha(theme.palette.primary.main, 0.08),
    };

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [totalHistory, setTotalHistory] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterTipo, setFilterTipo] = useState('all');
    const [filterEstado, setFilterEstado] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    const [expandedRows, setExpandedRows] = useState({});
    const [detailDialog, setDetailDialog] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [exportDialog, setExportDialog] = useState(false);

    useEffect(() => { loadHistory(); }, [page, rowsPerPage, searchTerm, filterTipo, filterEstado]);
    useEffect(() => {
        const timer = setTimeout(() => { setSearchTerm(searchInput); setPage(0); }, 500);
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

    const handleChangePage = (_, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleRefresh = () => { loadHistory(); };
    const toggleRowExpansion = (id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
    const handleOpenDetail = (historyItem) => { setSelectedHistory(historyItem); setDetailDialog(true); };
    const handleCloseDetail = () => { setDetailDialog(false); setSelectedHistory(null); };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(value);

    // ─── Sub-renders ────────────────────────────────────────────────────────────

    const skeletonCount = Math.min(rowsPerPage, 12);

    const renderSkeletonRows = () =>
        Array.from({ length: skeletonCount }).map((_, i) => (
            <React.Fragment key={i}>
                <TableRow sx={{ '& .MuiTableCell-root': { py: 1.375, px: 2 } }}>
                    <TableCell sx={{ width: 48 }}><Skeleton variant="circular" width={24} height={24} /></TableCell>
                    <TableCell>
                        <Skeleton variant="text" width="55%" height={18} />
                        <Skeleton variant="text" width="35%" height={14} />
                    </TableCell>
                    <TableCell>
                        <Skeleton variant="text" width="80%" height={18} />
                        <Skeleton variant="text" width="50%" height={14} />
                    </TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={22} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={68} height={22} /></TableCell>
                    <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                    <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                </TableRow>
            </React.Fragment>
        ));

    const renderEmptyState = () => {
        const isFiltered = searchTerm || filterTipo !== 'all' || filterEstado !== 'all';
        return (
            <TableRow>
                <TableCell colSpan={7} sx={{ border: 'none', p: 0 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, px: 3 }}>
                        <Box sx={{
                            width: 60, height: 60, borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.06),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
                        }}>
                            <HistoryIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={600} color="text.primary" gutterBottom>
                            {isFiltered ? 'Sin resultados' : 'Sin registros de historial'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 360, lineHeight: 1.6 }}>
                            {isFiltered
                                ? 'No encontramos registros con esos criterios. Prueba ajustando la búsqueda o los filtros.'
                                : 'Los envíos realizados a Bitrix24 aparecerán aquí con su estado y detalles.'}
                        </Typography>
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
                        Historial Bitrix
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Registro de todos los envíos realizados a Bitrix24
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

                    {user?.es_lider && (
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => setExportDialog(true)}
                            sx={{ borderRadius: 1.5, fontWeight: 500, fontSize: '0.875rem' }}
                        >
                            Exportar
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* ── Barra de filtros ─────────────────────────────────────────────── */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.75, flexShrink: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1.5}>
                    <TextField
                        placeholder="Buscar por oferta, deal o usuario..."
                        size="small"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        sx={{
                            flexGrow: 1, minWidth: 200, maxWidth: 400,
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
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                            value={filterTipo}
                            label="Tipo"
                            onChange={(e) => { setFilterTipo(e.target.value); setPage(0); }}
                            sx={{ borderRadius: 1.5 }}
                        >
                            <MenuItem value="all">Todos los tipos</MenuItem>
                            <MenuItem value="crear">Creaciones</MenuItem>
                            <MenuItem value="actualizar">Actualizaciones</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            value={filterEstado}
                            label="Estado"
                            onChange={(e) => { setFilterEstado(e.target.value); setPage(0); }}
                            sx={{ borderRadius: 1.5 }}
                        >
                            <MenuItem value="all">Todos los estados</MenuItem>
                            <MenuItem value="exitoso">Exitosos</MenuItem>
                            <MenuItem value="error">Con errores</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ flexGrow: 1 }} />

                    {!initialLoading && (
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            {totalHistory.toLocaleString()} {totalHistory === 1 ? 'registro' : 'registros'}
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
                                <TableCell sx={{ ...HEADER_CELL_SX, width: 52, p: 0 }} />
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '14%' }}>Deal / Quote</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '30%' }}>Oferta</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '13%' }}>Tipo</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '11%' }}>Estado</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '14%' }}>Usuario</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '14%' }}>Fecha</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {initialLoading ? (
                                renderSkeletonRows()
                            ) : history.length === 0 ? (
                                renderEmptyState()
                            ) : (
                                history.map((item, index) => (
                                    <React.Fragment key={item._id}>
                                        {/* Fila principal */}
                                        <TableRow
                                            hover
                                            sx={{
                                                bgcolor: expandedRows[item._id]
                                                    ? alpha(theme.palette.primary.main, 0.025)
                                                    : index % 2 !== 0
                                                        ? alpha(theme.palette.grey[500], 0.025)
                                                        : 'transparent',
                                                '&:hover': { bgcolor: pagePalette.softHover },
                                                '& .MuiTableCell-root': {
                                                    py: 1.25, px: 2,
                                                    borderBottom: expandedRows[item._id]
                                                        ? 'none'
                                                        : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                                },
                                            }}
                                        >
                                            {/* Expand toggle */}
                                            <TableCell sx={{ px: '0 !important', textAlign: 'center' }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleRowExpansion(item._id)}
                                                    sx={{
                                                        p: 0.5,
                                                        color: expandedRows[item._id] ? 'primary.main' : 'text.disabled',
                                                        '&:hover': { color: 'primary.main', bgcolor: pagePalette.softStrong },
                                                    }}
                                                >
                                                    <ExpandMoreIcon
                                                        sx={{
                                                            fontSize: 18,
                                                            transition: 'transform 0.2s ease',
                                                            transform: expandedRows[item._id] ? 'rotate(180deg)' : 'none',
                                                        }}
                                                    />
                                                </IconButton>
                                            </TableCell>

                                            {/* Deal / Quote */}
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8125rem', fontFamily: '"Roboto Mono", monospace', color: 'text.primary' }}>
                                                    #{item.num_deal}
                                                </Typography>
                                                {item.quote_id && (
                                                    <Typography variant="caption" color="text.disabled" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.72rem' }}>
                                                        Q#{item.quote_id}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* Oferta */}
                                            <TableCell>
                                                <Typography variant="body2" noWrap fontWeight={500} sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                                                    {item.nombre_oferta}
                                                </Typography>
                                                {item.nombre_archivo && (
                                                    <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: '0.72rem', display: 'block' }}>
                                                        {item.nombre_archivo}
                                                    </Typography>
                                                )}
                                            </TableCell>

                                            {/* Tipo */}
                                            <TableCell>
                                                <Chip
                                                    label={item.tipo_operacion === 'crear' ? 'Creación' : 'Actualización'}
                                                    size="small"
                                                    icon={item.tipo_operacion === 'crear'
                                                        ? <AddIcon sx={{ fontSize: '13px !important' }} />
                                                        : <EditIcon sx={{ fontSize: '13px !important' }} />
                                                    }
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        borderRadius: 1,
                                                        '& .MuiChip-label': { px: 0.75 },
                                                        '& .MuiChip-icon': { ml: '6px' },
                                                        ...(item.tipo_operacion === 'crear'
                                                            ? { backgroundColor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.text.primary }
                                                            : { backgroundColor: alpha(theme.palette.warning.main, 0.12), color: theme.palette.text.primary }
                                                        ),
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Estado */}
                                            <TableCell>
                                                <Chip
                                                    label={item.estado === 'exitoso' ? 'Exitoso' : 'Error'}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        borderRadius: 1,
                                                        '& .MuiChip-label': { px: 1 },
                                                        ...(item.estado === 'exitoso'
                                                            ? { backgroundColor: alpha(theme.palette.success.main, 0.12), color: theme.palette.text.primary }
                                                            : { backgroundColor: alpha(theme.palette.error.main, 0.12), color: theme.palette.text.primary }
                                                        ),
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Usuario */}
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.primary' }} noWrap>
                                                    {item.usuario_envio || '—'}
                                                </Typography>
                                            </TableCell>

                                            {/* Fecha */}
                                            <TableCell>
                                                <Tooltip
                                                    title={moment.utc(item.created_at).local().format('DD/MM/YYYY HH:mm:ss')}
                                                    placement="left"
                                                >
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                                                            {moment.utc(item.created_at).local().format('DD/MM/YY')}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                                                            {moment.utc(item.created_at).local().format('HH:mm')}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>

                                        {/* Fila expandida */}
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                sx={{
                                                    p: 0,
                                                    borderBottom: expandedRows[item._id]
                                                        ? `1px solid ${alpha(theme.palette.divider, 0.5)}`
                                                        : 'none',
                                                }}
                                            >
                                                <Collapse in={expandedRows[item._id]} timeout="auto" unmountOnExit>
                                                    <Box
                                                        sx={{
                                                            p: 2,
                                                            bgcolor: alpha(theme.palette.grey[500], 0.02),
                                                            borderTop: '1px solid',
                                                            borderColor: alpha(theme.palette.divider, 0.5),
                                                        }}
                                                    >
                                                        <Grid container spacing={2}>
                                                            {/* Usuarios involucrados */}
                                                            <Grid size={{ xs: 12, md: 6 }}>
                                                                <SectionPanel title="Personas involucradas" icon={<PersonIcon />}>
                                                                    <DataRow label="Preparado por" value={item.preparado} />
                                                                    {item.preparado_unva && <DataRow label="Preparado UNVA" value={item.preparado_unva} />}
                                                                    {item.preparado_unai && <DataRow label="Preparado UNAI" value={item.preparado_unai} />}
                                                                    {item.preparado_unap && <DataRow label="Preparado UNAP" value={item.preparado_unap} />}
                                                                    {item.preparado_unepc && <DataRow label="Preparado UNEPC" value={item.preparado_unepc} />}
                                                                    <DataRow label="Responsable" value={item.responsable} />
                                                                    {item.visto_bueno && <DataRow label="Visto bueno" value={item.visto_bueno} />}
                                                                </SectionPanel>
                                                            </Grid>

                                                            {/* Información financiera */}
                                                            <Grid size={{ xs: 12, md: 6 }}>
                                                                <SectionPanel title="Información financiera" icon={<MoneyIcon />}>
                                                                    <DataRow label="Utilidad" value={`${(item.utilidad * 100).toFixed(2)}%`} />
                                                                    <DataRow label="Total productos" value={item.total_productos} />
                                                                    {item.costo_auma > 0 && <DataRow label="Costo AUMA" value={formatCurrency(item.costo_auma)} />}
                                                                    {item.costo_msa > 0 && <DataRow label="Costo MSA" value={formatCurrency(item.costo_msa)} />}
                                                                    {item.costo_valmet > 0 && <DataRow label="Costo Valmet" value={formatCurrency(item.costo_valmet)} />}
                                                                </SectionPanel>
                                                            </Grid>

                                                            {/* Totales por área */}
                                                            {item.totales_por_area && Object.keys(item.totales_por_area).some((k) => item.totales_por_area[k] > 0) && (
                                                                <Grid size={{ xs: 12 }}>
                                                                    <SectionPanel title="Totales por área" icon={<DescriptionIcon />}>
                                                                        <Grid container spacing={1.5}>
                                                                            {Object.entries(item.totales_por_area)
                                                                                .filter(([, v]) => v > 0)
                                                                                .map(([area, total]) => (
                                                                                    <Grid key={area} size={{ xs: 6, sm: 4, md: 2 }}>
                                                                                        <Box
                                                                                            sx={{
                                                                                                border: '1px solid',
                                                                                                borderColor: 'divider',
                                                                                                borderRadius: 1.5,
                                                                                                p: 1.25,
                                                                                                textAlign: 'center',
                                                                                                bgcolor: 'background.paper',
                                                                                            }}
                                                                                        >
                                                                                            <Typography
                                                                                                variant="caption"
                                                                                                color="text.secondary"
                                                                                                fontWeight={600}
                                                                                                sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem', mb: 0.5 }}
                                                                                            >
                                                                                                {area}
                                                                                            </Typography>
                                                                                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
                                                                                                {formatCurrency(total)}
                                                                                            </Typography>
                                                                                        </Box>
                                                                                    </Grid>
                                                                                ))}
                                                                        </Grid>
                                                                    </SectionPanel>
                                                                </Grid>
                                                            )}

                                                            {/* Error */}
                                                            {item.estado === 'error' && item.error_mensaje && (
                                                                <Grid size={{ xs: 12 }}>
                                                                    <Box
                                                                        sx={{
                                                                            border: '1px solid',
                                                                            borderColor: alpha(theme.palette.error.main, 0.24),
                                                                            borderLeft: `3px solid ${theme.palette.error.main}`,
                                                                            borderRadius: 1.5,
                                                                            p: 2,
                                                                            bgcolor: alpha(theme.palette.error.main, 0.035),
                                                                        }}
                                                                    >
                                                                        <Typography
                                                                            variant="caption"
                                                                            fontWeight={700}
                                                                            color="error.main"
                                                                            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}
                                                                        >
                                                                            Mensaje de error
                                                                        </Typography>
                                                                        <Typography variant="body2" color="error.main" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem', lineHeight: 1.6 }}>
                                                                            {item.error_mensaje}
                                                                        </Typography>
                                                                    </Box>
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

                <Divider sx={{ flexShrink: 0 }} />

                <TablePagination
                    rowsPerPageOptions={[15, 25, 50, 100]}
                    component="div"
                    count={totalHistory}
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

            {/* ── Diálogo de exportación ───────────────────────────────────────── */}
            <ExportDialog open={exportDialog} onClose={() => setExportDialog(false)} />

            {/* ── Diálogo de detalles ──────────────────────────────────────────── */}
            <Dialog
                open={detailDialog}
                onClose={handleCloseDetail}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>Detalles del envío</Typography>
                            {selectedHistory && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Deal #{selectedHistory.num_deal} · {selectedHistory.nombre_oferta}
                                </Typography>
                            )}
                        </Box>
                        <IconButton onClick={handleCloseDetail} size="small" sx={{ mt: -0.5, color: 'text.secondary' }}>
                            <DescriptionIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <Divider sx={{ mt: 2.5 }} />

                <DialogContent sx={{ pt: 3, px: 3 }}>
                    {selectedHistory && (
                        <Stack spacing={2}>
                            <SectionPanel title="Información general" icon={<DescriptionIcon />}>
                                <DataRow label="Deal" value={`#${selectedHistory.num_deal}`} mono />
                                <DataRow label="Quote" value={selectedHistory.quote_id ? `#${selectedHistory.quote_id}` : null} mono />
                                <DataRow label="Oferta" value={selectedHistory.nombre_oferta} />
                                <DataRow label="Archivo" value={selectedHistory.nombre_archivo} />
                                {selectedHistory.rubrica && <DataRow label="Rúbrica" value={selectedHistory.rubrica} />}
                            </SectionPanel>

                            {selectedHistory.tipo_operacion === 'crear' && (
                                <SectionPanel title="Fechas" icon={<CalendarIcon />}>
                                    {selectedHistory.fecha_correo && <DataRow label="Correo" value={selectedHistory.fecha_correo} />}
                                    {selectedHistory.fecha_inicio && <DataRow label="Inicio" value={selectedHistory.fecha_inicio} />}
                                    {selectedHistory.fecha_envio && <DataRow label="Envío" value={selectedHistory.fecha_envio} />}
                                    {selectedHistory.fecha_cierre && <DataRow label="Cierre" value={selectedHistory.fecha_cierre} />}
                                </SectionPanel>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <Divider />

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleCloseDetail} variant="outlined" size="small" sx={{ borderRadius: 1.5 }}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
