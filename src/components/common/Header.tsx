import React, { useState } from 'react';
import { YouthUnionBadge } from './YouthUnionBadge';
import { store } from '../../services/store';
import { Profile } from '../../types';
import {
  UserCheck,
  User,
  RotateCcw,
  CheckCircle2,
  Menu,
  X,
  QrCode,
  LayoutDashboard,
  Calendar,
  Award,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Database,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentUser: Profile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTestBench?: () => void;
  onOpenSupabaseGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenTestBench,
  onOpenSupabaseGuide,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const isOfficer = currentUser.role === 'officer';
  const isMember = currentUser.role === 'member';

  const handleResetDemo = () => {
    if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu của Đoàn khoa Cơ khí?')) {
      store.resetToInitialDemoData(true, true);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2000);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Đồng chí có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
      store.logout();
    }
  };

  // Dynamic Navigation per Role
  const adminNavItems = [
    { id: 'admin_dashboard', label: 'Quản trị hệ thống', icon: ShieldCheck },
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'activities', label: 'Quản lý hoạt động', icon: Calendar },
    { id: 'qr', label: 'Điểm danh QR động', icon: QrCode },
    { id: 'points', label: 'Sổ ngày CTXH & Báo cáo', icon: Award },
  ];

  const officerNavItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'activities', label: 'Quản lý hoạt động', icon: Calendar },
    { id: 'qr', label: 'Điểm danh QR động', icon: QrCode },
    { id: 'points', label: 'Ngày Công tác xã hội', icon: Award },
  ];

  const memberNavItems = [
    { id: 'member_home', label: 'Trang cá nhân', icon: Award },
    { id: 'member_activities', label: 'Hoạt động Đoàn', icon: Calendar },
    { id: 'member_scanner', label: 'Quét mã QR', icon: QrCode },
  ];

  const navItems = isAdmin
    ? adminNavItems
    : isOfficer
    ? officerNavItems
    : memberNavItems;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner with Slogan & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-900 text-white text-xs px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium truncate">
          <span className="bg-amber-400 text-blue-950 font-black px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0">
            Sáng kiến số
          </span>
          <span className="truncate">
            ĐOÀN VIÊN SỐ – Điểm danh QR động & Tích lũy ngày Công tác xã hội
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {resetSuccess && (
            <span className="flex items-center gap-1 text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] animate-pulse">
              <CheckCircle2 size={12} /> Đã nạp lại Demo
            </span>
          )}

          {onOpenSupabaseGuide && (
            <button
              onClick={onOpenSupabaseGuide}
              className="hidden lg:flex items-center gap-1 bg-white/10 hover:bg-white/20 text-cyan-200 px-2 py-0.5 rounded text-[11px] transition"
              title="Xem cấu hình Supabase PostgreSQL & RLS"
            >
              <Database size={11} /> CSDL & RLS
            </button>
          )}

          {onOpenTestBench && (
            <button
              onClick={onOpenTestBench}
              className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold px-2 py-0.5 rounded text-[11px] transition shadow-2xs"
              title="Kiểm thử 8 kịch bản bảo mật và phân quyền cho Ban Giám khảo"
            >
              <Sparkles size={11} /> Kiểm Thử BGK
            </button>
          )}

          <button
            onClick={handleResetDemo}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded text-[11px] transition"
            title="Khôi phục dữ liệu mẫu ban đầu"
          >
            <RotateCcw size={11} /> Nạp Demo
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() =>
              setActiveTab(
                isAdmin
                  ? 'admin_dashboard'
                  : isOfficer
                  ? 'dashboard'
                  : 'member_home'
              )
            }
          >
            <YouthUnionBadge size={40} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-blue-950">
                  ĐOÀN VIÊN SỐ
                </span>
                <span className="bg-blue-100 text-blue-700 font-bold text-[10px] px-1.5 py-0.5 rounded-full border border-blue-200 uppercase">
                  v3.0 Phân quyền
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Đoàn TNCS Hồ Chí Minh • Phân hệ Quản trị & Đoàn viên
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Account Info & Logout */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border bg-slate-50 border-slate-200 shadow-2xs">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${
                  isAdmin
                    ? 'bg-red-600'
                    : isOfficer
                    ? 'bg-blue-600'
                    : 'bg-emerald-600'
                }`}
              >
                {isAdmin ? (
                  <ShieldAlert size={17} />
                ) : isOfficer ? (
                  <ShieldCheck size={17} />
                ) : (
                  <User size={17} />
                )}
              </div>

              <div className="text-left hidden sm:block leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 truncate max-w-[130px]">
                    {currentUser.full_name}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                      isAdmin
                        ? 'bg-red-100 text-red-800'
                        : isOfficer
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isAdmin ? 'Admin' : isOfficer ? 'Cán bộ' : 'Đoàn viên'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {currentUser.student_code}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl border border-slate-200 hover:border-rose-200 text-xs font-bold transition flex items-center gap-1.5"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Đăng xuất</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-xl"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-md">
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider flex items-center justify-between">
            <span>Chức năng theo quyền ({currentUser.role.toUpperCase()}):</span>
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
