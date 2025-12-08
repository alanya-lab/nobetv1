import React, { useState, useEffect } from 'react';
import StaffManager from './components/StaffManager';
import ConstraintsForm from './components/ConstraintsForm';
import UnavailabilityGrid from './components/UnavailabilityGrid';
import Scheduler from './components/Scheduler';
import Statistics from './components/Statistics';
import ExportTools from './components/ExportTools';

function App() {
    // Load initial state from localStorage if available
    const [staffList, setStaffList] = useState(() => {
        const saved = localStorage.getItem('staffList');
        return saved ? JSON.parse(saved) : [];
    });

    const [constraints, setConstraints] = useState(() => {
        const saved = localStorage.getItem('constraints');
        return saved ? JSON.parse(saved) : {
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
            maxSenioritySum: 0,
            selectedMonth: new Date().toISOString().slice(0, 7)
        };
    });

    // Save to localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem('staffList', JSON.stringify(staffList));
    }, [staffList]);

    useEffect(() => {
        localStorage.setItem('constraints', JSON.stringify(constraints));
    }, [constraints]);

    const [schedule, setSchedule] = useState(null);
    const [activeTab, setActiveTab] = useState('staff');

    const tabs = [
        { id: 'staff', label: 'Personel', icon: '👥' },
        { id: 'unavailability', label: 'Müsaitlik', icon: '📅' },
        { id: 'constraints', label: 'Ayarlar', icon: '⚙️' },
        { id: 'schedule', label: 'Çizelge', icon: '📊' }
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
                        />
                        {schedule && (
                            <>
                                <Statistics
                                    staffList={staffList}
                                    schedule={schedule}
                                    constraints={constraints}
                                />
                                <ExportTools schedule={schedule} staffList={staffList} />
                            </>
                        )}
                    </>
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
                    Vardiya Çizelgesi v2.0 • {new Date().getFullYear()}
                </p>
            </footer>
        </div>
    );
}

export default App;
