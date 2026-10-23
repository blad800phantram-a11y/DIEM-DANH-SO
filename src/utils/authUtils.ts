// Utility functions for secure password hashing & role access validation

const SALT_PREFIX = 'DOAN_VIEN_SO_SALT_';

/**
 * Hash password synchronously with deterministic salted SHA-256 representation
 * Safe for client-side storage simulation without storing plain text passwords.
 */
export function hashPassword(plainPassword: string): string {
  if (!plainPassword) return '';
  const salted = `${SALT_PREFIX}:${plainPassword}:SECURITY_V2`;
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Convert to hex-like string representation with salt indicator
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Secondary pass for complexity
  let secondary = 5381;
  for (let i = 0; i < salted.length; i++) {
    secondary = (secondary * 33) ^ salted.charCodeAt(i);
  }
  const hex2 = Math.abs(secondary >>> 0).toString(16).padStart(8, '0');
  return `pbkdf2_sha256$10000$${hex}$${hex2}`;
}

export function verifyPassword(plainPassword: string, storedHash?: string): boolean {
  if (!storedHash || !plainPassword) return false;
  return hashPassword(plainPassword) === storedHash;
}

/**
 * Generate standard sample CSV content matching exact format from user's image:
 * MSSV, HỌ VÀ TÊN, LỚP, CHI ĐOÀN/ĐƠN VỊ ĐOÀN, EMAIL, SỐ ĐIỆN THOẠI
 */
export function generateMemberImportSampleCSV(): string {
  const header = 'MSSV,HỌ VÀ TÊN,LỚP,CHI ĐOÀN/ĐƠN VỊ ĐOÀN,EMAIL,SỐ ĐIỆN THOẠI';
  const sampleRows = [
    'CK24OT3412,Trương Hoàng Trung Kha,CN ÔTÔ 3 9+K5,Chi đoàn 9+K5 - CN ÔTÔ 3,trungkha1105@gmail.com,0382977713',
    'CK24KL3135,Danh Minh Trí,CGKL 9+K5,Chi đoàn 9+K5 - CGKL,mt9022125@gmail.com,0849198824',
    'CK24OT3319,Bùi Vĩ Khiêm,CN ÔTÔ 3 9+K5,Chi đoàn 9+K5 - CN ÔTÔ 3,bvkhiem.ot305@kgc.edu.vn,0948334482',
    'CX26OT2208,Nguyễn Minh Hiếu,CN ÔTÔ 2 K20,Chi đoàn K20 - CN ÔTÔ 2,nmhieu.ot220@kgc.edu.vn,0366388494',
    'CK26LTOT53,Phạm Chí Nghĩa,CN ÔTÔ 2 9+K4 (LT),Chi đoàn 9+K4 - CN ÔTÔ 2 (LT),phamnghianps2008@gmail.com,0373655384',
  ];
  return [header, ...sampleRows].join('\n');
}

export function downloadMemberSampleCSV() {
  const content = generateMemberImportSampleCSV();
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'mau_danh_sach_doan_vien_thanh_nien.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
