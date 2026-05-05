import { useContext, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Avatar,
    Box,
    Chip,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    AccountCircle,
    Article as ArticleIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Dashboard as DashboardIcon,
    History as HistoryIcon,
    Logout,
    Menu as MenuIcon,
    People,
    ProductionQuantityLimits,
    Send as SendIcon,
    Star,
} from '@mui/icons-material';
import { MainContext } from '../contexts/MainContext';
import { corporateColors } from '../theme/tokens';

const drawerWidth = 280;
const miniDrawerWidth = 72;

const MainLayout = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { user, setUser, mode, toggleTheme } = useContext(MainContext);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);
    const [anchorEl, setAnchorEl] = useState(null);

    const sidebarBg = '#0F172A';
    const sidebarBgAlt = theme.palette.mode === 'light' ? '#0F4A6E' : '#173149';
    const sidebarBorder = alpha('#FFFFFF', theme.palette.mode === 'light' ? 0.10 : 0.08);
    const sidebarText = corporateColors.sidebarText;
    const sidebarTextMuted = corporateColors.sidebarMuted;
    const sidebarHover = alpha('#FFFFFF', 0.06);
    const sidebarSelected = alpha(corporateColors.primaryHover, 0.26);
    const sidebarSelectedHover = alpha(corporateColors.primaryHover, 0.36);

    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen((prev) => !prev);
            return;
        }
        setDesktopOpen((prev) => !prev);
    };

    const handleNavigate = (path) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const handleUserMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleUserMenuClose = () => setAnchorEl(null);

    const handleLogout = () => {
        localStorage.removeItem('usuario');
        setUser(null);
        handleUserMenuClose();
        navigate('/login');
    };

    const handleProfile = () => {
        handleUserMenuClose();
        navigate('/profile');
    };

    const isActive = (path) => location.pathname === path;

    const menuItems = [
        ...(user?.es_lider
            ? [
                { title: 'Generar Reporte', icon: <ArticleIcon />, path: '/reports/generate' },
                { title: 'Historial Reportes', icon: <HistoryIcon />, path: '/reports/history' },
            ]
            : []),
        { title: 'Enviar a Bitrix', icon: <SendIcon />, path: '/bitrix/send' },
        { title: 'Historial Bitrix', icon: <HistoryIcon />, path: '/bitrix/history' },
        { title: 'Dashboard Bitrix', icon: <DashboardIcon />, path: '/bitrix/dashboard' },
        { title: 'Productos', icon: <ProductionQuantityLimits />, path: '/products' },
        { title: 'Usuarios', icon: <People />, path: '/users' },
    ];

    useEffect(() => {
        const storedUser = localStorage.getItem('usuario');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate, setUser]);

    const getUserInitials = () => user?.iniciales || '??';

    const getUserFullName = () => {
        if (!user) return 'Usuario';
        return `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Usuario';
    };

    const currentSectionTitle = menuItems.find((item) => isActive(item.path))?.title || 'Quotizador';

    const renderMenuItems = (collapsed = false) => (
        <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
            {menuItems.map((item) => (
                <Tooltip key={item.title} title={collapsed ? item.title : ''} placement="right">
                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                            onClick={() => handleNavigate(item.path)}
                            selected={isActive(item.path)}
                            sx={{
                                minHeight: 46,
                                borderRadius: 2.5,
                                justifyContent: collapsed ? 'center' : 'initial',
                                px: collapsed ? 2.25 : 2,
                                color: isActive(item.path) ? 'common.white' : sidebarText,
                                '&.Mui-selected': {
                                    color: 'common.white',
                                    backgroundColor: sidebarSelected,
                                    boxShadow: `inset 3px 0 0 ${corporateColors.accentGold}`,
                                    '& .MuiListItemIcon-root': { color: 'common.white' },
                                    '&:hover': { backgroundColor: sidebarSelectedHover },
                                },
                                '&:hover': { backgroundColor: sidebarHover },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: collapsed ? 0 : 40,
                                    mr: collapsed ? 0 : 2,
                                    justifyContent: 'center',
                                    color: isActive(item.path) ? 'common.white' : sidebarTextMuted,
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            {!collapsed && (
                                <ListItemText
                                    primary={item.title}
                                    primaryTypographyProps={{
                                        fontSize: 14,
                                        fontWeight: isActive(item.path) ? 700 : 500,
                                    }}
                                />
                            )}
                        </ListItemButton>
                    </ListItem>
                </Tooltip>
            ))}
        </List>
    );

    const drawerContent = (collapsed = false) => (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: sidebarBg, color: sidebarText }}>
            <Toolbar
                sx={{
                    minHeight: 72,
                    px: collapsed ? 1 : 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    backgroundColor: sidebarBgAlt,
                    borderBottom: `1px solid ${sidebarBorder}`,
                }}
            >
                {!collapsed && (
                    <Box>
                        <Typography variant="overline" sx={{ color: sidebarTextMuted, letterSpacing: '0.14em', fontWeight: 700 }}>
                            Plataforma
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'common.white', lineHeight: 1.1 }}>
                            Quotizador
                        </Typography>
                    </Box>
                )}
                {!isMobile && (
                    <IconButton onClick={handleDrawerToggle} sx={{ color: 'common.white' }}>
                        {desktopOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                    </IconButton>
                )}
            </Toolbar>

            {renderMenuItems(collapsed)}

            {!collapsed && (
                <Box sx={{ p: 2, pt: 1.5 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            bgcolor: alpha('#FFFFFF', 0.06),
                            borderColor: alpha('#FFFFFF', 0.08),
                        }}
                    >
                        <Typography variant="caption" sx={{ color: sidebarTextMuted, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Entorno
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'common.white', fontWeight: 600 }}>
                            Sistema interno corporativo
                        </Typography>
                    </Paper>
                </Box>
            )}
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: {
                        md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : `calc(100% - ${miniDrawerWidth}px)`,
                    },
                    ml: {
                        md: desktopOpen ? `${drawerWidth}px` : `${miniDrawerWidth}px`,
                    },
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    bgcolor: alpha(theme.palette.background.paper, 0.94),
                    color: 'text.primary',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 6px 22px rgba(11, 61, 92, 0.08)',
                }}
            >
                <Toolbar sx={{ minHeight: 72 }}>
                    {isMobile && (
                        <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Box sx={{ flexGrow: 1 }}>
                        {!isMobile && (
                            <Box>
                                <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, lineHeight: 1.1 }}>
                                    Operaciones
                                </Typography>
                                <Typography variant="h6" sx={{ color: corporateColors.brand, lineHeight: 1.15 }}>
                                    {currentSectionTitle}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
                        <IconButton
                            onClick={toggleTheme}
                            color="inherit"
                            sx={{
                                mr: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.background.paper, 0.92),
                            }}
                        >
                            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                        </IconButton>
                    </Tooltip>

                    {user && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {!isMobile && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mr: 1,
                                        px: 1.5,
                                        py: 0.75,
                                        borderRadius: 2.5,
                                        bgcolor: alpha(corporateColors.brand, 0.03),
                                    }}
                                >
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                            {getUserFullName()}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            @{user.iniciales}
                                        </Typography>
                                    </Box>
                                    {user.es_lider && (
                                        <Chip
                                            icon={<Star sx={{ fontSize: 14 }} />}
                                            label="Líder"
                                            size="small"
                                            sx={{
                                                height: 24,
                                                fontSize: '0.72rem',
                                                backgroundColor: alpha(corporateColors.accentGold, 0.16),
                                                color: corporateColors.brand,
                                            }}
                                        />
                                    )}
                                </Paper>
                            )}

                            <Tooltip title="Cuenta">
                                <IconButton
                                    onClick={handleUserMenuOpen}
                                    sx={{ p: 0, '&:hover': { backgroundColor: 'transparent' } }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 38,
                                            height: 38,
                                            backgroundColor: corporateColors.brand,
                                            fontSize: '0.875rem',
                                            fontWeight: 700,
                                            boxShadow: `0 0 0 3px ${alpha(corporateColors.primaryHover, 0.12)}`,
                                        }}
                                    >
                                        {getUserInitials()}
                                    </Avatar>
                                </IconButton>
                            </Tooltip>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleUserMenuClose}
                                onClick={handleUserMenuClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                PaperProps={{
                                    elevation: 3,
                                    sx: {
                                        mt: 1.5,
                                        minWidth: 220,
                                        borderRadius: 2.5,
                                        '& .MuiMenuItem-root': { px: 2, py: 1 },
                                    },
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                                    <Typography variant="subtitle2">{getUserFullName()}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        @{user.iniciales}
                                    </Typography>
                                </Box>

                                <MenuItem onClick={handleProfile}>
                                    <ListItemIcon>
                                        <AccountCircle fontSize="small" />
                                    </ListItemIcon>
                                    Mi Perfil
                                </MenuItem>
                                <Divider />
                                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                                    <ListItemIcon>
                                        <Logout fontSize="small" sx={{ color: 'error.main' }} />
                                    </ListItemIcon>
                                    Cerrar Sesión
                                </MenuItem>
                            </Menu>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        bgcolor: sidebarBg,
                        color: sidebarText,
                        backgroundImage: 'none',
                    },
                }}
            >
                {drawerContent(false)}
            </Drawer>

            <Drawer
                variant="permanent"
                open={desktopOpen}
                sx={{
                    display: { xs: 'none', md: 'block' },
                    width: desktopOpen ? drawerWidth : miniDrawerWidth,
                    flexShrink: 0,
                    transition: theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    '& .MuiDrawer-paper': {
                        width: desktopOpen ? drawerWidth : miniDrawerWidth,
                        boxSizing: 'border-box',
                        borderRight: `1px solid ${sidebarBorder}`,
                        bgcolor: sidebarBg,
                        color: sidebarText,
                        backgroundImage: 'none',
                        overflowX: 'hidden',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    },
                }}
            >
                {drawerContent(!desktopOpen)}
            </Drawer>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: '100%',
                    minHeight: '100vh',
                    transition: theme.transitions.create(['margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                }}
            >
                <Toolbar sx={{ minHeight: 72 }} />
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;
