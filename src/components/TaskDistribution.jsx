import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { distributeTaskColumn } from '../utils/taskDistributionAlgorithm';
import TaskColumnConfig from './TaskColumnConfig';

const TaskDistribution = ({ staffList, schedule, constraints, tasks, setTasks, onSaveToHistory, setConstraints }) => {
    const [hiddenColumns, setHiddenColumns] = useState(constraints.hiddenTaskColumns || []);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configColumnIndex, setConfigColumnIndex] = useState(null);

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

    // Calculate statistics per staff
    const calculateStaffStats = () => {
        const stats = {};
        staffList.forEach(staff => {
            stats[staff.id] = { name: staff.name, seniority: staff.seniority, counts: {} };
            taskColumns.forEach((_, idx) => {
                stats[staff.id].counts[idx] = 0;
            });
        });

        days.forEach(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayTasks = tasks[dateString] || {};

            taskColumns.forEach((_, idx) => {
                const assigned = dayTasks[idx];
                if (assigned) {
                    const ids = Array.isArray(assigned) ? assigned : [assigned];
                    ids.forEach(id => {
                        if (stats[id]) {
                            stats[id].counts[idx]++;
                        }
                    });
                }
            });
        });

        return Object.values(stats).sort((a, b) => b.seniority - a.seniority);
    };

    const staffStats = calculateStaffStats();

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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left', minWidth: '90px' }}>Tarih</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', minWidth: '100px' }}>{shiftColumnNames[0]}</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left', minWidth: '100px' }}>{shiftColumnNames[1]}</th>
                            {taskColumns.map((col, idx) => {
                                if (hiddenColumns.includes(idx)) return null;

                                const config = constraints.taskColumnConfig?.[idx] || {};
                                const maxPerDay = config.maxPerDay || 1;

                                // Create sub-columns
                                return Array.from({ length: maxPerDay }).map((_, subIdx) => (
                                    <th key={`${idx}-${subIdx}`} style={{ padding: '6px 8px', textAlign: 'left', minWidth: '110px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{col} {maxPerDay > 1 ? (subIdx + 1) : ''}</span>
                                            {subIdx === 0 && (
                                                <div className="no-print" style={{ display: 'flex', gap: '4px' }}>
                                                    <button
                                                        onClick={() => setConfigColumnIndex(idx)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}
                                                        title="Ayarlar"
                                                    >
                                                        ⚙️
                                                    </button>
                                                    <button
                                                        onClick={() => handleAutoDistribute(idx, true)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}
                                                        title="Boşları Doldur"
                                                    >
                                                        ➕
                                                    </button>
                                                    <button
                                                        onClick={() => handleAutoDistribute(idx, false)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}
                                                        title="Sıfırdan Dağıt"
                                                    >
                                                        🔄
                                                    </button>
                                                    <button
                                                        onClick={() => toggleColumnVisibility(idx)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}
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
                                <tr key={dateString} style={{ borderBottom: '1px solid var(--color-border)' }}>
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

                                            return (
                                                <td key={`${idx}-${subIdx}`} style={{ padding: '2px 4px' }}>
                                                    <select
                                                        value={assignedId || ""}
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
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 2px',
                                                            borderRadius: '4px',
                                                            border: '1px solid var(--color-border)',
                                                            background: 'var(--color-bg)',
                                                            color: 'var(--color-text)',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            outline: 'none'
                                                        }}
                                                    >
                                                        <option value="" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>-</option>

                                                        <optgroup label="✅ Müsait Olanlar" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                                                            {freeStaff.map(s => (
                                                                <option
                                                                    key={s.id}
                                                                    value={s.id}
                                                                    style={{
                                                                        background: 'var(--color-surface)',
                                                                        color: getSeniorityColor(s.seniority),
                                                                        fontWeight: '700'
                                                                    }}
                                                                >
                                                                    {s.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>

                                                        <optgroup label="❌ Meşgul / İzinli" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                                                            {busyStaff.map(s => (
                                                                <option
                                                                    key={s.id}
                                                                    value={s.id}
                                                                    style={{
                                                                        background: 'var(--color-surface)',
                                                                        color: 'var(--color-text-muted)',
                                                                        fontStyle: 'italic'
                                                                    }}
                                                                >
                                                                    {s.name} ({s.reason})
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                </td>
                                            );
                                        });
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Statistics Panel */}
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px' }} className="no-print">
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>📊 Görev İstatistikleri</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {staffStats.map(stat => (
                            <div key={stat.name} style={{ padding: '8px', background: 'var(--color-bg)', borderRadius: '6px', fontSize: '0.75rem' }}>
                                <div style={{ fontWeight: '600', color: getSeniorityColor(stat.seniority), marginBottom: '4px' }}>
                                    {stat.name}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {taskColumns.map((col, idx) => {
                                        if (hiddenColumns.includes(idx)) return null;
                                        return (
                                            <span key={idx} style={{ color: 'var(--color-text-muted)' }}>
                                                {col}: <b style={{ color: 'var(--color-primary)' }}>{stat.counts[idx]}</b>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
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
