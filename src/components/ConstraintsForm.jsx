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
                        max="72"
                    />
                    <p style={{
                        marginTop: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)'
                    }}>
                        {constraints.minRestHours > 12 ? '(Arka arkaya nöbet yok)' : '(Arka arkaya nöbet izinli)'}
                    </p>
                </div>

                <div>
                    <label>Min Kıdem Toplamı</label>
                    <input
                        type="number"
                        name="minSenioritySum"
                        value={constraints.minSenioritySum || ''}
                        onChange={handleInputChange}
                        min="0"
                        placeholder="Örn: 5"
                    />
                </div>

                <div>
                    <label>Max Kıdem Toplamı</label>
                    <input
                        type="number"
                        name="maxSenioritySum"
                        value={constraints.maxSenioritySum || ''}
                        onChange={handleInputChange}
                        min="0"
                        placeholder="Örn: 15"
                    />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px', padding: '16px', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>⭐ Kıdemli Öncelikli Günler</label>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        {days.map(day => (
                            <label key={day.key} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: constraints.beneficialDays?.includes(day.key) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                border: `1px solid ${constraints.beneficialDays?.includes(day.key) ? '#6366f1' : 'var(--color-border)'}`,
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={constraints.beneficialDays?.includes(day.key) || false}
                                    onChange={(e) => {
                                        const current = constraints.beneficialDays || [];
                                        const updated = e.target.checked
                                            ? [...current, day.key]
                                            : current.filter(d => d !== day.key);
                                        setConstraints({ ...constraints, beneficialDays: updated });
                                    }}
                                    style={{ accentColor: '#6366f1' }}
                                />
                                {day.label}
                            </label>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontSize: '0.9rem' }}>Minimum Kıdem Eşiği:</label>
                        <select
                            value={constraints.beneficialDaysThreshold || 4}
                            onChange={(e) => setConstraints({ ...constraints, beneficialDaysThreshold: parseInt(e.target.value, 10) })}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            (Seçilen günlerde bu kıdem ve üzeri öncelikli atanır)
                        </span>
                    </div>
                </div>

                {/* Slot System */}
                <div style={{ gridColumn: '1 / -1', marginTop: '10px', padding: '16px', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <label style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={constraints.slotSystem?.enabled || false}
                                onChange={(e) => setConstraints({
                                    ...constraints,
                                    slotSystem: { ...constraints.slotSystem, enabled: e.target.checked }
                                })}
                                style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                            />
                            ☑️ Slot Sistemini Aktif Et
                        </label>
                    </div>

                    {constraints.slotSystem?.enabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {/* Slot 1 */}
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#6366f1' }}>📌 Slot 1 (1. Nöbetçi)</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(seniority => (
                                        <label key={`s1-${seniority}`} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: `1px solid ${constraints.slotSystem?.slot1Seniorities?.includes(seniority) ? '#6366f1' : 'var(--color-border)'}`,
                                            backgroundColor: constraints.slotSystem?.slot1Seniorities?.includes(seniority) ? '#6366f1' : 'transparent',
                                            color: constraints.slotSystem?.slot1Seniorities?.includes(seniority) ? 'white' : 'var(--color-text)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={constraints.slotSystem?.slot1Seniorities?.includes(seniority) || false}
                                                onChange={(e) => {
                                                    const current = constraints.slotSystem?.slot1Seniorities || [];
                                                    const updated = e.target.checked
                                                        ? [...current, seniority]
                                                        : current.filter(s => s !== seniority);
                                                    setConstraints({
                                                        ...constraints,
                                                        slotSystem: { ...constraints.slotSystem, slot1Seniorities: updated }
                                                    });
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {seniority}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Slot 2 */}
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#8b5cf6' }}>📌 Slot 2 (2. Nöbetçi)</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(seniority => (
                                        <label key={`s2-${seniority}`} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: `1px solid ${constraints.slotSystem?.slot2Seniorities?.includes(seniority) ? '#8b5cf6' : 'var(--color-border)'}`,
                                            backgroundColor: constraints.slotSystem?.slot2Seniorities?.includes(seniority) ? '#8b5cf6' : 'transparent',
                                            color: constraints.slotSystem?.slot2Seniorities?.includes(seniority) ? 'white' : 'var(--color-text)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={constraints.slotSystem?.slot2Seniorities?.includes(seniority) || false}
                                                onChange={(e) => {
                                                    const current = constraints.slotSystem?.slot2Seniorities || [];
                                                    const updated = e.target.checked
                                                        ? [...current, seniority]
                                                        : current.filter(s => s !== seniority);
                                                    setConstraints({
                                                        ...constraints,
                                                        slotSystem: { ...constraints.slotSystem, slot2Seniorities: updated }
                                                    });
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {seniority}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <p style={{ gridColumn: '1 / -1', margin: '10px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                ⚠️ Slotlar birbirinden bağımsızdır. Eğer bir slot için uygun personel bulunamazsa, o pozisyon boş kalır.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Task Columns */}
            <div style={{ gridColumn: '1 / -1', marginTop: '10px', padding: '16px', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>📋 Görev Sütunları</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                    "Görevler" sekmesinde görünecek sütunları buradan belirleyebilirsiniz (Örn: Ameliyat 1, Servis, Poliklinik vb.).
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        id="newTaskColumn"
                        placeholder="Yeni sütun adı..."
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = e.target.value.trim();
                                if (val) {
                                    const current = constraints.taskColumns || [];
                                    if (!current.includes(val)) {
                                        setConstraints({ ...constraints, taskColumns: [...current, val] });
                                        e.target.value = '';
                                    }
                                }
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            const input = document.getElementById('newTaskColumn');
                            const val = input.value.trim();
                            if (val) {
                                const current = constraints.taskColumns || [];
                                if (!current.includes(val)) {
                                    setConstraints({ ...constraints, taskColumns: [...current, val] });
                                    input.value = '';
                                }
                            }
                        }}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px' }}
                    >
                        Ekle
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(constraints.taskColumns || []).map((col, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                        }}>
                            <span>{col}</span>
                            <button
                                onClick={() => {
                                    const current = constraints.taskColumns || [];
                                    setConstraints({ ...constraints, taskColumns: current.filter((_, i) => i !== idx) });
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    padding: '0 2px',
                                    fontSize: '1rem',
                                    lineHeight: 1
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ConstraintsForm;
