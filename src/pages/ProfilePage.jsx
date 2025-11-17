import { useState, useEffect, useContext } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
} from '@mui/material';
import {
    Save as SaveIcon,
    Cancel as CancelIcon,
    Visibility,
    VisibilityOff,
    Lock as LockIcon,
    Star,
} from '@mui/icons-material';
import { MainContext } from '../contexts/MainContext';
import moment from 'moment';

const ProfilePage = () => {
    const { user, setUser } = useContext(MainContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        iniciales: '',
        webhook_bitrix: '',
    });
    const [passwordData, setPasswordData] = useState({
        contrasena_actual: '',
        contrasena_nueva: '',
        confirmar_contrasena: '',
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                nombre: user.nombre || '',
                apellido: user.apellido || '',
                iniciales: user.iniciales || '',
                webhook_bitrix: user.webhook_bitrix || '',
            });
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch(`http://localhost:8000/api/perfil/${user._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Error al actualizar perfil');
            }
            const updatedUser = data.usuario;
            setUser(updatedUser);
            localStorage.setItem('usuario', JSON.stringify(updatedUser));
            setSuccess('Perfil actualizado exitosamente');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        setError('');
        setSuccess('');
        if (!passwordData.contrasena_actual || !passwordData.contrasena_nueva || !passwordData.confirmar_contrasena) {
            setError('Todos los campos de contraseña son obligatorios');
            return;
        }

        if (passwordData.contrasena_nueva.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (passwordData.contrasena_nueva !== passwordData.confirmar_contrasena) {
            setError('Las contraseñas nuevas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`http://localhost:8000/api/perfil/${user._id}/cambiar-contrasena`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contrasena_actual: passwordData.contrasena_actual,
                    contrasena_nueva: passwordData.contrasena_nueva,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Error al cambiar contraseña');
            }

            setSuccess('Contraseña cambiada exitosamente');
            setOpenPasswordDialog(false);
            setPasswordData({
                contrasena_actual: '',
                contrasena_nueva: '',
                confirmar_contrasena: '',
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelPasswordChange = () => {
        setOpenPasswordDialog(false);
        setPasswordData({
            contrasena_actual: '',
            contrasena_nueva: '',
            confirmar_contrasena: '',
        });
        setError('');
    };

    if (!user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        Mi Perfil
                    </Typography>
                    {user.es_lider && (
                        <Chip
                            icon={<Star sx={{ fontSize: 18 }} />}
                            label="Líder"
                            sx={{
                                backgroundColor: '#ffd700',
                                color: '#000',
                                fontWeight: 600,
                            }}
                        />
                    )}
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                {/* Información de solo lectura */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                        Información de la Cuenta
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Rol"
                                value={user.es_lider ? 'Líder' : 'Usuario'}
                                InputProps={{
                                    readOnly: true,
                                }}
                                disabled
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                label="Fecha de Creación"
                                value={user.fecha_creacion ? (new Date(user.fecha_creacion).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })) : moment(user.fecha_creacion).format('LLL')}
                                InputProps={{
                                    readOnly: true,
                                }}
                                disabled
                            />
                        </Grid>
                    </Grid>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                        Datos Personales
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                label="Nombre"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleInputChange}
                                required
                                inputProps={{ minLength: 2, maxLength: 100 }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                label="Apellido"
                                name="apellido"
                                value={formData.apellido}
                                onChange={handleInputChange}
                                required
                                inputProps={{ minLength: 2, maxLength: 100 }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                fullWidth
                                label="Iniciales"
                                name="iniciales"
                                value={formData.iniciales}
                                onChange={handleInputChange}
                                required
                                inputProps={{
                                    minLength: 2,
                                    maxLength: 4,
                                    style: { textTransform: 'uppercase' }
                                }}
                                helperText="2-4 letras mayúsculas (ej: JPS)"
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Webhook Bitrix"
                                name="webhook_bitrix"
                                value={formData.webhook_bitrix}
                                onChange={handleInputChange}
                                required
                                helperText="URL completa del webhook de Bitrix24"
                            />
                        </Grid>
                    </Grid>
                </Box>

                {/* Botones de acción */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mb: 3 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={() => {
                            setFormData({
                                nombre: user.nombre || '',
                                apellido: user.apellido || '',
                                iniciales: user.iniciales || '',
                                webhook_bitrix: user.webhook_bitrix || '',
                            });
                            setError('');
                            setSuccess('');
                        }}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={handleUpdateProfile}
                        disabled={loading}
                    >
                        Guardar Cambios
                    </Button>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Sección de seguridad */}
                <Box>
                    <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                        Seguridad
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        onClick={() => setOpenPasswordDialog(true)}
                        fullWidth
                        sx={{ justifyContent: 'flex-start' }}
                    >
                        Cambiar Contraseña
                    </Button>
                </Box>
            </Paper>

            {/* Dialog para cambiar contraseña */}
            <Dialog open={openPasswordDialog} onClose={handleCancelPasswordChange} maxWidth="sm" fullWidth>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        label="Contraseña Actual"
                        name="contrasena_actual"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.contrasena_actual}
                        onChange={handlePasswordInputChange}
                        sx={{ mt: 2, mb: 2 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        edge="end"
                                    >
                                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Nueva Contraseña"
                        name="contrasena_nueva"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.contrasena_nueva}
                        onChange={handlePasswordInputChange}
                        sx={{ mb: 2 }}
                        helperText="Mínimo 6 caracteres"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        edge="end"
                                    >
                                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Confirmar Nueva Contraseña"
                        name="confirmar_contrasena"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmar_contrasena}
                        onChange={handlePasswordInputChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        edge="end"
                                    >
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={handleCancelPasswordChange} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleChangePassword}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
                    >
                        Cambiar Contraseña
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProfilePage;