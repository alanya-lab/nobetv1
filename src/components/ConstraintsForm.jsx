import React from 'react';

const ConstraintsForm = ({ constraints, setConstraints }) => {
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setConstraints({
            ...constraints,
            [name]: type === 'number' ? parseInt(value, 10) : value
        });
    };

    const handleDailyNeedsChange = (day, value) => {
        setConstraints({
            ...constraints,
            dailyNeeds: {
                ...constraints.dailyNeeds,
                [day]: parseInt(value, 10)
            }
        });
    };

    const days = [
        { key: 'Monday', label: 'Pzt' },
        { key: 'Tuesday', label: 'Sal' },
        { key: 'Wednesday', label: 'Çar' },
        { key: 'Thursday', label: 'Per' },
        { key: 'Friday', label: 'Cum' },
        { key: 'Saturday', label: 'Cmt' },
        { key: 'Sunday', label: 'Paz' }
    ];

    const isWeekend = (day) => day === 'Saturday' || day === 'Sunday';

    return (
        <div className="card">
            <h3 style={{ margin: '0 0 20px 0' }}>⚙️ Çizelge Ayarları</h3>

            {/* Month Selection */}
            <div style={{ marginBottom: '24px' }}>
                <label>Çizelge Ayı</label>
                <input
                    type="month"
                    name="selectedMonth"
                    value={constraints.selectedMonth}
                    onChange={handleInputChange}
                    style={{ maxWidth: '250px' }}
                />
            </div>

            {/* Daily Needs */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ marginBottom: '12px', display: 'block' }}>Günlük Personel İhtiyacı</label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '8px',
                    maxWidth: '500px'
                }}>
                    {days.map(day => (
                        <div key={day.key} style={{ textAlign: 'center' }}>
                            <div style={{
                                marginBottom: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: isWeekend(day.key) ? '#a78bfa' : 'var(--color-text-muted)'
                            }}>
                                {day.label}
                            </div>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={constraints.dailyNeeds[day.key]}
                                onChange={(e) => handleDailyNeedsChange(day.key, e.target.value)}
                                style={{
                                    textAlign: 'center',
                                    padding: '10px 8px',
                                    fontWeight: '600',
                                    fontSize: '1rem',
                                    backgroundColor: isWeekend(day.key) ? 'rgba(139, 92, 246, 0.1)' : 'var(--color-bg)'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Other Settings */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
            }}>
                <div>
                    <label>Vardiya Süresi (saat)</label>
                    <input
                        type="number"
                        name="shiftDuration"
                        value={constraints.shiftDuration}
                        onChange={handleInputChange}
                        min="1"
                        max="24"
                    />
                </div>

                <div>
                    <label>Max Vardiya/Ay</label>
                    <input
                        type="number"
                        name="maxShiftsPerMonth"
                        value={constraints.maxShiftsPerMonth}
                        onChange={handleInputChange}
                        min="1"
                        max="31"
                    />
                </div>

                <div>
                    <label>Min Dinlenme (saat)</label>
                    <input
                        type="number"
                        name="minRestHours"
                        value={constraints.minRestHours}
                        onChange={handleInputChange}
                        min="0"
                        max="48"
                    />
                    <p style={{
                        marginTop: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)'
                    }}>
                        {constraints.minRestHours > 12 ? '(Arka arkaya nöbet yok)' : '(Arka arkaya nöbet izinli)'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConstraintsForm;
