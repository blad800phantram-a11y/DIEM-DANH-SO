import React, { useState, useEffect, useRef } from 'react';
import { store } from '../../services/store';
import { Profile, UserRole, AccountStatus } from '../../types';
import { downloadMemberSampleCSV, hashPassword } from '../../utils/authUtils';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  FileSpreadsheet,
  Download,
  Lock,
  Unlock,
  KeyRound,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  RotateCcw,
  Sparkles,
  Database,
  Eye,
  Calendar,
} from 'lucide-react';

interface ParsedMemberRow {
  student_code: string;
  full_name: string;
  class_name: string;
  union_unit: string;
  email: string;
  phone: string;
  isValid: boolean;
  errorReason?: string;
}

export const AdminDashboard: React.FC = () => {
  const [members, setMembers] = useState<Profile[]>(store.members);
  const [currentUser, setCurrentUser] = useState<Profile>(store.getCurrentUser());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState<boolean>(false);
  const [targetMemberForPass, setTargetMemberForPass] = useState<Profile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for Manual Add Account
  const [formData, setFormData] = useState({
    student_code: '',
    full_name: '',
    username: '',
    password: '',
    class_name: 'CN ÔTÔ 3 9+K5',
    union_unit: 'Chi đoàn 9+K5 - CN ÔTÔ 3',
    email: '',
    phone: '',
    role: 'officer' as UserRole,
    status: 'active' as AccountStatus,
  });

  // Batch Import States
  const [pasteData, setPasteData] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedMemberRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setMembers([...store.members]);
      setCurrentUser(store.getCurrentUser());
    });
    return unsub;
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filter accounts
  const filteredAccounts = members.filter(m => {
    const matchSearch =
      m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.username && m.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = roleFilter === 'ALL' || m.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  // Stats
  const totalAccounts = members.length;
  const adminCount = members.filter(m => m.role === 'admin').length;
  const officerCount = members.filter(m => m.role === 'officer').length;
  const memberCount = members.filter(m => m.role === 'member').length;
  const lockedCount = members.filter(m => m.status === 'locked').length;

  // Handle Manual Create Account
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.student_code.trim()) throw new Error('Vui lòng nhập mã số (MSSV hoặc mã cán bộ).');
      if (!formData.full_name.trim()) throw new Error('Vui lòng nhập họ và tên.');

      const newPass = formData.password.trim() || (formData.role === 'officer' ? 'canbo123' : 'doanvien123');

      store.addMember({
        student_code: formData.student_code.trim().toUpperCase(),
        full_name: formData.full_name.trim(),
        username: formData.username.trim() || formData.student_code.trim().toLowerCase(),
        password_hash: hashPassword(newPass),
        class_name: formData.class_name.trim(),
        union_unit: formData.union_unit.trim(),
        email: formData.email.trim() || `${formData.student_code.toLowerCase()}@kgc.edu.vn`,
        phone: formData.phone.trim() || '0900000000',
        role: formData.role,
        status: formData.status,
      });

      // Also ensure password hash is set if custom
      if (formData.password.trim()) {
        const created = store.members.find(m => m.student_code === formData.student_code.trim().toUpperCase());
        if (created) {
          store.resetAccountPassword(created.id, newPass);
        }
      }

      showToast('success', `Đã tạo thành công tài khoản [${formData.role.toUpperCase()}] cho đồng chí ${formData.full_name}!`);
      setIsCreateModalOpen(false);
      setFormData({
        student_code: '',
        full_name: '',
        username: '',
        password: '',
        class_name: 'CN ÔTÔ 3 9+K5',
        union_unit: 'Chi đoàn 9+K5 - CN ÔTÔ 3',
        email: '',
        phone: '',
        role: 'officer',
        status: 'active',
      });
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi tạo tài khoản.');
    }
  };

  // Toggle Lock
  const handleToggleLock = (targetMember: Profile) => {
    try {
      const isLocking = targetMember.status === 'active';
      const promptText = isLocking
        ? `Xác nhận KHÓA tài khoản ${targetMember.student_code} (${targetMember.full_name})? Người này sẽ không thể đăng nhập vào hệ thống.`
        : `Xác nhận MỞ KHÓA tài khoản ${targetMember.student_code} (${targetMember.full_name})?`;

      if (window.confirm(promptText)) {
        store.toggleMemberLock(targetMember.id);
        showToast('success', `${isLocking ? 'Đã khóa' : 'Đã mở khóa'} tài khoản ${targetMember.student_code} thành công.`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Thao tác không thành công.');
    }
  };

  // Open Reset Password
  const openResetPasswordModal = (member: Profile) => {
    setTargetMemberForPass(member);
    setNewPasswordInput('');
    setIsResetPassModalOpen(true);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberForPass) return;
    try {
      store.resetAccountPassword(targetMemberForPass.id, newPasswordInput);
      showToast('success', `Đã đặt lại mật khẩu mới cho tài khoản ${targetMemberForPass.student_code} thành công!`);
      setIsResetPassModalOpen(false);
      setTargetMemberForPass(null);
    } catch (err: any) {
      showToast('error', err.message || 'Không thể đặt lại mật khẩu.');
    }
  };

  // Change Role
  const handleChangeRole = (member: Profile, newRole: UserRole) => {
    if (member.role === newRole) return;
    try {
      if (window.confirm(`Xác nhận phân quyền lại cho đồng chí ${member.full_name} thành [${newRole.toUpperCase()}]?`)) {
        store.changeUserRole(member.id, newRole);
        showToast('success', `Đã cập nhật vai trò của ${member.student_code} sang ${newRole.toUpperCase()}.`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi phân quyền.');
    }
  };

  // Parse Raw Content for Batch Import
  const parseRawContent = (rawText: string) => {
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const existingCodes = new Set(members.map(m => m.student_code.toLowerCase()));
    const batchCodes = new Set<string>();
    const results: ParsedMemberRow[] = [];

    const firstLineLower = lines[0]?.toLowerCase() || '';
    const hasHeader =
      firstLineLower.includes('mssv') ||
      firstLineLower.includes('mã') ||
      firstLineLower.includes('họ và tên') ||
      firstLineLower.includes('student');

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      let parts: string[] = [];

      if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim());
      } else if (line.includes(',')) {
        parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      } else {
        parts = line.split(/\s{2,}/).map(p => p.trim());
      }

      // Format matches image: MSSV | HỌ VÀ TÊN | LỚP | CHI ĐOÀN/ĐƠN VỊ ĐOÀN | EMAIL | SỐ ĐIỆN THOẠI
      const student_code = (parts[0] || '').toUpperCase();
      const full_name = parts[1] || '';
      const class_name = parts[2] || 'CN ÔTÔ 3 9+K5';
      const union_unit = parts[3] || `Chi đoàn ${class_name}`;
      const email = parts[4] || `${student_code.toLowerCase()}@kgc.edu.vn`;
      const phone = parts[5] || '0900000000';

      let isValid = true;
      let errorReason = '';

      if (!student_code) {
        isValid = false;
        errorReason = 'Thiếu MSSV / Mã đoàn viên';
      } else if (!full_name) {
        isValid = false;
        errorReason = 'Thiếu Họ và tên';
      } else if (existingCodes.has(student_code.toLowerCase())) {
        isValid = false;
        errorReason = 'Mã số đã tồn tại trên hệ thống';
      } else if (batchCodes.has(student_code.toLowerCase())) {
        isValid = false;
        errorReason = 'Trùng lặp trong danh sách tải lên';
      }

      if (isValid) {
        batchCodes.add(student_code.toLowerCase());
      }

      results.push({
        student_code,
        full_name,
        class_name,
        union_unit,
        email,
        phone,
        isValid,
        errorReason,
      });
    }

    setParsedRows(results);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteData(text);
    parseRawContent(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setPasteData(content);
      parseRawContent(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConfirmBatch = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast('error', 'Không có dòng hợp lệ nào để tạo tài khoản.');
      return;
    }

    try {
      const res = store.addBatchMembers(
        validRows.map(r => ({
          student_code: r.student_code,
          full_name: r.full_name,
          class_name: r.class_name,
          union_unit: r.union_unit,
          email: r.email,
          phone: r.phone,
        }))
      );

      showToast('success', `Đã tạo thành công ${res.successCount} tài khoản đoàn viên mới!`);
      setIsBatchModalOpen(false);
      setPasteData('');
      setParsedRows([]);
      setFileName('');
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi nhập danh sách.');
    }
  };

  const loadExampleDataFromImage = () => {
    // Fill text area with exact rows from user's uploaded image
    const example = `MSSV,HỌ VÀ TÊN,LỚP,CHI ĐOÀN/ĐƠN VỊ ĐOÀN,EMAIL,SỐ ĐIỆN THOẠI
CK24OT3412,Trương Hoàng Trung Kha,CN ÔTÔ 3 9+K5,Chi đoàn 9+K5 - CN ÔTÔ 3,trungkha1105@gmail.com,0382977713
CK24KL3135,Danh Minh Trí,CGKL 9+K5,Chi đoàn 9+K5 - CGKL,mt9022125@gmail.com,0849198824
CK24OT3319,Bùi Vĩ Khiêm,CN ÔTÔ 3 9+K5,Chi đoàn 9+K5 - CN ÔTÔ 3,bvkhiem.ot305@kgc.edu.vn,0948334482
CX26OT2208,Nguyễn Minh Hiếu,CN ÔTÔ 2 K20,Chi đoàn K20 - CN ÔTÔ 2,nmhieu.ot220@kgc.edu.vn,0366388494
CK26LTOT53,Phạm Chí Nghĩa,CN ÔTÔ 2 9+K4 (LT),Chi đoàn 9+K4 - CN ÔTÔ 2 (LT),phamnghianps2008@gmail.com,0373655384`;
    setPasteData(example);
    parseRawContent(example);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-cyan-950 text-white rounded-3xl p-6 shadow-xl border border-blue-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-red-600/90 text-white text-[11px] font-black uppercase rounded-lg tracking-wider">
              Phân hệ ADMIN
            </span>
            <span className="text-cyan-300 text-xs font-semibold">
              Quản trị toàn hệ thống • Phân quyền 3 vai trò
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Quản Trị Người Dùng & Phân Quyền
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Quản trị viên có toàn quyền tạo mới tài khoản cán bộ, đoàn viên (thủ công hoặc tải file Excel), khóa/mở tài khoản, đặt lại mật khẩu và điều chỉnh quyền truy cập.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition"
          >
            <UserPlus size={16} /> Tạo Tài Khoản Mới
          </button>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition"
          >
            <FileSpreadsheet size={16} /> Nhập Hàng Loạt (Excel/CSV)
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Users size={16} className="text-blue-600" />
            <span>Tổng tài khoản</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalAccounts}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Đã cấp trên hệ thống</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <ShieldAlert size={16} className="text-red-600" />
            <span>Quản trị viên (ADMIN)</span>
          </div>
          <div className="text-2xl font-black text-red-700 mt-2">{adminCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Toàn quyền hệ thống</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-blue-600" />
            <span>Cán bộ Đoàn (CANBO)</span>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">{officerCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Quản lý hoạt động & QR</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <UserCheck size={16} className="text-emerald-600" />
            <span>Đoàn viên (DOANVIEN)</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{memberCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Quét QR & tích lũy ngày</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Lock size={16} className="text-amber-600" />
            <span>Tài khoản bị khóa</span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{lockedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bị chặn đăng nhập</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo họ tên, MSSV, mã cán bộ, email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
              <Filter size={14} /> Vai trò:
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="admin">Quản trị viên (ADMIN)</option>
              <option value="officer">Cán bộ Đoàn (CANBO)</option>
              <option value="member">Đoàn viên (DOANVIEN)</option>
            </select>

            <div className="flex items-center gap-1 text-xs text-slate-600 font-bold ml-2">
              Trạng thái:
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Bị khóa</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Mã số (MSSV/CB)</th>
                <th className="px-4 py-3.5">Họ và Tên</th>
                <th className="px-4 py-3.5">Chi Đoàn / Đơn Vị</th>
                <th className="px-4 py-3.5">Email / Tên đăng nhập</th>
                <th className="px-4 py-3.5">Vai trò</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác Quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Không tìm thấy tài khoản phù hợp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(account => {
                  const isCurrent = account.id === currentUser.id;
                  const isLocked = account.status === 'locked';

                  return (
                    <tr key={account.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {account.student_code}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{account.full_name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {account.phone || 'Chưa cập nhật SĐT'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium">{account.class_name}</div>
                        <div className="text-[11px] text-slate-400">{account.union_unit}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        <div>{account.email}</div>
                        {account.username && (
                          <div className="text-[10px] text-slate-400 font-sans">
                            User: @{account.username}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {/* Role selector for Admin */}
                        <select
                          value={account.role}
                          disabled={isCurrent}
                          onChange={e => handleChangeRole(account, e.target.value as UserRole)}
                          className={`text-xs font-extrabold px-2 py-1 rounded-lg border transition cursor-pointer disabled:cursor-not-allowed ${
                            account.role === 'admin'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : account.role === 'officer'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <option value="admin">Quản trị viên (ADMIN)</option>
                          <option value="officer">Cán bộ Đoàn (CANBO)</option>
                          <option value="member">Đoàn viên (DOANVIEN)</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isLocked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Lock size={12} /> Bị khóa
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} /> Hoạt động
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => openResetPasswordModal(account)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Đặt lại mật khẩu an toàn"
                          >
                            <KeyRound size={16} />
                          </button>

                          {/* Lock / Unlock Button */}
                          <button
                            disabled={isCurrent}
                            onClick={() => handleToggleLock(account)}
                            className={`p-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
                              isLocked
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-rose-700 hover:bg-rose-50'
                            }`}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          >
                            {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create Account Form */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Tạo Tài Khoản Mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cấp tài khoản có phân quyền bảo mật cho Cán bộ hoặc Đoàn viên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã số (MSSV / Mã cán bộ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.student_code}
                    onChange={e => setFormData({ ...formData, student_code: e.target.value })}
                    placeholder="VD: CK24OT3412, CB-001..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lớp sinh hoạt
                  </label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                    placeholder="VD: CN ÔTÔ 3 9+K5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chi đoàn / Đơn vị Đoàn
                  </label>
                  <input
                    type="text"
                    value={formData.union_unit}
                    onChange={e => setFormData({ ...formData, union_unit: e.target.value })}
                    placeholder="VD: Chi đoàn 9+K5 - CN ÔTÔ 3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email / Tên đăng nhập
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@kgc.edu.vn"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân quyền (Vai trò) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="officer">Cán bộ Đoàn (CANBO)</option>
                    <option value="member">Đoàn viên (DOANVIEN)</option>
                    <option value="admin">Quản trị viên (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu khởi tạo
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mặc định: canbo123 / doanvien123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                * Mật khẩu sẽ được tự động băm bảo mật khi lưu trữ. Người dùng mới sẽ đăng nhập và chỉ truy cập các tính năng thuộc quyền được cấp.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-md transition"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Import Modal with Template */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-100 text-cyan-800 rounded-xl">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Nhập Danh Sách Tạo Tài Khoản Hàng Loạt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hỗ trợ dán trực tiếp từ Excel hoặc tải file CSV mẫu theo chuẩn Đoàn khoa Cơ khí
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadMemberSampleCSV}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Download size={14} className="text-blue-600" /> Tải File Mẫu Excel/CSV
                </button>
                <button
                  onClick={loadExampleDataFromImage}
                  className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Sparkles size={14} className="text-amber-500" /> Nạp Dữ Liệu Từ Ảnh Đính Kèm
                </button>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <FileText size={14} /> Chọn File CSV từ máy tính {fileName && `(${fileName})`}
                </button>
              </div>
            </div>

            {/* Paste Data Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dán nội dung bảng tính hoặc CSV (Cột: MSSV | Họ và tên | Lớp | Chi đoàn | Email | SĐT):
              </label>
              <textarea
                value={pasteData}
                onChange={handlePasteChange}
                rows={5}
                placeholder="Dán các hàng từ file Excel hoặc CSV vào đây..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>
                    Xem trước kết quả phân tích ({parsedRows.filter(r => r.isValid).length}/{parsedRows.length} dòng hợp lệ):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Mật khẩu mặc định cấp phát: <strong className="text-slate-700">doanvien123</strong>
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">MSSV</th>
                        <th className="p-2">Họ và tên</th>
                        <th className="p-2">Lớp</th>
                        <th className="p-2">Chi đoàn</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Trạng thái kiểm tra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'bg-white' : 'bg-rose-50/70'}>
                          <td className="p-2 font-mono font-bold text-slate-900">{row.student_code}</td>
                          <td className="p-2 font-semibold text-slate-900">{row.full_name}</td>
                          <td className="p-2 text-slate-600">{row.class_name}</td>
                          <td className="p-2 text-slate-600">{row.union_unit}</td>
                          <td className="p-2 text-slate-500 font-mono text-[11px]">{row.email}</td>
                          <td className="p-2">
                            {row.isValid ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 size={13} /> Hợp lệ
                              </span>
                            ) : (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertCircle size={13} /> {row.errorReason}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={parsedRows.filter(r => r.isValid).length === 0}
                onClick={handleConfirmBatch}
                className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white font-extrabold rounded-xl text-xs shadow-md transition disabled:opacity-40"
              >
                Xác Nhận Tạo {parsedRows.filter(r => r.isValid).length} Tài Khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password Modal */}
      {isResetPassModalOpen && targetMemberForPass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Đặt Lại Mật Khẩu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tài khoản: {targetMemberForPass.student_code} ({targetMemberForPass.full_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsResetPassModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới (Tối thiểu 6 ký tự)
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewPasswordInput('DoanVien@2026')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition"
                >
                  Gợi ý: DoanVien@2026
                </button>
                <button
                  type="button"
                  onClick={() => setNewPasswordInput('KGC@123456')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition"
                >
                  Gợi ý: KGC@123456
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs shadow-md transition"
                >
                  Cập Nhật Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
