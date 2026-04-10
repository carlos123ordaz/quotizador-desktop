import { createContext, useState, useMemo } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'

export const MainContext = createContext()

export const MainContextApp = ({ children }) => {
    const [user, setUser] = useState(null)
    const [mode, setMode] = useState(() => {
        return localStorage.getItem('themeMode') || 'light'
    })

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === 'light'
                        ? {
                            primary: {
                                main: '#334155',
                                dark: '#1e293b',
                            },
                            secondary: {
                                main: '#64748b',
                            },
                            success: {
                                main: '#4b6358',
                                dark: '#34463d',
                            },
                            info: {
                                main: '#516173',
                                dark: '#344150',
                            },
                            warning: {
                                main: '#766454',
                                dark: '#5a4b40',
                            },
                            error: {
                                main: '#8b4d4d',
                                dark: '#6f3d3d',
                            },
                            background: {
                                default: '#f3f4f6',
                                paper: '#ffffff',
                            },
                            text: {
                                primary: '#111827',
                                secondary: '#4b5563',
                            },
                        }
                        : {
                            primary: {
                                main: '#94a3b8',
                                dark: '#64748b',
                            },
                            secondary: {
                                main: '#64748b',
                            },
                            success: {
                                main: '#7f9a8c',
                                dark: '#5f776b',
                            },
                            info: {
                                main: '#8191a3',
                                dark: '#5f7183',
                            },
                            warning: {
                                main: '#a18f7c',
                                dark: '#7f6f5f',
                            },
                            error: {
                                main: '#b67b7b',
                                dark: '#965f5f',
                            },
                            background: {
                                default: '#111827',
                                paper: '#1f2937',
                            },
                            text: {
                                primary: '#e5e7eb',
                                secondary: '#9ca3af',
                            },
                        }),
                },
            }),
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
