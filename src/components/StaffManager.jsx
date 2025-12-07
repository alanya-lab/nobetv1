import React, { useState } from 'react';

const StaffManager = ({ staffList, setStaffList }) => {
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        seniority: 5,
        priority: 'Medium',
        unavailability: []
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleRangeChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: parseInt(value, 10) });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            setStaffList(staffList.map(staff => staff.id === formData.id ? formData : staff));
            closeModal();
        } else {
            setStaffList([...staffList, { ...formData, id: Date.now() }]);
            setFormData({
                id: null,
                name: '',
                seniority: 5,
                priority: 'Medium',
                unavailability: []
            });
        }
    };

    const openModal = (staff = null) => {
        if (staff) {
            const staffName = staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
            setFormData({ ...staff, name: staffName });
            setIsEditing(true);
        } else {
            setFormData({ id: null, name: '', seniority: 5, priority: 'Medium', unavailability: [] });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsEditing(false);
    };

    const handleDelete = (id) => {
        if (window.confirm('Bu personeli silmek istediğinize emin misiniz?')) {
            setStaffList(staffList.filter(staff => staff.id !== id));
        }
    };

    const handleBulkImport = () => {
        if (!bulkText.trim()) return;
        const names = bulkText.split(/[\n,\t]+/).map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) return;

        const newStaff = names.map((name, idx) => ({
            id: Date.now() + idx,
            name,
            seniority: 5,
            priority: 'Medium',
            unavailability: []
        }));

        setStaffList([...staffList, ...newStaff]);
        setBulkText('');
        setIsBulkImportOpen(false);
    };

    const handleQuickUpdate = (staffId, field, value) => {
        setStaffList(staffList.map(staff =>
            staff.id === staffId ? { ...staff, [field]: value } : staff
        ));
    };

    const clearAllStaff = () => {
        if (window.confirm('Tüm personeli silmek istediğinize emin misiniz?')) {
            setStaffList([]);
        }
    };

    const getSeniorityColor = (seniority) => {
        if (seniority <= 2) return '#f87171';
        if (seniority <= 4) return '#fbbf24';
        if (seniority <= 6) return '#4ade80';
        if (seniority <= 8) return '#60a5fa';
        return '#a78bfa';
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0 }}>👥 Personel Listesi <span style={{ color: 'var(--color-text-muted)', fontWeight: 'normal' }}>({staffList.length})</span></h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => setIsBulkImportOpen(true)} className="btn btn-ghost">
                        📋 Toplu Ekle
                    </button>
                    <button onClick={() => openModal()} className="btn btn-primary">
                        + Yeni Personel
                    </button>
                </div>
            </div>

            {staffList.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                        Henüz personel eklenmedi.<br />
                        <span style={{ fontSize: '0.9rem' }}>"Toplu Ekle" ile liste yapıştırın veya tek tek ekleyin.</span>
                    </p>
                </div>
            ) : (
                <div className="card" style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                            Kıdemi kaydırarak hızlıca ayarlayabilirsiniz.
                        </p>
                        <button onClick={clearAllStaff} className="btn btn-ghost" style={{ color: '#f87171', fontSize: '0.85rem' }}>
                            🗑️ Tümünü Sil
                        </button>
                    </div>
                    <table style={{ width: '100%', minWidth: '500px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Ad Soyad</th>
                                <th style={{ padding: '12px', width: '200px' }}>Kıdem (1-10)</th>
                                <th style={{ padding: '12px', width: '60px' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.map(staff => (
                                <tr key={staff.id}>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>
                                        {staff.name || `${staff.firstName} ${staff.lastName}`}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={staff.seniority}
                                                onChange={(e) => handleQuickUpdate(staff.id, 'seniority', parseInt(e.target.value, 10))}
                                                style={{ flex: 1 }}
                                            />
                                            <span style={{
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '8px',
                                                fontWeight: '700',
                                                fontSize: '0.9rem',
                                                backgroundColor: `${getSeniorityColor(staff.seniority)}20`,
                                                color: getSeniorityColor(staff.seniority)
                                            }}>
                                                {staff.seniority}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDelete(staff.id)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                padding: '6px 10px',
                                                borderRadius: '6px',
                                                color: '#f87171'
                                            }}
                                            title="Sil"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Single Staff Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '450px', margin: 0 }}>
                        <h3 style={{ marginTop: 0 }}>{isEditing ? '✏️ Personel Düzenle' : '+ Yeni Personel'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label>Ad Soyad</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    autoFocus
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Kıdem Sırası</span>
                                    <strong style={{ color: getSeniorityColor(formData.seniority) }}>{formData.seniority}</strong>
                                </label>
                                <input
                                    type="range"
                                    name="seniority"
                                    min="1"
                                    max="10"
                                    value={formData.seniority}
                                    onChange={handleRangeChange}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    <span>1 (En çok nöbet)</span>
                                    <span>10 (En az nöbet)</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={closeModal} className="btn btn-ghost" style={{ flex: 1 }}>
                                    İptal
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    {isEditing ? 'Kaydet' : 'Ekle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {isBulkImportOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '550px', margin: 0 }}>
                        <h3 style={{ marginTop: 0 }}>📋 Toplu Personel Ekle</h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
                            Her satıra bir isim yazın veya Excel'den yapıştırın.
                        </p>

                        <textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={`Emre Yıldırım\nMert Koç\nYılkı Sönmez\n...`}
                            style={{
                                width: '100%',
                                minHeight: '180px',
                                resize: 'vertical'
                            }}
                            autoFocus
                        />

                        <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            marginTop: '12px',
                            fontSize: '0.85rem',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--color-text-muted)'
                        }}>
                            💡 Varsayılan kıdem: 5. Tabloda hızlıca düzenleyebilirsiniz.
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => { setIsBulkImportOpen(false); setBulkText(''); }}
                                className="btn btn-ghost"
                                style={{ flex: 1 }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleBulkImport}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={!bulkText.trim()}
                            >
                                Ekle ({bulkText.split(/[\n,\t]+/).filter(n => n.trim()).length} kişi)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManager;
