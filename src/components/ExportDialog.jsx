import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Typography,
    Paper,
    Box,
    CircularProgress,
    Alert,
    IconButton,
    Divider,
    Stack,
    Chip,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Info as InfoIcon,
    Close as CloseIcon,
    Assessment as AssessmentIcon,
    Description as DescriptionIcon,
    Business as BusinessIcon,
    Inventory as InventoryIcon,
    CheckCircle as CheckCircleIcon,
    FolderOpen as FolderOpenIcon,
    OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import axios from 'axios';
import moment from 'moment';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
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

export const ExportDialog = ({ open, onClose }) => {
    // Estados principales
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);

    // Estado para el diálogo de descarga exitosa
    const [downloadDialog, setDownloadDialog] = useState({
        open: false,
        filename: '',
        savedPath: '',
    });

    // Inicializar fechas con rango de un mes al abrir el diálogo
    useEffect(() => {
        if (open) {
            const today = moment().add(1, 'day');
            const oneMonthAgo = moment().subtract(1, 'month');

            setFechaInicio(oneMonthAgo.format('YYYY-MM-DD'));
            setFechaFin(today.format('YYYY-MM-DD'));
            setDepartamento('');
        }
    }, [open]);

    // Cargar estadísticas cuando cambien las fechas
    useEffect(() => {
        if (open && (fechaInicio || fechaFin)) {
            loadStats();
        }
    }, [fechaInicio, fechaFin, open]);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const params = {};
            if (fechaInicio) params.fecha_inicio = fechaInicio;
            if (fechaFin) params.fecha_fin = fechaFin;

            const response = await axios.get(`${CONFIG.uri}/processed-excels/export/stats`, { params });
            setStats(response.data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            setStats(null);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const params = {};
            if (fechaInicio) params.fecha_inicio = fechaInicio;
            if (fechaFin) params.fecha_fin = fechaFin;
            if (departamento) params.departamento = departamento;



            // Usar axios en lugar de tauriFetch (igual que en ReportHistory pero adaptado)
            const response = await axios.get(`${CONFIG.uri}/processed-excels/export`, {
                params,
                responseType: 'blob'
            });

            const timestamp = moment().format('YYYYMMDD_HHmmss');
            const fileName = `consolidado_${timestamp}.xlsx`;

            // Convertir blob a arrayBuffer
            const blob = response.data;
            const arrayBuffer = await blob.arrayBuffer();

            // Abrir diálogo para guardar archivo
            const filePath = await save({
                defaultPath: fileName,
                filters: [{ name: 'Excel', extensions: ['xlsx'] }],
            });

            if (filePath) {
                await writeFile(filePath, new Uint8Array(arrayBuffer));

                // Cerrar diálogo de exportación
                onClose();

                // Mostrar diálogo de descarga exitosa
                setDownloadDialog({
                    open: true,
                    filename: fileName,
                    savedPath: filePath,
                });
            }
        } catch (error) {
            console.error('Error al exportar:', error);
            alert(`Error al exportar datos: ${error.message}`);
        } finally {
            setLoading(false);
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

    const handleReset = () => {
        const today = moment();
        const oneMonthAgo = moment().subtract(1, 'month');

        setFechaInicio(oneMonthAgo.format('YYYY-MM-DD'));
        setFechaFin(today.format('YYYY-MM-DD'));
        setDepartamento('');
    };

    return (
        <>
            {/* Diálogo de Exportación */}
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="md"
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
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <DownloadIcon
                            sx={{
                                color: fioriTheme.palette.primary.main,
                                mr: 1.5,
                                fontSize: 24,
                            }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1F2937' }}>
                            Exportar Datos Consolidados
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{ color: '#6B7280' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 2.5 }}>
                    <Stack spacing={3}>
                        {/* Información */}
                        <Alert
                            severity="info"
                            sx={{
                                borderRadius: '6px',
                                fontSize: '13px',
                                bgcolor: '#E0F2FE',
                                color: '#0369A1',
                                '& .MuiAlert-icon': {
                                    color: '#0369A1',
                                },
                            }}
                        >
                            Por defecto se exportará el último mes de datos. Ajusta los filtros según sea necesario.
                        </Alert>

                        {/* Filtros de Fecha */}
                        <Box>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: '#1F2937',
                                    fontWeight: 600,
                                    mb: 1.5,
                                }}
                            >
                                Rango de Fechas
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Fecha Inicio"
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '6px',
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
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField
                                        fullWidth
                                        label="Fecha Fin"
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '6px',
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
                            </Grid>
                        </Box>

                        {/* Filtro de Departamento */}
                        <Box>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: '#1F2937',
                                    fontWeight: 600,
                                    mb: 1.5,
                                }}
                            >
                                Filtros Adicionales
                            </Typography>
                            <FormControl fullWidth>
                                <InputLabel>Departamento (Opcional)</InputLabel>
                                <Select
                                    value={departamento}
                                    label="Departamento (Opcional)"
                                    onChange={(e) => setDepartamento(e.target.value)}
                                    sx={{
                                        borderRadius: '6px',
                                        '& fieldset': {
                                            borderColor: '#E5E7EB',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: '#D1D5DB',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: fioriTheme.palette.primary.main,
                                        },
                                    }}
                                >
                                    <MenuItem value="">Todos los departamentos</MenuItem>
                                    <MenuItem value="UN AU">UN AU</MenuItem>
                                    <MenuItem value="UN AI">UN AI</MenuItem>
                                    <MenuItem value="UN VA">UN VA</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Divider />

                        {/* Vista Previa de Estadísticas */}
                        {loadingStats && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                <CircularProgress size={40} sx={{ color: fioriTheme.palette.primary.main }} />
                            </Box>
                        )}

                        {stats && !loadingStats && (
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <InfoIcon
                                        sx={{
                                            color: fioriTheme.palette.primary.main,
                                            mr: 1,
                                            fontSize: 20,
                                        }}
                                    />
                                    <Typography
                                        variant="subtitle2"
                                        sx={{
                                            color: '#1F2937',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Vista Previa de Exportación
                                    </Typography>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '6px',
                                                bgcolor: '#F9FAFB',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <AssessmentIcon
                                                sx={{
                                                    fontSize: 24,
                                                    color: fioriTheme.palette.primary.main,
                                                    mb: 0.5,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: fioriTheme.palette.primary.main,
                                                }}
                                            >
                                                {stats.total_archivos}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: '#6B7280',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Archivos
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '6px',
                                                bgcolor: '#F9FAFB',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <InventoryIcon
                                                sx={{
                                                    fontSize: 24,
                                                    color: fioriTheme.palette.success.main,
                                                    mb: 0.5,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: fioriTheme.palette.success.main,
                                                }}
                                            >
                                                {stats.total_productos}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: '#6B7280',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Productos
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '6px',
                                                bgcolor: '#F9FAFB',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <DescriptionIcon
                                                sx={{
                                                    fontSize: 24,
                                                    color: fioriTheme.palette.warning.main,
                                                    mb: 0.5,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: fioriTheme.palette.warning.main,
                                                }}
                                            >
                                                {stats.deals_unicos}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: '#6B7280',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Deals
                                            </Typography>
                                        </Paper>
                                    </Grid>

                                    <Grid size={{ xs: 6, sm: 3 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '6px',
                                                bgcolor: '#F9FAFB',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <BusinessIcon
                                                sx={{
                                                    fontSize: 24,
                                                    color: '#8B5CF6',
                                                    mb: 0.5,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: '#8B5CF6',
                                                }}
                                            >
                                                {stats.clientes_unicos}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: '#6B7280',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Clientes
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                {/* Productos por Departamento */}
                                {stats.productos_por_departamento && Object.keys(stats.productos_por_departamento).length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: '#6B7280',
                                                fontWeight: 500,
                                                display: 'block',
                                                mb: 1,
                                            }}
                                        >
                                            Distribución por Departamento:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {Object.entries(stats.productos_por_departamento).map(([dept, count]) => (
                                                <Chip
                                                    key={dept}
                                                    label={`${dept}: ${count}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#E0F2FE',
                                                        color: '#0369A1',
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {stats && stats.total_archivos === 0 && !loadingStats && (
                            <Alert
                                severity="warning"
                                sx={{
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                }}
                            >
                                No se encontraron datos para exportar con los filtros seleccionados. Intenta ajustar el rango de fechas.
                            </Alert>
                        )}
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
                        onClick={handleReset}
                        variant="outlined"
                        disabled={loading}
                        sx={{
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
                        Restablecer
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button
                        onClick={onClose}
                        disabled={loading}
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
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                        onClick={handleExport}
                        disabled={loading || !stats || stats.total_archivos === 0}
                        sx={{
                            fontWeight: 600,
                            fontSize: '14px',
                            textTransform: 'none',
                            bgcolor: fioriTheme.palette.success.main,
                            '&:hover': {
                                bgcolor: '#096B31',
                            },
                            '&:disabled': {
                                bgcolor: '#E5E7EB',
                                color: '#9CA3AF',
                            },
                        }}
                    >
                        {loading ? 'Exportando...' : 'Exportar Excel'}
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
                                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
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
        </>
    );
};