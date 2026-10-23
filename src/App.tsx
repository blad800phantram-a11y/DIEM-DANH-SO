import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { Profile } from './types';
import { Header } from './components/common/Header';
import { LoginPage } from './components/auth/LoginPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { ActivityManagement } from './components/activities/ActivityManagement';
import { DynamicQRPresenter } from './components/qr/DynamicQRPresenter';
import { MemberQRScanner } from './components/scanner/MemberQRScanner';
import { MemberHome } from './components/member-view/MemberHome';
import { PointLedger } from './components/points/PointLedger';
import { JudgeTestBench } from './components/judge-bench/JudgeTestBench';
import { SupabaseSchemaModal } from './components/database-guide/SupabaseSchemaModal';
import {
  QrCode,
  UserCheck,
  User,
  ShieldAlert,
  ShieldCheck,
  Award,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<Profile>(store.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(store.isAuthenticated);
  const [activeTab, setActiveTab] = useState<string>('admin_dashboard');
  const [selectedActivityForQR, setSelectedActivityForQR] = useState<string | undefined>(undefined);

  // Modals
  const [isTestBenchOpen, setIsTestBenchOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setCurrentUser(store.getCurrentUser());
      setIsAuthenticated(store.isAuthenticated);
    });
    return unsub;
  }, []);

  const isAdmin = currentUser.role === 'admin';
  const isOfficer = currentUser.role === 'officer';
  const isMember = currentUser.role === 'member';

  // Role-based Auto Navigation & Access Guard
  useEffect(() => {
    if (!isAuthenticated) return;

    if (isAdmin) {
      const allowed = ['admin_dashboard', 'dashboard', 'activities', 'qr', 'points'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('admin_dashboard');
      }
    } else if (isOfficer) {
      const allowed = ['dashboard', 'activities', 'qr', 'points'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    } else if (isMember) {
      const allowed = ['member_home', 'member_activities', 'member_scanner'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('member_home');
      }
    }
  }, [currentUser.role, isAuthenticated]);

  const handleOpenQR = (activityId?: string) => {
    setSelectedActivityForQR(activityId);
    setActiveTab('qr');
  };

  const handleLoginSuccess = (role: string) => {
    setIsAuthenticated(true);
    setCurrentUser(store.getCurrentUser());
    if (role === 'admin') {
      setActiveTab('admin_dashboard');
    } else if (role === 'officer') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('member_home');
    }
  };

  // If user is not logged in, show modern Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Header with Navigation & User Profile */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTestBench={() => setIsTestBenchOpen(true)}
        onOpenSupabaseGuide={() => setIsSupabaseModalOpen(true)}
      />

      {/* Role Indicator Bar */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Tài khoản xác thực:</span>
            <span className="font-extrabold text-slate-900 flex items-center gap-1">
              {isAdmin ? (
                <ShieldAlert size={14} className="text-red-600" />
              ) : isOfficer ? (
                <ShieldCheck size={14} className="text-blue-700" />
              ) : (
                <User size={14} className="text-emerald-700" />
              )}
              {currentUser.full_name} ({currentUser.student_code})
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                isAdmin
                  ? 'bg-red-100 text-red-800'
                  : isOfficer
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isAdmin
                ? 'Quản trị viên (ADMIN)'
                : isOfficer
                ? 'Cán bộ Đoàn (CANBO)'
                : 'Đoàn viên (DOANVIEN)'}
            </span>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              • {currentUser.union_unit}
            </span>
          </div>

          <div className="text-slate-500 text-[11px] flex items-center gap-2">
            <span>
              {isAdmin
                ? 'Quyền hạn: Toàn quyền quản trị tài khoản, tạo hàng loạt Excel, phân quyền & nhật ký kiểm toán.'
                : isOfficer
                ? 'Quyền hạn: Quản lý hoạt động được giao, phát QR động 30s & xuất báo cáo.'
                : 'Quyền hạn: Quét mã QR điểm danh camera, theo dõi ngày CTXH cá nhân.'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Authenticated Role */}
      <main className="flex-1 pb-16">
        {/* === PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN) === */}
        {isAdmin && (
          <>
            {activeTab === 'admin_dashboard' && <AdminDashboard />}

            {activeTab === 'dashboard' && (
              <OverviewDashboard
                onOpenQR={handleOpenQR}
                onNavigate={tab => setActiveTab(tab)}
              />
            )}

            {activeTab === 'activities' && (
              <ActivityManagement onOpenQRPresenter={handleOpenQR} />
            )}

            {activeTab === 'qr' && (
              <DynamicQRPresenter initialActivityId={selectedActivityForQR} />
            )}

            {activeTab === 'points' && <PointLedger currentUser={currentUser} />}
          </>
        )}

        {/* === PHÂN HỆ CÁN BỘ ĐOÀN (CANBO) === */}
        {isOfficer && (
          <>
            {activeTab === 'dashboard' && (
              <OverviewDashboard
                onOpenQR={handleOpenQR}
                onNavigate={tab => setActiveTab(tab)}
              />
            )}

            {activeTab === 'activities' && (
              <ActivityManagement onOpenQRPresenter={handleOpenQR} />
            )}

            {activeTab === 'qr' && (
              <DynamicQRPresenter initialActivityId={selectedActivityForQR} />
            )}

            {activeTab === 'points' && <PointLedger currentUser={currentUser} />}
          </>
        )}

        {/* === PHÂN HỆ ĐOÀN VIÊN THANH NIÊN (DOANVIEN) === */}
        {isMember && (
          <>
            {activeTab === 'member_home' && (
              <MemberHome
                currentUser={currentUser}
                onOpenScanner={() => setActiveTab('member_scanner')}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'member_activities' && (
              <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
                <div className="bg-gradient-to-r from-blue-900 to-cyan-800 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold">
                      Xin chào, Đồng chí {currentUser.full_name}!
                    </h2>
                    <p className="text-xs text-blue-100 mt-1">
                      Mã đoàn viên: <strong>{currentUser.student_code}</strong> | Lớp: {currentUser.class_name} | Ngày CTXH tích lũy: <strong className="text-amber-300 font-extrabold">{currentUser.total_points || 0} ngày</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('member_scanner')}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-blue-950 font-black rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 transition cursor-pointer"
                  >
                    <QrCode size={18} /> Quét QR Điểm Danh Ngay
                  </button>
                </div>

                <ActivityManagement onOpenQRPresenter={handleOpenQR} />
              </div>
            )}

            {activeTab === 'member_scanner' && (
              <MemberQRScanner
                currentUser={currentUser}
                onGoToPoints={() => setActiveTab('member_home')}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button for Members to quick scan QR */}
      {isMember && activeTab !== 'member_scanner' && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setActiveTab('member_scanner')}
            className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <QrCode size={20} />
            <span className="text-xs sm:text-sm">Quét QR Điểm Danh</span>
          </button>
        </div>
      )}

      {/* Test Bench Modal for Judges */}
      <JudgeTestBench
        isOpen={isTestBenchOpen}
        onClose={() => setIsTestBenchOpen(false)}
      />

      {/* Supabase Schema Modal */}
      <SupabaseSchemaModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-justify text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-slate-800">ĐOÀN VIÊN SỐ</strong> — Hệ thống Điểm Danh QR Động & Tích Lũy Ngày Công Tác Xã Hội
          </div>
          <div className="text-slate-400 text-[11px] flex items-center gap-2">
            <span>Bảo mật 3 vai trò: ADMIN • CANBO • DOANVIEN</span>
            <span>• Đoàn khoa Cơ khí - Đoàn trường Cao đẳng Kiên Giang</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
