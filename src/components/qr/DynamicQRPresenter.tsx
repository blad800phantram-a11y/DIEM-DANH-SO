import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { store } from '../../services/store';
import { Activity, Attendance, QRSession } from '../../types';
import {
  Play,
  Square,
  RefreshCw,
  Maximize2,
  Minimize2,
  Users,
  ShieldCheck,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Award,
  Sparkles,
  QrCode as QrIcon,
  CheckCircle2,
} from 'lucide-react';

interface DynamicQRPresenterProps {
  initialActivityId?: string;
}

export const DynamicQRPresenter: React.FC<DynamicQRPresenterProps> = ({
  initialActivityId,
}) => {
  const [activities, setActivities] = useState<Activity[]>(store.activities);
  const [attendances, setAttendances] = useState<Attendance[]>(store.attendances);
  
  // Select active activity
  const defaultActId =
    initialActivityId ||
    activities.find(a => a.status === 'active')?.id ||
    activities[0]?.id;

  const [selectedActivityId, setSelectedActivityId] = useState<string>(defaultActId || '');
  const [cycleSeconds, setCycleSeconds] = useState<number>(30); // 15, 30, 60s
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<QRSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const presenterRef = useRef<HTMLDivElement>(null);

  // Sync with store
  useEffect(() => {
    const unsub = store.subscribe(() => {
      setActivities([...store.activities]);
      setAttendances([...store.attendances]);
    });
    return unsub;
  }, []);

  const activeActivity = activities.find(a => a.id === selectedActivityId);

  // Filter attendees for this activity
  const activityAttendees = attendances.filter(
    att => att.activity_id === selectedActivityId && att.status === 'verified'
  );

  const prevAttendeesCountRef = useRef<number>(activityAttendees.length);

  useEffect(() => {
    if (activityAttendees.length > prevAttendeesCountRef.current) {
      playAttendanceChime();
    }
    prevAttendeesCountRef.current = activityAttendees.length;
  }, [activityAttendees.length]);

  // Refresh or generate QR code
  const refreshQRCode = (forceNew = false) => {
    if (!activeActivity) return;

    if (activeActivity.points <= 0) {
      setStatusMessage('Hoạt động này chưa có mức điểm được phê duyệt.');
      return;
    }

    try {
      const result = forceNew
        ? store.rotateQRToken(activeActivity.id, cycleSeconds)
        : store.startOrGetQRSession(activeActivity.id, cycleSeconds);

      if (result) {
        setCurrentSession(result.session);
        // Calculate remaining seconds
        const sessionExp = result.session.expires_at || result.session.expiresAt || Date.now();
        const rem = Math.max(0, Math.ceil((sessionExp - Date.now()) / 1000));
        setTimeLeft(rem > 0 ? rem : cycleSeconds);

        // Generate QR Data URL with clean high-res canvas
        QRCode.toDataURL(result.qrString, {
          width: 480,
          margin: 2,
          color: {
            dark: '#0f172a', // Deep slate
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        })
          .then(url => setQrDataUrl(url))
          .catch(err => console.error('Error generating QR:', err));
      }
    } catch (e: any) {
      setStatusMessage(e.message || 'Lỗi sinh mã QR.');
    }
  };

  // Initial generation
  useEffect(() => {
    if (activeActivity && activeActivity.status === 'active') {
      refreshQRCode(false);
    } else {
      setQrDataUrl('');
      setCurrentSession(null);
    }
  }, [selectedActivityId, activeActivity?.status, cycleSeconds]);

  // Dynamic 1-second interval for countdown and auto-refresh
  useEffect(() => {
    if (!activeActivity || activeActivity.status !== 'active') return;

    const interval = setInterval(() => {
      if (currentSession && currentSession.status === 'active') {
        const sessionExp = currentSession.expires_at || currentSession.expiresAt || Date.now();
        const remaining = Math.max(0, Math.ceil((sessionExp - Date.now()) / 1000));
        setTimeLeft(remaining);

        // When time expires, rotate token automatically
        if (remaining <= 0) {
          refreshQRCode(true);
        }
      } else {
        refreshQRCode(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession, activeActivity, cycleSeconds]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      presenterRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Handle open / close attendance
  const handleToggleAttendance = () => {
    if (!activeActivity) return;
    if (activeActivity.status === 'active') {
      store.setActivityStatus(activeActivity.id, 'closed');
      store.revokeQRSession(activeActivity.id);
    } else {
      store.setActivityStatus(activeActivity.id, 'active');
      refreshQRCode(true);
    }
  };

  // Sound feedback for new check-in
  const playAttendanceChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  // Simulate a quick check-in for real-time presentation demonstration
  const handleSimulateOneAttendee = () => {
    if (!activeActivity || activeActivity.status !== 'active') {
      setStatusMessage('Vui lòng mở điểm danh hoạt động trước khi quét.');
      return;
    }

    // Find a member who hasn't checked in yet
    const attendedMemberIds = new Set(activityAttendees.map(a => a.member_id));
    const candidate = store.members.find(
      m => m.role === 'member' && m.status === 'active' && !attendedMemberIds.has(m.id)
    );

    if (!candidate) {
      setStatusMessage('Tất cả đoàn viên trong danh sách demo đã hoàn thành điểm danh!');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    try {
      const { qrString } = store.startOrGetQRSession(activeActivity.id, cycleSeconds);
      const res = store.processAttendanceCheckIn(candidate.id, qrString);
      if (res.success) {
        playAttendanceChime();
        setStatusMessage(`Đã ghi nhận điểm danh: ${candidate.full_name} (+${res.pointsAwarded}đ)`);
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        setStatusMessage(res.message);
      }
    } catch (e: any) {
      setStatusMessage(e.message || 'Lỗi mô phỏng điểm danh.');
    }
  };

  const isSessionActive = activeActivity?.status === 'active' && currentSession?.status === 'active';
  const progressPercent = Math.min(100, Math.max(0, (timeLeft / cycleSeconds) * 100));

  return (
    <div
      ref={presenterRef}
      className={`p-4 sm:p-6 transition-all duration-300 ${
        isFullscreen ? 'bg-slate-900 text-white min-h-screen flex flex-col justify-between' : ''
      }`}
    >
      {/* Header & Activity Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <QrIcon size={22} />
            </span>
            <div>
              <h1 className={`text-xl sm:text-2xl font-extrabold ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
                Phát Mã QR Động Điểm Danh
              </h1>
              <p className={`text-xs ${isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
                Tự động làm mới mã bảo mật định kỳ 30 giây – Chống chụp màn hình & điểm danh hộ
              </p>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedActivityId}
            onChange={e => setSelectedActivityId(e.target.value)}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-hidden ${
              isFullscreen
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-white text-slate-800 border-slate-300'
            }`}
          >
            {activities.map(act => (
              <option key={act.id} value={act.id}>
                [{act.activity_code}] {act.title} ({act.status === 'active' ? 'ĐANG MỞ' : act.status})
              </option>
            ))}
          </select>

          <select
            value={cycleSeconds}
            onChange={e => setCycleSeconds(Number(e.target.value))}
            className={`px-2.5 py-2 text-xs sm:text-sm font-semibold rounded-lg border ${
              isFullscreen
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-white text-slate-800 border-slate-300'
            }`}
            title="Chu kỳ tự động xoay mã QR"
          >
            <option value={15}>15 giây</option>
            <option value={30}>30 giây (Chuẩn)</option>
            <option value={60}>60 giây</option>
          </select>

          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg border transition ${
              isFullscreen
                ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Chế độ trình chiếu máy chiếu toàn màn hình"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Grid: QR Viewport on Left, Details & Live Attendees on Right */}
      {activeActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* QR Code Presentation Box */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div
              className={`w-full max-w-md p-6 rounded-2xl border transition-all relative ${
                isFullscreen
                  ? 'bg-slate-800/90 border-slate-700 shadow-2xl'
                  : 'bg-white border-slate-200 shadow-lg'
              }`}
            >
              {/* Activity Mini Banner */}
              <div className="text-center mb-4 pb-3 border-b border-slate-200/60">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mb-1.5">
                  <Award size={13} />
                  Mức ngày CTXH: +{activeActivity.points} ngày Công tác xã hội
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                  {activeActivity.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã: <span className="font-mono font-bold text-blue-700">{activeActivity.activity_code}</span> | Địa điểm: {activeActivity.location}
                </p>
              </div>

              {/* QR Canvas / Image Viewport */}
              <div className="flex flex-col items-center justify-center min-h-[320px] relative">
                {isSessionActive && qrDataUrl ? (
                  <div className="relative p-3 bg-white rounded-xl shadow-inner border border-slate-200">
                    <img
                      src={qrDataUrl}
                      alt="Mã QR Điểm danh động"
                      className="w-64 h-64 sm:w-72 sm:h-72 object-contain select-none"
                    />

                    {/* Central Badge Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-blue-900 border-2 border-white shadow-md flex items-center justify-center text-white font-extrabold text-[10px] tracking-tighter">
                        ĐVS
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 w-full">
                    <AlertCircle size={40} className="mx-auto text-amber-500 mb-2" />
                    <h4 className="font-bold text-slate-800 text-sm">Điểm danh chưa mở hoặc đã đóng</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Nhấn nút <strong className="text-blue-700">"MỞ ĐIỂM DANH QR"</strong> bên dưới để hệ thống bắt đầu tạo token bảo mật tự xoay vòng.
                    </p>
                  </div>
                )}
              </div>

              {/* Countdown & Rotating Progress */}
              {isSessionActive && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <Clock size={14} className="animate-spin text-blue-600" />
                      Mã tự xoay vòng sau:
                    </span>
                    <span className="font-mono font-bold text-sm text-amber-600">
                      {timeLeft}s / {cycleSeconds}s
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2.5 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>Token: {currentSession?.token.substring(0, 18)}...</span>
                    <button
                      onClick={() => refreshQRCode(true)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-sans font-medium"
                    >
                      <RefreshCw size={11} /> Đổi mã ngay
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons: Open / Close Attendance */}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={handleToggleAttendance}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition ${
                    activeActivity.status === 'active'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {activeActivity.status === 'active' ? (
                    <>
                      <Square size={16} /> ĐÓNG ĐIỂM DANH QR
                    </>
                  ) : (
                    <>
                      <Play size={16} /> MỞ ĐIỂM DANH QR
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Attendance Live Feed - Directly underneath the QR Code Presentation Card */}
            <div
              className={`w-full max-w-md mt-4 p-4 rounded-2xl border transition-all ${
                isFullscreen
                  ? 'bg-slate-800/90 border-slate-700 text-white shadow-xl'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Live Feed Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                    <span>Attendance Live Feed</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      Thời gian thực
                    </span>
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSimulateOneAttendee}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition flex items-center gap-1 ${
                      isFullscreen
                        ? 'bg-blue-900/60 hover:bg-blue-800 text-cyan-300 border-blue-700'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                    }`}
                    title="Mô phỏng 1 đoàn viên quét mã thành công để trình diễn live feed"
                  >
                    <Sparkles size={11} /> + Quét thử 1 lượt
                  </button>
                </div>
              </div>

              {/* Feed items */}
              <div className="mt-3 space-y-2">
                {activityAttendees.length > 0 ? (
                  activityAttendees.slice(0, 4).map((att, idx) => (
                    <div
                      key={att.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        idx === 0
                          ? isFullscreen
                            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30'
                            : 'bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-200'
                          : isFullscreen
                          ? 'bg-slate-800/40 border-slate-700/60'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                            idx === 0
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {idx === 0 ? '✓' : att.member_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 dark:text-white truncate">
                              {att.member_name}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500 text-white animate-pulse">
                                MỚI
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {att.student_code} • {att.class_name}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                          +{att.points_awarded} ngày
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(att.checked_in_at).toLocaleTimeString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-5 text-slate-400 text-xs">
                    <p className="font-medium">Chưa có lượt điểm danh nào trong phiên này.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Đoàn viên quét mã QR phía trên sẽ xuất hiện tức thì tại đây!
                    </p>
                  </div>
                )}
              </div>

              {activityAttendees.length > 4 && (
                <div className="mt-2 pt-2 border-t border-slate-200/60 text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    và {activityAttendees.length - 4} đoàn viên khác đã điểm danh thành công
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Attendees Counter & Activity Details */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Real-time Attendees Stat Card */}
            <div
              className={`p-5 rounded-2xl border ${
                isFullscreen
                  ? 'bg-slate-800/90 border-slate-700 text-white'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Users size={18} className="text-blue-600" />
                  <span>Đoàn viên đã điểm danh</span>
                </div>
                <div className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold text-xs">
                  {activityAttendees.length} / {activeActivity.max_attendees || 300} lượt
                </div>
              </div>

              {/* Real-time Attendee List with latest on top */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {activityAttendees.length > 0 ? (
                  activityAttendees.map(att => (
                    <div
                      key={att.id}
                      className="pt-2 flex items-center justify-between text-xs hover:bg-slate-50/50 p-1.5 rounded transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{att.member_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {att.student_code} • {att.class_name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-emerald-600 text-xs">
                          +{att.points_awarded} ngày
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {new Date(att.checked_in_at).toLocaleTimeString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Chưa có lượt điểm danh nào trong phiên này.
                  </div>
                )}
              </div>
            </div>

            {/* Anti-tampering & Security Checklist Card */}
            <div
              className={`p-5 rounded-2xl border ${
                isFullscreen
                  ? 'bg-slate-800/90 border-slate-700 text-white'
                  : 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-100'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-blue-950 mb-2.5">
                <ShieldCheck size={16} className="text-blue-700" />
                <span>Cơ chế bảo mật QR động & Chống gian lận:</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Chống chụp màn hình:</strong> Token tự động hủy và đổi mới mỗi {cycleSeconds} giây.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Chống điểm danh trùng:</strong> Cơ sở dữ liệu và máy chủ kiểm tra ràng buộc duy nhất (Unique constraint).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Chống sửa điểm:</strong> Mức điểm được đọc từ quy định hoạt động trên máy chủ, client không thể can thiệp.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
