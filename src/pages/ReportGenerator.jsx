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

const ReportGenerator = () => {
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
                return <CheckCircleIcon sx={{ color: fioriTheme.palette.success.main, fontSize: 20 }} />;
            case 'error':
                return <ErrorIcon sx={{ color: fioriTheme.palette.error.main, fontSize: 20 }} />;
            default:
                return <DescriptionIcon sx={{ color: '#666', fontSize: 20 }} />;
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: fioriTheme.palette.background.default,
            py: 4,
        }}>
            <Container>
                {/* Header */}
                <Box sx={{ mb: 4 }}>

                    <Typography
                        variant="body1"
                        sx={{
                            color: '#6B7280',
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
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                bgcolor: '#FFFFFF',
                                height: '100%',
                            }}
                        >
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    mb: 2,
                                    color: '#1F2937',
                                    fontSize: '16px',
                                }}
                            >
                                Seleccionar Archivos
                            </Typography>

                            {/* Zona de carga */}
                            <Box
                                sx={{
                                    border: '2px dashed #D1D5DB',
                                    borderRadius: '8px',
                                    p: 3,
                                    textAlign: 'center',
                                    bgcolor: '#F9FAFB',
                                    mb: 3,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        borderColor: fioriTheme.palette.primary.main,
                                        bgcolor: '#F3F8FF',
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
                                        color: fioriTheme.palette.primary.main,
                                        mb: 1,
                                    }}
                                />
                                <Typography
                                    variant="subtitle2"
                                    sx={{
                                        fontWeight: 600,
                                        color: '#1F2937',
                                        mb: 0.5,
                                    }}
                                >
                                    Arrastra archivos aquí
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: '#6B7280' }}
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
                                                color: '#1F2937',
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
                                                    bgcolor: '#F9FAFB',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '6px',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        bgcolor: '#F3F8FF',
                                                        borderColor: fioriTheme.palette.primary.main,
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
                                                                color: '#1F2937',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {fileObj.name}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: '#9CA3AF' }}
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
                                                        color: fioriTheme.palette.error.main,
                                                        '&:hover': {
                                                            bgcolor: 'error.50',
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
                                        bgcolor: fioriTheme.palette.primary.main,
                                        '&:hover': {
                                            bgcolor: '#0552B1',
                                        },
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
                                        borderColor: '#D1D5DB',
                                        color: '#6B7280',
                                        '&:hover': {
                                            borderColor: '#9CA3AF',
                                            bgcolor: '#F9FAFB',
                                        },
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
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '8px',
                                        bgcolor: '#FFFFFF',
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
                                                color: '#1F2937',
                                            }}
                                        >
                                            {progress < 100 ? 'Subiendo archivos..' : 'Procesando archivos..'}
                                        </Typography>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{
                                                fontWeight: 600,
                                                color: fioriTheme.palette.primary.main,
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
                                            borderRadius: '4px',
                                            bgcolor: '#E5E7EB',
                                            mb: 2,
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: '4px',
                                                bgcolor: fioriTheme.palette.primary.main,
                                            },
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
                                        border: '1px solid #D1E7DD',
                                        borderRadius: '8px',
                                        bgcolor: '#F1F8F5',
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
                                                color: fioriTheme.palette.success.main,
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
                                                    color: fioriTheme.palette.success.main,
                                                }}
                                            >
                                                Procesamiento completado exitosamente
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{ color: '#4B5563', display: 'block', mt: 0.5 }}
                                            >
                                                {moment(result.timestamp).format('DD/MM/YYYY HH:mm')}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 2, borderColor: '#D1E7DD' }} />

                                    {/* Estadísticas */}
                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid size={{ xs: 6 }}>
                                            <Box>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: '#6B7280',
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
                                                        color: fioriTheme.palette.success.main,
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
                                                        color: '#6B7280',
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
                                                        color: fioriTheme.palette.primary.main,
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
                                                        color: '#6B7280',
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
                                                        color: '#1F2937',
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
                                                        color: '#6B7280',
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
                                                        color: '#4B5563',
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
                                                    bgcolor: fioriTheme.palette.success.main,
                                                    '&:hover': {
                                                        bgcolor: '#096B31',
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
                                        border: '1px solid #FEDCD2',
                                        borderRadius: '8px',
                                        bgcolor: '#FEF6F5',
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
                                                    color: fioriTheme.palette.warning.main,
                                                    mr: 1.5,
                                                    fontSize: 22,
                                                }}
                                            />
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: '#1F2937',
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
                                        <Divider sx={{ borderColor: '#FEDCD2' }} />
                                        <Box sx={{ p: 2.5 }}>
                                            <Stack spacing={1.5}>
                                                {errors.map((error, index) => (
                                                    <Box
                                                        key={index}
                                                        sx={{
                                                            p: 1.5,
                                                            bgcolor: '#FFFFFF',
                                                            border: '1px solid #FEDCD2',
                                                            borderRadius: '6px',
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 600,
                                                                color: '#1F2937',
                                                                mb: 0.5,
                                                            }}
                                                        >
                                                            {error.file}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ color: '#6B7280' }}
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
                                        border: '1px solid #F9C8C8',
                                        borderRadius: '8px',
                                        bgcolor: '#FEF2F2',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                        <ErrorIcon
                                            sx={{
                                                color: fioriTheme.palette.error.main,
                                                mr: 1.5,
                                                mt: 0.25,
                                            }}
                                        />
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: fioriTheme.palette.error.main,
                                                    mb: 0.5,
                                                }}
                                            >
                                                Error al procesar los archivos
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: '#6B7280' }}
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
                            {/* Información del archivo */}
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

                            {/* Ubicación */}
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

export default ReportGenerator;