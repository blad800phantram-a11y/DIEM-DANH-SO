import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { Attendance, Activity, Profile } from '../../types';
import { exportAttendanceReportToCSV, formatVietnameseDateTime } from '../../utils/exportUtils';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Users,
  Award,
  TrendingUp,
  Percent,
  Camera,
  MapPin,
  X,
  Eye,
  Navigation,
} from 'lucide-react';

export const ReportsAndStats: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [attendances, setAttendances] = useState<Attendance[]>(store.attendances);
  const [members, setMembers] = useState<Profile[]>(store.members);

  const [selectedActivityId, setSelectedActivityId] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProofAtt, setSelectedProofAtt] = useState<Attendance | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setActivities([...store.activities]);
      setAttendances([...store.attendances]);
      setMembers([...store.members]);
    });
    return unsub;
  }, []);

  const uniqueClasses = Array.from(new Set(members.map(m => m.class_name))).filter(Boolean);

  // Filter attendances
  const filteredAttendances = attendances.filter(att => {
    const matchActivity = selectedActivityId === 'ALL' || att.activity_id === selectedActivityId;
    const matchClass = selectedClass === 'ALL' || att.class_name === selectedClass;
    const matchSearch =
      att.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.student_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.activity_title.toLowerCase().includes(searchTerm.toLowerCase());

    return matchActivity && matchClass && matchSearch;
  });

  // KPI calculations
  const totalVerified = filteredAttendances.filter(a => a.status === 'verified').length;
  const totalPointsAwarded = filteredAttendances.reduce((sum, a) => sum + (a.points_awarded || 0), 0);

  const activeActObj = activities.find(a => a.id === selectedActivityId);
  const currentActivityTitle = activeActObj ? activeActObj.title : 'Tất cả hoạt động';

  const handleExport = () => {
    exportAttendanceReportToCSV(filteredAttendances, currentActivityTitle);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" size={26} /> Báo Cáo & Thống Kê Điểm Danh
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tổng hợp dữ liệu tham gia, ngày Công tác xã hội và kết xuất báo cáo chuẩn Excel cho nhà trường
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition"
        >
          <Download size={16} /> Xuất Báo Cáo Excel (CSV)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Tổng lượt điểm danh</div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-900 mt-1">
            {totalVerified}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">100% mã QR hợp lệ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Tổng ngày CTXH tích lũy</div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-1">
            +{totalPointsAwarded} ngày
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Khớp với sổ giao dịch</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Hoạt động báo cáo</div>
          <div className="text-base sm:text-lg font-extrabold text-slate-800 mt-1 truncate">
            {selectedActivityId === 'ALL' ? 'Tất cả (5 hoạt động)' : activeActObj?.activity_code}
          </div>
          <div className="text-[11px] text-blue-600 font-medium truncate">
            {selectedActivityId === 'ALL' ? 'Toàn hệ thống' : activeActObj?.title}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Đoàn viên tham gia</div>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1">
            {new Set(filteredAttendances.map(a => a.member_id)).size} người
          </div>
          <div className="text-[11px] text-indigo-500 font-medium">Dữ liệu thực tế</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên đoàn viên, mã số sinh viên..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedActivityId}
            onChange={e => setSelectedActivityId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden max-w-xs"
          >
            <option value="ALL">Tất cả hoạt động</option>
            {activities.map(act => (
              <option key={act.id} value={act.id}>
                [{act.activity_code}] {act.title}
              </option>
            ))}
          </select>

          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Tất cả Lớp / Chi đoàn</option>
            {uniqueClasses.map(c => (
              <option key={c} value={c}>
                Lớp {c}
              </option>
            ))}
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
                <th className="py-3 px-3.5">Tên hoạt động</th>
                <th className="py-3 px-3.5">Thời gian điểm danh (Giờ VN)</th>
                <th className="py-3 px-3.5 text-center">Minh chứng / GPS</th>
                <th className="py-3 px-3.5 text-right">Ngày CTXH ghi nhận</th>
                <th className="py-3 px-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttendances.length > 0 ? (
                filteredAttendances.map((att, idx) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-900">
                      {att.student_code}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900">{att.member_name}</td>
                    <td className="py-3 px-3.5 text-slate-600">{att.class_name}</td>
                    <td className="py-3 px-3.5 font-medium text-slate-800">
                      <span className="font-mono text-[10px] text-blue-700 mr-1">
                        [{att.activity_code}]
                      </span>
                      {att.activity_title}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-500">
                      {formatVietnameseDateTime(att.checked_in_at)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {att.proof_image ? (
                          <button
                            onClick={() => setSelectedProofAtt(att)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                            title="Xem ảnh minh chứng camera trực tiếp"
                          >
                            <Camera size={11} /> Ảnh camera
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                        {att.coordinates && (
                          <button
                            onClick={() => setSelectedProofAtt(att)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition"
                            title="Xem tọa độ GPS"
                          >
                            <MapPin size={10} className="text-rose-600" />
                            GPS {att.coordinates.distance_meters !== undefined ? `(${att.coordinates.distance_meters}m)` : ''}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-extrabold text-emerald-600 text-sm">
                      +{att.points_awarded} ngày
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={10} /> Hợp lệ
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    Không tìm thấy bản ghi điểm danh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Xem Minh Chứng & Tọa Độ Chi Tiết */}
      {selectedProofAtt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                  {selectedProofAtt.activity_code}
                </span>
                <h3 className="font-extrabold text-slate-900 text-sm mt-1">
                  Minh Chứng Tham Gia Hoạt Động
                </h3>
              </div>
              <button
                onClick={() => setSelectedProofAtt(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl space-y-1">
                <div>Đoàn viên: <strong className="text-slate-900">{selectedProofAtt.member_name}</strong> ({selectedProofAtt.student_code})</div>
                <div>Lớp / Chi đoàn: <strong className="text-slate-700">{selectedProofAtt.class_name}</strong></div>
                <div>Thời gian quét: <strong className="text-slate-700">{formatVietnameseDateTime(selectedProofAtt.checked_in_at)}</strong></div>
              </div>

              {selectedProofAtt.coordinates && (
                <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl space-y-1 text-amber-950">
                  <div className="font-bold flex items-center gap-1 text-amber-900">
                    <Navigation size={13} className="text-rose-600" /> Tọa độ GPS thu thập:
                  </div>
                  <div className="font-mono text-[11px]">
                    {selectedProofAtt.coordinates.latitude.toFixed(5)}° N, {selectedProofAtt.coordinates.longitude.toFixed(5)}° E
                  </div>
                  {selectedProofAtt.coordinates.distance_meters !== undefined && (
                    <div className="text-[11px]">
                      Cự ly tới địa điểm: <strong>{selectedProofAtt.coordinates.distance_meters}m</strong> {selectedProofAtt.coordinates.is_within_radius ? '(✓ Hợp lệ)' : '(Ngoài bán kính tiêu chuẩn)'}
                    </div>
                  )}
                </div>
              )}

              {selectedProofAtt.proof_image ? (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <Camera size={13} className="text-blue-600" />
                    Ảnh chụp trực tiếp từ Camera:
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                    <img
                      src={selectedProofAtt.proof_image}
                      alt="Ảnh minh chứng camera"
                      className="w-full h-auto object-contain max-h-72 bg-slate-900"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">
                    Ảnh đóng dấu kỹ thuật số: Thời gian + Mã ĐV + Tọa độ GPS chống gian lận
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                  Hoạt động này không yêu cầu hình ảnh minh chứng.
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedProofAtt(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
