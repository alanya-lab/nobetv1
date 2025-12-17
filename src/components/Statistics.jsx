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

    // 10-step Red-Violet Gradient (Infrared Style)
    const getSeniorityColor = (seniority) => {
        const colors = {
            1: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#fca5a5' }, // Red
            2: { bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316', text: '#fdba74' }, // Orange
            3: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#fcd34d' }, // Amber
            4: { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308', text: '#fde047' }, // Yellow
            5: { bg: 'rgba(132, 204, 22, 0.2)', border: '#84cc16', text: '#bef264' }, // Lime
            6: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#86efac' }, // Green
            7: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06b6d4', text: '#67e8f9' }, // Cyan
            8: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#93c5fd' }, // Blue
            9: { bg: 'rgba(99, 102, 241, 0.2)', border: '#6366f1', text: '#a5b4fc' }, // Indigo
            10: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8b5cf6', text: '#c4b5fd' } // Violet
        };
        return colors[seniority] || colors[10];
    };

    const totalShifts = stats.reduce((a, b) => a + b.shiftCount, 0);
    const totalWeekday = stats.reduce((a, b) => a + b.weekdayShifts, 0);
    const totalWeekend = stats.reduce((a, b) => a + b.weekendShifts, 0);

    return (
        <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                📊 İstatistikler ve Rapor
            </h3>

            {/* Seniority Legend */}
            <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '20px',
                flexWrap: 'wrap',
                background: 'rgba(0,0,0,0.2)',
                padding: '10px',
                borderRadius: '8px'
            }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginRight: '8px', alignSelf: 'center' }}>Kıdem Skalası:</span>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => {
                    const c = getSeniorityColor(s);
                    return (
                        <div key={s} style={{
                            backgroundColor: c.bg,
                            border: `1px solid ${c.border}`,
                            color: c.text,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                        }}>
                            {s}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Staff Stats */}
                <div>
                    <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }}>Personel Durumu</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                        {staffList.map(staff => {
                            const stat = stats.find(s => s.id === staff.id);
                            if (!stat) return null;
                            const colors = getSeniorityColor(staff.seniority);

                            // Calculate percentage of target reached
                            const percent = Math.min(100, Math.round((stat.shiftCount / stat.targetShifts) * 100));
                            const isTargetMet = stat.shiftCount === stat.targetShifts;
                            const isOver = stat.shiftCount > stat.targetShifts;

                            return (
                                <div key={staff.id} style={{
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--color-bg)',
                                    border: `1px solid ${colors.border}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{
                                            fontWeight: '600',
                                            color: colors.text,
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {staff.name} <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(K:{staff.seniority})</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                            Haftasonu: {stat.weekendShifts} | Haftaiçi: {stat.weekdayShifts}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            color: isOver ? '#f87171' : (isTargetMet ? '#4ade80' : 'var(--color-text)')
                                        }}>
                                            {stat.shiftCount} <span style={{ fontSize: '0.75rem', fontWeight: '400', color: 'var(--color-text-muted)' }}>/ {stat.targetShifts}</span>
                                        </div>
                                        <div style={{
                                            width: '50px',
                                            height: '3px',
                                            background: '#333',
                                            borderRadius: '2px',
                                            marginTop: '3px',
                                            overflow: 'hidden',
                                            marginLeft: 'auto'
                                        }}>
                                            <div style={{
                                                width: `${percent}%`,
                                                height: '100%',
                                                background: isOver ? '#f87171' : colors.border
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Algorithm Report */}
                <div>
                    <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }}>Algoritma Raporu</h4>
                    <div style={{
                        maxHeight: '500px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingRight: '4px'
                    }}>
                        {logs.map((log, idx) => {
                            let bg = 'var(--color-bg)';
                            let border = 'var(--color-border)';
                            let iconColor = 'var(--color-text)';

                            if (log.type === 'error') {
                                bg = 'rgba(239, 68, 68, 0.1)';
                                border = 'rgba(239, 68, 68, 0.3)';
                                iconColor = '#f87171';
                            } else if (log.type === 'warning') {
                                bg = 'rgba(245, 158, 11, 0.1)';
                                border = 'rgba(245, 158, 11, 0.3)';
                                iconColor = '#fbbf24';
                            } else if (log.type === 'success') {
                                bg = 'rgba(34, 197, 94, 0.1)';
                                border = 'rgba(34, 197, 94, 0.3)';
                                iconColor = '#4ade80';
                            } else if (log.type === 'info') {
                                bg = 'rgba(59, 130, 246, 0.1)';
                                border = 'rgba(59, 130, 246, 0.3)';
                                iconColor = '#60a5fa';
                            }

                            return (
                                <div key={idx} style={{
                                    padding: '10px',
                                    borderRadius: '6px',
                                    backgroundColor: bg,
                                    border: `1px solid ${border}`,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start'
                                }}>
                                    <span style={{ fontSize: '1.1rem', lineHeight: 1, color: iconColor }}>{log.icon}</span>
                                    <div>
                                        <div style={{ color: 'var(--color-text)', lineHeight: '1.4' }}>
                                            {log.message}
                                        </div>
                                        {log.details && (
                                            <div style={{
                                                marginTop: '4px',
                                                fontSize: '0.75rem',
                                                color: 'var(--color-text-muted)',
                                                fontStyle: 'italic'
                                            }}>
                                                {log.details}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {logs.length === 0 && (
                            <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '10px' }}>
                                Henüz rapor oluşturulmadı.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Statistics;
