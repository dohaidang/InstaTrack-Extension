/**
 * Export data to CSV file
 */

import type { Follower, StatusType } from '../types';

export type { StatusType };

type ExportData = Pick<Follower, 'username' | 'fullName' | 'avatarUrl'>;

export function exportToCsv(data: ExportData[], filename: string, status: StatusType): void {
    // CSV header with Status column
    const headers = ['Username', 'Full Name', 'Status', 'Profile URL'];

    // Convert data to CSV rows
    const rows = data.map(item => [
        item.username,
        item.fullName || '',
        status,
        `https://instagram.com/${item.username}`
    ].map(cell => `"${cell.replace(/"/g, '""')}"`).join(','));

    // Combine header + rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create blob with BOM for Excel UTF-8 support
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
