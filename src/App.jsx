import React, { useState, useEffect } from 'react';
import StaffManager from './components/StaffManager';
import ConstraintsForm from './components/ConstraintsForm';
import UnavailabilityGrid from './components/UnavailabilityGrid';
import Scheduler from './components/Scheduler';
import Statistics from './components/Statistics';
import ExportTools from './components/ExportTools';
import TaskDistribution from './components/TaskDistribution';

function App() {
    // MANTIK VE STATE KISMI (TAMAMEN AYNI KORUNDU)
    const [staffList, setStaffList] = useState(() => {
        const saved = localStorage.getItem('staffList');
        return saved ? JSON.parse(saved) : [];
    });

    const [constraints, setConstraints] = useState(() => {
        const saved = localStorage.getItem('constraints');
        const defaultConstraints = {
            dailyNeeds: { Monday: 2, Tuesday: 2, Wednesday: 2, Thursday: 2, Friday: 2, Saturday: 2, Sunday: 2 },
            shiftDuration: 8,
            holidays: [],
            minShiftsPerMonth: 0,
            maxShiftsPerMonth: 20,
            minRestHours: 11,
            selectedMonth: new Date().toISOString().slice(0, 7),
            beneficialDays: [],
            beneficialDaysThreshold: 4,
            slotSystem: { enabled: false, slot1Seniorities: [6, 5, 4], slot2Seniorities: [3, 2, 1] },
            taskColumns: [],
            taskColumnConfig: {},
            shiftColumnNames: ['Nöbetçi 1', 'Nöbetçi 2'],
            hiddenTaskColumns: []
        };
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    ...defaultConstraints,
                    ...parsed,
                    dailyNeeds: { ...defaultConstraints.dailyNeeds, ...(parsed.dailyNeeds || {}) },
                    slotSystem: { ...defaultConstraints.slotSystem, ...(parsed.slotSystem || {}) },
                    taskColumns: parsed.taskColumns || [],
                    taskColumnConfig: parsed.taskColumnConfig || {},
                    shiftColumnNames: parsed.shiftColumnNames || defaultConstraints.shiftColumnNames,
                    hiddenTaskColumns: parsed.hiddenTaskColumns || []
                };
            } catch (e) { return defaultConstraints; }
        }
        return defaultConstraints;
    });

    const [schedule, setSchedule] = useState(() => {
        const saved = localStorage.getItem('currentSchedule');
        try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
    });

    const [scheduleHistory, setScheduleHistory] = useState(() => {
        const saved = localStorage.getItem('scheduleHistory');
        try { return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
    });

    const [tasks, setTasks] = useState(() => {
        const saved = localStorage.getItem('tasks');
        try { return saved ? JSON.parse(saved) : {}; } catch (e) { return {}; }
    });

    const [activeTab, setActiveTab] = useState('staff');

    // EFFECTLER (AYNEN KORUNDU)
    useEffect(() => { localStorage.setItem('staffList', JSON.stringify(staffList)); }, [staffList]);
    useEffect(() => { localStorage.setItem('constraints', JSON.stringify(constraints)); }, [constraints]);
    useEffect(() => {
        if (schedule) localStorage.setItem('currentSchedule', JSON.stringify(schedule));
        else localStorage.removeItem('currentSchedule');
    }, [schedule]);
    useEffect(() => { localStorage.setItem('scheduleHistory', JSON.stringify(scheduleHistory)); }, [scheduleHistory]);
    useEffect(() => { localStorage.setItem('tasks', JSON.stringify(tasks)); }, [tasks]);

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
        { id: 'tasks', label: 'Görevler', icon: '📋' },
        { id: 'export', label: 'Dışa Aktar', icon: '💾' }
    ];

    // GÖRSEL TASARIM (STITCH 'DESIGN.MD' UYGULANDI)
    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Header - Indigo Gradient */}
            <header style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                padding: '2.5rem 1rem',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📋</div>
                    <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
                        Nöbet Çizelgesi Pro
                    </h1>
                    <p style={{ opacity: 0.9, fontSize: '1rem', marginTop: '0.5rem' }}>
                        Kıdeme Göre Akıllı ve Adil Dağılım Sistemi
                    </p>
                </div>
            </header>

            {/* Navigation - Modern Floating Menu */}
            <nav style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                background: 'white',
                padding: '10px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                maxWidth: '700px',
                margin: '-25px auto 30px',
                position: 'relative',
                zIndex: 10,
                border: '1px solid #e2e8f0'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: activeTab === tab.id ? '700' : '500',
                            backgroundColor: activeTab === tab.id ? '#6366f1' : 'transparent',
                            color: activeTab === tab.id ? 'white' : '#64748b',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: activeTab === tab.id ? 'translateY(-2px)' : 'none'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Main Content Area */}
            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 20px 25px -5px rgba(0,0,0,0.05)',
                    border: '1px solid #f1f5f9'
                }}>
                    {activeTab === 'staff' && <StaffManager staffList={staffList} setStaffList={setStaffList} />}
                    {activeTab === 'unavailability' && (
                        <UnavailabilityGrid
                            staffList={staffList}
                            setStaffList={setStaffList}
                            selectedMonth={constraints.selectedMonth}
                        />
                    )}
                    {activeTab === 'constraints' && (
                        <ConstraintsForm
                            constraints={constraints}
                            setConstraints={setConstraints}
                            tasks={tasks}
                            setTasks={setTasks}
                        />
                    )}
                    {activeTab === 'schedule' && (
                        <div className="space-y-6">
                            <Scheduler
                                staffList={staffList}
                                constraints={constraints}
                                schedule={schedule}
                                setSchedule={setSchedule}
                                onSaveToHistory={saveScheduleToHistory}
                            />
                            {schedule && (
                                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px dashed #f1f5f9' }}>
                                    <Statistics staffList={staffList} schedule={schedule} constraints={constraints} />
                                    <ExportTools
                                        schedule={schedule}
                                        staffList={staffList}
                                        history={scheduleHistory}
                                        onLoadHistory={loadScheduleFromHistory}
                                        onDeleteHistory={deleteScheduleFromHistory}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'export' && (
                        <ExportTools
                            schedule={schedule}
                            staffList={staffList}
                            history={scheduleHistory}
                            onLoadHistory={loadScheduleFromHistory}
                            onDeleteHistory={deleteScheduleFromHistory}
                        />
                    )}
                    {activeTab === 'tasks' && (
                        <TaskDistribution
                            staffList={staffList}
                            schedule={schedule}
                            constraints={constraints}
                            setConstraints={setConstraints}
                            tasks={tasks}
                            setTasks={setTasks}
                            onSaveToHistory={saveScheduleToHistory}
                        />
                    )}
                </div>
            </main>

            <footer style={{ textAlign: 'center', paddingBottom: '3rem', color: '#94a3b8' }}>
                <p style={{ fontWeight: '600' }}>Nöbet Çizelgesi v2.0 • {new Date().getFullYear()}</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Doktorlar için, doktorlar tarafından tasarlandı.</p>
            </footer>
        </div>
    );
}

export default App;
