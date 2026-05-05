import { useState, useEffect, useContext } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Add,
    Delete,
    Edit,
    ExpandLess,
    ExpandMore,
    Layers,
    TableChart,
} from '@mui/icons-material';
import axios from 'axios';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';

const CAMPOS_CONOCIDOS = [
    { value: 'numDeal', label: 'Número de Deal' },
    { value: 'preparado', label: 'Preparado por (Principal)' },
    { value: 'responsable', label: 'Responsable (Principal)' },
    { value: 'vistoBueno', label: 'Visto Bueno' },
    { value: 'rubrica', label: 'Rúbrica' },
    { value: 'utilidad', label: 'Utilidad' },
    { value: 'preparado_unau', label: 'Preparado UNAU' },
    { value: 'preparado_unva', label: 'Preparado UNVA' },
    { value: 'preparado_unai', label: 'Preparado UNAI' },
    { value: 'preparado_unap', label: 'Preparado UNAP' },
    { value: 'preparado_unepc', label: 'Preparado UNEPC' },
    { value: 'preparado_pic', label: 'Preparado PIC' },
    { value: 'preparado_pau', label: 'Preparado PAU' },
    { value: 'responsable_unau', label: 'Responsable UNAU' },
    { value: 'responsable_unva', label: 'Responsable UNVA' },
    { value: 'responsable_unai', label: 'Responsable UNAI' },
    { value: 'responsable_unap', label: 'Responsable UNAP' },
    { value: 'responsable_unepc', label: 'Responsable UNEPC' },
    { value: 'responsable_pic', label: 'Responsable PIC' },
    { value: 'responsable_pau', label: 'Responsable PAU' },
];

const HOJAS = ['Datos', 'Oferta', 'Resumen'];

const emptyCampo = {
    campo_interno: '',
    nombre_display: '',
    hoja: 'Datos',
    fila: '',
    columna: '',
};

const emptyVersion = { nombre: '', descripcion: '' };

export default function TemplateVersionsPage() {
    const theme = useTheme();
    const { user } = useContext(MainContext);

    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    // Version dialog
    const [versionDialog, setVersionDialog] = useState({ open: false, editing: null });
    const [versionForm, setVersionForm] = useState(emptyVersion);
    const [versionSaving, setVersionSaving] = useState(false);

    // Campo dialog
    const [campoDialog, setCampoDialog] = useState({ open: false, versionId: null, editIndex: null });
    const [campoForm, setCampoForm] = useState(emptyCampo);
    const [campoSaving, setCampoSaving] = useState(false);

    // Delete confirmations
    const [deleteVersionId, setDeleteVersionId] = useState(null);
    const [deleteCampo, setDeleteCampo] = useState(null);

    const showAlert = (severity, message) => {
        setAlert({ severity, message });
        setTimeout(() => setAlert(null), 4000);
    };

    const loadVersions = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${CONFIG.uri}/template-versions`);
            setVersions(res.data.versiones || []);
        } catch {
            showAlert('error', 'Error al cargar versiones de plantilla');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadVersions(); }, []);

    // ── Version CRUD ────────────────────────────────────────────────────────────

    const openCreateVersion = () => {
        setVersionForm(emptyVersion);
        setVersionDialog({ open: true, editing: null });
    };

    const openEditVersion = (v) => {
        setVersionForm({ nombre: v.nombre, descripcion: v.descripcion || '' });
        setVersionDialog({ open: true, editing: v });
    };

    const handleSaveVersion = async () => {
        if (!versionForm.nombre.trim()) return;
        setVersionSaving(true);
        try {
            if (versionDialog.editing) {
                await axios.put(
                    `${CONFIG.uri}/template-versions/${versionDialog.editing._id}`,
                    { nombre: versionForm.nombre, descripcion: versionForm.descripcion || null },
                    { params: { usuario_id: user._id } }
                );
                showAlert('success', 'Versión actualizada');
            } else {
                await axios.post(
                    `${CONFIG.uri}/template-versions`,
                    { nombre: versionForm.nombre, descripcion: versionForm.descripcion || null, campos: [] },
                    { params: { usuario_id: user._id } }
                );
                showAlert('success', 'Versión creada');
            }
            setVersionDialog({ open: false, editing: null });
            loadVersions();
        } catch (err) {
            showAlert('error', err.response?.data?.detail || 'Error al guardar versión');
        } finally {
            setVersionSaving(false);
        }
    };

    const handleToggleActivo = async (v) => {
        try {
            await axios.put(
                `${CONFIG.uri}/template-versions/${v._id}`,
                { activo: !v.activo },
                { params: { usuario_id: user._id } }
            );
            loadVersions();
        } catch (err) {
            showAlert('error', err.response?.data?.detail || 'Error al cambiar estado');
        }
    };

    const handleDeleteVersion = async () => {
        if (!deleteVersionId) return;
        try {
            await axios.delete(
                `${CONFIG.uri}/template-versions/${deleteVersionId}`,
                { params: { usuario_id: user._id } }
            );
            showAlert('success', 'Versión eliminada');
            setDeleteVersionId(null);
            loadVersions();
        } catch (err) {
            showAlert('error', err.response?.data?.detail || 'Error al eliminar versión');
        }
    };

    // ── Campo CRUD ───────────────────────────────────────────────────────────────

    const openAddCampo = (versionId) => {
        setCampoForm(emptyCampo);
        setCampoDialog({ open: true, versionId, editIndex: null });
    };

    const openEditCampo = (versionId, index, campo) => {
        setCampoForm({ ...campo });
        setCampoDialog({ open: true, versionId, editIndex: index });
    };

    const handleSaveCampo = async () => {
        const { versionId, editIndex } = campoDialog;
        const version = versions.find(v => v._id === versionId);
        if (!version) return;

        if (!campoForm.campo_interno || !campoForm.nombre_display || !campoForm.fila || !campoForm.columna) return;

        const newCampo = {
            campo_interno: campoForm.campo_interno,
            nombre_display: campoForm.nombre_display,
            hoja: campoForm.hoja,
            fila: parseInt(campoForm.fila),
            columna: parseInt(campoForm.columna),
        };

        const campos = [...version.campos];
        if (editIndex !== null) {
            campos[editIndex] = newCampo;
        } else {
            campos.push(newCampo);
        }

        setCampoSaving(true);
        try {
            await axios.put(
                `${CONFIG.uri}/template-versions/${versionId}`,
                { campos },
                { params: { usuario_id: user._id } }
            );
            showAlert('success', editIndex !== null ? 'Campo actualizado' : 'Campo agregado');
            setCampoDialog({ open: false, versionId: null, editIndex: null });
            loadVersions();
        } catch (err) {
            showAlert('error', err.response?.data?.detail || 'Error al guardar campo');
        } finally {
            setCampoSaving(false);
        }
    };

    const handleDeleteCampo = async () => {
        if (!deleteCampo) return;
        const { versionId, index } = deleteCampo;
        const version = versions.find(v => v._id === versionId);
        if (!version) return;

        const campos = version.campos.filter((_, i) => i !== index);
        try {
            await axios.put(
                `${CONFIG.uri}/template-versions/${versionId}`,
                { campos },
                { params: { usuario_id: user._id } }
            );
            showAlert('success', 'Campo eliminado');
            setDeleteCampo(null);
            loadVersions();
        } catch (err) {
            showAlert('error', err.response?.data?.detail || 'Error al eliminar campo');
        }
    };

    const handleCampoInternoChange = (value) => {
        const known = CAMPOS_CONOCIDOS.find(c => c.value === value);
        setCampoForm(prev => ({
            ...prev,
            campo_interno: value,
            nombre_display: known ? known.label : prev.nombre_display,
        }));
    };

    if (!user?.es_lider) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <Alert severity="warning">Solo los usuarios líderes pueden acceder a esta sección.</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Layers sx={{ color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                            Versiones de Plantilla
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Configura los campos de cada versión del Excel
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={openCreateVersion}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
                >
                    Nueva versión
                </Button>
            </Box>

            {alert && (
                <Alert severity={alert.severity} sx={{ mb: 2, borderRadius: 1.5 }} onClose={() => setAlert(null)}>
                    {alert.message}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : versions.length === 0 ? (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 5, textAlign: 'center' }}>
                    <Layers sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>Sin versiones</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Crea la primera versión de plantilla para empezar a configurar los campos del Excel.
                    </Typography>
                    <Button variant="outlined" startIcon={<Add />} onClick={openCreateVersion} sx={{ borderRadius: 1.5, textTransform: 'none' }}>
                        Crear versión
                    </Button>
                </Paper>
            ) : (
                <Stack spacing={1.5}>
                    {versions.map(version => {
                        const isExpanded = expandedId === version._id;
                        return (
                            <Paper
                                key={version._id}
                                elevation={0}
                                sx={{ border: '1px solid', borderColor: isExpanded ? 'primary.main' : 'divider', borderRadius: 2, overflow: 'hidden', transition: 'border-color 0.15s' }}
                            >
                                {/* Version header */}
                                <Box
                                    sx={{
                                        px: 2.5, py: 1.75,
                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                        bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.03) : alpha(theme.palette.grey[500], 0.02),
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
                                    }}
                                    onClick={() => setExpandedId(isExpanded ? null : version._id)}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                                                {version.nombre}
                                            </Typography>
                                            <Chip
                                                label={version.activo ? 'Activo' : 'Inactivo'}
                                                size="small"
                                                color={version.activo ? 'success' : 'default'}
                                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                            />
                                            <Chip
                                                label={`${version.campos.length} campo${version.campos.length !== 1 ? 's' : ''}`}
                                                size="small"
                                                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}
                                            />
                                        </Box>
                                        {version.descripcion && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8rem' }}>
                                                {version.descripcion}
                                            </Typography>
                                        )}
                                    </Box>

                                    <Stack direction="row" spacing={0.5} onClick={e => e.stopPropagation()}>
                                        <Tooltip title={version.activo ? 'Desactivar' : 'Activar'}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color={version.activo ? 'warning' : 'success'}
                                                onClick={() => handleToggleActivo(version)}
                                                sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', minWidth: 80 }}
                                            >
                                                {version.activo ? 'Desactivar' : 'Activar'}
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="Editar nombre">
                                            <IconButton size="small" onClick={() => openEditVersion(version)} sx={{ borderRadius: 1.5 }}>
                                                <Edit sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar versión">
                                            <IconButton size="small" onClick={() => setDeleteVersionId(version._id)} sx={{ borderRadius: 1.5, color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) } }}>
                                                <Delete sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>

                                    <IconButton size="small" sx={{ color: 'text.disabled', ml: 0.5 }}>
                                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                </Box>

                                {/* Campos table */}
                                {isExpanded && (
                                    <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                                        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha(theme.palette.grey[500], 0.01) }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TableChart sx={{ fontSize: 14, color: 'text.disabled' }} />
                                                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', fontSize: '0.65rem' }}>
                                                    Campos configurados
                                                </Typography>
                                            </Box>
                                            <Button
                                                size="small"
                                                startIcon={<Add sx={{ fontSize: 14 }} />}
                                                onClick={() => openAddCampo(version._id)}
                                                sx={{ borderRadius: 1.5, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                                            >
                                                Agregar campo
                                            </Button>
                                        </Box>

                                        {version.campos.length === 0 ? (
                                            <Box sx={{ py: 3, textAlign: 'center' }}>
                                                <Typography variant="body2" color="text.disabled">
                                                    Sin campos configurados. Agrega el primer campo.
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            {['Campo interno', 'Etiqueta', 'Hoja', 'Fila', 'Col', ''].map(h => (
                                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', py: 1.25, bgcolor: alpha(theme.palette.grey[500], 0.02), borderBottom: '2px solid', borderBottomColor: 'divider' }}>
                                                                    {h}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {version.campos.map((campo, idx) => (
                                                            <TableRow key={idx} hover>
                                                                <TableCell>
                                                                    <Typography variant="caption" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem', color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.06), px: 0.75, py: 0.25, borderRadius: 0.75 }}>
                                                                        {campo.campo_interno}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{campo.nombre_display}</Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip label={campo.hoja} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }} />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem' }}>{campo.fila}</Typography>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Typography variant="body2" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: '0.8rem' }}>{campo.columna}</Typography>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ pr: 1.5 }}>
                                                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                        <IconButton size="small" onClick={() => openEditCampo(version._id, idx, campo)} sx={{ borderRadius: 1 }}>
                                                                            <Edit sx={{ fontSize: 14 }} />
                                                                        </IconButton>
                                                                        <IconButton size="small" onClick={() => setDeleteCampo({ versionId: version._id, index: idx })} sx={{ borderRadius: 1, color: 'error.main', '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) } }}>
                                                                            <Delete sx={{ fontSize: 14 }} />
                                                                        </IconButton>
                                                                    </Stack>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </Box>
                                )}
                            </Paper>
                        );
                    })}
                </Stack>
            )}

            {/* ── Dialog: Create / Edit Version ───────────────────────────────────── */}
            <Dialog
                open={versionDialog.open}
                onClose={() => setVersionDialog({ open: false, editing: null })}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    {versionDialog.editing ? 'Editar versión' : 'Nueva versión de plantilla'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <TextField
                            label="Nombre de la versión"
                            value={versionForm.nombre}
                            onChange={e => setVersionForm(p => ({ ...p, nombre: e.target.value }))}
                            fullWidth
                            size="small"
                            required
                            placeholder="ej. v1.0, Versión 2024"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                        <TextField
                            label="Descripción (opcional)"
                            value={versionForm.descripcion}
                            onChange={e => setVersionForm(p => ({ ...p, descripcion: e.target.value }))}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setVersionDialog({ open: false, editing: null })} sx={{ textTransform: 'none', borderRadius: 1.5 }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveVersion}
                        disabled={versionSaving || !versionForm.nombre.trim()}
                        sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}
                    >
                        {versionSaving ? <CircularProgress size={16} color="inherit" /> : versionDialog.editing ? 'Guardar' : 'Crear'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Dialog: Add / Edit Campo ─────────────────────────────────────────── */}
            <Dialog
                open={campoDialog.open}
                onClose={() => setCampoDialog({ open: false, versionId: null, editIndex: null })}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
                    {campoDialog.editIndex !== null ? 'Editar campo' : 'Agregar campo'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.25 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Campo interno *</InputLabel>
                                <Select
                                    value={campoForm.campo_interno}
                                    onChange={e => handleCampoInternoChange(e.target.value)}
                                    label="Campo interno *"
                                    sx={{ borderRadius: 1.5 }}
                                >
                                    {CAMPOS_CONOCIDOS.map(c => (
                                        <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Etiqueta para mostrar *"
                                value={campoForm.nombre_display}
                                onChange={e => setCampoForm(p => ({ ...p, nombre_display: e.target.value }))}
                                fullWidth
                                size="small"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Hoja *</InputLabel>
                                <Select
                                    value={campoForm.hoja}
                                    onChange={e => setCampoForm(p => ({ ...p, hoja: e.target.value }))}
                                    label="Hoja *"
                                    sx={{ borderRadius: 1.5 }}
                                >
                                    {HOJAS.map(h => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField
                                label="Fila *"
                                type="number"
                                value={campoForm.fila}
                                onChange={e => setCampoForm(p => ({ ...p, fila: e.target.value }))}
                                fullWidth
                                size="small"
                                inputProps={{ min: 1 }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 4 }}>
                            <TextField
                                label="Columna *"
                                type="number"
                                value={campoForm.columna}
                                onChange={e => setCampoForm(p => ({ ...p, columna: e.target.value }))}
                                fullWidth
                                size="small"
                                inputProps={{ min: 1 }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setCampoDialog({ open: false, versionId: null, editIndex: null })} sx={{ textTransform: 'none', borderRadius: 1.5 }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveCampo}
                        disabled={campoSaving || !campoForm.campo_interno || !campoForm.nombre_display || !campoForm.fila || !campoForm.columna}
                        sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}
                    >
                        {campoSaving ? <CircularProgress size={16} color="inherit" /> : campoDialog.editIndex !== null ? 'Guardar' : 'Agregar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Dialog: Confirm delete version ──────────────────────────────────── */}
            <Dialog
                open={Boolean(deleteVersionId)}
                onClose={() => setDeleteVersionId(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Eliminar versión</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Esta acción es irreversible. Se eliminará la versión y todos sus campos configurados.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDeleteVersionId(null)} sx={{ textTransform: 'none', borderRadius: 1.5 }}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteVersion} sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Dialog: Confirm delete campo ────────────────────────────────────── */}
            <Dialog
                open={Boolean(deleteCampo)}
                onClose={() => setDeleteCampo(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2.5 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Eliminar campo</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        ¿Confirmas que deseas eliminar este campo de la versión?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDeleteCampo(null)} sx={{ textTransform: 'none', borderRadius: 1.5 }}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteCampo} sx={{ textTransform: 'none', borderRadius: 1.5, boxShadow: 'none' }}>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
