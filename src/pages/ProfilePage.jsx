import { useContext, useEffect, useState } from 'react';
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
    Grid,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Cancel as CancelIcon,
    Lock as LockIcon,
    Save as SaveIcon,
    Star,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import moment from 'moment';
import { MainContext } from '../contexts/MainContext';
import { CONFIG } from '../config';
import { corporateColors } from '../theme/tokens';

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
        if (!user) return;
        setFormData({
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            iniciales: user.iniciales || '',
            webhook_bitrix: user.webhook_bitrix || '',
        });
    }, [user]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordInputChange = (event) => {
        const { name, value } = event.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${CONFIG.uri}/perfil/${user._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
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
            const response = await fetch(`${CONFIG.uri}/perfil/${user._id}/cambiar-contrasena`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    const handleReset = () => {
        if (!user) return;
        setFormData({
            nombre: user.nombre || '',
            apellido: user.apellido || '',
            iniciales: user.iniciales || '',
            webhook_bitrix: user.webhook_bitrix || '',
        });
        setError('');
        setSuccess('');
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
        <Box sx={{ p: { xs: 2, md: 3 }, display: 'grid', gap: 2.5 }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3.5 },
                    borderRadius: 3,
                    background: `linear-gradient(180deg, ${alpha(corporateColors.brand, 0.05)} 0%, rgba(255,255,255,0) 100%)`,
                }}
            >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                    <Box>
                        <Typography variant="h4">Mi perfil</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            Administra tu información personal, credenciales y configuración de integración.
                        </Typography>
                    </Box>
                    {user.es_lider && (
                        <Chip
                            icon={<Star sx={{ fontSize: 16 }} />}
                            label="Líder"
                            sx={{
                                backgroundColor: alpha(corporateColors.accentGold, 0.18),
                                color: corporateColors.brand,
                                fontWeight: 700,
                            }}
                        />
                    )}
                </Stack>
            </Paper>

            {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.10em', fontWeight: 700 }}>
                            Cuenta
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                            Resumen
                        </Typography>

                        <Box sx={{ mt: 3, display: 'grid', gap: 1.5 }}>
                            {[
                                { label: 'Rol', value: user.es_lider ? 'Líder' : 'Usuario' },
                                { label: 'Iniciales', value: user.iniciales },
                                {
                                    label: 'Fecha de creación',
                                    value: user.fecha_creacion
                                        ? new Date(user.fecha_creacion).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : moment(user.fecha_creacion).format('LLL'),
                                },
                            ].map((item) => (
                                <Box
                                    key={item.label}
                                    sx={{
                                        p: 1.75,
                                        borderRadius: 2.5,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: alpha(corporateColors.brand, 0.02),
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                                        {item.label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600 }}>
                                        {item.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        <Button variant="outlined" fullWidth startIcon={<LockIcon />} sx={{ mt: 3 }} onClick={() => setOpenPasswordDialog(true)}>
                            Cambiar contraseña
                        </Button>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
                        <Typography variant="h6">Datos personales</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 3 }}>
                            Mantén actualizados tus datos de identificación y la conexión individual con Bitrix.
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField fullWidth label="Nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField fullWidth label="Apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} required />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Iniciales"
                                    name="iniciales"
                                    value={formData.iniciales}
                                    onChange={handleInputChange}
                                    helperText="2-4 letras mayúsculas"
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    required
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Webhook Bitrix"
                                    name="webhook_bitrix"
                                    value={formData.webhook_bitrix}
                                    onChange={handleInputChange}
                                    helperText="URL completa del webhook de Bitrix24"
                                    required
                                />
                            </Grid>
                        </Grid>

                        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25} justifyContent="flex-end" sx={{ mt: 3 }}>
                            <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleReset} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                onClick={handleUpdateProfile}
                                disabled={loading}
                            >
                                Guardar cambios
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={openPasswordDialog} onClose={handleCancelPasswordChange} maxWidth="sm" fullWidth>
                <DialogTitle>Cambiar contraseña</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
                    {error && <Alert severity="error">{error}</Alert>}

                    <TextField
                        fullWidth
                        label="Contraseña actual"
                        name="contrasena_actual"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.contrasena_actual}
                        onChange={handlePasswordInputChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowCurrentPassword((prev) => !prev)} edge="end">
                                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Nueva contraseña"
                        name="contrasena_nueva"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.contrasena_nueva}
                        onChange={handlePasswordInputChange}
                        helperText="Mínimo 6 caracteres"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowNewPassword((prev) => !prev)} edge="end">
                                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Confirmar nueva contraseña"
                        name="confirmar_contrasena"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmar_contrasena}
                        onChange={handlePasswordInputChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end">
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
                        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                    >
                        Actualizar contraseña
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProfilePage;
