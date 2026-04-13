import { useContext, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    CheckCircle as CheckCircleIcon,
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    Description as DescriptionIcon,
    Download as DownloadIcon,
    Error as ErrorIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    FolderOpen as FolderOpenIcon,
    OpenInNew as OpenInNewIcon,
    PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import moment from 'moment';
import axios from 'axios';
import { save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';
import { corporateColors } from '../theme/tokens';

const MetricCard = ({ label, value, color }) => (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, height: '100%' }}>
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
            {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color }}>
            {value}
        </Typography>
    </Paper>
);

const InfoRow = ({ label, value, mono = false }) => {
    if (!value && value !== 0) return null;

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.9, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none', pb: 0 } }}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={600} align="right" sx={{ fontFamily: mono ? '"Roboto Mono", monospace' : 'inherit', fontSize: mono ? '0.8rem' : '0.8125rem' }}>
                {value}
            </Typography>
        </Box>
    );
};

const ReportGenerator = () => {
    const theme = useTheme();
    const { user } = useContext(MainContext);

    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [errors, setErrors] = useState([]);
    const [showErrors, setShowErrors] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [downloadDialog, setDownloadDialog] = useState({ open: false, filename: '', savedPath: '' });
    const [elapsedTime, setElapsedTime] = useState(0);

    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const listenerRegistered = useRef(false);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusConfig = (status) => {
        if (status === 'success') return { label: 'Listo', color: corporateColors.brand, background: alpha(corporateColors.accentTeal, 0.16) };
        if (status === 'error') return { label: 'Error', color: corporateColors.accentOrange, background: alpha(corporateColors.accentOrange, 0.14) };
        return { label: 'Pendiente', color: theme.palette.text.secondary, background: alpha(theme.palette.grey[500], 0.1) };
    };

    const getStatusIcon = (status) => {
        if (status === 'success') return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
        if (status === 'error') return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
        return <DescriptionIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
    };

    const handleDroppedFiles = async (filePaths) => {
        try {
            const processedFiles = await Promise.all(
                filePaths.map(async (filePath) => {
                    try {
                        const fileBuffer = await readFile(filePath);
                        const fileName = filePath.split(/[\\/]/).pop();
                        if (!fileName.match(/\.(xlsx|xls|xlsm)$/i)) return null;

                        const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                        return {
                            file,
                            id: `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            name: fileName,
                            size: (file.size / 1024).toFixed(2),
                            status: 'pending',
                        };
                    } catch (error) {
                        console.error('Error procesando archivo:', error);
                        return null;
                    }
                })
            );

            const validFiles = processedFiles.filter(Boolean);
            if (validFiles.length > 0) setFiles((prev) => [...prev, ...validFiles]);
            if (validFiles.length < filePaths.length) alert('Algunos archivos fueron ignorados (solo se permiten archivos Excel)');
        } catch (error) {
            console.error('Error al procesar archivos arrastrados:', error);
            alert('Error al procesar los archivos arrastrados');
        }
    };

    useEffect(() => {
        if (listenerRegistered.current) return;
        listenerRegistered.current = true;
        let unlistenFn;

        const setupDragDrop = async () => {
            const appWindow = getCurrentWebviewWindow();
            return appWindow.onDragDropEvent(async (event) => {
                if (event.payload.type === 'drop') await handleDroppedFiles(event.payload.paths);
            });
        };

        setupDragDrop().then((fn) => {
            unlistenFn = fn;
        });

        return () => {
            if (unlistenFn) unlistenFn();
        };
    }, []);

    useEffect(() => {
        if (processing) {
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [processing]);

    const handleFileChange = (event) => {
        const selectedFiles = Array.from(event.target.files);
        const excelFiles = selectedFiles.filter((file) => file.name.match(/\.(xlsx|xls|xlsm)$/i));

        if (excelFiles.length !== selectedFiles.length) {
            alert('Solo se permiten archivos Excel (.xlsx, .xls, .xlsm)');
        }

        setFiles((prev) => [
            ...prev,
            ...excelFiles.map((file) => ({
                file,
                id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: file.name,
                size: (file.size / 1024).toFixed(2),
                status: 'pending',
            })),
        ]);
    };

    const handleRemoveFile = (fileId) => setFiles((prev) => prev.filter((file) => file.id !== fileId));

    const handleClearAll = () => {
        setFiles([]);
        setResult(null);
        setErrors([]);
        setDownloadUrl(null);
        setProgress(0);
        setElapsedTime(0);
    };

    const onSubmit = async () => {
        if (files.length === 0) {
            alert('Por favor, selecciona al menos un archivo');
            return;
        }

        setProcessing(true);
        setProgress(0);
        setErrors([]);
        setResult(null);
        setDownloadUrl(null);
        setElapsedTime(0);

        try {
            const formData = new FormData();
            files.forEach((fileObj) => formData.append('files', fileObj.file));

            const response = await axios.post(`${CONFIG.uri}/reports/generate`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                },
            });

            const data = response.data;
            setErrors(data.errors || []);
            setResult({
                success: data.success,
                processedFiles: data.processed_files,
                totalFiles: data.processed_files + data.files_with_errors,
                errors: data.files_with_errors,
                totalRecords: data.total_records,
                filename: data.filename,
                timestamp: data.timestamp,
                processingTime: data.processing_time,
                reportId: data.report_id,
            });
            setDownloadUrl(data.download_url);

            setFiles((prev) =>
                prev.map((fileObj) => ({
                    ...fileObj,
                    status: data.errors.find((errorItem) => errorItem.file === fileObj.name) ? 'error' : 'success',
                }))
            );

            setProgress(100);
        } catch (error) {
            console.error('Error al procesar archivos:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Error al procesar los archivos';
            setResult({ success: false, error: errorMessage });
            if (error.response?.data?.errors) setErrors(error.response.data.errors);
        } finally {
            setProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!downloadUrl) {
            alert('No hay URL de descarga disponible');
            return;
        }

        try {
            const response = await tauriFetch(downloadUrl);
            const blob = await response.blob();
            const fileName = result.filename || 'reporte.xlsx';
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

    const handleCloseDownloadDialog = () => setDownloadDialog({ open: false, filename: '', savedPath: '' });
    const handleOpenFile = async () => { try { await openPath(downloadDialog.savedPath); } catch (error) { console.error('Error abriendo archivo:', error); } };
    const handleShowInFolder = async () => { try { await revealItemInDir(downloadDialog.savedPath); } catch (error) { console.error('Error mostrando carpeta:', error); } };

    const totalFiles = files.length;
    const pendingFiles = files.filter((file) => file.status === 'pending').length;
    const successFiles = files.filter((file) => file.status === 'success').length;
    const errorFiles = files.filter((file) => file.status === 'error').length;

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 }, gap: 2.5, overflow: 'hidden', boxSizing: 'border-box' }}>
            <Box sx={{ flexShrink: 0 }}>
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                    Generar reporte
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Carga y procesa archivos Excel para generar reportes consolidados
                </Typography>
            </Box>

            <Grid container spacing={2} flexShrink={0}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard label="En cola" value={totalFiles} color={theme.palette.primary.main} /></Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard label="Pendientes" value={pendingFiles} color={theme.palette.warning.dark} /></Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard label="Procesados" value={successFiles} color={theme.palette.success.main} /></Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard label="Con error" value={errorFiles} color={theme.palette.error.main} /></Grid>
            </Grid>

            <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                <Grid size={{ xs: 12, lg: 4 }} sx={{ minHeight: 0 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                            <Typography variant="subtitle2" fontWeight={700}>Carga de archivos</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                Usa arrastrar y soltar o selección manual.
                            </Typography>
                        </Box>

                        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minHeight: 0 }}>
                            <Box
                                component="label"
                                sx={{
                                    border: '1.5px dashed',
                                    borderColor: alpha(theme.palette.primary.main, 0.35),
                                    borderRadius: 2,
                                    px: 2.5,
                                    py: 4,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                                    '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.06) },
                                }}
                            >
                                <input type="file" multiple accept=".xlsx,.xls,.xlsm" onChange={handleFileChange} style={{ display: 'none' }} />
                                <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1.25 }} />
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
                                    Soltar archivos aquí
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto', lineHeight: 1.6 }}>
                                    También puedes hacer clic para buscar archivos `.xlsx`, `.xls` o `.xlsm`.
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                                <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={onSubmit} disabled={files.length === 0 || processing} fullWidth sx={{ py: 1.15, fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                                    {processing ? `${progress < 100 ? 'Subiendo' : 'Procesando'} ${progress < 100 ? `${progress}%` : formatTime(elapsedTime)}` : 'Procesar archivos'}
                                </Button>
                                <Button variant="outlined" onClick={handleClearAll} disabled={files.length === 0 || processing} sx={{ py: 1.15, fontWeight: 600, textTransform: 'none', borderRadius: 1.5, minWidth: 120 }}>
                                    Limpiar
                                </Button>
                            </Stack>

                            <Divider />

                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle2" fontWeight={700}>Archivos seleccionados</Typography>
                                <Chip label={`${files.length} total`} size="small" sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }} />
                            </Box>

                            <Stack spacing={1} sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
                                {files.length === 0 ? (
                                    <Box sx={{ flexGrow: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: alpha(theme.palette.grey[500], 0.02) }}>
                                        <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 260, lineHeight: 1.6 }}>
                                            Aún no hay archivos cargados. El lote aparecerá aquí con su estado individual.
                                        </Typography>
                                    </Box>
                                ) : (
                                    files.map((fileObj) => {
                                        const status = getStatusConfig(fileObj.status);

                                        return (
                                            <Box key={fileObj.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper' }}>
                                                <Box sx={{ flexShrink: 0 }}>{getStatusIcon(fileObj.status)}</Box>
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={600} noWrap>{fileObj.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{fileObj.size} KB</Typography>
                                                </Box>
                                                <Chip label={status.label} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1, color: status.color, bgcolor: status.background }} />
                                                <IconButton size="small" onClick={() => handleRemoveFile(fileObj.id)} disabled={processing} sx={{ color: 'error.main', flexShrink: 0 }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        );
                                    })
                                )}
                            </Stack>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }} sx={{ minHeight: 0 }}>
                    <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
                        {processing && (
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                                <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.grey[500], 0.02), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="subtitle2" fontWeight={700}>Estado del procesamiento</Typography>
                                    <Typography variant="body2" fontWeight={700} color="primary.main">{progress < 100 ? `${progress}%` : formatTime(elapsedTime)}</Typography>
                                </Box>
                                <Box sx={{ p: 2.5 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                                        {progress < 100 ? 'Subiendo lote al servidor...' : 'Procesando estructura y consolidando registros...'}
                                    </Typography>
                                    <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 999 }} />
                                </Box>
                            </Paper>
                        )}

                        {result && result.success && (
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.25), borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                                <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: alpha(theme.palette.success.main, 0.18), bgcolor: alpha(theme.palette.success.main, 0.04), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'success.dark' }}>
                                            Reporte generado correctamente
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                                            {moment(result.timestamp).format('DD/MM/YYYY HH:mm')}
                                        </Typography>
                                    </Box>
                                    <Chip label={errors.length > 0 ? 'Resultado parcial' : 'Resultado limpio'} size="small" sx={{ height: 24, fontSize: '0.72rem', fontWeight: 700, color: errors.length > 0 ? corporateColors.warning : corporateColors.brand, bgcolor: errors.length > 0 ? alpha(corporateColors.warning, 0.16) : alpha(corporateColors.accentTeal, 0.16) }} />
                                </Box>

                                <Box sx={{ p: 2.5 }}>
                                    <Grid container spacing={2} sx={{ mb: 2.5 }}>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard label="Archivos" value={`${result.processedFiles} / ${result.totalFiles}`} color={theme.palette.text.primary} /></Grid>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard label="Registros" value={result.totalRecords} color={theme.palette.primary.main} /></Grid>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><MetricCard label="Tiempo" value={`${result.processingTime}s`} color={theme.palette.success.main} /></Grid>
                                        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, height: '100%' }}>
                                                <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                                                    ID reporte
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} sx={{ mt: 1, fontFamily: '"Roboto Mono", monospace', fontSize: '0.78rem' }}>
                                                    {result.reportId}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>

                                    {user?.es_lider && (
                                        <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload} sx={{ py: 1.15, px: 2.5, fontWeight: 600, textTransform: 'none', borderRadius: 1.5, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>
                                            Descargar reporte
                                        </Button>
                                    )}
                                </Box>
                            </Paper>
                        )}

                        {errors.length > 0 && (
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.24), borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                                <Box sx={{ px: 2.5, py: 1.75, borderBottom: showErrors ? '1px solid' : 'none', borderColor: alpha(theme.palette.warning.main, 0.18), bgcolor: alpha(theme.palette.warning.main, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowErrors(!showErrors)}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: theme.palette.warning.dark }}>
                                            Archivos con observaciones
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                                            {errors.length} archivo(s) no pudieron consolidarse correctamente.
                                        </Typography>
                                    </Box>
                                    <IconButton size="small">
                                        {showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                </Box>

                                <Collapse in={showErrors}>
                                    <Box sx={{ p: 2.5 }}>
                                        <Stack spacing={1.25}>
                                            {errors.map((error, index) => (
                                                <Box key={index} sx={{ p: 1.5, border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.22), borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.03) }}>
                                                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{error.file}</Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.6 }}>
                                                        {error.error}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Collapse>
                            </Paper>
                        )}

                        {result && !result.success && (
                            <Alert severity="error" sx={{ borderRadius: 2, alignItems: 'flex-start', flexShrink: 0 }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                                    Error al procesar los archivos
                                </Typography>
                                <Typography variant="body2">{result.error}</Typography>
                            </Alert>
                        )}

                        {!processing && !result && (
                            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.grey[500], 0.02)} 100%)` }}>
                                <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
                                    <DescriptionIcon sx={{ fontSize: 42, color: 'text.disabled', mb: 1.5 }} />
                                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                                        Listo para consolidar
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                                        Carga uno o varios archivos Excel y ejecuta el proceso. Aquí verás el progreso, el resumen del resultado y los errores detectados por archivo.
                                    </Typography>
                                </Box>
                            </Paper>
                        )}
                    </Stack>
                </Grid>
            </Grid>

            <Dialog open={downloadDialog.open} onClose={handleCloseDownloadDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
                <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Archivo guardado</Typography>
                            <Typography variant="body2" color="text.secondary">El reporte se descargó correctamente.</Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <Divider />

                <DialogContent sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.03) }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <DescriptionIcon sx={{ fontSize: 32, color: 'success.main', mr: 1.5 }} />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-all' }}>
                                        {downloadDialog.filename}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        Archivo Excel
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Guardado en
                            </Typography>
                            <Box sx={{ p: 1.25, bgcolor: alpha(theme.palette.grey[500], 0.04), border: '1px solid', borderColor: 'divider', borderRadius: 1.5, fontFamily: '"Roboto Mono", monospace', fontSize: '12px', color: 'text.secondary', wordBreak: 'break-all' }}>
                                {downloadDialog.savedPath}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 2.5, gap: 1 }}>
                    <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleShowInFolder} fullWidth sx={{ py: 1, fontWeight: 600, textTransform: 'none', borderRadius: 1.5 }}>
                        Mostrar en carpeta
                    </Button>
                    <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={handleOpenFile} fullWidth sx={{ py: 1, fontWeight: 600, textTransform: 'none', borderRadius: 1.5 }}>
                        Abrir archivo
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReportGenerator;
