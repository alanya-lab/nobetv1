import React, { useState, useEffect } from 'react';
import StaffManager from './components/StaffManager';
import ConstraintsForm from './components/ConstraintsForm';
import UnavailabilityGrid from './components/UnavailabilityGrid';
import Scheduler from './components/Scheduler';
import Statistics from './components/Statistics';

import ExportTools from './components/ExportTools';
import TaskDistribution from './components/TaskDistribution';

function App() {
    // Load initial state from localStorage if available
    const [staffList, setStaffList] = useState(() => {
        const saved = localStorage.getItem('staffList');
        return saved ? JSON.parse(saved) : [];
    });

    const [constraints, setConstraints] = useState(() => {
        const saved = localStorage.getItem('constraints');
        const defaultConstraints = {
            dailyNeeds: {
                Monday: 2,
                Tuesday: 2,
                Wednesday: 2,
                Thursday: 2,
                Friday: 2,
                Saturday: 2,
                Sunday: 2
            },
            shiftDuration: 8,
            holidays: [],
            minShiftsPerMonth: 0,
            maxShiftsPerMonth: 20,
            minRestHours: 11,
            selectedMonth: new Date().toISOString().slice(0, 7),
            beneficialDays: [],
            beneficialDaysThreshold: 4,
            slotSystem: {
                enabled: false,
                slot1Seniorities: [6, 5, 4],

                slot2Seniorities: [3, 2, 1]
            },
            taskColumns: []
        };

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge saved data with defaults to ensure new fields (like selectedMonth) are present
                return {
                    ...defaultConstraints,
                    ...parsed,
                    // Ensure nested objects are also merged correctly
                    dailyNeeds: { ...defaultConstraints.dailyNeeds, ...(parsed.dailyNeeds || {}) },

                    slotSystem: { ...defaultConstraints.slotSystem, ...(parsed.slotSystem || {}) },
                    taskColumns: parsed.taskColumns || []
                };
            } catch (e) {
                console.error("Ayarlar yüklenirken hata oluştu:", e);
                return defaultConstraints;
            }
        }

        return defaultConstraints;
    });

    const [schedule, setSchedule] = useState(() => {
        const saved = localStorage.getItem('currentSchedule');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("Çizelge yüklenirken hata oluştu:", e);
            return null;
        }
    });

    const [scheduleHistory, setScheduleHistory] = useState(() => {
        const saved = localStorage.getItem('scheduleHistory');
        try {
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Geçmiş yüklenirken hata oluştu:", e);
            return [];
        }
    });

    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('tasks');
        try {
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Görevler yüklenirken hata oluştu:", e);
            return {};
        }
    });

    const [activeTab, setActiveTab] = useState('staff');

    // Save to localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem('staffList', JSON.stringify(staffList));
    }, [staffList]);

    useEffect(() => {
        localStorage.setItem('constraints', JSON.stringify(constraints));
    }, [constraints]);

    useEffect(() => {
        if (schedule) {
            localStorage.setItem('currentSchedule', JSON.stringify(schedule));
        } else {
            localStorage.removeItem('currentSchedule');
        }
    }, [schedule]);

    useEffect(() => {
        localStorage.setItem('scheduleHistory', JSON.stringify(scheduleHistory));
    }, [scheduleHistory]);

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    const saveScheduleToHistory = () => {
        if (!schedule) return;

        const timestamp = new Date().toLocaleString('tr-TR');
        const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })
            .format(new Date(constraints.selectedMonth + '-01'));

        const newEntry = {
            id: Date.now(),
            name: `${monthName} (${timestamp})`,

            schedule: schedule,
            constraints: { ...constraints },
            staffList: [...staffList],
            tasks: { ...tasks }
        };

        setScheduleHistory(prev => [newEntry, ...prev]);
    };

    const loadScheduleFromHistory = (entry) => {
        if (window.confirm('Bu çizelgeyi yüklemek mevcut çalışmanızı değiştirecektir. Devam edilsin mi?')) {
            setSchedule(entry.schedule);
            setConstraints(entry.constraints);

            setStaffList(entry.staffList);
            setTasks(entry.tasks || {});
            setActiveTab('schedule');
        }
    };

    const deleteScheduleFromHistory = (id) => {
        if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
            setScheduleHistory(prev => prev.filter(item => item.id !== id));
        }
    };

    const tabs = [
        { id: 'staff', label: 'Personel', icon: '👥' },
        { id: 'unavailability', label: 'Müsaitlik', icon: '📅' },

        { id: 'constraints', label: 'Ayarlar', icon: '⚙️' },
        { id: 'schedule', label: 'Çizelge', icon: '📊' },
        { id: 'tasks', label: 'Görevler', icon: '📋' }
    ];

    return (
        <div className="container">
            {/* Header */}
            <header style={{
                marginBottom: '2rem',
                textAlign: 'center',
                paddingTop: '1rem'
            }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                    }}>
                        📋
                    </div>
                    <h1 style={{
                        margin: 0,
                        fontSize: '1.75rem',
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Vardiya Çizelgesi
                    </h1>
                </div>
                <p style={{
                    color: 'var(--color-text-muted)',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem'
                }}>
                    Kıdeme göre otomatik nöbet dağılımı
                </p>

                {/* Navigation */}
                <nav style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    background: 'var(--color-surface)',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    maxWidth: '500px',
                    margin: '0 auto'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeTab === tab.id ? '600' : '500',
                                background: activeTab === tab.id
                                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                                    : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--color-text-muted)',
                                transition: 'all 0.2s ease',
                                boxShadow: activeTab === tab.id
                                    ? '0 2px 10px rgba(99, 102, 241, 0.4)'
                                    : 'none'
                            }}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </header>

            {/* Main Content */}
            <main className="animate-in">
                {activeTab === 'staff' && (
                    <StaffManager staffList={staffList} setStaffList={setStaffList} />
                )}
                {activeTab === 'unavailability' && (
                    <UnavailabilityGrid
                        staffList={staffList}
                        setStaffList={setStaffList}
                        selectedMonth={constraints.selectedMonth}
                    />
                )}
                {activeTab === 'constraints' && (
                    <ConstraintsForm constraints={constraints} setConstraints={setConstraints} />
                )}
                {activeTab === 'schedule' && (
                    <>
                        <Scheduler
                            staffList={staffList}
                            constraints={constraints}
                            schedule={schedule}
                            setSchedule={setSchedule}
                            onSaveToHistory={saveScheduleToHistory}
                        />
                        {schedule && (
                            <>
                                <Statistics
                                    staffList={staffList}
                                    schedule={schedule}
                                    constraints={constraints}
                                />
                                <ExportTools
                                    schedule={schedule}
                                    staffList={staffList}
                                    history={scheduleHistory}
                                    onLoadHistory={loadScheduleFromHistory}
                                    onDeleteHistory={deleteScheduleFromHistory}
                                />
                            </>
                        )}
                        {!schedule && scheduleHistory.length > 0 && (
                            <div style={{ marginTop: '2rem' }}>
                                <ExportTools
                                    schedule={null}
                                    staffList={staffList}
                                    history={scheduleHistory}
                                    onLoadHistory={loadScheduleFromHistory}
                                    onDeleteHistory={deleteScheduleFromHistory}
                                />
                            </div>
                        )}
                    </>
                )}
                {activeTab === 'tasks' && (
                    <TaskDistribution
                        staffList={staffList}
                        schedule={schedule}
                        constraints={constraints}
                        tasks={tasks}
                        setTasks={setTasks}
                        onSaveToHistory={saveScheduleToHistory}
                    />
                )}
            </main>

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: '2rem 0 1rem',
                color: 'var(--color-text-muted)',
                fontSize: '0.8rem'
            }}>
                <p style={{ margin: 0 }}>
                    Emre YILDIRIM • {new Date().getFullYear()}
                </p>
            </footer>
        </div>
    );
}

export default App;

