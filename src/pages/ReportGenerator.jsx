import { useContext, useState, useEffect, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    LinearProgress,
    IconButton,
    Divider,
    Stack,
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Container,
    useTheme,
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Description as DescriptionIcon,
    PlayArrow as PlayArrowIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    FolderOpen as FolderOpenIcon,
    Close as CloseIcon,
    OpenInNew as OpenInNewIcon,
    Info as InfoIcon,
    Timer as TimerIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import moment from 'moment';
import axios from 'axios';
import { save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';


const ReportGenerator = () => {
    const theme = useTheme();
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const { user } = useContext(MainContext);
    const [result, setResult] = useState(null);
    const [errors, setErrors] = useState([]);
    const [showErrors, setShowErrors] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [downloadDialog, setDownloadDialog] = useState({
        open: false,
        filename: '',
        savedPath: '',
    });

    // Estados para el contador de tiempo
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    const listenerRegistered = useRef(false);
    const handleDroppedFiles = async (filePaths) => {
        try {
            const processedFiles = await Promise.all(
                filePaths.map(async (filePath) => {
                    try {
                        const fileBuffer = await readFile(filePath);
                        const fileName = filePath.split(/[\\/]/).pop();

                        if (!fileName.match(/\.(xlsx|xls|xlsm)$/i)) {
                            console.warn(`Archivo ignorado: ${fileName}`);
                            return null;
                        }

                        const blob = new Blob([fileBuffer], {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });
                        const file = new File([blob], fileName, {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        });

                        return {
                            file,
                            id: `${fileName}-${Date.now()}`,
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

            const validFiles = processedFiles.filter(f => f !== null);
            if (validFiles.length > 0) {
                setFiles((prev) => [...prev, ...validFiles]);
            }

            if (validFiles.length < filePaths.length) {
                alert('Algunos archivos fueron ignorados (solo se permiten archivos Excel)');
            }
        } catch (error) {
            console.error('Error al procesar archivos arrastrados:', error);
            alert('Error al procesar los archivos arrastrados');
        }
    };

    // useEffect para el drag and drop
    useEffect(() => {
        if (listenerRegistered.current) {
            return;
        }
        listenerRegistered.current = true;
        let unlistenFn;
        const setupDragDrop = async () => {
            const appWindow = getCurrentWebviewWindow();

            const unlisten = await appWindow.onDragDropEvent(async (event) => {
                if (event.payload.type === 'drop') {
                    await handleDroppedFiles(event.payload.paths);
                }
            });

            return unlisten;
        };

        setupDragDrop().then(fn => {
            unlistenFn = fn;
        });

        return () => {
            if (unlistenFn) unlistenFn();
        };
    }, []);

    // Efecto para el contador de tiempo
    useEffect(() => {
        if (processing) {
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setElapsedTime(elapsed);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [processing]);

    // Función para formatear el tiempo
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Manejo de archivos seleccionados
    const handleFileChange = (event) => {
        const selectedFiles = Array.from(event.target.files);
        const excelFiles = selectedFiles.filter((file) =>
            file.name.match(/\.(xlsx|xls|xlsm)$/i)
        );

        if (excelFiles.length !== selectedFiles.length) {
            alert('Solo se permiten archivos Excel (.xlsx, .xls, .xlsm)');
        }

        const newFiles = excelFiles.map((file) => ({
            file,
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            size: (file.size / 1024).toFixed(2),
            status: 'pending',
        }));

        setFiles((prev) => [...prev, ...newFiles]);
    };

    // Eliminar archivo de la lista
    const handleRemoveFile = (fileId) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    // Limpiar todo
    const handleClearAll = () => {
        setFiles([]);
        setResult(null);
        setErrors([]);
        setDownloadUrl(null);
        setProgress(0);
        setElapsedTime(0);
    };

    // INTEGRACIÓN CON LA API DE FASTAPI
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
            files.forEach((fileObj) => {
                formData.append('files', fileObj.file);
            });

            const response = await axios.post(
                `${CONFIG.uri}/reports/generate`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        setProgress(percentCompleted);
                    },
                }
            );

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
                prev.map((f) => ({
                    ...f,
                    status: data.errors.find((e) => e.file === f.name)
                        ? 'error'
                        : 'success',
                }))
            );

            setProgress(100);

        } catch (error) {
            console.error('Error al procesar archivos:', error);

            const errorMessage = error.response?.data?.detail
                || error.message
                || 'Error al procesar los archivos';

            setResult({
                success: false,
                error: errorMessage,
            });

            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
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
    };

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

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />;
            case 'error':
                return <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />;
            default:
                return <DescriptionIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />;
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            py: 4,
        }}>
            <Container>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            color: 'text.secondary',
                            fontSize: '14px',
                        }}
                    >
                        Carga y procesa archivos Excel para generar reportes consolidados
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {/* Panel de carga - Izquierda */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                height: '100%',
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    mb: 2,
                                    color: 'text.primary',
                                    fontSize: '16px',
                                }}
                            >
                                Seleccionar Archivos
                            </Typography>

                            {/* Zona de carga */}
                            <Box
                                sx={{
                                    border: '2px dashed',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    p: 3,
                                    textAlign: 'center',
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                    mb: 3,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.08)' : '#F3F8FF',
                                    },
                                }}
                                component="label"
                            >
                                <input
                                    type="file"
                                    multiple
                                    accept=".xlsx,.xls,.xlsm"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                <CloudUploadIcon
                                    sx={{
                                        fontSize: 48,
                                        color: 'primary.main',
                                        mb: 1,
                                    }}
                                />
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        mb: 0.5,
                                    }}
                                >
                                    Arrastra archivos aquí
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary' }}
                                >
                                    O haz clic para seleccionar (Excel: .xlsx, .xls, .xlsm)
                                </Typography>
                            </Box>
                            {files.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 2,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 600,
                                                color: 'text.primary',
                                            }}
                                        >
                                            {files.length} archivo(s) seleccionado(s)
                                        </Typography>
                                    </Box>

                                    <Stack spacing={1} maxHeight="300px" overflow="auto">
                                        {files.map((fileObj) => (
                                            <Box
                                                key={fileObj.id}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    p: 1.5,
                                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                                                    border: 1,
                                                    borderColor: 'divider',
                                                    borderRadius: 1.5,
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.08)' : '#F3F8FF',
                                                        borderColor: 'primary.main',
                                                    },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                    {getStatusIcon(fileObj.status)}
                                                    <Box sx={{ ml: 1.5, flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                color: 'text.primary',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {fileObj.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: 'text.secondary' }}
                                                        >
                                                            {fileObj.size} KB
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveFile(fileObj.id)}
                                                    disabled={processing}
                                                    sx={{
                                                        ml: 1,
                                                        color: 'error.main',
                                                        '&:hover': {
                                                            bgcolor: 'error.light',
                                                        },
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {/* Botones de acción */}
                            <Stack spacing={2} mt={4}>
                                <Button
                                    variant="contained"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={onSubmit}
                                    disabled={files.length === 0 || processing}
                                    fullWidth
                                    sx={{
                                        py: 1.2,
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        textTransform: 'none',
                                    }}
                                >
                                    {processing ? `${progress < 100 ? 'Subiendo..' : 'Procesando..'}... ${progress < 100 && progress || formatTime(elapsedTime)} ${progress < 100 ? '%' : 's'}` : 'Procesar Archivos'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleClearAll}
                                    disabled={files.length === 0 || processing}
                                    fullWidth
                                    sx={{
                                        py: 1.2,
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        textTransform: 'none',
                                    }}
                                >
                                    Limpiar Todo
                                </Button>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Panel de resultados - Derecha */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Stack spacing={3}>
                            {/* Barra de progreso con tiempo */}
                            {processing && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        border: 1,
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            mb: 1.5,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 600,
                                                color: 'text.primary',
                                            }}
                                        >
                                            {progress < 100 ? 'Subiendo archivos..' : 'Procesando archivos..'}
                                        </Typography>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 600,
                                                color: 'primary.main',
                                            }}
                                        >
                                            {
                                                progress < 100 ? `${progress}%` : `${formatTime(elapsedTime)}s`
                                            }
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={progress}
                                        sx={{
                                            height: 8,
                                            borderRadius: 1,
                                            mb: 2,
                                        }}
                                    />
                                </Paper>
                            )}

                            {/* Resumen exitoso */}
                            {result && result.success && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        border: 1,
                                        borderColor: theme.palette.mode === 'dark' ? 'success.dark' : '#D1E7DD',
                                        borderRadius: 2,
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(16, 126, 62, 0.08)' : '#F1F8F5',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            mb: 2,
                                        }}
                                    >
                                        <CheckCircleIcon
                                            sx={{
                                                color: 'success.main',
                                                fontSize: 24,
                                                mr: 1.5,
                                                mt: 0.5,
                                            }}
                                        />
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'success.main',
                                                }}
                                            >
                                                Procesamiento completado exitosamente
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                                            >
                                                {moment(result.timestamp).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Estadísticas */}
                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid size={{ xs: 6 }}>
                                            <Box>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        display: 'block',
                                                        mb: 0.5,
                                                    }}
                                                >
                                                    Archivos procesados
                                                </Typography>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: 'success.main',
                                                    }}
                                                >
                                                    {result.processedFiles} / {result.totalFiles}
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
                                                    }}
                                                >
                                                    Registros totales
                                                </Typography>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: 'primary.main',
                                                    }}
                                                >
                                                    {result.totalRecords}
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
                                                    }}
                                                >
                                                    Tiempo de procesamiento
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: 'text.primary',
                                                    }}
                                                >
                                                    {result.processingTime}s
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
                                                    }}
                                                >
                                                    ID del Reporte
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        color: 'text.secondary',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    {result.reportId}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    {/* Botón de descarga */}
                                    {
                                        user && user.es_lider && (
                                            <Button
                                                variant="contained"
                                                startIcon={<DownloadIcon />}
                                                onClick={handleDownload}
                                                fullWidth
                                                sx={{
                                                    py: 1.2,
                                                    fontWeight: 600,
                                                    fontSize: '14px',
                                                    textTransform: 'none',
                                                    bgcolor: 'success.main',
                                                    '&:hover': {
                                                        bgcolor: 'success.dark',
                                                    },
                                                }}
                                            >
                                                Descargar Reporte
                                            </Button>
                                        )
                                    }
                                </Paper>
                            )}

                            {/* Errores */}
                            {errors.length > 0 && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        border: 1,
                                        borderColor: theme.palette.mode === 'dark' ? 'warning.dark' : '#FEDCD2',
                                        borderRadius: 2,
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(212, 136, 6, 0.08)' : '#FEF6F5',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            p: 2.5,
                                        }}
                                        onClick={() => setShowErrors(!showErrors)}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <ErrorIcon
                                                sx={{
                                                    color: 'warning.main',
                                                    mr: 1.5,
                                                    fontSize: 22,
                                                }}
                                            />
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {errors.length} archivo(s) con errores
                                            </Typography>
                                        </Box>
                                        <IconButton size="small">
                                            {showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>

                                    <Collapse in={showErrors}>
                                        <Divider />
                                        <Box sx={{ p: 2.5 }}>
                                            <Stack spacing={1.5}>
                                                {errors.map((error, index) => (
                                                    <Box
                                                        key={index}
                                                        sx={{
                                                            p: 1.5,
                                                            bgcolor: 'background.paper',
                                                            border: 1,
                                                            borderColor: theme.palette.mode === 'dark' ? 'warning.dark' : '#FEDCD2',
                                                            borderRadius: 1.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 600,
                                                                color: 'text.primary',
                                                                mb: 0.5,
                                                            }}
                                                        >
                                                            {error.file}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: 'text.secondary' }}
                                                        >
                                                            {error.error}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Box>
                                    </Collapse>
                                </Paper>
                            )}

                            {/* Error general */}
                            {result && !result.success && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        border: 1,
                                        borderColor: theme.palette.mode === 'dark' ? 'error.dark' : '#F9C8C8',
                                        borderRadius: 2,
                                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(179, 38, 30, 0.08)' : '#FEF2F2',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                        <ErrorIcon
                                            sx={{
                                                color: 'error.main',
                                                mr: 1.5,
                                                mt: 0.25,
                                            }}
                                        />
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'error.main',
                                                    mb: 0.5,
                                                }}
                                            >
                                                Error al procesar los archivos
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: 'text.secondary' }}
                                            >
                                                {result.error}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

                {/* Dialog de descarga */}
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
                            {/* Información del archivo */}
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

                            {/* Ubicación */}
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

export default ReportGenerator;