import React, { useState } from 'react';
import { generateSchedule } from '../utils/schedulerAlgorithm';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWeekend, subDays, addDays as addDaysFns } from 'date-fns';
import { tr } from 'date-fns/locale';

const Scheduler = ({ staffList, constraints, schedule, setSchedule, onSaveToHistory }) => {
    const [editingDay, setEditingDay] = useState(null);
    const [copied, setCopied] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);

    // Use selected month or default to current
    const selectedDate = constraints.selectedMonth ? new Date(constraints.selectedMonth + '-01') : new Date();
    const monthTitle = format(selectedDate, 'MMMM yyyy', { locale: tr });

    const handleGenerate = () => {
        if (staffList.length === 0) {
            alert('Lütfen önce personel ekleyin.');
            return;
        }
        const newSchedule = generateSchedule(staffList, constraints, selectedDate);
        setSchedule(newSchedule);
    };

    // Remove staff from a specific day
    const removeFromDay = (dateString, staffId) => {
        setSchedule(prev => ({
            ...prev,
            [dateString]: prev[dateString].filter(s => s.id !== staffId)
        }));
    };

    // Add staff to a specific day
    const addToDay = (dateString, staff) => {
        setSchedule(prev => ({
            ...prev,
            [dateString]: [...(prev[dateString] || []), staff]
        }));
        setEditingDay(null);
    };

    // Get available staff for adding (not already assigned that day)
    const getAvailableStaff = (dateString) => {
        const assigned = schedule[dateString] || [];
        const assignedIds = assigned.map(s => s.id);
        return staffList.filter(s => !assignedIds.includes(s.id));
    };

    // Copy schedule to clipboard
    const copyToClipboard = () => {
        if (!schedule) return;

        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        let text = `Vardiya Çizelgesi - ${monthTitle}\n\n`;
        text += 'Tarih\tNöbetçi 1\tNöbetçi 2\n';
        text += '─'.repeat(60) + '\n';

        days.forEach(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const assigned = schedule[dateString] || [];

            // Format: "8 Ocak Perşembe"
            const fullDate = format(day, 'd MMMM EEEE', { locale: tr });

            // Get staff names
            const staff1 = assigned[0] ? (assigned[0].name || `${assigned[0].firstName} ${assigned[0].lastName}`) : '-';
            const staff2 = assigned[1] ? (assigned[1].name || `${assigned[1].firstName} ${assigned[1].lastName}`) : '-';

            // If there are more, add them too (just in case)
            let extraStaff = '';
            if (assigned.length > 2) {
                extraStaff = '\t' + assigned.slice(2).map(s => s.name || `${s.firstName} ${s.lastName}`).join('\t');
            }

            text += `${fullDate}\t${staff1}\t${staff2}${extraStaff}\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

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

    // Helper to check if staff is resting (checks both PAST and FUTURE assignments)
    const checkRestViolation = (staffId, targetDateStr) => {
        if (!schedule) return false;

        const targetDate = new Date(targetDateStr);
        const restDays = Math.ceil(constraints.minRestHours / 24);
        const requiredDayGap = 1 + restDays; // 1 (the day itself) + rest days

        for (let i = 1; i < requiredDayGap; i++) {
            // Check Past
            const pastDate = subDays(targetDate, i);
            const pastString = format(pastDate, 'yyyy-MM-dd');
            if (schedule[pastString]?.find(s => s.id === staffId)) return true;

            // Check Future
            const futureDate = addDaysFns(targetDate, i);
            const futureString = format(futureDate, 'yyyy-MM-dd');
            if (schedule[futureString]?.find(s => s.id === staffId)) return true;
        }
        return false;
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e, dateString, staff) => {
        setDraggedItem({ date: dateString, staff });
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedItem(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetDate, targetStaff) => {
        e.preventDefault();

        if (!draggedItem) return;

        const { date: sourceDate, staff: sourceStaff } = draggedItem;

        // Don't do anything if dropped on same person
        if (sourceDate === targetDate && sourceStaff.id === targetStaff.id) return;

        // Perform the swap
        setSchedule(prev => {
            const newSchedule = { ...prev };

            // Remove from old positions
            newSchedule[sourceDate] = newSchedule[sourceDate].filter(s => s.id !== sourceStaff.id);
            newSchedule[targetDate] = newSchedule[targetDate].filter(s => s.id !== targetStaff.id);

            // Add to new positions (Swap)
            newSchedule[sourceDate].push(targetStaff);
            newSchedule[targetDate].push(sourceStaff);

            return newSchedule;
        });
    };

    const renderCalendar = () => {
        if (!schedule) return (
            <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg)',
                borderRadius: '8px',
                border: '2px dashed var(--color-border)'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
                <p style={{ margin: 0 }}>Çizelge oluşturmak için butona tıklayın</p>
            </div>
        );

        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const startDay = getDay(monthStart);
        const placeholders = Array.from({ length: startDay }).map((_, i) => <div key={`placeholder-${i}`} />);

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '6px',
                marginTop: '16px'
            }}>
                {/* Day Headers */}
                {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day, idx) => (
                    <div key={day} style={{
                        fontWeight: '600',
                        textAlign: 'center',
                        padding: '10px 4px',
                        backgroundColor: idx === 0 || idx === 6
                            ? 'rgba(139, 92, 246, 0.2)'
                            : 'var(--color-bg)',
                        color: idx === 0 || idx === 6
                            ? '#a78bfa'
                            : 'var(--color-text-muted)',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>{day}</div>
                ))}

                {placeholders}

                {/* Days */}
                {days.map(day => {
                    const dateString = format(day, 'yyyy-MM-dd');
                    const assigned = schedule[dateString] || [];
                    const isWknd = isWeekend(day);
                    const isEditing = editingDay === dateString;

                    return (
                        <div key={dateString} style={{
                            border: isWknd
                                ? '1px solid rgba(139, 92, 246, 0.4)'
                                : '1px solid var(--color-border)',
                            borderRadius: '8px',
                            minHeight: '90px',
                            padding: '8px',
                            backgroundColor: isWknd
                                ? 'rgba(139, 92, 246, 0.1)'
                                : 'var(--color-bg)',
                            position: 'relative'
                        }}>
                            {/* Day Number */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px'
                            }}>
                                <span style={{
                                    fontWeight: '700',
                                    fontSize: '0.95rem',
                                    color: isWknd ? '#a78bfa' : 'var(--color-text)'
                                }}>
                                    {format(day, 'd')}
                                </span>
                                <button
                                    onClick={() => setEditingDay(isEditing ? null : dateString)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        opacity: 0.6,
                                        padding: '2px 4px'
                                    }}
                                    title="Düzenle"
                                >
                                    {isEditing ? '✕' : '✏️'}
                                </button>
                            </div>

                            {/* Assigned Staff */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {assigned.map(staff => {
                                    const colors = getSeniorityColor(staff.seniority);
                                    return (
                                        <div
                                            key={staff.id}
                                            draggable={!isEditing}
                                            onDragStart={(e) => handleDragStart(e, dateString, staff)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, dateString, staff)}
                                            className={checkRestViolation(staff.id, dateString) ? 'violation-blink' : ''}
                                            style={{
                                                fontSize: '0.75rem',
                                                padding: '3px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: colors.bg,
                                                color: colors.text,
                                                border: `1px solid ${colors.border}`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '4px',
                                                cursor: isEditing ? 'default' : 'grab',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                flex: 1,
                                                pointerEvents: 'none'
                                            }}>
                                                {staff.name || `${staff.firstName} ${staff.lastName?.charAt(0)}.`}
                                            </span>
                                            {isEditing && (
                                                <button
                                                    onClick={() => removeFromDay(dateString, staff.id)}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.3)',
                                                        border: 'none',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.7rem',
                                                        padding: '1px 4px',
                                                        color: '#fca5a5'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Staff Dropdown */}
                            {isEditing && (
                                <div style={{
                                    marginTop: '6px',
                                    position: 'relative'
                                }}>
                                    <select
                                        onChange={(e) => {
                                            const staff = staffList.find(s => s.id === parseInt(e.target.value));
                                            if (staff) addToDay(dateString, staff);
                                        }}
                                        value=""
                                        style={{
                                            width: '100%',
                                            padding: '4px',
                                            fontSize: '0.7rem',
                                            borderRadius: '4px',
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text)'
                                        }}
                                    >
                                        <option value="">+ Ekle...</option>
                                        {getAvailableStaff(dateString).map(staff => (
                                            <option key={staff.id} value={staff.id}>
                                                {staff.name} (K:{staff.seniority})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Download settings log
    const downloadSettingsLog = () => {
        let log = `NOBET CIZELGESI AYARLARI - ${format(new Date(), 'dd.MM.yyyy HH:mm')}\n`;
        log += `============================================\n\n`;

        log += `1. GENEL KISITLAMALAR\n`;
        log += `---------------------\n`;
        log += `Ay: ${monthTitle}\n`;
        log += `Maksimum Nöbet: ${constraints.maxShiftsPerMonth}\n`;
        log += `Min Dinlenme: ${constraints.minRestHours} saat\n`;
        log += `Vardiya Süresi: ${constraints.shiftDuration} saat\n`;
        log += `Slot Sistemi: ${constraints.slotSystem?.enabled ? 'Aktif' : 'Pasif'}\n\n`;

        log += `2. GUNLUK IHTIYACLAR\n`;
        log += `--------------------\n`;
        Object.entries(constraints.dailyNeeds).forEach(([day, count]) => {
            log += `${day}: ${count} kişi\n`;
        });
        log += `\n`;

        log += `3. PERSONEL LISTESI (${staffList.length} Kişi)\n`;
        log += `----------------------------------------\n`;
        staffList.forEach(staff => {
            log += `[ID: ${staff.id}] ${staff.name}\n`;
            log += `   - Kıdem: ${staff.seniority}\n`;
            log += `   - Müsait Değil: ${staff.unavailability?.join(', ') || 'Yok'}\n`;
            log += `   - İzinli: ${staff.leaveDays?.join(', ') || 'Yok'}\n`;
            log += `   - Kesin Nöbet: ${staff.requiredDays?.join(', ') || 'Yok'}\n`;
            log += `\n`;
        });

        const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nobet_ayarlari_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="card">
            <style>
                {`
                    @keyframes blink-violation {
                        0% { opacity: 1; }
                        50% { opacity: 0.4; background-color: rgba(239, 68, 68, 0.4) !important; }
                        100% { opacity: 1; }
                    }
                    .violation-blink {
                        animation: blink-violation 1.5s infinite ease-in-out;
                        border: 1.5px solid #ef4444 !important;
                        position: relative;
                        z-index: 1;
                    }
                    .violation-blink::after {
                        content: '⚠️';
                        position: absolute;
                        right: -2px;
                        top: -8px;
                        font-size: 0.7rem;
                    }
                `}
            </style>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <h3 style={{ margin: 0 }}>Aylık Çizelge</h3>
                    <div style={{
                        fontSize: '1.1em',
                        fontWeight: '600',
                        color: 'var(--color-primary-light)',
                        marginTop: '4px',
                        textTransform: 'capitalize'
                    }}>
                        📅 {monthTitle}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={downloadSettingsLog}
                        className="btn btn-ghost"
                        title="Tüm ayarları ve personel listesini indir"
                    >
                        ⚙️ Ayarları İndir
                    </button>
                    {schedule && (
                        <button
                            onClick={onSaveToHistory}
                            className="btn btn-ghost"
                            style={{ fontSize: '0.85rem' }}
                            title="Çizelgeyi geçmişe kaydet"
                        >
                            💾 Kaydet
                        </button>
                    )}
                    {schedule && (
                        <button
                            onClick={copyToClipboard}
                            className="btn btn-ghost"
                            style={{ fontSize: '0.85rem' }}
                        >
                            {copied ? '✓ Kopyalandı!' : '📋 Panoya Kopyala'}
                        </button>
                    )}
                    <button onClick={handleGenerate} className="btn btn-primary">
                        🔄 Çizelge Oluştur
                    </button>
                </div>
            </div>

            {schedule && (
                <div style={{
                    padding: '10px 12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>💡</span>
                    <span>İsimleri sürükleyip bırakarak yer değiştirebilirsiniz.</span>
                </div>
            )}

            {renderCalendar()}
        </div>
    );
};

export default Scheduler;
