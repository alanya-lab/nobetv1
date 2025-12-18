import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';

const TaskDistribution = ({ staffList, schedule, constraints, tasks, setTasks }) => {
    // 1. Initialize or get selected month
    const selectedDate = constraints.selectedMonth ? new Date(constraints.selectedMonth + '-01') : new Date();
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 2. Get Task Columns (default if not set)
    const taskColumns = constraints.taskColumns || [];

    // 3. Helper: Get available staff for a specific day and task
    const getAvailableStaff = (dateString, currentTaskIndex) => {
        const dayDate = new Date(dateString);
        const prevDate = subDays(dayDate, 1);
        const prevDateString = format(prevDate, 'yyyy-MM-dd');

        // Get staff who worked the previous night (Shift)
        const prevShiftStaff = schedule && schedule[prevDateString] ? schedule[prevDateString] : [];
        const prevShiftIds = prevShiftStaff.map(s => s.id);

        // Get staff already assigned to OTHER tasks on THIS day
        const dayTasks = tasks[dateString] || {};
        const assignedToOtherTasksIds = [];
        taskColumns.forEach((col, idx) => {
            if (idx !== currentTaskIndex && dayTasks[idx]) {
                assignedToOtherTasksIds.push(dayTasks[idx]);
            }
        });

        return staffList.filter(staff => {
            // Filter 1: Is on leave?
            const isLeave = staff.leaveDays && staff.leaveDays.includes(format(dayDate, 'yyyy-MM-dd'));
            if (isLeave) return false;

            // Filter 2: Worked previous night shift?
            if (prevShiftIds.includes(staff.id)) return false;

            // Filter 3: Already assigned to another task today?
            if (assignedToOtherTasksIds.includes(staff.id)) return false;

            return true;
        });
    };

    // 4. Handle Assignment Change
    const handleTaskChange = (dateString, taskIndex, staffId) => {
        setTasks(prev => {
            const dayTasks = prev[dateString] || {};
            const newDayTasks = { ...dayTasks };

            if (staffId === "") {
                delete newDayTasks[taskIndex];
            } else {
                newDayTasks[taskIndex] = parseInt(staffId);
            }

            return {
                ...prev,
                [dateString]: newDayTasks
            };
        });
    };

    // 5. Calculate Stats per Day
    const getDayStats = (dateString) => {
        const dayTasks = tasks[dateString] || {};
        const assignedCount = Object.keys(dayTasks).length;

        // Calculate total available staff (not on leave, not post-shift)
        const dayDate = new Date(dateString);
        const prevDate = subDays(dayDate, 1);
        const prevDateString = format(prevDate, 'yyyy-MM-dd');
        const prevShiftStaff = schedule && schedule[prevDateString] ? schedule[prevDateString] : [];
        const prevShiftIds = prevShiftStaff.map(s => s.id);

        const availableStaff = staffList.filter(staff => {
            const isLeave = staff.leaveDays && staff.leaveDays.includes(dateString);
            if (isLeave) return false;
            if (prevShiftIds.includes(staff.id)) return false;
            return true;
        });

        const totalAvailable = availableStaff.length;
        const remaining = totalAvailable - assignedCount;

        // Get names of unassigned staff
        const assignedIds = Object.values(dayTasks);
        const unassignedNames = availableStaff
            .filter(s => !assignedIds.includes(s.id))
            .map(s => s.name || `${s.firstName} ${s.lastName}`);

        return { totalAvailable, assignedCount, remaining, unassignedNames };
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
            <h3 style={{ marginBottom: '16px' }}>Günlük Görev Dağılımı</h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr style={{ background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', minWidth: '120px' }}>Tarih</th>
                        {taskColumns.map((col, idx) => (
                            <th key={idx} style={{ padding: '10px', textAlign: 'left', minWidth: '150px' }}>{col}</th>
                        ))}
                        <th style={{ padding: '10px', textAlign: 'left', minWidth: '200px' }}>Durum</th>
                    </tr>
                </thead>
                <tbody>
                    {days.map(day => {
                        const dateString = format(day, 'yyyy-MM-dd');
                        const dayName = format(day, 'd MMMM EEEE', { locale: tr });
                        const stats = getDayStats(dateString);
                        const dayTasks = tasks[dateString] || {};

                        return (
                            <tr key={dateString} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '8px', fontWeight: '500' }}>{dayName}</td>
                                {taskColumns.map((col, idx) => {
                                    const assignedId = dayTasks[idx];
                                    const availableStaff = getAvailableStaff(dateString, idx);

                                    // If currently assigned person is not in available list (e.g. became unavailable later), add them back to option
                                    // so we can see who it is
                                    const currentStaff = staffList.find(s => s.id === assignedId);

                                    return (
                                        <td key={idx} style={{ padding: '4px' }}>
                                            <select
                                                value={assignedId || ""}
                                                onChange={(e) => handleTaskChange(dateString, idx, e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--color-border)',
                                                    background: assignedId ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                <option value="">- Seçiniz -</option>
                                                {currentStaff && !availableStaff.find(s => s.id === currentStaff.id) && (
                                                    <option value={currentStaff.id}>
                                                        {currentStaff.name} (Uygun Değil!)
                                                    </option>
                                                )}
                                                {availableStaff.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    );
                                })}
                                <td style={{ padding: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                                        <div>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Müsait:</span> <b>{stats.totalAvailable}</b>
                                            <span style={{ margin: '0 4px', color: '#e2e8f0' }}>|</span>
                                            <span style={{ color: 'var(--color-primary)' }}>Atanan:</span> <b>{stats.assignedCount}</b>
                                        </div>
                                        {stats.unassignedNames.length > 0 ? (
                                            <div style={{ color: '#f59e0b', marginTop: '2px', lineHeight: '1.2' }} title={stats.unassignedNames.join(', ')}>
                                                Boşta: {stats.unassignedNames.slice(0, 3).join(', ')}
                                                {stats.unassignedNames.length > 3 && ` +${stats.unassignedNames.length - 3}`}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#22c55e' }}>✓ Herkes atandı</div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TaskDistribution;
