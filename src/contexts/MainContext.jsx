import { createContext, useMemo, useState } from 'react'
import { createTheme, alpha, ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { corporateColors } from '../theme/tokens'

export const MainContext = createContext()

export const MainContextApp = ({ children }) => {
    const [user, setUser] = useState(null)
    const [mode, setMode] = useState(() => {
        return localStorage.getItem('themeMode') || 'light'
    })

    const theme = useMemo(
        () => {
            const isLight = mode === 'light'
            const palette = isLight
                ? {
                    mode,
                    primary: {
                        main: corporateColors.primary,
                        light: corporateColors.primaryHover,
                        dark: corporateColors.brand,
                        contrastText: '#FFFFFF',
                    },
                    secondary: {
                        main: corporateColors.accentTeal,
                        contrastText: '#FFFFFF',
                    },
                    success: {
                        main: corporateColors.success,
                        dark: corporateColors.brand,
                    },
                    info: {
                        main: corporateColors.info,
                        dark: corporateColors.brand,
                    },
                    warning: {
                        main: corporateColors.warning,
                        dark: corporateColors.accentOrange,
                    },
                    error: {
                        main: corporateColors.error,
                        dark: '#C8652F',
                    },
                    background: {
                        default: corporateColors.background,
                        paper: corporateColors.surface,
                    },
                    text: {
                        primary: corporateColors.textPrimary,
                        secondary: corporateColors.textSecondary,
                    },
                    divider: corporateColors.border,
                }
                : {
                    mode,
                    primary: {
                        main: '#78A1F3',
                        light: '#A8C0F7',
                        dark: '#4E7CDD',
                        contrastText: '#0D1B2A',
                    },
                    secondary: {
                        main: '#6FB4BA',
                        contrastText: '#0D1B2A',
                    },
                    success: {
                        main: '#71B8BF',
                        dark: '#4F9DA5',
                    },
                    info: {
                        main: '#56B3D6',
                        dark: '#0088BB',
                    },
                    warning: {
                        main: '#F0C259',
                        dark: '#E9A61A',
                    },
                    error: {
                        main: '#F1A06B',
                        dark: '#EA8344',
                    },
                    background: {
                        default: '#0F1E2D',
                        paper: '#142739',
                    },
                    text: {
                        primary: '#E9EEF3',
                        secondary: '#A7B6C6',
                    },
                    divider: alpha('#D7DEE6', 0.16),
                }

            return createTheme({
                palette,
                customTokens: corporateColors,
                shape: {
                    borderRadius: 10,
                },
                typography: {
                    fontFamily: '"Segoe UI Variable Display", "Segoe UI", "Trebuchet MS", sans-serif',
                    h4: {
                        fontWeight: 700,
                        letterSpacing: '-0.03em',
                    },
                    h5: {
                        fontWeight: 700,
                        letterSpacing: '-0.025em',
                    },
                    h6: {
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                    },
                    subtitle1: {
                        fontWeight: 600,
                    },
                    subtitle2: {
                        fontWeight: 700,
                    },
                    button: {
                        fontWeight: 600,
                        textTransform: 'none',
                        letterSpacing: 0,
                    },
                },
                shadows: [
                    'none',
                    '0 2px 6px rgba(11, 61, 92, 0.04)',
                    '0 6px 18px rgba(11, 61, 92, 0.06)',
                    '0 10px 24px rgba(11, 61, 92, 0.08)',
                    '0 14px 32px rgba(11, 61, 92, 0.10)',
                    ...Array(20).fill('0 18px 40px rgba(11, 61, 92, 0.10)'),
                ],
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            ':root': {
                                colorScheme: isLight ? 'light' : 'dark',
                            },
                            body: {
                                backgroundColor: palette.background.default,
                                backgroundImage: isLight
                                    ? `linear-gradient(180deg, ${alpha(corporateColors.brand, 0.045)} 0%, ${palette.background.default} 220px)`
                                    : `linear-gradient(180deg, ${alpha(corporateColors.brand, 0.24)} 0%, ${palette.background.default} 220px)`,
                            },
                            '::selection': {
                                backgroundColor: alpha(corporateColors.primaryHover, 0.24),
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                border: `1px solid ${palette.divider}`,
                                boxShadow: isLight
                                    ? '0 8px 24px rgba(11, 61, 92, 0.06)'
                                    : '0 12px 28px rgba(3, 10, 18, 0.28)',
                            },
                        },
                    },
                    MuiAppBar: {
                        styleOverrides: {
                            root: {
                                backgroundImage: 'none',
                                borderBottom: `1px solid ${palette.divider}`,
                                boxShadow: '0 4px 16px rgba(11, 61, 92, 0.08)',
                            },
                        },
                    },
                    MuiDrawer: {
                        styleOverrides: {
                            paper: {
                                borderRight: `1px solid ${isLight ? alpha('#FFFFFF', 0.08) : palette.divider}`,
                            },
                        },
                    },
                    MuiButton: {
                        defaultProps: {
                            disableElevation: true,
                        },
                        styleOverrides: {
                            root: {
                                minHeight: 40,
                                borderRadius: 10,
                                paddingInline: 18,
                            },
                            containedPrimary: {
                                backgroundColor: corporateColors.primary,
                                '&:hover': {
                                    backgroundColor: corporateColors.primaryHover,
                                },
                            },
                            outlined: {
                                borderColor: alpha(corporateColors.brand, isLight ? 0.18 : 0.32),
                                '&:hover': {
                                    borderColor: corporateColors.primary,
                                    backgroundColor: alpha(corporateColors.primary, 0.05),
                                },
                            },
                            text: {
                                '&:hover': {
                                    backgroundColor: alpha(corporateColors.primary, 0.05),
                                },
                            },
                        },
                    },
                    MuiChip: {
                        styleOverrides: {
                            root: {
                                borderRadius: 8,
                                fontWeight: 600,
                            },
                        },
                    },
                    MuiOutlinedInput: {
                        styleOverrides: {
                            root: {
                                borderRadius: 10,
                                backgroundColor: isLight ? alpha('#FFFFFF', 0.92) : alpha('#FFFFFF', 0.02),
                                transition: 'border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease',
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: alpha(corporateColors.brand, 0.42),
                                },
                                '&.Mui-focused': {
                                    boxShadow: `0 0 0 4px ${alpha(corporateColors.primaryHover, 0.14)}`,
                                },
                            },
                            notchedOutline: {
                                borderColor: alpha(corporateColors.textSecondary, isLight ? 0.26 : 0.38),
                            },
                            input: {
                                paddingTop: 12,
                                paddingBottom: 12,
                            },
                        },
                    },
                    MuiInputLabel: {
                        styleOverrides: {
                            root: {
                                color: palette.text.secondary,
                            },
                        },
                    },
                    MuiTableCell: {
                        styleOverrides: {
                            head: {
                                color: palette.text.secondary,
                                fontWeight: 700,
                            },
                        },
                    },
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                borderRadius: 14,
                            },
                        },
                    },
                    MuiAlert: {
                        styleOverrides: {
                            root: {
                                borderRadius: 10,
                            },
                            standardWarning: {
                                backgroundColor: alpha(corporateColors.warning, 0.10),
                            },
                        },
                    },
                    MuiDivider: {
                        styleOverrides: {
                            root: {
                                borderColor: palette.divider,
                            },
                        },
                    },
                    MuiLinearProgress: {
                        styleOverrides: {
                            root: {
                                borderRadius: 999,
                                backgroundColor: alpha(corporateColors.primary, 0.12),
                            },
                        },
                    },
                    MuiTooltip: {
                        styleOverrides: {
                            tooltip: {
                                backgroundColor: isLight ? corporateColors.brand : '#0B1521',
                                fontSize: '0.74rem',
                            },
                        },
                    },
                },
            })
        },
        [mode]
    )

    const toggleTheme = () => {
        setMode((prevMode) => {
            const newMode = prevMode === 'light' ? 'dark' : 'light'
            localStorage.setItem('themeMode', newMode)
            return newMode
        })
    }

    return (
        <MainContext.Provider value={{ user, setUser, mode, toggleTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </MainContext.Provider>
    )
}
