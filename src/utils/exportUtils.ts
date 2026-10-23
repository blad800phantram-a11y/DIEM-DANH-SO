import { Attendance, Profile, PointTransaction } from '../types';

/**
 * Trigger CSV download with proper UTF-8 BOM for Microsoft Excel Vietnamese support
 */
function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format ISO date string into Vietnamese format dd/MM/yyyy HH:mm
 */
export function formatVietnameseDateTime(dateStr: string | number): string {
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Export member roster to Excel-compatible CSV
 */
export function exportMembersToCSV(members: Profile[], fileName = 'danh_sach_doan_vien.csv') {
  const headers = [
    'STT',
    'Mã đoàn viên',
    'Họ và tên',
    'Lớp',
    'Chi đoàn / Đơn vị Đoàn',
    'Email',
    'Số điện thoại',
    'Vai trò',
    'Trạng thái tài khoản',
    'Tổng điểm tích lũy',
    'Số hoạt động tham gia',
  ];

  const rows = members.map((m, index) => [
    index + 1,
    `"${m.student_code}"`,
    `"${m.full_name}"`,
    `"${m.class_name}"`,
    `"${m.union_unit}"`,
    `"${m.email}"`,
    `"${m.phone}"`,
    m.role === 'admin' ? 'Quản trị viên' : m.role === 'officer' ? 'Cán bộ Đoàn' : 'Đoàn viên',
    m.status === 'active' ? 'Đang hoạt động' : 'Bị khóa',
    m.total_points,
    m.attended_count,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, fileName);
}

/**
 * Export attendance report to Excel-compatible CSV
 */
export function exportAttendanceReportToCSV(
  attendances: Attendance[],
  activityTitle: string,
  fileName = 'bao_cao_diem_danh.csv'
) {
  const headers = [
    'STT',
    'Mã đoàn viên',
    'Họ và tên',
    'Lớp',
    'Chi đoàn / Đơn vị',
    'Tên hoạt động',
    'Mã hoạt động',
    'Thời gian điểm danh (Giờ VN)',
    'Điểm ghi nhận',
    'Trạng thái',
  ];

  const rows = attendances.map((att, idx) => [
    idx + 1,
    `"${att.student_code}"`,
    `"${att.member_name}"`,
    `"${att.class_name}"`,
    `"${att.union_unit}"`,
    `"${att.activity_title.replace(/"/g, '""')}"`,
    `"${att.activity_code}"`,
    `"${formatVietnameseDateTime(att.checked_in_at)}"`,
    att.points_awarded,
    att.status === 'verified' ? 'Hợp lệ (Đã cộng điểm)' : 'Chờ xác minh',
  ]);

  const summary = [
    `"BÁO CÁO ĐIỂM DANH HOẠT ĐỘNG: ${activityTitle.replace(/"/g, '""')}"`,
    `"Thời gian xuất báo cáo: ${formatVietnameseDateTime(new Date().toISOString())}"`,
    `"Tổng số đoàn viên đã điểm danh: ${attendances.length}"`,
    '',
  ].join('\n');

  const csv = summary + '\n' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, fileName);
}

/**
 * Export point transactions ledger to CSV
 */
export function exportPointTransactionsToCSV(
  transactions: PointTransaction[],
  fileName = 'so_theo_doi_diem_ren_luyen.csv'
) {
  const headers = [
    'STT',
    'Mã đoàn viên',
    'Họ và tên',
    'Tên hoạt động',
    'Số điểm ghi nhận',
    'Loại giao dịch',
    'Thời gian (Giờ VN)',
    'Căn cứ / Lý do',
    'Người / Hệ thống thực hiện',
    'Trạng thái',
  ];

  const rows = transactions.map((t, idx) => [
    idx + 1,
    `"${t.student_code}"`,
    `"${t.member_name}"`,
    `"${t.activity_title.replace(/"/g, '""')}"`,
    t.points,
    t.transaction_type === 'attendance'
      ? 'Điểm danh hoạt động'
      : t.transaction_type === 'manual_adjustment'
      ? 'Điều chỉnh cán bộ'
      : 'Thưởng/Phạt',
    `"${formatVietnameseDateTime(t.created_at)}"`,
    `"${t.reason.replace(/"/g, '""')}"`,
    `"${t.actor_name}"`,
    t.status === 'confirmed' ? 'Đã xác nhận' : 'Đã thu hồi',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, fileName);
}

/**
 * Download sample CSV template for importing members
 */
export function downloadMemberImportTemplate(fileName = 'mau_nhap_danh_sach_doan_vien.csv') {
  const headers = [
    'Mã đoàn viên',
    'Họ và tên',
    'Lớp',
    'Chi đoàn / Đơn vị Đoàn',
    'Email',
    'Số điện thoại',
  ];

  const sampleRows = [
    ['DVS-2421', 'Nguyễn Văn An', 'K47-CNTT1', 'Chi đoàn K47-CNTT1', 'an.nv.dvs2421@sinhvien.edu.vn', '0912345001'],
    ['DVS-2422', 'Trần Thị Thúy', 'K47-QTKD1', 'Chi đoàn K47-QTKD1', 'thuy.tt.dvs2422@sinhvien.edu.vn', '0912345002'],
    ['DVS-2423', 'Lê Hoàng Minh', 'K48-DTVT', 'Chi đoàn K48-DTVT', 'minh.lh.dvs2423@sinhvien.edu.vn', '0912345003'],
    ['DVS-2424', 'Phạm Quỳnh Anh', 'K48-KT1', 'Chi đoàn K48-KT1', 'anh.pq.dvs2424@sinhvien.edu.vn', '0912345004'],
  ];

  const csvContent = [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  downloadCSV(csvContent, fileName);
}

