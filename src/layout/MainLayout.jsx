import { useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    useTheme,
    useMediaQuery,
    Collapse,
    Tooltip,
    Avatar,
    Menu,
    MenuItem,
    Chip,
} from '@mui/material';
import {
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Description as DescriptionIcon,
    IntegrationInstructions as IntegrationIcon,
    ExpandLess,
    ExpandMore,
    Article as ArticleIcon,
    Send as SendIcon,
    History as HistoryIcon,
    AccountCircle,
    Logout,
    Star,
    People,
    ProductionQuantityLimits,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { MainContext } from '../contexts/MainContext';


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
    const [reportsOpen, setReportsOpen] = useState(true);
    const [bitrixOpen, setBitrixOpen] = useState(true);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleDrawerToggle = () => {
        if (isMobile) {
            setMobileOpen(!mobileOpen);
        } else {
            setDesktopOpen(!desktopOpen);
        }
    };

    const handleNavigate = (path) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const handleUserMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
    };

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
        ...(user?.es_lider ? [
            {
                title: 'Reportes Excel',
                icon: <DescriptionIcon />,
                type: 'group',
                open: reportsOpen,
                setOpen: setReportsOpen,
                items: [
                    {
                        title: 'Generar Reporte',
                        icon: <ArticleIcon />,
                        path: '/reports/generate',
                    },
                    {
                        title: 'Historial',
                        icon: <HistoryIcon />,
                        path: '/reports/history',
                    },
                ],
            },
        ] : []),
        {
            title: 'Integración Bitrix',
            icon: <IntegrationIcon />,
            type: 'group',
            open: bitrixOpen,
            setOpen: setBitrixOpen,
            items: [
                {
                    title: 'Enviar a Bitrix',
                    icon: <SendIcon />,
                    path: '/bitrix/send',
                },
                {
                    title: 'Historial',
                    icon: <HistoryIcon />,
                    path: '/bitrix/history',
                },
                {
                    title: 'Productos',
                    icon: <ProductionQuantityLimits />,
                    path: '/products',
                },
                {
                    title: 'Usuarios',
                    icon: <People />,
                    path: '/users',
                },
            ],
        }
    ];

    useEffect(() => {
        const storedUser = localStorage.getItem('usuario');
        if (!storedUser) {
            navigate('/login');
        } else {
            setUser(JSON.parse(storedUser));
        }
    }, [navigate]);

    const getUserInitials = () => {
        if (!user) return '??';
        return user.iniciales || '??';
    };

    const getUserFullName = () => {
        if (!user) return 'Usuario';
        return `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Usuario';
    };

    const drawerDesktop = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: desktopOpen ? 'space-between' : 'center',
                    px: desktopOpen ? 2 : 1,
                    minHeight: 64,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
            >
                {desktopOpen && (
                    <Typography
                        variant="h6"
                        noWrap
                        sx={{
                            color: 'white',
                            fontWeight: 700,
                            letterSpacing: 0.5,
                        }}
                    >
                        Quotizador
                    </Typography>
                )}
                <IconButton
                    onClick={handleDrawerToggle}
                    sx={{ color: 'white' }}
                >
                    {desktopOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </IconButton>
            </Toolbar>

            <Divider />
            <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
                {menuItems.map((item) => {
                    if (item.type === 'group') {
                        return (
                            <Box key={item.title}>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => item.setOpen(!item.open)}
                                        sx={{
                                            borderRadius: 2,
                                            justifyContent: desktopOpen ? 'initial' : 'center',
                                            px: desktopOpen ? 2 : 2.5,
                                            '&:hover': {
                                                backgroundColor: theme.palette.action.hover,
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: desktopOpen ? 40 : 0,
                                                mr: desktopOpen ? 2 : 0,
                                                justifyContent: 'center',
                                                color: theme.palette.text.secondary,
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        {desktopOpen && (
                                            <>
                                                <ListItemText
                                                    primary={item.title}
                                                    primaryTypographyProps={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                    }}
                                                />
                                                {item.open ? <ExpandLess /> : <ExpandMore />}
                                            </>
                                        )}
                                    </ListItemButton>
                                </ListItem>

                                <Collapse in={item.open && desktopOpen} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {item.items.map((subItem) => (
                                            <ListItem
                                                key={subItem.title}
                                                disablePadding
                                                sx={{ pl: 2 }}
                                            >
                                                <ListItemButton
                                                    onClick={() => handleNavigate(subItem.path)}
                                                    selected={isActive(subItem.path)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        '&.Mui-selected': {
                                                            backgroundColor: theme.palette.primary.main,
                                                            color: 'white',
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.primary.dark,
                                                            },
                                                            '& .MuiListItemIcon-root': {
                                                                color: 'white',
                                                            },
                                                        },
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.action.hover,
                                                        },
                                                    }}
                                                >
                                                    <ListItemIcon
                                                        sx={{
                                                            minWidth: 36,
                                                            color: isActive(subItem.path)
                                                                ? 'white'
                                                                : theme.palette.text.secondary,
                                                        }}
                                                    >
                                                        {subItem.icon}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={subItem.title}
                                                        primaryTypographyProps={{
                                                            fontSize: 13,
                                                            fontWeight: isActive(subItem.path) ? 600 : 400,
                                                        }}
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Collapse>
                            </Box>
                        );
                    }
                    return null;
                })}
            </List>
            <Divider />
            <Box sx={{ p: 2, pt: 2 }}>
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                    © 2025 Quotizador
                </Typography>
            </Box>
        </Box>
    );

    const drawerMobile = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    minHeight: 64,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
            >
                <Typography
                    variant="h6"
                    noWrap
                    sx={{
                        color: 'white',
                        fontWeight: 700,
                        letterSpacing: 0.5,
                    }}
                >
                    Quotizador
                </Typography>
            </Toolbar>

            <Divider />
            <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
                {menuItems.map((item) => {
                    if (item.type === 'group') {
                        return (
                            <Box key={item.title}>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => item.setOpen(!item.open)}
                                        sx={{
                                            borderRadius: 2,
                                            px: 2,
                                            '&:hover': {
                                                backgroundColor: theme.palette.action.hover,
                                            },
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 40,
                                                mr: 2,
                                                color: theme.palette.text.secondary,
                                            }}
                                        >
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.title}
                                            primaryTypographyProps={{
                                                fontSize: 14,
                                                fontWeight: 600,
                                            }}
                                        />
                                        {item.open ? <ExpandLess /> : <ExpandMore />}
                                    </ListItemButton>
                                </ListItem>

                                <Collapse in={item.open} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {item.items.map((subItem) => (
                                            <ListItem
                                                key={subItem.title}
                                                disablePadding
                                                sx={{ pl: 2 }}
                                            >
                                                <ListItemButton
                                                    onClick={() => handleNavigate(subItem.path)}
                                                    selected={isActive(subItem.path)}
                                                    sx={{
                                                        borderRadius: 2,
                                                        '&.Mui-selected': {
                                                            backgroundColor: theme.palette.primary.main,
                                                            color: 'white',
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.primary.dark,
                                                            },
                                                            '& .MuiListItemIcon-root': {
                                                                color: 'white',
                                                            },
                                                        },
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.action.hover,
                                                        },
                                                    }}
                                                >
                                                    <ListItemIcon
                                                        sx={{
                                                            minWidth: 36,
                                                            color: isActive(subItem.path)
                                                                ? 'white'
                                                                : theme.palette.text.secondary,
                                                        }}
                                                    >
                                                        {subItem.icon}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={subItem.title}
                                                        primaryTypographyProps={{
                                                            fontSize: 13,
                                                            fontWeight: isActive(subItem.path) ? 600 : 400,
                                                        }}
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Collapse>
                            </Box>
                        );
                    }
                    return null;
                })}
            </List>
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                }}
            >
                <Toolbar>
                    {isMobile && (
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        {location.pathname.includes('/reports/generate') && 'Generar Reporte Excel'}
                        {location.pathname.includes('/reports/history') && 'Historial de Reportes'}
                        {location.pathname.includes('/bitrix/send') && 'Enviar a Bitrix'}
                        {location.pathname.includes('/bitrix/history') && 'Historial Bitrix'}
                        {location.pathname.includes('/products') && 'Gestión de Productos'}
                        {location.pathname.includes('/employees') && 'Gestión de Empleados'}
                    </Typography>

                    {/* Botón de cambio de tema */}
                    <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
                        <IconButton
                            onClick={toggleTheme}
                            color="inherit"
                            sx={{ mr: 1 }}
                        >
                            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* Avatar y menú de usuario */}
                    {user && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {!isMobile && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {getUserFullName()}
                                    </Typography>
                                    {user && user.es_lider && (
                                        <Chip
                                            icon={<Star sx={{ fontSize: 14 }} />}
                                            label="Líder"
                                            size="small"
                                            sx={{
                                                height: 22,
                                                fontSize: '0.7rem',
                                                backgroundColor: '#ffd700',
                                                color: '#000',
                                            }}
                                        />
                                    )}
                                </Box>
                            )}

                            <Tooltip title="Cuenta">
                                <IconButton
                                    onClick={handleUserMenuOpen}
                                    sx={{
                                        p: 0,
                                        '&:hover': {
                                            backgroundColor: 'transparent',
                                        }
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            backgroundColor: theme.palette.primary.main,
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
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
                                        minWidth: 200,
                                        '& .MuiMenuItem-root': {
                                            px: 2,
                                            py: 1,
                                        },
                                    },
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        {getUserFullName()}
                                    </Typography>
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

            {/* Drawer Mobile */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true,
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                    },
                }}
            >
                {drawerMobile}
            </Drawer>

            {/* Drawer Desktop */}
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
                        borderRight: `1px solid ${theme.palette.divider}`,
                        overflowX: 'hidden',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    },
                }}
            >
                {drawerDesktop}
            </Drawer>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: '100%',
                    transition: theme.transitions.create(['margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;