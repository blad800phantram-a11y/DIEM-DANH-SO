import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { Activity, Attendance, PointTransaction, Profile, ActivityStatus } from '../../types';
import { formatVietnameseDateTime } from '../../utils/exportUtils';
import {
  Users,
  Calendar,
  CheckCircle2,
  Award,
  Plus,
  QrCode,
  Clock,
  MapPin,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

interface OverviewDashboardProps {
  onOpenQR: (activityId?: string) => void;
  onNavigate: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onOpenQR,
  onNavigate,
}) => {
  const [members, setMembers] = useState<Profile[]>(store.members);
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [attendances, setAttendances] = useState<Attendance[]>(store.attendances);
  const [transactions, setTransactions] = useState<PointTransaction[]>(store.transactions);

  // Quick Create Activity Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPoints, setNewPoints] = useState(3);
  const [newStartTime, setNewStartTime] = useState('2026-10-24T08:00');
  const [newEndTime, setNewEndTime] = useState('2026-10-24T17:00');

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setMembers([...store.members]);
      setActivities([...store.activities]);
      setAttendances([...store.attendances]);
      setTransactions([...store.transactions]);
    });
    return unsub;
  }, []);

  // Compute 4 primary metrics
  const totalMembers = members.filter(m => m.role === 'member').length;
  const totalActivities = activities.length;
  const totalCheckIns = attendances.filter(att => att.status === 'verified').length;
  const totalPoints = transactions
    .filter(t => t.status === 'confirmed')
    .reduce((sum, t) => sum + (t.points || 0), 0);

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Vui lòng nhập tên hoạt động');
      return;
    }

    const created = store.createActivity({
      title: newTitle.trim(),
      description: newDescription.trim() || 'Hoạt động phong trào Đoàn TNCS Hồ Chí Minh.',
      location: newLocation.trim() || 'Hội trường Nhà trường',
      organizer: 'Ban Chấp hành Đoàn trường',
      person_in_charge: 'Cán bộ Đoàn phụ trách',
      start_time: new Date(newStartTime).toISOString(),
      end_time: new Date(newEndTime).toISOString(),
      attendance_start: new Date(newStartTime).toISOString(),
      attendance_end: new Date(newEndTime).toISOString(),
      points: Number(newPoints) || 1,
      target_groups: ['Tất cả đoàn viên'],
      status: 'active', // Open attendance immediately
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewLocation('');

    // Open QR presenter for this newly created activity
    onOpenQR(created.id);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Title & Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Tổng Quan Hệ Thống
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Theo dõi tức thì dữ liệu đoàn viên, hoạt động và tích lũy ngày Công tác xã hội
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus size={16} /> Tạo hoạt động mới
        </button>
      </div>

      {/* 4 Primary KPI Cards Required by User Brief */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Tổng số đoàn viên */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 text-blue-700 text-xs font-bold mb-2">
            <span className="p-2 bg-blue-50 rounded-xl">
              <Users size={18} />
            </span>
            <span>Tổng số đoàn viên</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {totalMembers}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Hồ sơ đã định danh</div>
        </div>

        {/* Metric 2: Tổng số hoạt động */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 text-emerald-700 text-xs font-bold mb-2">
            <span className="p-2 bg-emerald-50 rounded-xl">
              <Calendar size={18} />
            </span>
            <span>Tổng số hoạt động</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {totalActivities}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            {activities.filter(a => a.status === 'active').length} đang mở điểm danh
          </div>
        </div>

        {/* Metric 3: Số lượt tham gia */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 text-cyan-700 text-xs font-bold mb-2">
            <span className="p-2 bg-cyan-50 rounded-xl">
              <CheckCircle2 size={18} />
            </span>
            <span>Số lượt tham gia</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {totalCheckIns}
          </div>
          <div className="text-[11px] text-cyan-600 mt-1 font-medium">Điểm danh qua QR động</div>
        </div>

        {/* Metric 4: Tổng ngày Công tác xã hội đã tích lũy */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 text-amber-600 text-xs font-bold mb-2">
            <span className="p-2 bg-amber-50 rounded-xl">
              <Award size={18} />
            </span>
            <span>Tổng ngày CTXH tích lũy</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {totalPoints} ngày
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">Ngày Công tác xã hội hợp lệ</div>
        </div>
      </div>

      {/* Danh sách hoạt động gần đây */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Danh Sách Hoạt Động Gần Đây</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cán bộ có thể mở điểm danh trực tiếp hoặc xem chi tiết số đoàn viên tham gia
            </p>
          </div>

          <button
            onClick={() => onNavigate('activities')}
            className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
          >
            Tất cả hoạt động <ArrowRight size={13} />
          </button>
        </div>

        {/* Activities List */}
        <div className="space-y-3">
          {activities.map(act => {
            const attendeesCount = attendances.filter(
              att => att.activity_id === act.id && att.status === 'verified'
            ).length;
            const isOpen = act.status === 'active';

            return (
              <div
                key={act.id}
                className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isOpen
                    ? 'bg-blue-50/40 border-blue-200 hover:border-blue-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {act.activity_code}
                    </span>
                    <span className="font-bold text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      +{act.points} ngày CTXH
                    </span>
                    {isOpen ? (
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                        Đang mở điểm danh QR
                      </span>
                    ) : (
                      <span className="font-medium text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {act.status === 'scheduled'
                          ? 'Đã lên lịch'
                          : act.status === 'completed'
                          ? 'Đã hoàn thành'
                          : 'Đã đóng'}
                      </span>
                    )}
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm mt-1.5">{act.title}</h4>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {act.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatVietnameseDateTime(act.start_time)}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Users size={12} /> Đã điểm danh: <strong>{attendeesCount}</strong> đoàn viên
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center">
                  <button
                    onClick={() => onOpenQR(act.id)}
                    className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                  >
                    <QrCode size={14} /> {isOpen ? 'Phát mã QR' : 'Mở điểm danh QR'}
                  </button>

                  <button
                    onClick={() => onNavigate('activities')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Quản lý
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Tạo Hoạt Động Nhanh */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-blue-700" /> Tạo Hoạt Động Đoàn Mới
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tên hoạt động <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Ngày Chủ nhật xanh lần thứ 153"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mức ngày Công tác xã hội được duyệt (+Ngày) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={newPoints}
                  onChange={e => setNewPoints(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-700 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Địa điểm</label>
                  <input
                    type="text"
                    placeholder="Sân trường / Hội trường A"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thời gian</label>
                  <input
                    type="datetime-local"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung tóm tắt</label>
                <textarea
                  rows={2}
                  placeholder="Mục đích, kế hoạch và yêu cầu tham gia..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={14} /> Lưu & Mở điểm danh QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
