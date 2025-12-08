import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';

const UnavailabilityGrid = ({ staffList, setStaffList, selectedMonth }) => {
    // 3 modes: 'unavailable' (preference), 'leave' (real leave - affects target), 'required' (must work)
    const [selectionMode, setSelectionMode] = useState('unavailable');

    const selectedDate = selectedMonth ? new Date(selectedMonth + '-01') : new Date();
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
    const monthTitle = format(selectedDate, 'MMMM yyyy', { locale: tr });

    const handleCellClick = (staffId, dateString) => {
        setStaffList(prevList =>
            prevList.map(staff => {
                if (staff.id !== staffId) return staff;

                const unavailability = staff.unavailability || [];
                const leaveDays = staff.leaveDays || [];
                const requiredDays = staff.requiredDays || [];

                if (selectionMode === 'unavailable') {
                    const isUnavailable = unavailability.includes(dateString);
                    return {
                        ...staff,
                        unavailability: isUnavailable
                            ? unavailability.filter(d => d !== dateString)
                            : [...unavailability, dateString],
                        // Clear from other arrays
                        leaveDays: leaveDays.filter(d => d !== dateString),
                        requiredDays: requiredDays.filter(d => d !== dateString)
                    };
                } else if (selectionMode === 'leave') {
                    const isLeave = leaveDays.includes(dateString);
                    return {
                        ...staff,
                        leaveDays: isLeave
                            ? leaveDays.filter(d => d !== dateString)
                            : [...leaveDays, dateString],
                        // Clear from other arrays
                        unavailability: unavailability.filter(d => d !== dateString),
                        requiredDays: requiredDays.filter(d => d !== dateString)
                    };
                } else {
                    const isRequired = requiredDays.includes(dateString);
                    return {
                        ...staff,
                        requiredDays: isRequired
                            ? requiredDays.filter(d => d !== dateString)
                            : [...requiredDays, dateString],
                        // Clear from other arrays
                        unavailability: unavailability.filter(d => d !== dateString),
                        leaveDays: leaveDays.filter(d => d !== dateString)
                    };
                }
            })
        );
    };

    const isUnavailable = (staff, dateString) => staff.unavailability?.includes(dateString);
    const isLeave = (staff, dateString) => staff.leaveDays?.includes(dateString);
    const isRequired = (staff, dateString) => staff.requiredDays?.includes(dateString);

    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    const getSeniorityColor = (seniority) => {
        if (seniority <= 2) return '#f87171';
        if (seniority <= 4) return '#fbbf24';
        if (seniority <= 6) return '#4ade80';
        if (seniority <= 8) return '#60a5fa';
        return '#a78bfa';
    };

    if (staffList.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                    Müsaitlik tablosu için önce personel ekleyin.
                </p>
            </div>
        );
    }

    return (
        <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: 0 }}>📅 Müsaitlik Takvimi</h3>
                    <div style={{
                        fontSize: '1.1em',
                        fontWeight: '600',
                        color: 'var(--color-primary-light)',
                        marginTop: '4px',
                        textTransform: 'capitalize'
                    }}>
                        {monthTitle}
                    </div>
                </div>
            </div>

            {/* Selection Mode Toggle - 3 BUTTONS */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                padding: '10px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: '8px',
                flexWrap: 'wrap'
            }}>
                <span style={{ fontWeight: '500', marginRight: '8px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>Mod:</span>
                <button
                    onClick={() => setSelectionMode('unavailable')}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        backgroundColor: selectionMode === 'unavailable' ? 'rgba(239, 68, 68, 0.2)' : 'var(--color-surface)',
                        color: selectionMode === 'unavailable' ? '#f87171' : 'var(--color-text-muted)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ✕ Müsait Değil
                </button>
                <button
                    onClick={() => setSelectionMode('leave')}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        backgroundColor: selectionMode === 'leave' ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-surface)',
                        color: selectionMode === 'leave' ? '#fbbf24' : 'var(--color-text-muted)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    🏖️ İzinli
                </button>
                <button
                    onClick={() => setSelectionMode('required')}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        backgroundColor: selectionMode === 'required' ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-surface)',
                        color: selectionMode === 'required' ? '#4ade80' : 'var(--color-text-muted)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ✓ Nöbet Yazılsın
                </button>
            </div>

            {/* Helper Text */}
            <div style={{
                marginBottom: '16px',
                padding: '10px 12px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)'
            }}>
                {selectionMode === 'unavailable' && (
                    <span>🔴 <strong>Müsait Değil:</strong> Tercih olarak işaretlenir, nöbet hedefini ETKİLEMEZ</span>
                )}
                {selectionMode === 'leave' && (
                    <span>🟡 <strong>İzinli:</strong> Gerçek izin günleri, 7+ gün ise nöbet hedefini DÜŞÜRÜR</span>
                )}
                {selectionMode === 'required' && (
                    <span>🟢 <strong>Nöbet Yazılsın:</strong> Bu günlerde mutlaka nöbet atanır</span>
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: `160px repeat(${days.length}, minmax(32px, 1fr))`,
                gap: '2px',
                fontSize: '0.75rem',
                minWidth: 'max-content'
            }}>
                {/* Header */}
                <div style={{
                    fontWeight: '600',
                    padding: '8px',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: '4px 0 0 0',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    color: 'var(--color-text-muted)'
                }}>
                    Personel
                </div>
                {days.map((day, idx) => {
                    const isWknd = isWeekend(day);
                    const dayOfWeek = getDay(day);
                    return (
                        <div
                            key={idx}
                            style={{
                                padding: '4px 2px',
                                textAlign: 'center',
                                fontWeight: '600',
                                backgroundColor: isWknd ? 'rgba(139, 92, 246, 0.2)' : 'var(--color-bg)',
                                color: isWknd ? '#a78bfa' : 'var(--color-text-muted)',
                                borderRadius: idx === days.length - 1 ? '0 4px 0 0' : '0'
                            }}
                        >
                            <div>{format(day, 'd')}</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{dayNames[dayOfWeek]}</div>
                        </div>
                    );
                })}

                {/* Staff Rows */}
                {staffList.map((staff, staffIdx) => (
                    <React.Fragment key={staff.id}>
                        <div style={{
                            padding: '8px',
                            backgroundColor: staffIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                            borderLeft: `3px solid ${getSeniorityColor(staff.seniority)}`
                        }}>
                            <span style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '130px'
                            }}>
                                {staff.name || `${staff.firstName} ${staff.lastName}`}
                            </span>
                        </div>

                        {days.map((day) => {
                            const dateString = format(day, 'yyyy-MM-dd');
                            const unavailable = isUnavailable(staff, dateString);
                            const leave = isLeave(staff, dateString);
                            const required = isRequired(staff, dateString);
                            const isWknd = isWeekend(day);

                            let bgColor = isWknd ? 'rgba(139, 92, 246, 0.1)' : (staffIdx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)');
                            let borderStyle = '1px solid var(--color-border)';
                            let icon = null;

                            if (unavailable) {
                                bgColor = 'rgba(239, 68, 68, 0.15)';
                                borderStyle = '2px solid #f87171';
                                icon = <span style={{ color: '#f87171' }}>✕</span>;
                            } else if (leave) {
                                bgColor = 'rgba(245, 158, 11, 0.15)';
                                borderStyle = '2px solid #fbbf24';
                                icon = <span style={{ color: '#fbbf24' }}>🏖️</span>;
                            } else if (required) {
                                bgColor = 'rgba(34, 197, 94, 0.15)';
                                borderStyle = '2px solid #4ade80';
                                icon = <span style={{ color: '#4ade80' }}>✓</span>;
                            }

                            return (
                                <div
                                    key={`${staff.id}-${dateString}`}
                                    onClick={() => handleCellClick(staff.id, dateString)}
                                    style={{
                                        padding: '4px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        backgroundColor: bgColor,
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '28px',
                                        border: borderStyle,
                                        fontSize: '0.9rem'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!unavailable && !leave && !required) {
                                            if (selectionMode === 'unavailable') {
                                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                            } else if (selectionMode === 'leave') {
                                                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                                            } else {
                                                e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                                            }
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!unavailable && !leave && !required) {
                                            e.currentTarget.style.backgroundColor = bgColor;
                                        }
                                    }}
                                >
                                    {icon}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginTop: '16px',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(139, 92, 246, 0.2)', borderRadius: '3px' }}></div>
                    <span>Hafta Sonu</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '2px solid #f87171', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#f87171', fontSize: '0.6rem' }}>✕</span>
                    </div>
                    <span>Müsait Değil (Tercih)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '2px solid #fbbf24', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.5rem' }}>🏖️</span>
                    </div>
                    <span>İzinli (Hedefi Etkiler)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: 'rgba(34, 197, 94, 0.2)', border: '2px solid #4ade80', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#4ade80', fontSize: '0.6rem' }}>✓</span>
                    </div>
                    <span>Nöbet Yazılsın</span>
                </div>
            </div>
        </div>
    );
};

export default UnavailabilityGrid;
