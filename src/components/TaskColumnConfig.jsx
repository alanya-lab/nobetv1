import React, { useState } from 'react';

const TaskColumnConfig = ({ columnIndex, columnName, constraints, setConstraints, staffList, onClose }) => {
    const config = constraints.taskColumnConfig?.[columnIndex] || {
        eligibleStaffIds: [],
        eligibleSeniorities: [],
        targetWeekdays: [1, 3, 4, 5], // Mon, Wed, Thu, Fri
        maxPerDay: 3,
        preferredSeniorityMix: []
    };

    const [selectionMode, setSelectionMode] = useState(
        config.eligibleStaffIds.length > 0 ? 'individual' : 'seniority'
    );
    const [selectedStaffIds, setSelectedStaffIds] = useState(config.eligibleStaffIds || []);
    const [selectedSeniorities, setSelectedSeniorities] = useState(config.eligibleSeniorities || []);
    const [targetWeekdays, setTargetWeekdays] = useState(config.targetWeekdays || [1, 3, 4, 5]);
    const [maxPerDay, setMaxPerDay] = useState(config.maxPerDay || 3);
    const [preferredMix, setPreferredMix] = useState(
        config.preferredSeniorityMix?.join(',') || ''
    );

    const weekdayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    const handleSave = () => {
        const newConfig = {
            eligibleStaffIds: selectionMode === 'individual' ? selectedStaffIds : [],
            eligibleSeniorities: selectionMode === 'seniority' ? selectedSeniorities : [],
            targetWeekdays,
            maxPerDay,
            preferredSeniorityMix: preferredMix ? preferredMix.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : []
        };

        setConstraints(prev => ({
            ...prev,
            taskColumnConfig: {
                ...(prev.taskColumnConfig || {}),
                [columnIndex]: newConfig
            }
        }));

        onClose();
    };

    const toggleStaff = (staffId) => {
        setSelectedStaffIds(prev =>
            prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
        );
    };

    const toggleSeniority = (seniority) => {
        setSelectedSeniorities(prev =>
            prev.includes(seniority) ? prev.filter(s => s !== seniority) : [...prev, seniority]
        );
    };

    const toggleWeekday = (day) => {
        setTargetWeekdays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    // Group staff by seniority
    const staffBySeniority = {};
    staffList.forEach(staff => {
        if (!staffBySeniority[staff.seniority]) {
            staffBySeniority[staff.seniority] = [];
        }
        staffBySeniority[staff.seniority].push(staff);
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'var(--color-surface)',
                padding: '24px',
                borderRadius: '12px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid var(--color-border)'
            }}>
                <h3 style={{ margin: '0 0 16px 0' }}>"{columnName}" Sütunu Ayarları</h3>

                {/* Selection Mode */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Seçim Modu
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                checked={selectionMode === 'seniority'}
                                onChange={() => setSelectionMode('seniority')}
                            />
                            <span>Kıdeme Göre</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                checked={selectionMode === 'individual'}
                                onChange={() => setSelectionMode('individual')}
                            />
                            <span>Kişi Bazlı</span>
                        </label>
                    </div>
                </div>

                {/* Seniority Selection */}
                {selectionMode === 'seniority' && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Dahil Edilecek Kıdemler
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {Object.keys(staffBySeniority).sort((a, b) => b - a).map(seniority => {
                                const sen = parseInt(seniority);
                                const isSelected = selectedSeniorities.includes(sen);
                                return (
                                    <button
                                        key={sen}
                                        onClick={() => toggleSeniority(sen)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            background: isSelected ? 'var(--color-primary)' : 'transparent',
                                            color: isSelected ? 'white' : 'var(--color-text)',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Kıdem {sen} ({staffBySeniority[sen].length})
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Individual Selection */}
                {selectionMode === 'individual' && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Dahil Edilecek Kişiler
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                            {staffList.map(staff => {
                                const isSelected = selectedStaffIds.includes(staff.id);
                                return (
                                    <label
                                        key={staff.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            background: isSelected ? 'var(--color-surface-hover)' : 'var(--color-bg)',
                                            cursor: 'pointer',
                                            border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleStaff(staff.id)}
                                        />
                                        <span style={{ fontSize: '0.85rem' }}>{staff.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Target Weekdays */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Hedef Günler
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {weekdayNames.map((name, idx) => {
                            const isSelected = targetWeekdays.includes(idx);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => toggleWeekday(idx)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                                        color: isSelected ? 'white' : 'var(--color-text)',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Max Per Day */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Günlük Maksimum Kişi Sayısı
                    </label>
                    <input
                        type="number"
                        value={maxPerDay}
                        onChange={(e) => setMaxPerDay(parseInt(e.target.value))}
                        min="1"
                        max="10"
                        style={{ width: '100px' }}
                    />
                </div>

                {/* Preferred Seniority Mix */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Tercih Edilen Kıdem Karışımı (opsiyonel)
                    </label>
                    <input
                        type="text"
                        value={preferredMix}
                        onChange={(e) => setPreferredMix(e.target.value)}
                        placeholder="Örn: 7,5,4"
                        style={{ width: '100%' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Her güne bu kıdemlerden birer kişi atamaya çalışır (virgülle ayırın)
                    </p>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} className="btn btn-ghost">
                        İptal
                    </button>
                    <button onClick={handleSave} className="btn btn-primary">
                        Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskColumnConfig;
