import React, { useState } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    IconButton,
    InputAdornment,
    Alert,
    CircularProgress,
    Container,
    FormControlLabel,
    Checkbox,
    Divider,
    useTheme
} from '@mui/material';
import { Visibility, VisibilityOff, Login, LockOpen } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

const LoginScreen = () => {
    const theme = useTheme();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const {
        control,
        handleSubmit,
        formState: { errors }
    } = useForm({
        defaultValues: {
            iniciales: '',
            contrasena: '',
            recordarme: false
        }
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await axios.post(`${CONFIG.uri}/login`, {
                iniciales: data.iniciales,
                contrasena: data.contrasena
            });
            localStorage.setItem('usuario', JSON.stringify(response.data));
            navigate('/');
        } catch (error) {
            console.log(error)
            if (error.response) {
                if (error.response.status === 401) {
                    setErrorMessage('Usuario o contraseña incorrectos');
                } else {
                    setErrorMessage(error.response.data.detail || 'Error al iniciar sesión');
                }
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
                backgroundColor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        backgroundColor: 'background.paper'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                        <LockOpen
                            sx={{
                                fontSize: 48,
                                color: 'primary.main',
                                mb: 2
                            }}
                        />
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 500,
                                color: 'text.primary',
                            }}
                        >
                            Iniciar Sesión
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                                mt: 1,
                            }}
                        >
                            Ingresa tus credenciales para acceder
                        </Typography>
                    </Box>

                    {/* Mensaje de error */}
                    {errorMessage && (
                        <Alert
                            severity="error"
                            sx={{ mb: 3 }}
                            onClose={() => setErrorMessage('')}
                        >
                            {errorMessage}
                        </Alert>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {/* Iniciales (Username) */}
                            <Controller
                                name="iniciales"
                                control={control}
                                rules={{
                                    required: 'Las iniciales son obligatorias',
                                    minLength: {
                                        value: 2,
                                        message: 'Las iniciales deben tener al menos 2 caracteres'
                                    }
                                }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Iniciales (Usuario)"
                                        variant="outlined"
                                        fullWidth
                                        autoFocus
                                        placeholder="Ej: JD, ABC"
                                        error={!!errors.iniciales}
                                        helperText={errors.iniciales?.message}
                                        inputProps={{ style: { textTransform: 'uppercase' } }}
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: 'primary.main'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: 'primary.main'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />

                            {/* Contraseña */}
                            <Controller
                                name="contrasena"
                                control={control}
                                rules={{
                                    required: 'La contraseña es obligatoria',
                                    minLength: {
                                        value: 6,
                                        message: 'La contraseña debe tener al menos 6 caracteres'
                                    }
                                }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Contraseña"
                                        type={showPassword ? 'text' : 'password'}
                                        variant="outlined"
                                        fullWidth
                                        error={!!errors.contrasena}
                                        helperText={errors.contrasena?.message}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                    >
                                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: 'primary.main'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: 'primary.main'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />

                            {/* Recordarme y Olvidé contraseña */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mt: -1
                                }}
                            >
                                <Controller
                                    name="recordarme"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    {...field}
                                                    checked={field.value}
                                                    sx={{
                                                        color: 'text.secondary',
                                                        '&.Mui-checked': {
                                                            color: 'primary.main'
                                                        }
                                                    }}
                                                />
                                            }
                                            label={
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: 'text.primary'
                                                    }}
                                                >
                                                    Recordarme
                                                </Typography>
                                            }
                                        />
                                    )}
                                />

                                <Button
                                    sx={{
                                        textTransform: 'none',
                                        color: 'primary.main',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        p: 0,
                                        minWidth: 'auto',
                                        '&:hover': {
                                            backgroundColor: 'transparent',
                                            textDecoration: 'underline'
                                        }
                                    }}
                                    onClick={() => {
                                        // Redirigir a recuperar contraseña
                                        // window.location.href = '/recuperar-contrasena';
                                        alert('Funcionalidad de recuperar contraseña próximamente');
                                    }}
                                >
                                    ¿Olvidaste tu contraseña?
                                </Button>
                            </Box>

                            {/* Botón de Login */}
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={loading}
                                startIcon={!loading && <Login />}
                                sx={{
                                    mt: 1,
                                    py: 1.5,
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    '&:disabled': {
                                        backgroundColor: 'action.disabledBackground'
                                    }
                                }}
                            >
                                {loading ? (
                                    <CircularProgress size={24} sx={{ color: theme.palette.mode === 'dark' ? 'primary.main' : '#fff' }} />
                                ) : (
                                    'Iniciar Sesión'
                                )}
                            </Button>
                        </Box>
                    </form>

                    {/* Divider */}
                    <Divider sx={{ my: 3 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            o
                        </Typography>
                    </Divider>

                    {/* Footer - Registro */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            ¿No tienes una cuenta?{' '}
                            <Button
                                sx={{
                                    textTransform: 'none',
                                    color: 'primary.main',
                                    fontWeight: 500,
                                    p: 0,
                                    minWidth: 'auto',
                                    '&:hover': {
                                        backgroundColor: 'transparent',
                                        textDecoration: 'underline'
                                    }
                                }}
                                onClick={() => {
                                    navigate('/register');
                                }}
                            >
                                Registrarse
                            </Button>
                        </Typography>
                    </Box>

                    {/* Footer adicional */}
                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.disabled',
                            }}
                        >
                            Al iniciar sesión, aceptas nuestros términos de servicio y política de privacidad
                        </Typography>
                    </Box>
                </Paper>

                {/* Información adicional */}
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        ¿Necesitas ayuda?{' '}
                        <Button
                            sx={{
                                textTransform: 'none',
                                color: 'primary.main',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                p: 0,
                                minWidth: 'auto',
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    textDecoration: 'underline'
                                }
                            }}
                            onClick={() => {
                                // Abrir soporte o ayuda
                                window.open('mailto:soporte@tuempresa.com', '_blank');
                            }}
                        >
                            Contactar soporte
                        </Button>
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default LoginScreen;