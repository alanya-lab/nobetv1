import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';

const ExportTools = ({ schedule, staffList }) => {
    const [copied, setCopied] = useState(false);

    if (!schedule) return null;

    const generateTableData = () => {
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

    return (
        <div className="card">
            <h3 style={{ margin: '0 0 16px 0' }}>📥 Dışa Aktar</h3>

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
        </div>
    );
};

export default ExportTools;
