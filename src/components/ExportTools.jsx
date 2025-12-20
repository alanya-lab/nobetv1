import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';

const ExportTools = ({ schedule, staffList, history, onLoadHistory, onDeleteHistory, tasks, constraints }) => {
    const [copied, setCopied] = useState(false);

    if (!schedule && (!history || history.length === 0)) return null;

    const generateTableData = () => {
        if (!schedule) return { rows: [], monthTitle: '' };
        const firstDate = Object.keys(schedule).filter(k => !k.startsWith('_'))[0];
        if (!firstDate) return [];

        const selectedDate = new Date(firstDate);
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const monthTitle = format(selectedDate, 'MMMM yyyy', { locale: tr });

        // Find max number of people assigned to any day
        let maxAssigned = 2;
        days.forEach(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const assigned = schedule[dateString] || [];
            if (assigned.length > maxAssigned) {
                maxAssigned = assigned.length;
            }
        });

        const rows = [];

        // Header - separate column for each shift position
        const header = ['Tarih', 'Gün'];
        for (let i = 1; i <= maxAssigned; i++) {
            header.push(`Nöbetçi ${i}`);
        }

        // Add Task Columns to Header
        const taskColumns = constraints?.taskColumns || [];
        taskColumns.forEach(col => header.push(col));

        rows.push(header);

        days.forEach(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const assigned = schedule[dateString] || [];
            const dayName = format(day, 'EEEE', { locale: tr });
            const dateFormatted = format(day, 'd MMMM', { locale: tr });

            const row = [dateFormatted, dayName];
            for (let i = 0; i < maxAssigned; i++) {
                if (assigned[i]) {
                    row.push(assigned[i].name || `${assigned[i].firstName} ${assigned[i].lastName}`);
                } else {
                    row.push('-');
                }
            }

            // Add Task Assignments
            const dayTasks = tasks ? (tasks[dateString] || {}) : {};
            taskColumns.forEach((_, idx) => {
                const staffId = dayTasks[idx];
                if (staffId) {
                    const staff = staffList.find(s => s.id === staffId);
                    row.push(staff ? (staff.name || `${staff.firstName} ${staff.lastName}`) : '?');
                } else {
                    row.push('');
                }
            });

            rows.push(row);
        });

        return { rows, monthTitle };
    };

    const copyAsTable = () => {
        const { rows, monthTitle } = generateTableData();

        let text = `Vardiya Çizelgesi - ${monthTitle}\n\n`;
        text += rows.map(row => row.join('\t')).join('\n');

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const downloadAsExcel = () => {
        const { rows, monthTitle } = generateTableData();

        // Create CSV content (Excel compatible)
        const BOM = '\uFEFF'; // For Turkish characters
        let csv = BOM;
        csv += `Vardiya Çizelgesi - ${monthTitle}\n\n`;
        csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vardiya_${format(new Date(), 'yyyy-MM')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBackupDownload = () => {
        const data = {
            staffList: localStorage.getItem('staffList'),
            constraints: localStorage.getItem('constraints'),
            currentSchedule: localStorage.getItem('currentSchedule'),
            scheduleHistory: localStorage.getItem('scheduleHistory'),
            tasks: localStorage.getItem('tasks'),
            timestamp: new Date().toISOString(),
            version: '2.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vardiya_yedek_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBackupUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm('Bu işlem mevcut verilerinizi silip yedekten geri yükleyecektir. Emin misiniz?')) {
            e.target.value = null;
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.staffList) localStorage.setItem('staffList', data.staffList);
                if (data.constraints) localStorage.setItem('constraints', data.constraints);
                if (data.currentSchedule) localStorage.setItem('currentSchedule', data.currentSchedule);
                if (data.scheduleHistory) localStorage.setItem('scheduleHistory', data.scheduleHistory);
                if (data.tasks) localStorage.setItem('tasks', data.tasks);

                alert('Yedek başarıyla yüklendi! Sayfa yenileniyor...');
                window.location.reload();
            } catch (error) {
                alert('Dosya okunamadı veya hatalı format!');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="card">
            <h3 style={{ margin: '0 0 16px 0' }}>📥 Dışa Aktar</h3>

            {schedule ? (
                <>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button onClick={copyAsTable} className="btn btn-ghost">
                            {copied ? '✓ Kopyalandı!' : '📋 Panoya Kopyala'}
                        </button>
                        <button onClick={downloadAsExcel} className="btn btn-secondary">
                            📊 Excel/CSV İndir
                        </button>
                    </div>

                    <p style={{
                        marginTop: '12px',
                        marginBottom: 0,
                        fontSize: '0.8rem',
                        color: 'var(--color-text-muted)'
                    }}>
                        💡 Panoya kopyalayıp Google Sheets veya Excel'e yapıştırabilirsiniz.
                    </p>
                </>
            ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Dışa aktarmak için önce bir çizelge oluşturun veya geçmişten yükleyin.
                </p>
            )}

            {history && history.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                    <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📂 Oluşturulan Listeler
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {history.map(item => (
                            <div key={item.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 12px',
                                background: 'var(--color-bg)',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                    {item.name}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => onLoadHistory(item)}
                                        className="btn btn-ghost"
                                        style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                    >
                                        📖 Aç
                                    </button>
                                    <button
                                        onClick={() => onDeleteHistory(item.id)}
                                        className="btn btn-ghost"
                                        style={{ padding: '4px 12px', fontSize: '0.8rem', color: '#fca5a5' }}
                                    >
                                        🗑️ Sil
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Backup Section */}
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>💾 Veri Yedekleme</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={handleBackupDownload} className="btn btn-primary" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                        ⬇️ Yedeği İndir
                    </button>

                    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                        <button className="btn btn-secondary">
                            ⬆️ Yedeği Yükle
                        </button>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleBackupUpload}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                opacity: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
                    Tüm verilerinizi (personel, ayarlar, geçmiş) bilgisayarınıza indirip saklayabilir, daha sonra geri yükleyebilirsiniz.
                </p>
            </div>
        </div>
    );
};

export default ExportTools;
