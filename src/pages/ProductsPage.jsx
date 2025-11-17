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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Inventory as InventoryIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon,
    FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';

const ProductsPage = () => {
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

    // Debounce para búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(0); // Reset a la primera página al buscar
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
            reset({
                code: '',
                name_excel: '',
                name_bitrix: '',
                unidad_negocio: '',
                area1: '',
                area2: '',
            });
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
                // Actualizar producto existente
                await axios.put(`${CONFIG.uri}/products/${editingProduct._id}`, data);
                showSnackbar('Producto actualizado exitosamente', 'success');
            } else {
                // Crear nuevo producto
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
        loadProducts();

    };
    const renderSkeletonRows = () => {
        return Array.from(new Array(rowsPerPage)).map((_, index) => (
            <TableRow key={index}>
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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 2 }}>
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




            {/* Toolbar de acciones - Estilo SAP Fiori */}
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
                        placeholder="Buscar productos..."
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

            {/* Tabla de productos - Estilo SAP Fiori */}
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
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Nombre Excel</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Nombre Bitrix</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Unidad de Negocio</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Fab. Deal</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>Fab. Cot</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {initialLoading ? (
                                renderSkeletonRows()
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            {searchTerm || filterActivo !== 'all'
                                                ? 'No se encontraron productos'
                                                : 'No hay productos registrados'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {searchTerm || filterActivo !== 'all'
                                                ? 'Intenta ajustar los filtros de búsqueda'
                                                : 'Comienza creando un nuevo producto'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow
                                        key={product._id}
                                        hover
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                        onClick={() => handleOpenDialog(product)}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {product.code}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {product.name_excel || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {product.name_bitrix || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {product.unidad_negocio || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {product.area1 || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {product.area2 || '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Divider />

                <TablePagination
                    rowsPerPageOptions={[5, 15, 25, 50, 100]}
                    component="div"
                    count={totalProducts}
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

            {/* Diálogo de crear/editar producto */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                TransitionComponent={Fade}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" fontWeight={400}>
                            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
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
                            <Grid size={{ xs: 12 }} sm={6}>
                                <Controller
                                    name="code"
                                    control={control}
                                    rules={{ required: 'El ID es requerido' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="ID"
                                            fullWidth
                                            size="small"
                                            error={!!errors.code}
                                            helperText={errors.code?.message}
                                            disabled={!!editingProduct}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }} sm={6}>
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
                                    onClick={() => {
                                        handleCloseDialog();
                                        handleOpenDeleteDialog(editingProduct);
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
                                {editingProduct ? 'Actualizar' : 'Crear'}
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
                        ¿Estás seguro de que deseas eliminar el producto{' '}
                        <strong>{productToDelete?.code}</strong>?
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

export default ProductsPage;