import React, { useState } from 'react';
import { isWeekend, parseISO } from 'date-fns';

const Statistics = ({ staffList, schedule, constraints }) => {
    const [showLogs, setShowLogs] = useState(true);

    if (!schedule) return null;

    // Get algorithm logs
    const logs = schedule._logs || [];

    // Calculate stats with weekday/weekend breakdown
    const stats = staffList.map(staff => {
        let shiftCount = 0;
        let weekdayShifts = 0;
        let weekendShifts = 0;

        Object.entries(schedule).forEach(([dateString, assigned]) => {
            if (dateString.startsWith('_')) return;
            if (assigned.find(s => s.id === staff.id)) {
                shiftCount++;
                const date = parseISO(dateString);
                if (isWeekend(date)) {
                    weekendShifts++;
                } else {
                    weekdayShifts++;
                }
            }
        });

        const staffStat = schedule._staffStats?.[staff.id];
        const targetShifts = staffStat?.targetShifts || 0;
        const targetDiff = shiftCount - targetShifts;
        const targetDetails = schedule._targetDetails?.[staff.id];

        return {
            ...staff,
            shiftCount,
            weekdayShifts,
            weekendShifts,
            targetShifts,
            targetDiff,
            totalHours: shiftCount * (constraints?.shiftDuration || 8),
            leaveDays: targetDetails?.leaveDays || 0,
            targetReduced: targetDetails?.targetReduced || false
        };
    });

    stats.sort((a, b) => a.seniority - b.seniority);

    const getSeniorityColor = (seniority) => {
        const colors = {
            1: '#ef4444', // Red
            2: '#f97316', // Orange
            3: '#f59e0b', // Amber
            4: '#eab308', // Yellow
            5: '#84cc16', // Lime
            6: '#22c55e', // Green
            7: '#10b981', // Emerald
            8: '#06b6d4', // Cyan
            9: '#3b82f6', // Blue
            10: '#8b5cf6' // Violet
        };
        const color = colors[seniority] || '#6b7280';
        return { bg: `${color}26`, text: color };
    };

    const getLogStyle = (type) => {
        switch (type) {
            case 'success': return { bg: 'rgba(34, 197, 94, 0.1)', border: '#4ade80' };
            case 'warning': return { bg: 'rgba(245, 158, 11, 0.1)', border: '#fbbf24' };
            case 'error': return { bg: 'rgba(239, 68, 68, 0.1)', border: '#f87171' };
            default: return { bg: 'rgba(99, 102, 241, 0.1)', border: '#818cf8' };
        }
    };

    const totalShifts = stats.reduce((a, b) => a + b.shiftCount, 0);
    const totalWeekday = stats.reduce((a, b) => a + b.weekdayShifts, 0);
    const totalWeekend = stats.reduce((a, b) => a + b.weekendShifts, 0);

    return (
        <>
            {/* Summary Report Card */}
            {logs.length > 0 && (
                <div className="card" style={{ marginBottom: '16px' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: showLogs ? '16px' : '0',
                            cursor: 'pointer'
                        }}
                        onClick={() => setShowLogs(!showLogs)}
                    >
                        <h3 style={{ margin: 0 }}>📋 Özet Rapor</h3>
                        <button style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '4px 8px'
                        }}>
                            {showLogs ? '▼' : '▶'}
                        </button>
                    </div>

                    {showLogs && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            {logs.map((log, idx) => {
                                const style = getLogStyle(log.type);
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            backgroundColor: style.bg,
                                            borderLeft: `3px solid ${style.border}`,
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <span>{log.icon}</span>
                                        <span>{log.message}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Statistics Card */}
            <div className="card">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <h3 style={{ margin: 0 }}>📊 İstatistikler</h3>
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-muted)'
                    }}>
                        <span><strong style={{ color: 'var(--color-text)' }}>{totalShifts}</strong> toplam</span>
                        <span><strong style={{ color: '#4ade80' }}>{totalWeekday}</strong> hafta içi</span>
                        <span><strong style={{ color: '#a78bfa' }}>{totalWeekend}</strong> hafta sonu</span>
                    </div>
                </div>

                {/* Seniority Legend */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    fontSize: '0.75rem'
                }}>
                    {[
                        { label: '1 (En Çok)', color: '#ef4444' },
                        { label: '5 (Orta)', color: '#84cc16' },
                        { label: '10 (En Az)', color: '#8b5cf6' }
                    ].map(item => (
                        <div key={item.label} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--color-bg)'
                        }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: item.color
                            }} />
                            <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                        </div>
                    ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '700px' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Personel</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '70px' }}>Kıdem</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>İzin</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '70px' }}>Hedef</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '70px' }}>Toplam</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Hafta İçi</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>H. Sonu</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '70px' }}>Saat</th>
                                <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map(staff => {
                                const colors = getSeniorityColor(staff.seniority);
                                return (
                                    <tr key={staff.id}>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>
                                            {staff.name || `${staff.firstName} ${staff.lastName}`}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                backgroundColor: colors.bg,
                                                color: colors.text
                                            }}>
                                                {staff.seniority}
                                            </span>
                                        </td>
                                        <td style={{
                                            padding: '12px',
                                            textAlign: 'center',
                                            color: staff.leaveDays > 0
                                                ? (staff.targetReduced ? '#fbbf24' : 'var(--color-text-muted)')
                                                : 'var(--color-text-muted)'
                                        }}>
                                            {staff.leaveDays > 0 ? (
                                                <span title={staff.targetReduced ? 'Hedef düşürüldü' : 'Hedef etkilenmedi'}>
                                                    {staff.leaveDays}g {staff.targetReduced && '↓'}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            {staff.targetShifts}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700', fontSize: '1.1rem' }}>
                                            {staff.shiftCount}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {staff.weekdayShifts}
                                        </td>
                                        <td style={{
                                            padding: '12px',
                                            textAlign: 'center',
                                            color: staff.weekendShifts > 0 ? '#a78bfa' : 'inherit'
                                        }}>
                                            {staff.weekendShifts}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            {staff.totalHours}h
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {staff.targetDiff === 0 ? (
                                                <span style={{ color: '#4ade80' }}>✓</span>
                                            ) : staff.targetDiff > 0 ? (
                                                <span style={{ color: '#fbbf24' }}>+{staff.targetDiff}</span>
                                            ) : (
                                                <span style={{ color: 'var(--color-text-muted)' }}>{staff.targetDiff}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default Statistics;

