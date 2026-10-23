import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { Activity, ActivityStatus, Attendance } from '../../types';
import { formatVietnameseDateTime } from '../../utils/exportUtils';
import {
  Calendar,
  Plus,
  Search,
  QrCode,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Square,
  Award,
  Users,
  Eye,
  FileSpreadsheet,
  Camera,
  Navigation,
} from 'lucide-react';

interface ActivityManagementProps {
  onOpenQRPresenter: (activityId: string) => void;
}

export const ActivityManagement: React.FC<ActivityManagementProps> = ({
  onOpenQRPresenter,
}) => {
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [attendances, setAttendances] = useState<Attendance[]>(store.attendances);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewProofAtt, setPreviewProofAtt] = useState<Attendance | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: 'Hội trường A, Tầng 1 - Trường CĐ Kiên Giang',
    points: 3,
    start_time: '2026-10-24T08:00',
    end_time: '2026-10-24T17:00',
    requires_proof: true,
    requires_geo: false,
  });

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setActivities([...store.activities]);
      setAttendances([...store.attendances]);
    });
    return unsub;
  }, []);

  const filteredActivities = activities.filter(act => {
    const matchSearch =
      act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.activity_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || act.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      if (!formData.title.trim()) throw new Error('Vui lòng nhập tên hoạt động.');
      if (formData.points <= 0) throw new Error('Mức điểm được duyệt phải lớn hơn 0.');

      const created = store.createActivity({
        title: formData.title.trim(),
        description: formData.description.trim() || 'Hoạt động Đoàn TNCS Hồ Chí Minh.',
        location: formData.location.trim() || 'Hội trường trường - Trường CĐ Kiên Giang',
        organizer: 'Ban Chấp hành Đoàn trường',
        person_in_charge: 'Cán bộ Đoàn phụ trách',
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        attendance_start: new Date(formData.start_time).toISOString(),
        attendance_end: new Date(formData.end_time).toISOString(),
        points: Number(formData.points),
        target_groups: ['Tất cả đoàn viên'],
        max_attendees: 300,
        status: 'active', // Mở điểm danh ngay theo tiêu chí hoàn thành nhanh
        requires_proof: formData.requires_proof,
        requires_geo: formData.requires_geo,
        target_lat: 10.0275,
        target_lng: 105.0805,
        geo_radius_meters: 1000,
      });

      setSuccessMessage(`Đã tạo thành công hoạt động ${created.activity_code}: "${created.title}"!`);
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        location: 'Hội trường A, Tầng 1 - Trường CĐ Kiên Giang',
        points: 3,
        start_time: '2026-10-24T08:00',
        end_time: '2026-10-24T17:00',
        requires_proof: true,
        requires_geo: false,
      });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi tạo hoạt động.');
    }
  };

  const handleToggleAttendanceStatus = (act: Activity) => {
    const newStatus = act.status === 'active' ? 'closed' : 'active';
    store.setActivityStatus(act.id, newStatus);
    setSuccessMessage(
      newStatus === 'active'
        ? `Đã mở điểm danh hoạt động ${act.activity_code}!`
        : `Đã đóng điểm danh hoạt động ${act.activity_code}!`
    );
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  // Get attendees of a specific activity
  const getActivityAttendees = (activityId: string) => {
    return attendances.filter(a => a.activity_id === activityId && a.status === 'verified');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-blue-700" size={26} /> Quản Lý Hoạt Động Đoàn
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tạo hoạt động, phê duyệt mức ngày Công tác xã hội, mở/đóng điểm danh và xem danh sách tham gia
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus size={16} /> Tạo hoạt động mới
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2 font-medium">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
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
            placeholder="Tìm theo tên hoạt động, mã HD, địa điểm..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="active">Đang mở điểm danh</option>
          <option value="closed">Đã đóng điểm danh</option>
          <option value="scheduled">Đã lên lịch</option>
          <option value="completed">Đã hoàn thành</option>
        </select>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map(act => {
          const actAttendees = getActivityAttendees(act.id);
          const isOpen = act.status === 'active';

          return (
            <div
              key={act.id}
              className={`rounded-2xl border p-5 transition flex flex-col justify-between shadow-2xs ${
                isOpen
                  ? 'bg-white border-blue-200 hover:border-blue-400'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {act.activity_code}
                  </span>

                  {isOpen ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Đang mở điểm danh
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      {act.status === 'scheduled'
                        ? 'Đã lên lịch'
                        : act.status === 'completed'
                        ? 'Đã hoàn thành'
                        : 'Đã đóng điểm danh'}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{act.description}</p>

                <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{act.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400 shrink-0" />
                    <span>{formatVietnameseDateTime(act.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-slate-400 shrink-0" />
                    <span>Đã tham gia: <strong className="text-blue-900">{actAttendees.length}</strong> đoàn viên</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Mở/Đóng, Tạo QR, Xem DS */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Mức ngày CTXH:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-extrabold">
                    +{act.points} ngày
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {isOpen ? (
                    <button
                      onClick={() => onOpenQRPresenter(act.id)}
                      className="py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition"
                    >
                      <QrCode size={13} /> Tạo mã QR
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleAttendanceStatus(act)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                    >
                      <Play size={13} /> Mở điểm danh
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedActivity(act)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Users size={13} /> DS tham gia ({actAttendees.length})
                  </button>
                </div>

                {isOpen && (
                  <button
                    onClick={() => handleToggleAttendanceStatus(act)}
                    className="w-full py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Square size={11} /> Đóng điểm danh hoạt động này
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Tạo Hoạt Động Mới */}
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
                  placeholder="Ví dụ: Hội nghị Học tập Chuyên đề Tư tưởng Hồ Chí Minh"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
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
                  value={formData.points}
                  onChange={e => setFormData({ ...formData, points: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-700 text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Điểm được lấy trực tiếp từ cấu hình này khi đoàn viên quét QR hợp lệ.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Địa điểm</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thời gian</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung hoạt động</label>
                <textarea
                  rows={2}
                  placeholder="Nội dung, kế hoạch và mục tiêu rèn luyện..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Ràng buộc bảo mật & xác thực điểm danh */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">Ràng buộc xác thực điểm danh:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.requires_proof}
                    onChange={e => setFormData({ ...formData, requires_proof: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Bắt buộc chụp ảnh minh chứng trực tiếp bằng camera tại sự kiện</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.requires_geo}
                    onChange={e => setFormData({ ...formData, requires_geo: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Bắt buộc xác thực định vị GPS tại điểm tổ chức (Trường CĐ Kiên Giang)</span>
                </label>
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
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-sm"
                >
                  Tạo & Mở Điểm Danh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem Danh Sách Đoàn Viên Tham Gia */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedActivity.activity_code}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-1">
                  {selectedActivity.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Activity Info Summary */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px] block">Mức điểm:</span>
                  <strong className="text-emerald-700 text-sm">+{selectedActivity.points} điểm</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Địa điểm:</span>
                  <strong className="truncate block">{selectedActivity.location}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Trạng thái:</span>
                  <strong className={selectedActivity.status === 'active' ? 'text-blue-700' : 'text-slate-700'}>
                    {selectedActivity.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                  </strong>
                </div>
              </div>

              {/* Attendee Roster Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Users size={15} className="text-blue-700" />
                    <span>Danh sách đoàn viên đã điểm danh ({getActivityAttendees(selectedActivity.id).length} lượt):</span>
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 text-center">STT</th>
                          <th className="py-2.5 px-3">Mã ĐV</th>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Lớp</th>
                          <th className="py-2.5 px-3">Thời gian quét QR</th>
                          <th className="py-2.5 px-3 text-center">Minh chứng / GPS</th>
                          <th className="py-2.5 px-3 text-right">Ngày CTXH cộng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getActivityAttendees(selectedActivity.id).length > 0 ? (
                          getActivityAttendees(selectedActivity.id).map((att, i) => (
                            <tr key={att.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-center text-slate-400 font-mono">{i + 1}</td>
                              <td className="py-2 px-3 font-mono font-bold text-blue-900">{att.student_code}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{att.member_name}</td>
                              <td className="py-2 px-3 text-slate-600">{att.class_name}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">
                                {new Date(att.checked_in_at).toLocaleTimeString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {att.proof_image ? (
                                    <button
                                      onClick={() => setPreviewProofAtt(att)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                                      title="Xem ảnh minh chứng camera"
                                    >
                                      <Camera size={10} /> Ảnh
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">—</span>
                                  )}
                                  {att.coordinates && (
                                    <button
                                      onClick={() => setPreviewProofAtt(att)}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition"
                                      title="Xem GPS"
                                    >
                                      <MapPin size={9} className="text-rose-600" />
                                      GPS
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-extrabold text-emerald-600">
                                +{att.points_awarded} ngày
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400">
                              Chưa có đoàn viên nào điểm danh cho hoạt động này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  handleToggleAttendanceStatus(selectedActivity);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  selectedActivity.status === 'active'
                    ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                    : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {selectedActivity.status === 'active' ? 'Đóng điểm danh' : 'Mở điểm danh'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const actId = selectedActivity.id;
                    setSelectedActivity(null);
                    onOpenQRPresenter(actId);
                  }}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <QrCode size={14} /> Chuyển sang màn hình QR
                </button>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof Review Modal */}
      {previewProofAtt && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                  {previewProofAtt.activity_code}
                </span>
                <h3 className="font-extrabold text-slate-900 text-sm mt-1">
                  Minh Chứng Tham Gia Thực Tế
                </h3>
              </div>
              <button
                onClick={() => setPreviewProofAtt(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl space-y-1">
                <div>Đoàn viên: <strong className="text-slate-900">{previewProofAtt.member_name}</strong> ({previewProofAtt.student_code})</div>
                <div>Lớp: <strong className="text-slate-700">{previewProofAtt.class_name}</strong></div>
                <div>Thời gian quét: <strong className="text-slate-700">{formatVietnameseDateTime(previewProofAtt.checked_in_at)}</strong></div>
              </div>

              {previewProofAtt.coordinates && (
                <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl space-y-1 text-amber-950">
                  <div className="font-bold flex items-center gap-1 text-amber-900">
                    <Navigation size={13} className="text-rose-600" /> Tọa độ GPS thu thập:
                  </div>
                  <div className="font-mono text-[11px]">
                    {previewProofAtt.coordinates.latitude.toFixed(5)}° N, {previewProofAtt.coordinates.longitude.toFixed(5)}° E
                  </div>
                  {previewProofAtt.coordinates.distance_meters !== undefined && (
                    <div className="text-[11px]">
                      Cự ly tới điểm tổ chức: <strong>{previewProofAtt.coordinates.distance_meters}m</strong> {previewProofAtt.coordinates.is_within_radius ? '(✓ Hợp lệ)' : '(Ngoài bán kính)'}
                    </div>
                  )}
                </div>
              )}

              {previewProofAtt.proof_image ? (
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <Camera size={13} className="text-blue-600" />
                    Ảnh chụp trực tiếp từ camera (không qua thư viện):
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                    <img
                      src={previewProofAtt.proof_image}
                      alt="Ảnh minh chứng camera"
                      className="w-full h-auto object-contain max-h-72 bg-slate-900"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-center">
                    Ảnh đóng dấu watermark kỹ thuật số chống giả mạo
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400">
                  Hoạt động này không yêu cầu hình ảnh minh chứng.
                </div>
              )}
            </div>

            <button
              onClick={() => setPreviewProofAtt(null)}
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
