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
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Inventory as InventoryIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
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

const getUNChipStyle = (value) => getAreaTone(value);

// ─── Componente principal ──────────────────────────────────────────────────────

const ProductsPage = () => {
    const theme = useTheme();
    const productPalette = {
        neutralHover: alpha(theme.palette.primary.main, 0.04),
        neutralStrong: alpha(theme.palette.primary.main, 0.12),
    };

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [totalProducts, setTotalProducts] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterActivo, setFilterActivo] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const { user } = useContext(MainContext);

    const { control, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            code: '',
            name_excel: '',
            name_bitrix: '',
            unidad_negocio: '',
            area1: '',
            area2: '',
        },
    });

    useEffect(() => {
        loadProducts();
    }, [page, rowsPerPage, searchTerm, filterActivo]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const params = {
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                ...(searchTerm && { search: searchTerm }),
                ...(filterActivo !== 'all' && { activo: filterActivo === 'active' }),
            };
            const response = await axios.get(`${CONFIG.uri}/products`, { params });
            setProducts(response.data.productos || []);
            setTotalProducts(response.data.total || 0);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            showSnackbar('Error al cargar los productos', 'error');
            setProducts([]);
            setTotalProducts(0);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    const handleOpenDialog = (product = null) => {
        if (!(user && user.es_lider)) return;
        if (product) {
            setEditingProduct(product);
            reset({
                code: product.code || '',
                name_excel: product.name_excel || '',
                name_bitrix: product.name_bitrix || '',
                unidad_negocio: product.unidad_negocio || '',
                area1: product.area1 || '',
                area2: product.area2 || '',
            });
        } else {
            setEditingProduct(null);
            reset({ code: '', name_excel: '', name_bitrix: '', unidad_negocio: '', area1: '', area2: '' });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingProduct(null);
        reset();
    };

    const onSubmit = async (data) => {
        try {
            setLoading(true);
            if (editingProduct) {
                await axios.put(`${CONFIG.uri}/products/${editingProduct._id}`, data);
                showSnackbar('Producto actualizado exitosamente', 'success');
            } else {
                await axios.post(`${CONFIG.uri}/products`, data);
                showSnackbar('Producto creado exitosamente', 'success');
            }
            handleCloseDialog();
            loadProducts();
        } catch (error) {
            console.error('Error al guardar producto:', error);
            showSnackbar('Error al guardar el producto', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDeleteDialog = (product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        try {
            setLoading(true);
            if (productToDelete) {
                await axios.delete(`${CONFIG.uri}/products/${productToDelete._id}`);
                showSnackbar('Producto eliminado exitosamente', 'success');
                setDeleteDialogOpen(false);
                setProductToDelete(null);
                loadProducts();
            }
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            showSnackbar('Error al eliminar el producto', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
    const handleCloseSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));
    const handleRefresh = () => loadProducts();

    // ─── Sub-renders ────────────────────────────────────────────────────────────

    const skeletonCount = Math.min(rowsPerPage, 12);
    const colSpan = user?.es_lider ? 7 : 6;

    const renderSkeletonRows = () =>
        Array.from({ length: skeletonCount }).map((_, i) => (
            <TableRow key={i} sx={{ '& .MuiTableCell-root': { py: 1.5, px: 2 } }}>
                <TableCell><Skeleton variant="text" width="55%" sx={{ borderRadius: 0.5 }} /></TableCell>
                <TableCell><Skeleton variant="text" width="80%" sx={{ borderRadius: 0.5 }} /></TableCell>
                <TableCell><Skeleton variant="text" width="75%" sx={{ borderRadius: 0.5 }} /></TableCell>
                <TableCell><Skeleton variant="rounded" width={84} height={22} sx={{ borderRadius: 1 }} /></TableCell>
                <TableCell><Skeleton variant="text" width="50%" sx={{ borderRadius: 0.5 }} /></TableCell>
                <TableCell><Skeleton variant="text" width="50%" sx={{ borderRadius: 0.5 }} /></TableCell>
                {user?.es_lider && <TableCell />}
            </TableRow>
        ));

    const renderEmptyState = () => {
        const isFiltered = searchTerm || filterActivo !== 'all';
        return (
            <TableRow>
                <TableCell colSpan={colSpan} sx={{ border: 'none', p: 0 }}>
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
                            <InventoryIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                        </Box>
                        <Typography variant="subtitle1" fontWeight={600} color="text.primary" gutterBottom>
                            {isFiltered ? 'Sin resultados' : 'Sin productos registrados'}
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                            sx={{ maxWidth: 360, lineHeight: 1.6 }}
                        >
                            {isFiltered
                                ? 'No encontramos productos con esos criterios. Prueba ajustando la búsqueda o los filtros.'
                                : 'Aún no hay productos registrados en el sistema. Crea el primero para comenzar.'}
                        </Typography>
                        {!isFiltered && user?.es_lider && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenDialog()}
                                disableElevation
                                sx={{ mt: 3, borderRadius: 1.5, fontWeight: 600, px: 3, boxShadow: 'none' }}
                            >
                                Crear producto
                            </Button>
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
            {/* Indicador de carga global */}
            {loading && !initialLoading && (
                <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 2 }} />
            )}

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h5"
                        fontWeight={700}
                        color="text.primary"
                        sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}
                    >
                        Gestión de Productos
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Administra, busca y organiza los productos del sistema
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
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
                                '&:hover': { bgcolor: productPalette.neutralHover },
                            }}
                        >
                            <RefreshIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>

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
                                boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
                                '&:hover': {
                                    boxShadow: `0 4px 10px ${alpha(theme.palette.common.black, 0.12)}`,
                                },
                            }}
                        >
                            Crear producto
                        </Button>
                    )}
                </Stack>
            </Box>

            {/* ── Barra de filtros ─────────────────────────────────────────────── */}
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 1.75,
                    flexShrink: 0,
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1.5}>
                    <TextField
                        placeholder="Buscar por nombre o código..."
                        size="small"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        sx={{
                            flexGrow: 1,
                            minWidth: 200,
                            maxWidth: 440,
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
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                        >
                            {totalProducts.toLocaleString()}{' '}
                            {totalProducts === 1 ? 'producto' : 'productos'}
                        </Typography>
                    )}
                </Stack>
            </Paper>

            {/* ── Tabla ────────────────────────────────────────────────────────── */}
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
                <TableContainer
                    sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    <Table stickyHeader size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '11%' }}>Código</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '24%' }}>Nombre Excel</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '24%' }}>Nombre Bitrix</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '18%' }}>Unidad de Negocio</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '10%' }}>Fab. Deal</TableCell>
                                <TableCell sx={{ ...HEADER_CELL_SX, width: '10%' }}>Fab. Cot</TableCell>
                                {user?.es_lider && (
                                    <TableCell sx={{ ...HEADER_CELL_SX, width: '7%' }} />
                                )}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {initialLoading ? (
                                renderSkeletonRows()
                            ) : products.length === 0 ? (
                                renderEmptyState()
                            ) : (
                                products.map((product, index) => (
                                    <TableRow
                                        key={product._id}
                                        hover
                                        onClick={() => handleOpenDialog(product)}
                                        sx={{
                                            cursor: user?.es_lider ? 'pointer' : 'default',
                                            bgcolor:
                                                index % 2 !== 0
                                                    ? alpha(theme.palette.grey[500], 0.025)
                                                    : 'transparent',
                                            '&:hover': {
                                                bgcolor: productPalette.neutralHover,
                                            },
                                            '& .MuiTableCell-root': {
                                                py: 1.375,
                                                px: 2,
                                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                                            },
                                            '&:last-child .MuiTableCell-root': {
                                                borderBottom: 'none',
                                            },
                                        }}
                                    >
                                        {/* Código */}
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    fontFamily: '"Roboto Mono", "Courier New", monospace',
                                                    color: 'text.primary',
                                                    letterSpacing: '0.02em',
                                                }}
                                            >
                                                {product.code}
                                            </Typography>
                                        </TableCell>

                                        {/* Nombre Excel */}
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{
                                                    fontSize: '0.8125rem',
                                                    color: product.name_excel ? 'text.primary' : 'text.disabled',
                                                    fontStyle: product.name_excel ? 'normal' : 'italic',
                                                }}
                                            >
                                                {product.name_excel || 'Sin nombre'}
                                            </Typography>
                                        </TableCell>

                                        {/* Nombre Bitrix */}
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{
                                                    fontSize: '0.8125rem',
                                                    color: product.name_bitrix ? 'text.primary' : 'text.disabled',
                                                    fontStyle: product.name_bitrix ? 'normal' : 'italic',
                                                }}
                                            >
                                                {product.name_bitrix || 'Sin nombre'}
                                            </Typography>
                                        </TableCell>

                                        {/* Unidad de Negocio */}
                                        <TableCell>
                                            {product.unidad_negocio ? (
                                                <Chip
                                                    label={product.unidad_negocio}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        borderRadius: 1,
                                                        maxWidth: '100%',
                                                        '& .MuiChip-label': { px: 1 },
                                                        ...getUNChipStyle(product.unidad_negocio),
                                                    }}
                                                />
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}
                                                >
                                                    —
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Fab. Deal */}
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: '0.8125rem',
                                                    color: product.area1 ? 'text.primary' : 'text.disabled',
                                                }}
                                            >
                                                {product.area1 || '—'}
                                            </Typography>
                                        </TableCell>

                                        {/* Fab. Cot */}
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: '0.8125rem',
                                                    color: product.area2 ? 'text.primary' : 'text.disabled',
                                                }}
                                            >
                                                {product.area2 || '—'}
                                            </Typography>
                                        </TableCell>

                                        {/* Acciones (solo líder) */}
                                        {user?.es_lider && (
                                            <TableCell
                                                align="right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Stack
                                                    direction="row"
                                                    spacing={0.25}
                                                    justifyContent="flex-end"
                                                    sx={{ opacity: 0, '.MuiTableRow-root:hover &': { opacity: 1 } }}
                                                >
                                                    <Tooltip title="Editar" placement="top">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDialog(product); }}
                                                            sx={{
                                                                p: 0.5,
                                                                color: 'text.secondary',
                                                                '&:hover': { color: 'primary.main', bgcolor: productPalette.neutralStrong },
                                                            }}
                                                        >
                                                            <EditIcon sx={{ fontSize: 15 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Eliminar" placement="top">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(product); }}
                                                            sx={{
                                                                p: 0.5,
                                                                color: 'text.secondary',
                                                                '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) },
                                                            }}
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
                    rowsPerPageOptions={[5, 15, 25, 50, 100]}
                    component="div"
                    count={totalProducts}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página:"
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}–${to} de ${count !== -1 ? count.toLocaleString() : `más de ${to}`}`
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

            {/* ── Diálogo crear / editar ───────────────────────────────────────── */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                TransitionComponent={Fade}
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ pb: 0, pt: 3, px: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                {editingProduct ? 'Editar producto' : 'Nuevo producto'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {editingProduct
                                    ? `Modificando el producto ${editingProduct.code}`
                                    : 'Completa los campos para registrar un nuevo producto'}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={handleCloseDialog}
                            size="small"
                            sx={{
                                mt: -0.5,
                                color: 'text.secondary',
                                '&:hover': { color: 'text.primary' },
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <Divider sx={{ mt: 2.5 }} />

                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent sx={{ pt: 3, px: 3, pb: 2 }}>
                        <Grid container spacing={2.5}>
                            {/* Fila 1: Código + Unidad de Negocio */}
                            <Grid size={{ xs: 12 }} sm={5}>
                                <Controller
                                    name="code"
                                    control={control}
                                    rules={{ required: 'El código es requerido' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Código"
                                            fullWidth
                                            size="small"
                                            error={!!errors.code}
                                            helperText={errors.code?.message}
                                            disabled={!!editingProduct}
                                            InputProps={{
                                                sx: {
                                                    fontFamily: '"Roboto Mono", "Courier New", monospace',
                                                    fontSize: '0.875rem',
                                                },
                                            }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }} sm={7}>
                                <Controller
                                    name="unidad_negocio"
                                    control={control}
                                    rules={{ required: 'La unidad de negocio es requerida' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Unidad de Negocio"
                                            fullWidth
                                            size="small"
                                            error={!!errors.unidad_negocio}
                                            helperText={errors.unidad_negocio?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Fila 2: Nombre Excel (ancho completo) */}
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="name_excel"
                                    control={control}
                                    rules={{ required: 'El nombre Excel es requerido' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Nombre Excel"
                                            fullWidth
                                            size="small"
                                            error={!!errors.name_excel}
                                            helperText={errors.name_excel?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Fila 3: Nombre Bitrix (ancho completo) */}
                            <Grid size={{ xs: 12 }}>
                                <Controller
                                    name="name_bitrix"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Nombre Bitrix"
                                            fullWidth
                                            size="small"
                                            error={!!errors.name_bitrix}
                                            helperText={errors.name_bitrix?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Fila 4: Fab. Deal + Fab. Cot */}
                            <Grid size={{ xs: 12 }} sm={6}>
                                <Controller
                                    name="area1"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Fab. Deal"
                                            fullWidth
                                            size="small"
                                            error={!!errors.area1}
                                            helperText={errors.area1?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }} sm={6}>
                                <Controller
                                    name="area2"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Fab. Cot"
                                            fullWidth
                                            size="small"
                                            error={!!errors.area2}
                                            helperText={errors.area2?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>

                    <Divider />

                    <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                        <Box>
                            {editingProduct && (
                                <Button
                                    onClick={() => { handleCloseDialog(); handleOpenDeleteDialog(editingProduct); }}
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
                            <Button
                                onClick={handleCloseDialog}
                                variant="outlined"
                                size="small"
                                sx={{ borderRadius: 1.5 }}
                            >
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
                                {editingProduct ? 'Actualizar' : 'Crear'}
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
                    <Typography variant="h6" fontWeight={700}>
                        Eliminar producto
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Esta acción no se puede deshacer
                    </Typography>
                </DialogTitle>

                <Divider sx={{ mt: 2.5 }} />

                <DialogContent sx={{ pt: 2.5, px: 3 }}>
                    <Alert
                        severity="warning"
                        variant="outlined"
                        sx={{
                            mb: 2,
                            borderRadius: 1.5,
                            fontSize: '0.8125rem',
                            borderColor: alpha(theme.palette.warning.main, 0.28),
                            bgcolor: alpha(theme.palette.warning.main, 0.05),
                            color: 'text.primary',
                        }}
                    >
                        Se eliminará permanentemente este producto del sistema.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        ¿Confirmas que deseas eliminar el producto{' '}
                        <Box component="span" fontWeight={700} color="text.primary">
                            {productToDelete?.code}
                        </Box>
                        ?
                    </Typography>
                </DialogContent>

                <Divider />

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        variant="outlined"
                        size="small"
                        sx={{ borderRadius: 1.5 }}
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
                        sx={{ borderRadius: 1.5, fontWeight: 600, minWidth: 90 }}
                    >
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Backdrop de carga en dialog */}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: alpha(corporateColors.brand, 0.34) }}
                open={loading && openDialog}
            >
                <CircularProgress color="inherit" size={32} />
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
                    variant="outlined"
                    sx={{
                        width: '100%',
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        borderColor:
                            snackbar.severity === 'error'
                                ? alpha(theme.palette.error.main, 0.28)
                                : alpha(theme.palette.primary.main, 0.2),
                    }}
                    elevation={6}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProductsPage;
