import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { distributeTaskColumn } from '../utils/taskDistributionAlgorithm';
import TaskColumnConfig from './TaskColumnConfig';

const TaskDistribution = ({ staffList, schedule, constraints, tasks, setTasks, onSaveToHistory, setConstraints }) => {
    const [hiddenColumns, setHiddenColumns] = useState(constraints.hiddenTaskColumns || []);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configColumnIndex, setConfigColumnIndex] = useState(null);
    const [activeStatsTab, setActiveStatsTab] = useState(0);
    const [editingCell, setEditingCell] = useState(null); // {dateString, columnIdx, subIdx}
    const [leaveColumnName, setLeaveColumnName] = useState(constraints.leaveColumnName || 'İzinli');
    const [editingLeaveColumnName, setEditingLeaveColumnName] = useState(false);

    // Helper: Get Seniority Color
    const getSeniorityColor = (seniority) => {
        if (!seniority) return 'var(--color-text)';
        const colors = {
            1: '#ef4444', 2: '#f97316', 3: '#f59e0b', 4: '#eab308', 5: '#84cc16',
            6: '#22c55e', 7: '#10b981', 8: '#14b8a6', 9: '#06b6d4', 10: '#3b82f6'
        };
        return colors[seniority] || 'var(--color-text)';
    };

    const handlePrint = () => {
        window.print();
    };

    // Initialize month
    const selectedDate = constraints.selectedMonth ? new Date(constraints.selectedMonth + '-01') : new Date();
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const taskColumns = constraints.taskColumns || [];
    const shiftColumnNames = constraints.shiftColumnNames || ['Nöbetçi 1', 'Nöbetçi 2'];

    // Helper: Check if date is a Turkish public holiday
    const isTurkishHoliday = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // Fixed holidays
        const fixedHolidays = [
            { month: 1, day: 1 },   // Yılbaşı
            { month: 4, day: 23 },  // 23 Nisan
            { month: 5, day: 1 },   // İşçi Bayramı
            { month: 5, day: 19 },  // 19 Mayıs
            { month: 7, day: 15 },  // 15 Temmuz
            { month: 8, day: 30 },  // 30 Ağustos
            { month: 10, day: 29 }, // 29 Ekim
        ];

        // Religious holidays (approximate - these change yearly)
        const religiousHolidays2024 = [
            { month: 4, day: 10 }, { month: 4, day: 11 }, { month: 4, day: 12 }, // Ramazan 2024
            { month: 6, day: 16 }, { month: 6, day: 17 }, { month: 6, day: 18 }, { month: 6, day: 19 }, // Kurban 2024
        ];

        const religiousHolidays2025 = [
            { month: 3, day: 30 }, { month: 3, day: 31 }, { month: 4, day: 1 }, // Ramazan 2025
            { month: 6, day: 6 }, { month: 6, day: 7 }, { month: 6, day: 8 }, { month: 6, day: 9 }, // Kurban 2025
        ];

        const checkHoliday = (holidays) => holidays.some(h => h.month === month && h.day === day);

        if (checkHoliday(fixedHolidays)) return true;
        if (year === 2024 && checkHoliday(religiousHolidays2024)) return true;
        if (year === 2025 && checkHoliday(religiousHolidays2025)) return true;

        return false;
    };

    // Helper: Get row background color based on day type
    const getRowBackgroundColor = (date) => {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = isTurkishHoliday(date);

        if (isHoliday) return 'rgba(239, 68, 68, 0.1)'; // Light red for holidays
        if (isWeekend) return 'rgba(147, 51, 234, 0.08)'; // Light purple for weekends
        return 'transparent';
    };

    // Helper: Get available staff for a specific day and task
    const getAvailableStaff = (dateString, currentTaskIndex, currentSubIdx) => {
        const dayDate = new Date(dateString);
        const prevDate = subDays(dayDate, 1);
        const prevDateString = format(prevDate, 'yyyy-MM-dd');

        const prevShiftStaff = schedule && schedule[prevDateString] ? schedule[prevDateString] : [];
        const prevShiftIds = prevShiftStaff.map(s => s.id);

        const dayTasks = tasks[dateString] || {};

        return staffList.map(staff => {
            let status = 'available';
            let reason = '';

            // 1. Check Leave
            const isLeave = staff.leaveDays && staff.leaveDays.includes(dateString);
            const isUnavailable = staff.unavailability && staff.unavailability.includes(dateString);
            if (isLeave) {
                status = 'busy';
                reason = 'İzinli';
            } else if (isUnavailable) {
                status = 'busy';
                reason = 'Müsait Değil';
            }
            // 2. Check Previous Night Shift
            else if (prevShiftIds.includes(staff.id)) {
                status = 'busy';
                reason = 'Nöbet Ertesi';
            }
            // 3. Check Other Task Columns
            else {
                for (let idx = 0; idx < taskColumns.length; idx++) {
                    const assigned = dayTasks[idx];
                    const assignedArray = Array.isArray(assigned) ? assigned : (assigned ? [assigned] : []);

                    if (idx === currentTaskIndex) {
                        // Check other slots in the SAME column
                        if (assignedArray.some((id, sIdx) => id === staff.id && sIdx !== currentSubIdx)) {
                            status = 'busy';
                            reason = 'Aynı Görev (Diğer Slot)';
                            break;
                        }
                    } else {
                        // Check other columns
                        if (assignedArray.includes(staff.id)) {
                            status = 'busy';
                            reason = 'Başka Görev';
                            break;
                        }
                    }
                }
            }

            return { ...staff, status, reason };
        });
    };

    // Toggle column visibility
    const toggleColumnVisibility = (columnIndex) => {
        const newHidden = hiddenColumns.includes(columnIndex)
            ? hiddenColumns.filter(i => i !== columnIndex)
            : [...hiddenColumns, columnIndex];

        setHiddenColumns(newHidden);

        // Save to constraints
        setConstraints(prev => ({
            ...prev,
            hiddenTaskColumns: newHidden
        }));
    };

    // Auto-distribute for a column
    const handleAutoDistribute = (columnIndex, fillEmptyOnly) => {
        const columnConfig = constraints.taskColumnConfig?.[columnIndex] || {};

        if (!columnConfig.eligibleStaffIds && !columnConfig.eligibleSeniorities) {
            alert('Bu sütun için önce ayarları yapılandırın (⚙️ butonuna tıklayın)');
            return;
        }

        const confirmMsg = fillEmptyOnly
            ? 'Boş hücreleri otomatik doldurmak istiyor musunuz?'
            : 'Mevcut atamaları silip sıfırdan dağıtmak istiyor musunuz?';

        if (!window.confirm(confirmMsg)) return;

        const newTasks = distributeTaskColumn({
            days,
            staffList,
            schedule,
            currentTasks: tasks,
            columnConfig,
            columnIndex,
            fillEmptyOnly
        });

        setTasks(newTasks);
    };

    // Save leave column name to constraints
    const handleLeaveColumnNameChange = (newName) => {
        setLeaveColumnName(newName);
        setConstraints(prev => ({
            ...prev,
            leaveColumnName: newName
        }));
    };

    // Get staff on leave for a specific day
    const getLeaveStaff = (dateString) => {
        return staffList.filter(staff => staff.leaveDays && staff.leaveDays.includes(dateString));
    };

    // Calculate day-based statistics for a specific column (person x weekday)
    const calculateColumnDayStats = (columnIndex) => {
        const stats = {};

        staffList.forEach(staff => {
            stats[staff.id] = {
                name: staff.name,
                seniority: staff.seniority,
                days: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, // Sunday=0, Monday=1, ..., Saturday=6
                total: 0
            };
        });

        days.forEach(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayTasks = tasks[dateString] || {};
            const dayOfWeek = day.getDay();

            const assigned = dayTasks[columnIndex];
            if (assigned) {
                const ids = Array.isArray(assigned) ? assigned : [assigned];
                ids.forEach(id => {
                    if (stats[id]) {
                        stats[id].days[dayOfWeek]++;
                        stats[id].total++;
                    }
                });
            }
        });

        return Object.values(stats).sort((a, b) => b.seniority - a.seniority);
    };



    if (taskColumns.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <h3>Henüz görev sütunu eklenmemiş.</h3>
                <p>Lütfen "Ayarlar" sekmesinden görev tanımlarını (Ameliyat, Servis vb.) ekleyin.</p>
            </div>
        );
    }

    return (
        <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Günlük Görev Dağılımı</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handlePrint} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                        🖨️ Yazdır
                    </button>
                    {onSaveToHistory && (
                        <button onClick={onSaveToHistory} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                            💾 Kaydet
                        </button>
                    )}
                </div>
            </div>

            <div className="print-area">
                <table style={{ width: 'auto', borderCollapse: 'collapse', fontSize: '0.75rem', tableLayout: 'auto' }}>
                    <thead>
                        <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>Tarih</th>
                            <th style={{ padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>{shiftColumnNames[0]}</th>
                            <th style={{ padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>{shiftColumnNames[1]}</th>
                            {taskColumns.map((col, idx) => {
                                if (hiddenColumns.includes(idx)) return null;

                                const config = constraints.taskColumnConfig?.[idx] || {};
                                const maxPerDay = config.maxPerDay || 1;

                                // Create sub-columns
                                return Array.from({ length: maxPerDay }).map((_, subIdx) => (
                                    <th key={`${idx}-${subIdx}`} style={{ padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontSize: '0.7rem' }}>{col}{maxPerDay > 1 ? ` ${subIdx + 1}` : ''}</span>
                                            {subIdx === 0 && (
                                                <div className="no-print" style={{ display: 'flex', gap: '2px' }}>
                                                    <button
                                                        onClick={() => setConfigColumnIndex(idx)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '1px' }}
                                                        title="Ayarlar"
                                                    >
                                                        ⚙️
                                                    </button>
                                                    <button
                                                        onClick={() => handleAutoDistribute(idx, true)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '1px' }}
                                                        title="Boşları Doldur"
                                                    >
                                                        ➕
                                                    </button>
                                                    <button
                                                        onClick={() => handleAutoDistribute(idx, false)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '1px' }}
                                                        title="Sıfırdan Dağıt"
                                                    >
                                                        🔄
                                                    </button>
                                                    <button
                                                        onClick={() => toggleColumnVisibility(idx)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '1px' }}
                                                        title="Gizle"
                                                    >
                                                        👁️
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                ));
                            })}
                            {/* Leave Column Header */}
                            <th style={{ padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap', background: 'rgba(239, 68, 68, 0.1)' }}>
                                {editingLeaveColumnName ? (
                                    <input
                                        type="text"
                                        value={leaveColumnName}
                                        onChange={(e) => setLeaveColumnName(e.target.value)}
                                        onBlur={() => {
                                            setEditingLeaveColumnName(false);
                                            handleLeaveColumnNameChange(leaveColumnName);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setEditingLeaveColumnName(false);
                                                handleLeaveColumnNameChange(leaveColumnName);
                                            }
                                        }}
                                        autoFocus
                                        style={{
                                            fontSize: '0.7rem',
                                            padding: '2px 4px',
                                            border: '1px solid var(--color-primary)',
                                            borderRadius: '3px',
                                            background: 'var(--color-bg)',
                                            color: 'var(--color-text)',
                                            width: '80px'
                                        }}
                                    />
                                ) : (
                                    <span
                                        onClick={() => setEditingLeaveColumnName(true)}
                                        style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                                        title="Sütun adını değiştirmek için tıklayın"
                                    >
                                        {leaveColumnName} ✏️
                                    </span>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => {
                            const dateString = format(day, 'yyyy-MM-dd');
                            const dayName = format(day, 'd MMM EEE', { locale: tr });
                            const dayTasks = tasks[dateString] || {};

                            // Get staff on shift for this day (sorted by seniority)
                            const shiftStaff = schedule && schedule[dateString] ? [...schedule[dateString]] : [];
                            shiftStaff.sort((a, b) => b.seniority - a.seniority);
                            const shiftStaff1 = shiftStaff[0];
                            const shiftStaff2 = shiftStaff[1];

                            return (
                                <tr key={dateString} style={{ borderBottom: '1px solid var(--color-border)', background: getRowBackgroundColor(day) }}>
                                    <td style={{ padding: '4px 8px', fontWeight: '500', fontSize: '0.75rem' }}>{dayName}</td>

                                    {/* Shift Columns */}
                                    <td style={{ padding: '4px 8px', color: shiftStaff1 ? getSeniorityColor(shiftStaff1.seniority) : 'inherit', fontWeight: '500', fontSize: '0.75rem' }}>
                                        {shiftStaff1 ? shiftStaff1.name : '-'}
                                    </td>
                                    <td style={{ padding: '4px 8px', color: shiftStaff2 ? getSeniorityColor(shiftStaff2.seniority) : 'inherit', fontWeight: '500', fontSize: '0.75rem' }}>
                                        {shiftStaff2 ? shiftStaff2.name : '-'}
                                    </td>

                                    {taskColumns.map((col, idx) => {
                                        if (hiddenColumns.includes(idx)) return null;

                                        const config = constraints.taskColumnConfig?.[idx] || {};
                                        const maxPerDay = config.maxPerDay || 1;
                                        const assignedIds = dayTasks[idx];
                                        const assignedArray = Array.isArray(assignedIds) ? assignedIds : (assignedIds ? [assignedIds] : []);

                                        return Array.from({ length: maxPerDay }).map((_, subIdx) => {
                                            const assignedId = assignedArray[subIdx];
                                            const allStaffStatus = getAvailableStaff(dateString, idx, subIdx);
                                            const freeStaff = allStaffStatus.filter(s => s.status === 'available');
                                            const busyStaff = allStaffStatus.filter(s => s.status === 'busy');

                                            const isEditing = editingCell?.dateString === dateString &&
                                                editingCell?.columnIdx === idx &&
                                                editingCell?.subIdx === subIdx;

                                            const assignedStaff = staffList.find(s => s.id === assignedId);

                                            return (
                                                <td key={`${idx}-${subIdx}`} style={{ padding: '2px 4px', minWidth: '80px' }}>
                                                    {isEditing ? (
                                                        <select
                                                            value={assignedId || ""}
                                                            autoFocus
                                                            onBlur={() => setEditingCell(null)}
                                                            onChange={(e) => {
                                                                const newId = e.target.value ? parseInt(e.target.value) : null;
                                                                setTasks(prev => {
                                                                    const dayTasks = prev[dateString] || {};
                                                                    const currentAssigned = dayTasks[idx];
                                                                    const currentArray = Array.isArray(currentAssigned) ? currentAssigned : (currentAssigned ? [currentAssigned] : []);

                                                                    const newArray = [...currentArray];
                                                                    if (newId) {
                                                                        newArray[subIdx] = newId;
                                                                    } else {
                                                                        newArray.splice(subIdx, 1);
                                                                    }

                                                                    const filtered = newArray.filter(id => id != null);

                                                                    return {
                                                                        ...prev,
                                                                        [dateString]: {
                                                                            ...dayTasks,
                                                                            [idx]: filtered.length > 0 ? filtered : undefined
                                                                        }
                                                                    };
                                                                });
                                                                setEditingCell(null);
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '2px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: '600',
                                                                outline: 'none'
                                                            }}
                                                        >
                                                            <option value="">-</option>
                                                            <optgroup label="✅ Müsait Olanlar">
                                                                {freeStaff.map(s => (
                                                                    <option key={s.id} value={s.id} style={{ color: getSeniorityColor(s.seniority) }}>
                                                                        {s.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label="❌ Meşgul / İzinli">
                                                                {busyStaff.map(s => (
                                                                    <option key={s.id} value={s.id} disabled style={{ fontStyle: 'italic' }}>
                                                                        {s.name} ({s.reason})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        </select>
                                                    ) : (
                                                        <div
                                                            onClick={() => setEditingCell({ dateString, columnIdx: idx, subIdx })}
                                                            style={{
                                                                cursor: 'pointer',
                                                                padding: '2px 4px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: assignedStaff ? '600' : '400',
                                                                color: assignedStaff ? getSeniorityColor(assignedStaff.seniority) : 'var(--color-text-muted)',
                                                                minHeight: '20px',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            {assignedStaff ? assignedStaff.name : '-'}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        });
                                    })}

                                    {/* Leave Column */}
                                    <td style={{
                                        padding: '2px 6px',
                                        background: 'rgba(239, 68, 68, 0.05)',
                                        fontSize: '0.7rem',
                                        color: 'var(--color-text-muted)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {getLeaveStaff(dateString).map(s => s.name).join(', ') || '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>


                {/* Per-Column Statistics with Tabs */}
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px' }} className="no-print">
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>📊 Görev İstatistikleri</h4>

                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        {taskColumns.map((col, idx) => {
                            if (hiddenColumns.includes(idx)) return null;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setActiveStatsTab(idx)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: activeStatsTab === idx ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                        background: activeStatsTab === idx ? 'var(--color-primary)' : 'var(--color-bg)',
                                        color: activeStatsTab === idx ? 'white' : 'var(--color-text)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: activeStatsTab === idx ? '700' : '500',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {col}
                                </button>
                            );
                        })}
                    </div>

                    {/* Statistics Table for Active Column */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '600' }}>Personel</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>Pzt</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>Sal</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>Çar</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>Per</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>Cum</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', background: 'rgba(147, 51, 234, 0.1)' }}>Cmt</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', background: 'rgba(147, 51, 234, 0.1)' }}>Paz</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', background: 'var(--color-bg)' }}>Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calculateColumnDayStats(activeStatsTab).map(stat => (
                                    <tr key={stat.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '6px 8px', fontWeight: '600', color: getSeniorityColor(stat.seniority) }}>
                                            {stat.name}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{stat.days[1] || '-'}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{stat.days[2] || '-'}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{stat.days[3] || '-'}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{stat.days[4] || '-'}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{stat.days[5] || '-'}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', background: 'rgba(147, 51, 234, 0.05)' }}>{stat.days[6] || '-'}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', background: 'rgba(147, 51, 234, 0.05)' }}>{stat.days[0] || '-'}</td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', background: 'var(--color-bg)', color: 'var(--color-primary)' }}>
                                            {stat.total}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Hidden Columns Info */}
                {hiddenColumns.length > 0 && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: 'var(--color-bg)', borderRadius: '6px', fontSize: '0.75rem' }} className="no-print">
                        <b>Gizli Sütunlar:</b> {hiddenColumns.map(idx => taskColumns[idx]).join(', ')}
                        {' '}
                        <button
                            onClick={() => {
                                setHiddenColumns([]);
                                setConstraints(prev => ({ ...prev, hiddenTaskColumns: [] }));
                            }}
                            style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '0.7rem' }}
                            className="btn btn-ghost"
                        >
                            Tümünü Göster
                        </button>
                    </div>
                )}
            </div>

            {/* Configuration Modal */}
            {configColumnIndex !== null && (
                <TaskColumnConfig
                    columnIndex={configColumnIndex}
                    columnName={taskColumns[configColumnIndex]}
                    constraints={constraints}
                    setConstraints={setConstraints}
                    staffList={staffList}
                    onClose={() => setConfigColumnIndex(null)}
                />
            )}
        </div>
    );
};

export default TaskDistribution;
