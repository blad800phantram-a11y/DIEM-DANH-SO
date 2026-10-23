import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { AuditLog } from '../../types';
import { formatVietnameseDateTime } from '../../utils/exportUtils';
import { ShieldCheck, Search, Filter, Clock, Activity, FileText } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(store.auditLogs);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setLogs([...store.auditLogs]);
    });
    return unsub;
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch =
      log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = typeFilter === 'ALL' || log.target_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-blue-700" size={26} /> Nhật Ký Hệ Thống & Kiểm Toán (Audit Logs)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Ghi nhận toàn bộ thao tác quan trọng: sinh token QR, ghi nhận điểm, điều chỉnh điểm và thay đổi trạng thái
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo hành động, người thực hiện hoặc nội dung..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden"
        >
          <option value="ALL">Tất cả đối tượng</option>
          <option value="qr_session">Phiên mã QR</option>
          <option value="attendance">Điểm danh</option>
          <option value="point">Ngày Công tác xã hội</option>
          <option value="activity">Hoạt động</option>
          <option value="user">Đoàn viên</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 text-center">STT</th>
                <th className="py-3 px-3.5">Thời gian</th>
                <th className="py-3 px-3.5">Người thực hiện</th>
                <th className="py-3 px-3.5">Hành động</th>
                <th className="py-3 px-3.5 text-center">Phân loại</th>
                <th className="py-3 px-3.5">Chi tiết thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap">
                    {formatVietnameseDateTime(log.created_at)}
                  </td>
                  <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                    {log.actor_name}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-bold text-blue-900 text-[11px]">
                    {log.action}
                  </td>
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {log.target_type}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 font-medium">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
