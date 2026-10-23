import React, { useState, useEffect, useRef } from 'react';
import { store } from '../../services/store';
import { Profile, UserRole, AccountStatus } from '../../types';
import { exportMembersToCSV, downloadMemberImportTemplate } from '../../utils/exportUtils';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Lock,
  Unlock,
  Edit2,
  Eye,
  CheckCircle2,
  X,
  AlertCircle,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Sparkles,
  ShieldCheck,
  Check,
  AlertTriangle,
  UserCheck,
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

export const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Profile[]>(store.members);
  const [currentUser, setCurrentUser] = useState<Profile>(store.getCurrentUser());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Form State for Manual Add Member
  const [formData, setFormData] = useState({
    student_code: '',
    full_name: '',
    class_name: 'K47-CNTT1',
    union_unit: 'Chi đoàn K47-CNTT1',
    email: '',
    phone: '',
    role: 'member' as UserRole,
    status: 'active' as AccountStatus,
  });

  // Batch Import States
  const [batchTab, setBatchTab] = useState<'upload' | 'paste'>('paste');
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

  const isOfficerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'officer';

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchSearch =
      m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchClass = classFilter === 'ALL' || m.class_name === classFilter;
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchSearch && matchClass && matchStatus;
  });

  const uniqueClasses = Array.from(new Set(members.map(m => m.class_name))).filter(Boolean);

  // Parse raw text (CSV or tab-separated spreadsheet paste) into structured rows
  const parseRawContent = (rawText: string) => {
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const existingCodes = new Set(members.map(m => m.student_code.toLowerCase()));
    const batchCodes = new Set<string>();
    const results: ParsedMemberRow[] = [];

    // Detect if first row is header
    const firstLineLower = lines[0]?.toLowerCase() || '';
    const hasHeader =
      firstLineLower.includes('mã') ||
      firstLineLower.includes('student') ||
      firstLineLower.includes('họ và tên') ||
      firstLineLower.includes('full name');

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Split by tab (Excel paste) or comma (CSV)
      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t').map(c => c.replace(/^["']|["']$/g, '').trim());
      } else {
        // Simple CSV splitter handling quotes
        const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
        cols = (match || []).map(c =>
          c.replace(/^,/, '').replace(/^["']|["']$/g, '').trim()
        );
      }

      const code = (cols[0] || '').toUpperCase();
      const name = cols[1] || '';
      const className = cols[2] || 'K47-CNTT1';
      const unit = cols[3] || `Chi đoàn ${className}`;
      const email = cols[4] || (code ? `${code.toLowerCase()}@sinhvien.edu.vn` : '');
      const phone = cols[5] || '0900000000';

      let isValid = true;
      let errorReason = '';

      if (!code) {
        isValid = false;
        errorReason = 'Thiếu mã đoàn viên';
      } else if (!name) {
        isValid = false;
        errorReason = 'Thiếu họ và tên';
      } else if (existingCodes.has(code.toLowerCase())) {
        isValid = false;
        errorReason = 'Mã đoàn viên đã tồn tại trên hệ thống';
      } else if (batchCodes.has(code.toLowerCase())) {
        isValid = false;
        errorReason = 'Mã đoàn viên bị trùng lặp trong danh sách';
      } else {
        batchCodes.add(code.toLowerCase());
      }

      results.push({
        student_code: code,
        full_name: name,
        class_name: className,
        union_unit: unit,
        email,
        phone,
        isValid,
        errorReason,
      });
    }

    setParsedRows(results);
  };

  // Handle Textarea paste change
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteData(val);
    parseRawContent(val);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setPasteData(text);
      parseRawContent(text);
    };
    reader.readAsText(file);
  };

  // Sample data button for instant testing
  const handleLoadSamplePaste = () => {
    const sample = `Mã đoàn viên\tHọ và tên\tLớp\tChi đoàn\tEmail\tSố điện thoại
DVS-2421\tNguyễn Hoàng Nam\tK47-CNTT1\tChi đoàn K47-CNTT1\tnam.nh.dvs2421@sinhvien.edu.vn\t0912345001
DVS-2422\tTrần Thị Ánh Tuyết\tK47-QTKD1\tChi đoàn K47-QTKD1\ttuyet.tta.dvs2422@sinhvien.edu.vn\t0912345002
DVS-2423\tLê Quang Hải\tK48-DTVT\tChi đoàn K48-DTVT\thai.lq.dvs2423@sinhvien.edu.vn\t0912345003
DVS-2424\tPhạm Thúy Vi\tK48-KT1\tChi đoàn K48-KT1\tvi.pt.dvs2424@sinhvien.edu.vn\t0912345004
DVS-2425\tĐỗ Minh Nhật\tK47-CNTT2\tChi đoàn K47-CNTT2\tnhat.dm.dvs2425@sinhvien.edu.vn\t0912345005`;
    setPasteData(sample);
    parseRawContent(sample);
  };

  // Submit batch creation
  const handleConfirmBatchImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Không có đoàn viên hợp lệ nào để nạp.');
      return;
    }

    try {
      const result = store.addBatchMembers(validRows);
      setSuccessMessage(
        `Đã tạo thành công tài khoản cho ${result.successCount} đoàn viên thanh niên vào hệ thống!`
      );
      setIsBatchModalOpen(false);
      setPasteData('');
      setParsedRows([]);
      setFileName('');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi nạp danh sách.');
    }
  };

  // Single manual member create
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      if (!isOfficerOrAdmin) {
        throw new Error('Bạn không có quyền tạo tài khoản đoàn viên.');
      }
      if (!formData.student_code.trim()) throw new Error('Vui lòng nhập mã đoàn viên.');
      if (!formData.full_name.trim()) throw new Error('Vui lòng nhập họ và tên.');

      store.addMember({
        student_code: formData.student_code,
        full_name: formData.full_name,
        class_name: formData.class_name,
        union_unit: formData.union_unit,
        email: formData.email || `${formData.student_code.toLowerCase()}@sinhvien.edu.vn`,
        phone: formData.phone || '0900000000',
        role: formData.role,
        status: formData.status,
      });

      setSuccessMessage(`Đã tạo thành công tài khoản cho đoàn viên ${formData.full_name}!`);
      setIsAddModalOpen(false);
      setFormData({
        student_code: '',
        full_name: '',
        class_name: 'K47-CNTT1',
        union_unit: 'Chi đoàn K47-CNTT1',
        email: '',
        phone: '',
        role: 'member',
        status: 'active',
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi thêm đoàn viên.');
    }
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      store.updateMember(editingMember.id, {
        full_name: editingMember.full_name,
        class_name: editingMember.class_name,
        union_unit: editingMember.union_unit,
        email: editingMember.email,
        phone: editingMember.phone,
      });
      setEditingMember(null);
      setSuccessMessage('Đã cập nhật thông tin đoàn viên thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi cập nhật.');
    }
  };

  const handleToggleLock = (m: Profile) => {
    const action = m.status === 'active' ? 'khóa' : 'mở khóa';
    if (window.confirm(`Bạn có chắc chắn muốn ${action} tài khoản của đoàn viên ${m.full_name}?`)) {
      store.toggleMemberLock(m.id);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="text-blue-700" size={28} />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Quản Lý Đoàn Viên & Phân Quyền Khởi Tạo
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cán bộ Đoàn và Quản trị viên được cấp quyền khởi tạo tài khoản cho đoàn viên bằng cách <strong>nhập thủ công</strong> hoặc <strong>nhập danh sách theo mẫu</strong>.
          </p>
        </div>

        {/* Action Buttons Suite */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportMembersToCSV(filteredMembers)}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition"
            title="Xuất dữ liệu đoàn viên đang hiển thị ra tệp CSV"
          >
            <Download size={14} /> Xuất CSV
          </button>

          <button
            onClick={() => downloadMemberImportTemplate()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
            title="Tải về tệp mẫu CSV / Excel chuẩn để chuẩn bị danh sách"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" /> Tải mẫu CSV
          </button>

          {isOfficerOrAdmin && (
            <>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition"
                title="Nhập nhiều tài khoản đoàn viên cùng lúc từ tệp hoặc dán bảng Excel"
              >
                <UploadCloud size={16} /> Nhập Danh Sách Theo Mẫu
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition"
                title="Tạo từng tài khoản đoàn viên bằng cách nhập thủ công"
              >
                <Plus size={16} /> Nhập Thủ Công
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role Authorization Banner */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-950">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-700 text-white rounded-lg">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="font-extrabold text-blue-900">
              Quyền hạn cán bộ Đoàn:
            </span>{' '}
            Đồng chí <strong>{currentUser.full_name}</strong> ({currentUser.role === 'admin' ? 'Quản trị viên' : 'Cán bộ Đoàn'}) có thẩm quyền khởi tạo tài khoản cá nhân, cấp phát mã đoàn viên và quản lý hồ sơ đoàn viên trong đơn vị.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 bg-white text-blue-800 font-bold rounded-lg border border-blue-200 text-[11px] shadow-2xs">
            ✓ Quyền: Thêm thủ công & Import file mẫu
          </span>
        </div>
      </div>

      {/* Notification Banners */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs flex items-center gap-2 font-medium animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-950 rounded-2xl text-xs flex items-center gap-2 font-medium animate-in fade-in">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên đoàn viên, mã số sinh viên, chi đoàn..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Tất cả lớp / Chi đoàn</option>
            {uniqueClasses.map(c => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 text-center">STT</th>
                <th className="py-3 px-3.5">Mã ĐV</th>
                <th className="py-3 px-3.5">Họ và tên đoàn viên</th>
                <th className="py-3 px-3.5">Lớp / Chi đoàn</th>
                <th className="py-3 px-3.5">Email / SĐT</th>
                <th className="py-3 px-3.5 text-center">Vai trò</th>
                <th className="py-3 px-3.5 text-center">Trạng thái</th>
                <th className="py-3 px-3.5 text-right">Tổng điểm</th>
                <th className="py-3 px-3.5 text-center">Số HĐ</th>
                <th className="py-3 px-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m, index) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3.5 text-center text-slate-400 font-mono">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-bold text-blue-900">
                    {m.student_code}
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-slate-900">{m.full_name}</div>
                    <div className="text-[10px] text-slate-400">{m.union_unit}</div>
                  </td>
                  <td className="py-3 px-3.5 font-medium text-slate-700">{m.class_name}</td>
                  <td className="py-3 px-3.5 text-slate-500">
                    <div>{m.email}</div>
                    <div className="text-[10px] font-mono">{m.phone}</div>
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : m.role === 'officer'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.role === 'admin' ? 'Admin' : m.role === 'officer' ? 'Cán bộ' : 'Đoàn viên'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {m.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right font-extrabold text-blue-700 text-sm">
                    {m.total_points}đ
                  </td>
                  <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                    {m.attended_count}
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedMember(m)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        title="Xem hồ sơ chi tiết"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setEditingMember(m)}
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleLock(m)}
                        className={`p-1.5 rounded-lg transition ${
                          m.status === 'active'
                            ? 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                            : 'text-rose-600 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={m.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      >
                        {m.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Nhập Thủ Công Đoàn Viên */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Khởi Tạo Tài Khoản Đoàn Viên (Thủ Công)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Thực hiện bởi Cán bộ Đoàn: <strong>{currentUser.full_name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mã đoàn viên / sinh viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: DVS-2421"
                  value={formData.student_code}
                  onChange={e => setFormData({ ...formData, student_code: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Mã đoàn viên là duy nhất trong toàn hệ thống.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Họ và tên đoàn viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lớp</label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chi đoàn / Đơn vị Đoàn</label>
                  <input
                    type="text"
                    value={formData.union_unit}
                    onChange={e => setFormData({ ...formData, union_unit: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email liên hệ</label>
                  <input
                    type="email"
                    placeholder="email@sinhvien.edu.vn"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="09..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-sm"
                >
                  Khởi Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Nhập Danh Sách Theo Mẫu (Batch Import) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    Nhập Danh Sách Đoàn Viên Theo Mẫu (Import Hàng Loạt)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cán bộ Đoàn có thể tải lên file .CSV hoặc sao chép - dán trực tiếp từ bảng tính Excel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Instructions and Template Download Bar */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-emerald-700 shrink-0" />
                  <span>
                    Định dạng cột chuẩn: <strong>Mã đoàn viên, Họ và tên, Lớp, Chi đoàn, Email, SĐT</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadMemberImportTemplate()}
                    className="px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl border border-emerald-300 transition shadow-2xs flex items-center gap-1.5"
                  >
                    <Download size={13} /> Tải file mẫu .CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSamplePaste}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition shadow-2xs flex items-center gap-1"
                  >
                    <Sparkles size={13} /> Dán 5 đoàn viên mẫu
                  </button>
                </div>
              </div>

              {/* Input Method Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBatchTab('paste')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    batchTab === 'paste' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={15} /> Dán trực tiếp từ Excel / Bảng tính
                </button>
                <button
                  type="button"
                  onClick={() => setBatchTab('upload')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    batchTab === 'upload' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud size={15} /> Tải lên tệp .CSV từ máy tính
                </button>
              </div>

              {/* Tab 1: Upload CSV file */}
              {batchTab === 'upload' && (
                <div className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl text-center bg-slate-50/60 transition">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <UploadCloud size={36} className="mx-auto text-slate-400 mb-2" />
                  <p className="font-bold text-slate-700 mb-1">
                    {fileName ? `Tệp đã chọn: ${fileName}` : 'Chọn tệp CSV danh sách đoàn viên'}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Hỗ trợ tệp định dạng .CSV (UTF-8) xuất từ Microsoft Excel hoặc Google Trang tính
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition"
                  >
                    Duyệt tệp từ thiết bị
                  </button>
                </div>
              )}

              {/* Tab 2: Paste data */}
              {batchTab === 'paste' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Vùng dán dữ liệu (Sao chép các dòng trong Excel và dán vào đây):
                  </label>
                  <textarea
                    rows={4}
                    value={pasteData}
                    onChange={handlePasteChange}
                    placeholder={`DVS-2421\tNguyễn Hoàng Nam\tK47-CNTT1\tChi đoàn K47-CNTT1\tnam.nh@sinhvien.edu.vn\t0912345001\nDVS-2422\tTrần Thị Ánh Tuyết\tK47-QTKD1\tChi đoàn K47-QTKD1\ttuyet.tta@sinhvien.edu.vn\t0912345002`}
                    className="w-full p-3 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>Xem trước danh sách ({parsedRows.length} dòng):</span>
                    </span>

                    <div className="flex items-center gap-2 font-bold text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check size={12} /> {validCount} hợp lệ
                      </span>
                      {invalidCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                          <AlertTriangle size={12} /> {invalidCount} lỗi / trùng
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Mã ĐV</th>
                          <th className="py-2 px-3">Họ và tên</th>
                          <th className="py-2 px-3">Lớp</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3 text-center">Trạng thái duyệt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((r, i) => (
                          <tr
                            key={i}
                            className={r.isValid ? 'hover:bg-slate-50/50' : 'bg-rose-50/50'}
                          >
                            <td className="py-2 px-3 font-mono font-bold">{r.student_code}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{r.full_name}</td>
                            <td className="py-2 px-3 text-slate-600">{r.class_name}</td>
                            <td className="py-2 px-3 text-slate-500">{r.email}</td>
                            <td className="py-2 px-3 text-center">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check size={10} /> Hợp lệ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  <X size={10} /> {r.errorReason}
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
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Thao tác này sẽ tự động ghi vết vào Nhật Ký Hệ Thống (Audit Logs).
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBatchImport}
                  disabled={validCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold transition shadow-md flex items-center gap-1.5"
                >
                  <Check size={16} /> Xác nhận nạp {validCount} đoàn viên vào hệ thống
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Xem Hồ Sơ Chi Tiết Đoàn Viên */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900">Hồ Sơ Đoàn Viên Số</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-700 text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                {selectedMember.full_name.charAt(0)}
              </div>
              <h4 className="font-extrabold text-lg text-slate-900 mt-2">
                {selectedMember.full_name}
              </h4>
              <p className="text-xs font-mono font-bold text-blue-700">
                {selectedMember.student_code}
              </p>
            </div>

            <div className="mt-5 space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Lớp:</span>
                <span className="font-bold text-slate-800">{selectedMember.class_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Chi đoàn:</span>
                <span className="font-bold text-slate-800">{selectedMember.union_unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-mono text-slate-700">{selectedMember.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Điện thoại:</span>
                <span className="font-mono text-slate-700">{selectedMember.phone}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Tổng ngày Công tác xã hội:</span>
                <span className="font-extrabold text-blue-700 text-sm">
                  {selectedMember.total_points} ngày
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Hoạt động đã tham gia:</span>
                <span className="font-bold text-slate-800">
                  {selectedMember.attended_count} hoạt động
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Trạng thái:</span>
                <span
                  className={`font-bold ${
                    selectedMember.status === 'active' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {selectedMember.status === 'active' ? 'Đang hoạt động' : 'Tài khoản bị khóa'}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setSelectedMember(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Chỉnh sửa thông tin */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900">Chỉnh Sửa Thông Tin</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã đoàn viên (Cố định)</label>
                <input
                  type="text"
                  disabled
                  value={editingMember.student_code}
                  className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono text-slate-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editingMember.full_name}
                  onChange={e =>
                    setEditingMember({ ...editingMember, full_name: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lớp</label>
                <input
                  type="text"
                  value={editingMember.class_name}
                  onChange={e =>
                    setEditingMember({ ...editingMember, class_name: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={e =>
                    setEditingMember({ ...editingMember, email: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
