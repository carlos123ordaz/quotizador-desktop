import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Container,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { LockOpen, Login, Visibility, VisibilityOff } from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import { corporateColors } from '../theme/tokens';

const LoginScreen = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm({
        defaultValues: {
            iniciales: '',
            contrasena: '',
            recordarme: false,
        },
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await axios.post(`${CONFIG.uri}/login`, {
                iniciales: data.iniciales,
                contrasena: data.contrasena,
            });
            localStorage.setItem('usuario', JSON.stringify(response.data));
            navigate('/');
        } catch (error) {
            if (error.response) {
                setErrorMessage(error.response.status === 401 ? 'Usuario o contraseña incorrectos' : error.response.data.detail || 'Error al iniciar sesión');
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
            <Container maxWidth="sm">
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 3, md: 4.5 },
                            borderRadius: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            width: '100%',
                        }}
                    >
                        <Box sx={{ mb: 4 }}>
                            <Box
                                sx={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 2.5,
                                    bgcolor: alpha(corporateColors.primary, 0.1),
                                    color: corporateColors.primary,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 2,
                                }}
                            >
                                <LockOpen />
                            </Box>
                            <Typography variant="h4">Iniciar sesión</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Ingresa tus credenciales para acceder al sistema.
                            </Typography>
                        </Box>

                        {errorMessage && (
                            <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ mb: 3 }}>
                                {errorMessage}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                                <Controller
                                    name="iniciales"
                                    control={control}
                                    rules={{
                                        required: 'Las iniciales son obligatorias',
                                        minLength: { value: 2, message: 'Las iniciales deben tener al menos 2 caracteres' },
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Iniciales"
                                            placeholder="Ej: JD"
                                            fullWidth
                                            autoFocus
                                            error={!!errors.iniciales}
                                            helperText={errors.iniciales?.message}
                                            inputProps={{ style: { textTransform: 'uppercase' } }}
                                            onChange={(event) => field.onChange(event.target.value.toUpperCase())}
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

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                    <Controller
                                        name="recordarme"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControlLabel
                                                control={<Checkbox {...field} checked={field.value} />}
                                                label={<Typography variant="body2">Recordarme</Typography>}
                                            />
                                        )}
                                    />

                                    <Button
                                        variant="text"
                                        sx={{ px: 0 }}
                                        onClick={() => alert('Funcionalidad de recuperar contraseña próximamente')}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </Button>
                                </Box>

                                <Button type="submit" variant="contained" fullWidth size="large" startIcon={!loading && <Login />} disabled={loading}>
                                    {loading ? <CircularProgress size={22} sx={{ color: '#FFFFFF' }} /> : 'Iniciar sesión'}
                                </Button>
                            </Box>
                        </form>

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="body2" color="text.secondary">
                            ¿No tienes una cuenta?{' '}
                            <Link component="button" type="button" underline="hover" onClick={() => navigate('/register')} sx={{ fontWeight: 600 }}>
                                Registrarse
                            </Link>
                        </Typography>

                        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, lineHeight: 1.7 }}>
                            Al ingresar aceptas los lineamientos internos de uso del sistema y las políticas corporativas vigentes.
                        </Typography>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};

export default LoginScreen;
