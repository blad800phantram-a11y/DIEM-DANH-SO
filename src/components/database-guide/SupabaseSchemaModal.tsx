import React, { useState } from 'react';
import { Database, Copy, Check, X, ShieldCheck, Terminal, ExternalLink } from 'lucide-react';

interface SupabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- ĐOÀN VIÊN SỐ: HỆ THỐNG ĐIỂM DANH QR ĐỘNG & TÍCH LŨY NGÀY CÔNG TÁC XÃ HỘI
-- CƠ SỞ DỮ LIỆU POSTGRESQL / SUPABASE & CHÍNH SÁCH ROW LEVEL SECURITY (RLS)
-- =========================================================================

-- 1. BẢNG PROFILES (HỒ SƠ ĐOÀN VIÊN & CÁN BỘ ĐOÀN)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  class_name VARCHAR(100) NOT NULL,
  union_unit VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'officer', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  attended_count INTEGER NOT NULL DEFAULT 0 CHECK (attended_count >= 0),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. BẢNG ACTIVITIES (HOẠT ĐỘNG ĐOÀN)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  organizer VARCHAR(255) NOT NULL,
  person_in_charge VARCHAR(255) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendance_start TIMESTAMPTZ NOT NULL,
  attendance_end TIMESTAMPTZ NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  target_groups TEXT[] NOT NULL DEFAULT ARRAY['Tất cả đoàn viên'],
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'active', 'closed', 'completed', 'cancelled')),
  requires_proof BOOLEAN DEFAULT FALSE,
  max_attendees INTEGER DEFAULT 300,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. BẢNG QR_SESSIONS (PHIÊN PHÁT MÃ QR ĐỘNG XOAY VÒNG 30S)
CREATE TABLE IF NOT EXISTS public.qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  cycle_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired'))
);

-- 4. BẢNG ATTENDANCES (BẢN GHI ĐIỂM DANH - CHỐNG ĐIỂM DANH TRÙNG)
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  qr_session_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'rejected', 'pending_proof')),
  points_awarded INTEGER NOT NULL,
  verification_note TEXT,
  proof_image_url TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  -- RÀNG BUỘC DUY NHẤT: Mỗi đoàn viên chỉ có 1 lượt điểm danh hợp lệ cho 1 hoạt động!
  CONSTRAINT uq_member_activity_attendance UNIQUE(activity_id, member_id)
);

-- 5. BẢNG POINT_TRANSACTIONS (SỔ GIAO DỊCH NGÀY CÔNG TÁC XÃ HỘI - TRANSACTIONAL INTEGRITY)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id VARCHAR(100) NOT NULL,
  attendance_id UUID REFERENCES public.attendances(id),
  points INTEGER NOT NULL,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('attendance', 'manual_adjustment', 'bonus', 'penalty')),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'revoked')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by VARCHAR(100) NOT NULL
);

-- 6. BẢNG AUDIT_LOGS (NHẬT KÝ HỆ THỐNG & KIỂM TOÁN THAO TÁC)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(100) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- CHÍNH SÁCH ROW LEVEL SECURITY (RLS) - BẢO MẬT ĐA TẦNG
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Đoàn viên chỉ xem thông tin cá nhân; Cán bộ/Admin xem toàn bộ
CREATE POLICY "Profiles: Users view self, Officers view all"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'officer'))
  );

-- 2. Activities: Mọi đoàn viên đã đăng nhập được xem hoạt động công khai
CREATE POLICY "Activities: Public read for authenticated users"
  ON public.activities FOR SELECT
  USING (auth.role() = 'authenticated');

-- Chỉ cán bộ hoặc Admin mới được tạo / sửa hoạt động
CREATE POLICY "Activities: Officer manage"
  ON public.activities FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'officer')));

-- 3. QR Sessions: Chỉ cán bộ phát mã mới quản lý phiên QR
CREATE POLICY "QR Sessions: Officer access"
  ON public.qr_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'officer')));

-- 4. Attendances: Đoàn viên xem lượt điểm danh của mình; Cán bộ xem toàn bộ
CREATE POLICY "Attendances: User view self, Officer view all"
  ON public.attendances FOR SELECT
  USING (
    member_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'officer'))
  );

-- 5. Point Transactions: Đoàn viên xem giao dịch điểm của mình
CREATE POLICY "PointTransactions: User view self"
  ON public.point_transactions FOR SELECT
  USING (
    member_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'officer'))
  );

-- 6. Audit Logs: Chỉ Admin và Cán bộ Đoàn được tra cứu nhật ký
CREATE POLICY "AuditLogs: Admin and Officer read"
  ON public.audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'officer')));
`;

export const SupabaseSchemaModal: React.FC<SupabaseSchemaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-700 animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Cơ Sở Dữ Liệu PostgreSQL & Supabase RLS Policies
              </h2>
              <p className="text-xs text-slate-400">
                Cấu trúc bảng, khóa ngoại, chỉ mục và chính sách bảo mật phân quyền theo mục XII
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              {copied ? 'Đã sao chép!' : 'Sao chép mã SQL'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-5 overflow-y-auto font-mono text-xs space-y-4">
          <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl text-blue-200 font-sans text-xs flex items-start gap-2">
            <ShieldCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong>Sẵn sàng cho môi trường Production:</strong> Bạn có thể sao chép đoạn mã SQL
              dưới đây và chạy trực tiếp tại <strong className="text-white">Supabase SQL Editor</strong> hoặc hệ thống PostgreSQL để khởi tạo toàn bộ cấu trúc và phân quyền chuẩn.
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 overflow-x-auto text-[11px] leading-relaxed selection:bg-blue-800">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Phiên bản lược đồ: v2.0-Production-Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
