import React, { useState } from 'react';
import { store } from '../../services/store';
import { YouthUnionBadge } from '../common/YouthUnionBadge';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (userRole: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<string>('');

  const executeLogin = (userToLogin: string, passToLogin: string) => {
    setError('');
    setSuccessInfo('');
    setLoading(true);

    setTimeout(() => {
      const res = store.login(userToLogin, passToLogin);
      setLoading(false);

      if (!res.success || !res.user) {
        setError(res.message);
      } else {
        setSuccessInfo(`Xin chào đồng chí ${res.user.full_name}! Đang chuyển hướng phân quyền...`);
        setTimeout(() => {
          onLoginSuccess(res.user!.role);
        }, 400);
      }
    }, 250);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeLogin(username, password);
  };

  const handleQuickFillAndLogin = (user: string, pass: string, autoSubmit = false) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setSuccessInfo('');
    if (autoSubmit) {
      executeLogin(user, pass);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
      {/* Background Decorative Rings */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-20">
        <div className="w-[600px] h-[600px] rounded-full border border-cyan-400/30 animate-pulse"></div>
        <div className="w-[900px] h-[900px] rounded-full border border-blue-500/20 absolute"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Top Header Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl mb-3">
            <YouthUnionBadge size={54} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            ĐOÀN VIÊN SỐ
          </h1>
          <p className="text-xs sm:text-sm text-cyan-200 font-medium mt-1">
            Hệ thống Điểm danh QR động & Tích lũy Ngày Công tác xã hội
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-cyan-700 px-6 py-4 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="text-cyan-300" size={20} />
              Đăng nhập hệ thống
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Xác thực vai trò tự động theo cơ sở dữ liệu Đoàn
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 sm:p-7 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                <div className="leading-relaxed">
                  <span className="font-bold">Đăng nhập không thành công:</span> {error}
                </div>
              </div>
            )}

            {/* Success Feedback */}
            {successInfo && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
                <span>{successInfo}</span>
              </div>
            )}

            {/* Username / Email / MSSV */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Tên đăng nhập / Email / MSSV hoặc Mã cán bộ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ví dụ: admin, trungkha1105@gmail.com..."
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Đăng Nhập</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher for Judges (Mô phỏng trình diễn) */}
          <div className="bg-slate-50 border-t border-slate-100 p-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 text-blue-900">
                <Sparkles size={14} className="text-amber-500" />
                Tài khoản mẫu trình diễn (Đoàn khoa Cơ khí):
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase">
                Demo
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {/* ADMIN */}
              <div
                onClick={() => handleQuickFillAndLogin('admin', 'admin123', false)}
                className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between text-xs cursor-pointer ${
                  username === 'admin'
                    ? 'bg-red-50/80 border-red-300 font-bold text-slate-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-extrabold uppercase">
                      Admin
                    </span>
                    <span className="font-extrabold text-slate-900">Bành Lê Anh Đào</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bí thư Đoàn khoa Cơ khí (admin / admin123)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickFillAndLogin('admin', 'admin123', true);
                    }}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                  >
                    Vào ngay
                  </button>
                </div>
              </div>

              {/* CANBO */}
              <div
                onClick={() => handleQuickFillAndLogin('canbo', 'canbo123', false)}
                className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between text-xs cursor-pointer ${
                  username === 'canbo'
                    ? 'bg-blue-50/80 border-blue-300 font-bold text-slate-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-extrabold uppercase">
                      Cán bộ
                    </span>
                    <span className="font-extrabold text-slate-900">Trương Hoàng Trung Kha</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cán bộ quản lý (canbo / canbo123)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickFillAndLogin('canbo', 'canbo123', true);
                    }}
                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                  >
                    Vào ngay
                  </button>
                </div>
              </div>

              {/* DOANVIEN */}
              <div
                onClick={() => handleQuickFillAndLogin('doanvien', 'doanvien123', false)}
                className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between text-xs cursor-pointer ${
                  username === 'doanvien'
                    ? 'bg-emerald-50/80 border-emerald-300 font-bold text-slate-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-extrabold uppercase">
                      Đoàn viên
                    </span>
                    <span className="font-extrabold text-slate-900">Danh Minh Trí</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    MSSV: CK24KL3135 (doanvien / doanvien123)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickFillAndLogin('doanvien', 'doanvien123', true);
                    }}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                  >
                    Vào ngay
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center pt-1 leading-normal">
              * Mật khẩu demo không áp dụng trên hệ thống thực tế. Hệ thống tuân thủ bảo mật Supabase RLS.
            </p>
          </div>
        </div>

        {/* Security Note Footer */}
        <div className="mt-4 text-center text-slate-400 text-xs flex items-center justify-center gap-1.5">
          <Info size={14} />
          <span>Hệ thống phân quyền 3 lớp: Quản trị viên • Cán bộ Đoàn • Đoàn viên</span>
        </div>
      </div>
    </div>
  );
};
