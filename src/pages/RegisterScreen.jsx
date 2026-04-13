import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Link,
    Paper,
    TextField,
    Typography,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { PersonAdd, Visibility, VisibilityOff } from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import { corporateColors } from '../theme/tokens';

const RegisterScreen = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        defaultValues: {
            nombre: '',
            apellido: '',
            iniciales: '',
            webhookBitrix: '',
            contrasena: '',
        },
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            await axios.post(`${CONFIG.uri}/register`, {
                nombre: data.nombre,
                apellido: data.apellido,
                es_lider: false,
                iniciales: data.iniciales,
                webhook_bitrix: data.webhookBitrix,
                contrasena: data.contrasena,
            });

            setSuccessMessage('Usuario registrado exitosamente');
            reset();

            setTimeout(() => {
                navigate('/login');
            }, 1800);
        } catch (error) {
            if (error.response) {
                setErrorMessage(error.response.data.detail || 'Error al registrar usuario');
            } else if (error.request) {
                setErrorMessage('No se pudo conectar con el servidor');
            } else {
                setErrorMessage('Error al procesar la solicitud');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                background: `linear-gradient(180deg, ${alpha(corporateColors.brand, 0.08)} 0%, ${theme.palette.background.default} 280px)`,
                py: 6,
            }}
        >
            <Container maxWidth="md">
                <Paper
                    elevation={0}
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            p: { xs: 3, md: 4.5 },
                            backgroundColor: alpha(corporateColors.brand, 0.04),
                            borderRight: { md: `1px solid ${theme.palette.divider}` },
                        }}
                    >
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: 2.5,
                                bgcolor: alpha(corporateColors.primary, 0.10),
                                color: corporateColors.primary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2,
                            }}
                        >
                            <PersonAdd />
                        </Box>
                        <Typography variant="h4">Crear cuenta</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.7 }}>
                            Registra un usuario nuevo con acceso al entorno corporativo y configura su webhook de integración con Bitrix.
                        </Typography>

                        <Box sx={{ mt: 4, display: 'grid', gap: 1.5 }}>
                            {[
                                'Credenciales de acceso unificadas',
                                'Configuración personal de integración',
                                'Alta consistente dentro del sistema',
                            ].map((item) => (
                                <Box
                                    key={item}
                                    sx={{
                                        px: 1.5,
                                        py: 1.25,
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {item}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ p: { xs: 3, md: 4.5 } }}>
                        {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}
                        {errorMessage && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}

                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Box sx={{ display: 'grid', gap: 2.25 }}>
                                <Controller
                                    name="nombre"
                                    control={control}
                                    rules={{
                                        required: 'El nombre es obligatorio',
                                        minLength: { value: 2, message: 'El nombre debe tener al menos 2 caracteres' },
                                    }}
                                    render={({ field }) => (
                                        <TextField {...field} label="Nombre" fullWidth error={!!errors.nombre} helperText={errors.nombre?.message} />
                                    )}
                                />

                                <Controller
                                    name="apellido"
                                    control={control}
                                    rules={{
                                        required: 'El apellido es obligatorio',
                                        minLength: { value: 2, message: 'El apellido debe tener al menos 2 caracteres' },
                                    }}
                                    render={({ field }) => (
                                        <TextField {...field} label="Apellido" fullWidth error={!!errors.apellido} helperText={errors.apellido?.message} />
                                    )}
                                />

                                <Controller
                                    name="iniciales"
                                    control={control}
                                    rules={{
                                        required: 'Las iniciales son obligatorias',
                                        pattern: {
                                            value: /^[A-Z]{2,4}$/,
                                            message: 'Las iniciales deben ser 2-4 letras mayúsculas',
                                        },
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Iniciales"
                                            placeholder="Ej: JD"
                                            fullWidth
                                            error={!!errors.iniciales}
                                            helperText={errors.iniciales?.message || 'Será el usuario de ingreso'}
                                            inputProps={{ style: { textTransform: 'uppercase' } }}
                                            onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                                        />
                                    )}
                                />

                                <Controller
                                    name="webhookBitrix"
                                    control={control}
                                    rules={{
                                        required: 'El webhook de Bitrix es obligatorio',
                                        pattern: {
                                            value: /^https?:\/\/.+/,
                                            message: 'Debe ser una URL válida',
                                        },
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Webhook de Bitrix"
                                            placeholder="https://..."
                                            fullWidth
                                            error={!!errors.webhookBitrix}
                                            helperText={errors.webhookBitrix?.message}
                                        />
                                    )}
                                />

                                <Controller
                                    name="contrasena"
                                    control={control}
                                    rules={{
                                        required: 'La contraseña es obligatoria',
                                        minLength: { value: 6, message: 'La contraseña debe tener al menos 6 caracteres' },
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Contraseña"
                                            type={showPassword ? 'text' : 'password'}
                                            fullWidth
                                            error={!!errors.contrasena}
                                            helperText={errors.contrasena?.message}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    )}
                                />

                                <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 1 }}>
                                    {loading ? <CircularProgress size={22} sx={{ color: '#FFFFFF' }} /> : 'Registrar usuario'}
                                </Button>
                            </Box>
                        </form>

                        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                            ¿Ya tienes una cuenta?{' '}
                            <Link component="button" type="button" underline="hover" onClick={() => navigate('/login')} sx={{ fontWeight: 600 }}>
                                Iniciar sesión
                            </Link>
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default RegisterScreen;
