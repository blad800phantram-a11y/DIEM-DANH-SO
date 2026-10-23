import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { PointTransaction, Profile, Activity } from '../../types';
import { exportPointTransactionsToCSV, formatVietnameseDateTime } from '../../utils/exportUtils';
import {
  Award,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Users,
  FileSpreadsheet,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface PointLedgerProps {
  currentUser: Profile;
}

export const PointLedger: React.FC<PointLedgerProps> = ({ currentUser }) => {
  const [transactions, setTransactions] = useState<PointTransaction[]>(store.transactions);
  const [members, setMembers] = useState<Profile[]>(store.members);
  const [activities, setActivities] = useState<Activity[]>(store.activities);

  const [activeSubTab, setActiveSubTab] = useState<'members_summary' | 'detailed_ledger'>('members_summary');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setTransactions([...store.transactions]);
      setMembers([...store.members]);
      setActivities([...store.activities]);
    });
    return unsub;
  }, []);

  const isOfficer = currentUser.role === 'admin' || currentUser.role === 'officer';

  // If member role, only display user's own data
  const displayedMembers = isOfficer
    ? members.filter(m => m.role === 'member')
    : members.filter(m => m.id === currentUser.id);

  const displayedTransactions = isOfficer
    ? transactions
    : transactions.filter(t => t.member_id === currentUser.id);

  // Filter members summary
  const filteredMembers = displayedMembers.filter(m => {
    const matchSearch =
      m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.student_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = classFilter === 'ALL' || m.class_name === classFilter;
    return matchSearch && matchClass;
  });

  // Filter detailed transaction records
  const filteredTransactions = displayedTransactions.filter(t => {
    const matchSearch =
      t.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.activity_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchActivity = activityFilter === 'ALL' || t.activity_id === activityFilter;
    return matchSearch && matchActivity;
  });

  const uniqueClasses = Array.from(new Set(members.map(m => m.class_name))).filter(Boolean);

  // Compute total accumulated points
  const totalPointsRecorded = displayedTransactions
    .filter(t => t.status === 'confirmed')
    .reduce((sum, t) => sum + (t.points || 0), 0);



    if (pts >= 30) return { label: 'Xuất sắc', color: 'bg-emerald-100 text-emerald-800' };
    if (pts >= 20) return { label: 'Tốt', color: 'bg-blue-100 text-blue-800' };
    if (pts >= 10) return { label: 'Khá', color: 'bg-amber-100 text-amber-800' };
    return { label: 'Trung bình', color: 'bg-slate-100 text-slate-700' };
  };

  const handleExportCSV = () => {
    exportPointTransactionsToCSV(filteredTransactions, 'bang_tong_hop_ngay_cong_tac_xa_hoi.csv');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="text-amber-500" size={26} /> Quản Lý & Tích Lũy Ngày Công Tác Xã Hội
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ngày Công tác xã hội được tự động lấy từ cấu hình hoạt động khi điểm danh QR hợp lệ
          </p>
        </div>

        {isOfficer && (
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition"
            title="Xuất bảng ngày Công tác xã hội ra file Excel (CSV) có hỗ trợ tiếng Việt đầy đủ"
          >
            <Download size={15} /> Xuất Báo Cáo Excel (CSV)
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-bold">Tổng ngày CTXH ghi nhận</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {totalPointsRecorded} ngày
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tích lũy từ quét QR</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-bold">Lượt cộng ngày CTXH hợp lệ</div>
          <div className="text-2xl font-extrabold text-blue-900 mt-1">
            {displayedTransactions.length} lượt
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">1 lượt / 1 hoạt động</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-bold">Đoàn viên tích lũy CTXH</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {displayedMembers.length} người
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tự động tổng hợp</div>
        </div>
      </div>

      {/* Sub Tabs Switcher */}
      {isOfficer && (
        <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold max-w-md">
          <button
            onClick={() => setActiveSubTab('members_summary')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeSubTab === 'members_summary'
                ? 'bg-white text-blue-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={14} /> Tổng ngày CTXH từng đoàn viên
          </button>
          <button
            onClick={() => setActiveSubTab('detailed_ledger')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeSubTab === 'detailed_ledger'
                ? 'bg-white text-blue-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} /> Nhật ký cộng ngày CTXH chi tiết
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên đoàn viên, mã số, hoặc tên hoạt động..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'members_summary' && isOfficer && (
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Tất cả lớp / Chi đoàn</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>
                  Lớp {c}
                </option>
              ))}
            </select>
          )}

          {activeSubTab === 'detailed_ledger' && (
            <select
              value={activityFilter}
              onChange={e => setActivityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden max-w-xs"
            >
              <option value="ALL">Tất cả hoạt động</option>
              {activities.map(act => (
                <option key={act.id} value={act.id}>
                  [{act.activity_code}] {act.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* SUB-VIEW 1: Bảng tổng hợp điểm của từng đoàn viên */}
      {(activeSubTab === 'members_summary' || !isOfficer) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Users size={16} className="text-blue-700" />
              <span>Bảng Tổng Hợp Ngày Công Tác Xã Hội ({filteredMembers.length} đoàn viên)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Tự động tổng hợp thời gian thực</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 text-center">STT</th>
                  <th className="py-2.5 px-3.5">Mã ĐV</th>
                  <th className="py-2.5 px-3.5">Họ và tên đoàn viên</th>
                  <th className="py-2.5 px-3.5">Lớp / Chi đoàn</th>
                  <th className="py-2.5 px-3.5 text-center">Số hoạt động</th>
                  <th className="py-2.5 px-3.5 text-right">Tổng ngày CTXH</th>
                  <th className="py-2.5 px-3.5 text-center">Xếp loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m, idx) => {

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-blue-900">{m.student_code}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{m.full_name}</td>
                      <td className="py-2.5 px-3.5 text-slate-600">{m.class_name}</td>
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-700">
                        {m.attended_count}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-blue-700 text-sm">
                        {m.total_points} ngày
                      </td>
                      <td className="py-2.5 px-3.5 text-center">


                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Nhật ký cộng điểm chi tiết từng hoạt động */}
      {activeSubTab === 'detailed_ledger' && isOfficer && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Clock size={16} className="text-blue-700" />
              <span>Lịch Sử Ghi Nhận Ngày Công Tác Xã Hội Chi Tiết ({filteredTransactions.length} giao dịch)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Minh bạch & có căn cứ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 text-center">STT</th>
                  <th className="py-2.5 px-3.5">Thời gian</th>
                  <th className="py-2.5 px-3.5">Mã ĐV</th>
                  <th className="py-2.5 px-3.5">Đoàn viên</th>
                  <th className="py-2.5 px-3.5">Tên hoạt động</th>
                  <th className="py-2.5 px-3.5 text-right">Ngày CTXH cộng</th>
                  <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-500">
                      {formatVietnameseDateTime(tx.created_at)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-blue-900">
                      {tx.student_code}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{tx.member_name}</td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-800">
                      <span className="font-mono text-[10px] text-blue-700 mr-1">
                        [{tx.activity_id}]
                      </span>
                      {tx.activity_title}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-extrabold text-emerald-600 text-sm">
                      +{tx.points} ngày
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={10} /> Đã xác nhận
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
