import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { Profile, Activity, PointTransaction, Attendance, Announcement } from '../../types';
import { formatVietnameseDateTime } from '../../utils/exportUtils';
import {
  QrCode,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Bell,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Camera,
  Navigation,
} from 'lucide-react';

interface MemberHomeProps {
  currentUser: Profile;
  onOpenScanner: () => void;
  onNavigateTab: (tab: string) => void;
}

export const MemberHome: React.FC<MemberHomeProps> = ({
  currentUser,
  onOpenScanner,
  onNavigateTab,
}) => {
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [transactions, setTransactions] = useState<PointTransaction[]>(store.transactions);
  const [attendances, setAttendances] = useState<Attendance[]>(store.attendances);
  const [announcements, setAnnouncements] = useState<Announcement[]>(store.announcements);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setActivities([...store.activities]);
      setTransactions([...store.transactions]);
      setAttendances([...store.attendances]);
      setAnnouncements([...store.announcements]);
    });
    return unsub;
  }, []);

  // Filter user specific data
  const userAttendances = attendances.filter(a => a.member_id === currentUser.id);
  const userTransactions = transactions.filter(t => t.member_id === currentUser.id);

  // Check-in status for activities
  const isCheckedIn = (activityId: string) =>
    userAttendances.some(a => a.activity_id === activityId && a.status === 'verified');

  //  removed - không xếp loại dựa vào ngày công tác xã hội

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Member Hero Card */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute right-20 top-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-extrabold text-2xl text-amber-300 shadow-inner">
              {currentUser.full_name.charAt(0)}
            </div>
            <div>
              <div className="text-xs text-blue-200 font-medium">Xin chào, Đồng chí</div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {currentUser.full_name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-blue-100">
                <span className="font-mono font-bold bg-white/15 px-2 py-0.5 rounded">
                  {currentUser.student_code}
                <span>•</span>
                <span>{currentUser.class_name}</span>
                <span>•</span>
                <span className="text-cyan-200">{currentUser.union_unit}</span>
              </div>
            </div>
          </div>

          <div className="self-start sm:self-center">

            >

          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10 text-center sm:text-left">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10">
            <div className="text-xs text-blue-200">Ngày Công tác xã hội tích lũy</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 mt-0.5">
              {currentUser.total_points || 0} ngày
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10">
            <div className="text-xs text-blue-200">Hoạt động đã tham gia</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {currentUser.attended_count || 0}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col justify-center">
            <div className="text-xs text-blue-200">Trạng thái hồ sơ</div>
            <div className="text-sm font-bold text-emerald-300 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <ShieldCheck size={16} /> Đã chuẩn hóa
            </div>
          </div>
        </div>

        {/* Primary Call to Action Button */}
        <div className="mt-6">
          <button
            onClick={onOpenScanner}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-teal-600 text-blue-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
          >
            <QrCode size={22} className="text-blue-950" />
            <span>QUÉT QR ĐIỂM DANH HOẠT ĐỘNG NGAY</span>
          </button>
        </div>
      </div>

      {/* Activities Feed for Member */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-blue-700" />
            <h3 className="font-extrabold text-slate-900 text-base">Hoạt Động Đoàn Dành Cho Bạn</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {activities.length} hoạt động
        </div>

        <div className="space-y-3">
          {activities.map(act => {
            const checked = isCheckedIn(act.id);
            const isOpen = act.status === 'active';

            return (
              <div
                key={act.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  checked
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isOpen
                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {act.activity_code}
                    <span className="font-bold text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      +{act.points} điểm
                    {checked && (
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Đã điểm danh
                    )}
                    {isOpen && !checked && (
                      <span className="font-bold text-xs text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                        Đang mở điểm danh
                    )}
                    {act.requires_geo && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Navigation size={10} className="text-amber-600" /> Bắt buộc GPS
                    )}
                    {act.requires_proof && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        <Camera size={10} className="text-purple-600" /> Chụp minh chứng camera
                    )}
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm mt-1.5">{act.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{act.description}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {act.location}
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Bắt đầu: {formatVietnameseDateTime(act.start_time)}
                  </div>
                </div>

                <div className="self-start sm:self-center">
                  {checked ? (
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold inline-block">
                      Đã ghi nhận +{act.points} ngày
                  ) : isOpen ? (
                    <button
                      onClick={onOpenScanner}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <QrCode size={14} /> Quét QR ngay
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold inline-block">
                      {act.status === 'scheduled' ? 'Sắp diễn ra' : 'Đã kết thúc'}
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Member's Personal Training Points History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award size={20} className="text-amber-500" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Lịch Sử Tích Lũy Ngày Công Tác Xã Hội Của Bạn
            </h3>
          </div>
          <span className="text-xs font-bold text-blue-700">
            Tổng cộng: {currentUser.total_points || 0} ngày
        </div>

        {userTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {userTransactions.map(tx => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900">{tx.activity_title}</div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5">{tx.reason}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {formatVietnameseDateTime(tx.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-extrabold text-sm ${
                      tx.points >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.points > 0 ? `+${tx.points}` : tx.points} ngày
                  </div>
                  <span className="inline-block text-[10px] font-bold text-slate-500">
                    {tx.transaction_type === 'attendance' ? 'Điểm danh QR' : 'Điều chỉnh'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            Bạn chưa có lượt tích lũy ngày CTXH nào. Hãy tham gia hoạt động và quét mã QR!
          </div>
        )}
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={20} className="text-blue-700" />
          <h3 className="font-extrabold text-slate-900 text-base">Thông Báo Từ Đoàn Trường</h3>
        </div>

        <div className="space-y-3">
          {announcements.map(ann => (
            <div
              key={ann.id}
              className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                  {ann.badge}
                <span className="text-[11px] text-slate-400">{ann.date}</span>
              </div>
              <h5 className="font-bold text-slate-900 text-xs sm:text-sm mt-1.5">{ann.title}</h5>
              <p className="text-slate-600 mt-1 leading-relaxed">{ann.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
