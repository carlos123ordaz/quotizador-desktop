import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    IconButton,
    Tooltip,
    Skeleton,
    Stack,
    useTheme,
    Chip,
    LinearProgress,
    Select,
    MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Refresh as RefreshIcon,
    Send as SendIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Add as AddIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { CONFIG } from '../config';

const MetricCard = ({ label, value, icon, color, loading, subtitle }) => (
    <Paper
        elevation={0}
        sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: `3px solid ${color}`,
            borderRadius: 2,
            p: 2,
            height: '100%',
        }}
    >
        {loading ? (
            <Box sx={{ minHeight: 88 }}>
                <Skeleton variant="text" width="40%" height={36} />
                <Skeleton variant="text" width="60%" height={16} sx={{ mt: 0.5 }} />
            </Box>
        ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: 88 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 88 }}>
                    <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{ lineHeight: 1, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                    >
                        {value ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 500 }}>
                        {label}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ mt: 0.25, display: 'block', minHeight: 20, visibility: subtitle ? 'visible' : 'hidden' }}
                    >
                        {subtitle || 'placeholder'}
                    </Typography>
                </Box>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: alpha(color, 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
            </Box>
        )}
    </Paper>
);

const DonutChart = ({ value, total, color, label, loading }) => {
    const theme = useTheme();
    const r = 52;
    const cx = 68;
    const cy = 68;
    const circ = 2 * Math.PI * r;
    const pct = total > 0 ? value / total : 0;
    const trackColor = theme.palette.mode === 'dark' ? '#374151' : '#e5e7eb';

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="circular" width={136} height={136} />
                <Skeleton variant="text" width={80} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width={136} height={136} viewBox="0 0 136 136">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={13} />
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={13}
                    strokeDasharray={`${pct * circ} ${circ}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dasharray 0.7s ease' }}
                />
                <text
                    x={cx}
                    y={cy - 6}
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="700"
                    fill={color}
                    fontFamily="inherit"
                >
                    {Math.round(pct * 100)}%
                </text>
                <text
                    x={cx}
                    y={cy + 13}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#9ca3af"
                    fontFamily="inherit"
                >
                    {value} de {total}
                </text>
            </svg>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mt: 0.25 }}>
                {label}
            </Typography>
        </Box>
    );
};

const HBar = ({ label, value, max, color }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <Box sx={{ mb: 1.75 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8125rem' }}>
                    {label}
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ ml: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {value}
                </Typography>
            </Box>
            <Box sx={{ height: 7, borderRadius: 4, bgcolor: alpha(color, 0.12), overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 4, transition: 'width 0.7s ease' }} />
            </Box>
        </Box>
    );
};

const ActivityBars = ({ data, loading }) => {
    const theme = useTheme();
    const safeData = data?.length ? data : [];
    const W = 420;
    const H = 120;
    const labelH = 18;
    const barArea = H - labelH;
    const gap = 8;
    const n = safeData.length || 1;
    const barW = (W - gap * (n - 1)) / n;
    const maxVal = Math.max(...safeData.map((d) => d.count), 1);
    const trackColor = theme.palette.mode === 'dark' ? '#374151' : '#e5e7eb';

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: 120 }}>
                {[55, 30, 80, 45, 70, 25, 60].map((h, i) => (
                    <Skeleton key={i} variant="rounded" sx={{ flexGrow: 1, height: `${h * 0.9}px` }} />
                ))}
            </Box>
        );
    }

    if (!safeData.length) {
        return (
            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
                Sin datos disponibles
            </Typography>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                {safeData.map((d, i) => {
                    const x = i * (barW + gap);
                    const filledH = Math.max((d.count / maxVal) * (barArea - 6), d.count > 0 ? 6 : 2);
                    const isLast = i === safeData.length - 1;
                    const barColor = d.count > 0
                        ? isLast
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.55)
                        : trackColor;
                    const cx = x + barW / 2;

                    return (
                        <g key={`${d.label}-${i}`}>
                            <rect x={x} y={0} width={barW} height={barArea - 2} rx={3} ry={3} fill={trackColor} />
                            <rect
                                x={x}
                                y={barArea - 2 - filledH}
                                width={barW}
                                height={filledH}
                                rx={3}
                                ry={3}
                                fill={barColor}
                            />
                            {d.count > 0 && (
                                <text
                                    x={cx}
                                    y={barArea - 2 - filledH - 4}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight={isLast ? '700' : '500'}
                                    fill={isLast ? theme.palette.primary.main : theme.palette.text.secondary}
                                    fontFamily="inherit"
                                >
                                    {d.count}
                                </text>
                            )}
                            <text
                                x={cx}
                                y={H - 2}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight={isLast ? '700' : '400'}
                                fill={isLast ? theme.palette.primary.main : '#9ca3af'}
                                fontFamily="inherit"
                            >
                                {d.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </Box>
    );
};

const SectionTitle = ({ children, extra }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
            {children}
        </Typography>
        {extra}
    </Box>
);

export const BitrixDashboard = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [yearFilter, setYearFilter] = useState('all');
    const [dashboardData, setDashboardData] = useState({
        stats: {
            total_envios: 0,
            exitosos: 0,
            errores: 0,
            creaciones: 0,
            actualizaciones: 0,
        },
        activity: [],
        top_users: [],
        totales_por_area: [],
        available_years: [],
    });

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        if (!isRefresh) setLoading(true);

        try {
            const params = yearFilter === 'all' ? {} : { year: yearFilter };
            const { data } = await axios.get(`${CONFIG.uri}/history/dashboard`, { params });
            setDashboardData(data);
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [yearFilter]);

    const displayStats = dashboardData.stats || {};
    const activityData = dashboardData.activity || [];
    const topUsers = dashboardData.top_users || [];
    const totalesPorArea = dashboardData.totales_por_area || [];
    const availableYears = dashboardData.available_years || [];

    const maxUserCount = topUsers[0]?.count || 1;
    const activityTotal = activityData.reduce((sum, item) => sum + item.count, 0);
    const successfulOperationTotal = Math.max(
        (displayStats.creaciones || 0) + (displayStats.actualizaciones || 0),
        1,
    );
    const successRate = displayStats.total_envios > 0
        ? Math.round((displayStats.exitosos / displayStats.total_envios) * 100)
        : 0;
    const dashboardPalette = {
        primary: theme.palette.primary.main,
        success: theme.palette.success.main,
        error: theme.palette.error.main,
        info: theme.palette.info.main,
        warning: theme.palette.warning.main,
        neutral: theme.palette.secondary.main,
    };

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
                height: 'calc(100vh - 64px)',
                overflow: 'auto',
                boxSizing: 'border-box',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
            }}
        >
            {refreshing && (
                <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 2 }} />
            )}

            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                        Dashboard Bitrix
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Resumen de actividad y métricas de envíos
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!loading && (
                        <Select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            size="small"
                            variant="outlined"
                            sx={{
                                fontSize: '0.8125rem',
                                height: 32,
                                '& .MuiSelect-select': { py: 0, px: 1.25 },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                            }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '0.8125rem' }}>
                                Todos los años
                            </MenuItem>
                            {availableYears.map((year) => (
                                <MenuItem key={year} value={year} sx={{ fontSize: '0.8125rem' }}>
                                    {year}
                                </MenuItem>
                            ))}
                        </Select>
                    )}
                    <Tooltip title="Actualizar">
                        <span>
                            <IconButton
                                onClick={() => fetchData(true)}
                                disabled={refreshing || loading}
                                size="small"
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    p: 0.875,
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                }}
                            >
                                <RefreshIcon
                                    sx={{
                                        fontSize: 18,
                                        animation: refreshing ? 'spin 1s linear infinite' : 'none',
                                        '@keyframes spin': {
                                            from: { transform: 'rotate(0deg)' },
                                            to: { transform: 'rotate(360deg)' },
                                        },
                                    }}
                                />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            <Grid container spacing={2}>
                {[
                    { label: 'Total envíos', value: displayStats.total_envios, icon: <SendIcon sx={{ fontSize: 18 }} />, color: dashboardPalette.primary },
                    { label: 'Exitosos', value: displayStats.exitosos, icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: dashboardPalette.success, subtitle: `${successRate}% tasa de éxito` },
                    { label: 'Con errores', value: displayStats.errores, icon: <ErrorIcon sx={{ fontSize: 18 }} />, color: dashboardPalette.error },
                    { label: 'Creaciones exitosas', value: displayStats.creaciones, icon: <AddIcon sx={{ fontSize: 18 }} />, color: dashboardPalette.info },
                    { label: 'Actualizaciones exitosas', value: displayStats.actualizaciones, icon: <EditIcon sx={{ fontSize: 18 }} />, color: dashboardPalette.warning },
                ].map((metric) => (
                    <Grid key={metric.label} size={{ xs: 12, sm: 6, md: 2.4 }}>
                        <MetricCard {...metric} loading={loading} />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={2} alignItems="stretch">
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, height: '100%' }}>
                        <SectionTitle>Tasa de éxito</SectionTitle>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <DonutChart
                                value={displayStats.exitosos || 0}
                                total={displayStats.total_envios || 0}
                                color={dashboardPalette.success}
                                label="envíos exitosos"
                                loading={loading}
                            />
                        </Box>
                        {!loading && (
                            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1.5 }}>
                                <Chip
                                    size="small"
                                    label={`${displayStats.exitosos || 0} OK`}
                                    sx={{ bgcolor: alpha(dashboardPalette.success, 0.12), color: theme.palette.text.primary, fontWeight: 600, height: 22, fontSize: '0.72rem' }}
                                />
                                <Chip
                                    size="small"
                                    label={`${displayStats.errores || 0} error`}
                                    sx={{ bgcolor: alpha(dashboardPalette.error, 0.12), color: theme.palette.text.primary, fontWeight: 600, height: 22, fontSize: '0.72rem' }}
                                />
                            </Stack>
                        )}
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, height: '100%' }}>
                        <SectionTitle>Distribución de envíos</SectionTitle>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={34} />)}
                            </Box>
                        ) : (
                            <Box sx={{ mt: 0.5 }}>
                                <HBar label="Creaciones" value={displayStats.creaciones || 0} max={successfulOperationTotal} color={dashboardPalette.info} />
                                <HBar label="Actualizaciones" value={displayStats.actualizaciones || 0} max={successfulOperationTotal} color={dashboardPalette.warning} />
                                <HBar label="Exitosos" value={displayStats.exitosos || 0} max={displayStats.total_envios || 0} color={dashboardPalette.success} />
                                <HBar label="Con errores" value={displayStats.errores || 0} max={displayStats.total_envios || 0} color={dashboardPalette.error} />
                            </Box>
                        )}
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, height: '100%' }}>
                        <SectionTitle
                            extra={
                                !loading && (
                                    <Typography variant="caption" color="text.disabled">
                                        {activityTotal} envío{activityTotal !== 1 ? 's' : ''}
                                        {yearFilter === 'all' ? ' en los últimos 7 días' : ' en el año'}
                                    </Typography>
                                )
                            }
                        >
                            {yearFilter === 'all' ? 'Actividad últimos 7 días' : 'Actividad por mes'}
                        </SectionTitle>
                        <ActivityBars data={activityData} loading={loading} />
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={2} alignItems="stretch">
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, height: '100%', boxSizing: 'border-box' }}>
                        <SectionTitle
                            extra={
                                !loading && (
                                    <Typography variant="caption" color="text.disabled">
                                        {yearFilter === 'all' ? 'todos los registros' : `año ${yearFilter}`}
                                    </Typography>
                                )
                            }
                        >
                            Top usuarios
                        </SectionTitle>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rounded" height={36} />)}
                            </Box>
                        ) : topUsers.length === 0 ? (
                            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
                                Sin datos disponibles
                            </Typography>
                        ) : (
                            <Box>
                                {topUsers.map((user, i) => {
                                    const medalColors = ['#475569', '#64748b', '#94a3b8'];
                                    const bgColor = i < 3 ? medalColors[i] : alpha(theme.palette.grey[500], 0.15);
                                    return (
                                        <Box key={user.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                            <Box
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    flexShrink: 0,
                                                    bgcolor: bgColor,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={700}
                                                    sx={{ fontSize: '0.65rem', color: i < 3 ? '#f8fafc' : 'text.secondary' }}
                                                >
                                                    {i + 1}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.4 }}>
                                                    <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.8125rem' }}>
                                                        {user.name}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={700} sx={{ ml: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                                                        {user.count}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1), overflow: 'hidden' }}>
                                                    <Box
                                                        sx={{
                                                            height: '100%',
                                                            width: `${(user.count / maxUserCount) * 100}%`,
                                                            bgcolor: theme.palette.primary.main,
                                                            borderRadius: 3,
                                                            transition: 'width 0.7s ease',
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, height: '100%', boxSizing: 'border-box' }}>
                        <SectionTitle>Totales por área</SectionTitle>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={36} />)}
                            </Box>
                        ) : totalesPorArea.length === 0 ? (
                            <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
                                Sin datos disponibles
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {totalesPorArea.map(({ area, total }, i) => {
                                    const maxTotal = totalesPorArea[0].total;
                                    const colors = [
                                        dashboardPalette.primary,
                                        dashboardPalette.info,
                                        dashboardPalette.success,
                                        dashboardPalette.warning,
                                        dashboardPalette.neutral,
                                    ];
                                    const color = colors[i % colors.length];
                                    return (
                                        <Box key={area} sx={{ mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.4 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={500}
                                                    sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                                                >
                                                    {area}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} sx={{ ml: 1, fontVariantNumeric: 'tabular-nums' }}>
                                                    {total.toLocaleString()}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ height: 7, borderRadius: 4, bgcolor: alpha(color, 0.12), overflow: 'hidden' }}>
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        width: `${(total / maxTotal) * 100}%`,
                                                        bgcolor: color,
                                                        borderRadius: 4,
                                                        transition: 'width 0.7s ease',
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default BitrixDashboard;
