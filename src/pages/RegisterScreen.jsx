import React, { useState } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    FormControlLabel,
    Switch,
    IconButton,
    InputAdornment,
    Alert,
    CircularProgress,
    Container
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';

const RegisterScreen = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        defaultValues: {
            nombre: '',
            apellido: '',
            esLider: false,
            iniciales: '',
            webhookBitrix: '',
            contrasena: ''
        }
    });

    const onSubmit = async (data) => {
        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {

            const response = await axios.post(`${CONFIG.uri}/register`, {
                nombre: data.nombre,
                apellido: data.apellido,
                es_lider: data.esLider,
                iniciales: data.iniciales,
                webhook_bitrix: data.webhookBitrix,
                contrasena: data.contrasena
            });

            setSuccessMessage('Usuario registrado exitosamente');
            reset();


            setTimeout(() => {
                navigate('/login');
            }, 2000);

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
                backgroundColor: '#f5f5f5',
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
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        backgroundColor: '#ffffff'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                        <PersonAdd
                            sx={{
                                fontSize: 48,
                                color: '#0070f2',
                                mb: 2
                            }}
                        />
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 500,
                                color: '#32363a',
                                fontFamily: '"72", "72full", Arial, Helvetica, sans-serif'
                            }}
                        >
                            Registro de Usuario
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#6a6d70',
                                mt: 1,
                                fontFamily: '"72", "72full", Arial, Helvetica, sans-serif'
                            }}
                        >
                            Complete el formulario para crear una nueva cuenta
                        </Typography>
                    </Box>

                    {/* Mensajes de éxito o error */}
                    {successMessage && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {successMessage}
                        </Alert>
                    )}

                    {errorMessage && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {errorMessage}
                        </Alert>
                    )}

                    {/* Formulario */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {/* Nombre */}
                            <Controller
                                name="nombre"
                                control={control}
                                rules={{
                                    required: 'El nombre es obligatorio',
                                    minLength: {
                                        value: 2,
                                        message: 'El nombre debe tener al menos 2 caracteres'
                                    }
                                }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Nombre"
                                        variant="outlined"
                                        fullWidth
                                        error={!!errors.nombre}
                                        helperText={errors.nombre?.message}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#0070f2'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#0070f2'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />

                            {/* Apellido */}
                            <Controller
                                name="apellido"
                                control={control}
                                rules={{
                                    required: 'El apellido es obligatorio',
                                    minLength: {
                                        value: 2,
                                        message: 'El apellido debe tener al menos 2 caracteres'
                                    }
                                }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Apellido"
                                        variant="outlined"
                                        fullWidth
                                        error={!!errors.apellido}
                                        helperText={errors.apellido?.message}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#0070f2'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#0070f2'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />

                            {/* Iniciales (Username) */}
                            <Controller
                                name="iniciales"
                                control={control}
                                rules={{
                                    required: 'Las iniciales son obligatorias',
                                    pattern: {
                                        value: /^[A-Z]{2,4}$/,
                                        message: 'Las iniciales deben ser 2-4 letras mayúsculas'
                                    }
                                }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Iniciales (Username)"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="Ej: JD, ABC"
                                        error={!!errors.iniciales}
                                        helperText={errors.iniciales?.message || 'Será tu usuario de ingreso'}
                                        inputProps={{ style: { textTransform: 'uppercase' } }}
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#0070f2'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#0070f2'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />

                            {/* Webhook de Bitrix */}
                            <Controller
                                name="webhookBitrix"
                                control={control}
                                rules={{
                                    required: 'El webhook de Bitrix es obligatorio',
                                    pattern: {
                                        value: /^https?:\/\/.+/,
                                        message: 'Debe ser una URL válida'
                                    }
                                }}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Webhook de Bitrix"
                                        variant="outlined"
                                        fullWidth
                                        placeholder="https://..."
                                        error={!!errors.webhookBitrix}
                                        helperText={errors.webhookBitrix?.message}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: '#0070f2'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#0070f2'
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
                                                    borderColor: '#0070f2'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#0070f2'
                                                }
                                            }
                                        }}
                                    />
                                )}
                            />


                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={loading}
                                sx={{
                                    mt: 2,
                                    py: 1.5,
                                    backgroundColor: '#0070f2',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    fontFamily: '"72", "72full", Arial, Helvetica, sans-serif',
                                    '&:hover': {
                                        backgroundColor: '#0064d9'
                                    },
                                    '&:disabled': {
                                        backgroundColor: '#e0e0e0'
                                    }
                                }}
                            >
                                {loading ? (
                                    <CircularProgress size={24} sx={{ color: '#fff' }} />
                                ) : (
                                    'Registrar Usuario'
                                )}
                            </Button>
                        </Box>
                    </form>

                    {/* Footer */}
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#6a6d70',
                                fontFamily: '"72", "72full", Arial, Helvetica, sans-serif'
                            }}
                        >
                            ¿Ya tienes una cuenta?{' '}
                            <Button
                                sx={{
                                    textTransform: 'none',
                                    color: '#0070f2',
                                    fontWeight: 500,
                                    p: 0,
                                    minWidth: 'auto',
                                    '&:hover': {
                                        backgroundColor: 'transparent',
                                        textDecoration: 'underline'
                                    }
                                }}
                                onClick={() => {
                                    navigate('/login');
                                }}
                            >
                                Iniciar Sesión
                            </Button>
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default RegisterScreen;