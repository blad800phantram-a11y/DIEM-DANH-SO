import {
  Profile,
  Activity,
  Attendance,
  PointTransaction,
  AuditLog,
  Announcement,
  QRSession,
  CheckInValidationResult,
  UserRole,
  AccountStatus,
  LoginResult,
} from '../types';
import {
  INITIAL_MEMBERS,
  INITIAL_ACTIVITIES,
  INITIAL_ATTENDANCES,
  INITIAL_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ANNOUNCEMENTS,
} from '../data/initialData';
import {
  generateDynamicToken,
  verifyTokenIntegrity,
  DynamicQRPayload,
} from '../utils/qrUtils';
import { hashPassword, verifyPassword } from '../utils/authUtils';
import { calculateHaversineDistance, KGC_CAMPUS_COORDS } from '../utils/geoUtils';

const STORAGE_KEY_PREFIX = 'DOAN_VIEN_SO_DATA_V1_';

export class DataStore {
  members: Profile[] = [];
  activities: Activity[] = [];
  attendances: Attendance[] = [];
  transactions: PointTransaction[] = [];
  auditLogs: AuditLog[] = [];
  announcements: Announcement[] = [];
  activeQRSessions: Record<string, QRSession> = {}; // key: activity_id
  currentUserId: string = 'user_admin_01'; // Default: Admin for presentation
  isAuthenticated: boolean = false; // Auth state defaults to unauthenticated (Login screen as entry point)

  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach(l => l());
  }

  private loadFromStorage() {
    try {
      const savedMembers = localStorage.getItem(STORAGE_KEY_PREFIX + 'members');
      const savedActivities = localStorage.getItem(STORAGE_KEY_PREFIX + 'activities');
      const savedAttendances = localStorage.getItem(STORAGE_KEY_PREFIX + 'attendances');
      const savedTransactions = localStorage.getItem(STORAGE_KEY_PREFIX + 'transactions');
      const savedLogs = localStorage.getItem(STORAGE_KEY_PREFIX + 'logs');
      const savedAnnouncements = localStorage.getItem(STORAGE_KEY_PREFIX + 'announcements');
      const savedUser = localStorage.getItem(STORAGE_KEY_PREFIX + 'current_user');
      const savedAuth = localStorage.getItem(STORAGE_KEY_PREFIX + 'is_auth');

      if (savedMembers && savedActivities) {
        this.members = JSON.parse(savedMembers);
        this.activities = JSON.parse(savedActivities);
        this.attendances = savedAttendances ? JSON.parse(savedAttendances) : INITIAL_ATTENDANCES;
        this.transactions = savedTransactions ? JSON.parse(savedTransactions) : INITIAL_TRANSACTIONS;
        this.auditLogs = savedLogs ? JSON.parse(savedLogs) : INITIAL_AUDIT_LOGS;
        this.announcements = savedAnnouncements ? JSON.parse(savedAnnouncements) : INITIAL_ANNOUNCEMENTS;
        this.currentUserId = savedUser || 'user_admin_01';
        this.isAuthenticated = savedAuth === 'true';

        // Check if essential demo accounts exist; if not, merge them
        const hasAdminKCK = this.members.some(m => m.student_code === 'CB-KCK-01');
        const hasOfficerKha = this.members.some(m => m.student_code === 'CK24OT3412');
        if (!hasAdminKCK || !hasOfficerKha) {
          this.resetToInitialDemoData(false, this.isAuthenticated);
        }
      } else {
        this.resetToInitialDemoData(false, false);
      }
    } catch {
      this.resetToInitialDemoData(false, false);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'members', JSON.stringify(this.members));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'activities', JSON.stringify(this.activities));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'attendances', JSON.stringify(this.attendances));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'transactions', JSON.stringify(this.transactions));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'logs', JSON.stringify(this.auditLogs));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'announcements', JSON.stringify(this.announcements));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'current_user', this.currentUserId);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'is_auth', this.isAuthenticated ? 'true' : 'false');
    } catch {
      // Storage quota or private browsing fallback
    }
  }

  resetToInitialDemoData(shouldNotify = true, keepAuth = false) {
    this.members = JSON.parse(JSON.stringify(INITIAL_MEMBERS));
    this.activities = JSON.parse(JSON.stringify(INITIAL_ACTIVITIES));
    this.attendances = JSON.parse(JSON.stringify(INITIAL_ATTENDANCES));
    this.transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
    this.auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    this.announcements = JSON.parse(JSON.stringify(INITIAL_ANNOUNCEMENTS));
    this.activeQRSessions = {};
    this.currentUserId = 'user_admin_01';
    this.isAuthenticated = keepAuth;

    if (shouldNotify) {
      this.notify();
    }
  }

  // --- Authentication & Session ---
  login(usernameOrEmail: string, password: string): LoginResult {
    const term = usernameOrEmail.trim().toLowerCase();
    const pass = password.trim();

    if (!term) {
      return { success: false, message: 'Vui lòng nhập tên đăng nhập, email hoặc MSSV/mã cán bộ.' };
    }
    if (!pass) {
      return { success: false, message: 'Vui lòng nhập mật khẩu.' };
    }

    const user = this.members.find(
      m =>
        (m.username && m.username.toLowerCase() === term) ||
        m.email.toLowerCase() === term ||
        m.student_code.toLowerCase() === term
    );

    if (!user) {
      return {
        success: false,
        message: 'Tài khoản không tồn tại trên hệ thống ĐOÀN VIÊN SỐ. Vui lòng kiểm tra lại.',
      };
    }

    if (user.status === 'locked') {
      return {
        success: false,
        message: 'Tài khoản của đồng chí đã bị tạm khóa bởi Quản trị viên. Vui lòng liên hệ Văn phòng Đoàn!',
      };
    }

    // Verify password hash or standard demo passwords
    const isCorrect =
      verifyPassword(pass, user.password_hash) ||
      (user.role === 'admin' && pass === 'admin123') ||
      (user.role === 'officer' && pass === 'canbo123') ||
      (user.role === 'member' && pass === 'doanvien123');

    if (!isCorrect) {
      return {
        success: false,
        message: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      };
    }

    this.currentUserId = user.id;
    this.isAuthenticated = true;

    this.addAuditLog(
      user.id,
      user.full_name,
      'USER_LOGIN',
      'user',
      user.id,
      `Đồng chí ${user.full_name} (${user.student_code}) đăng nhập thành công với vai trò [${user.role.toUpperCase()}].`
    );

    this.notify();
    return {
      success: true,
      message: 'Đăng nhập thành công!',
      user,
    };
  }

  logout() {
    const user = this.getCurrentUser();
    this.addAuditLog(
      user.id,
      user.full_name,
      'USER_LOGOUT',
      'user',
      user.id,
      `Đồng chí ${user.full_name} đã đăng xuất khỏi hệ thống.`
    );
    this.isAuthenticated = false;
    this.notify();
  }

  // --- User & Role Management ---
  getCurrentUser(): Profile {
    const user = this.members.find(m => m.id === this.currentUserId);
    return user || this.members[0];
  }

  switchUser(userId: string) {
    const found = this.members.find(m => m.id === userId);
    if (found) {
      this.currentUserId = found.id;
      this.notify();
    }
  }

  // Quick switch role helper for presentation
  switchRole(role: UserRole) {
    const target = this.members.find(m => m.role === role);
    if (target) {
      this.currentUserId = target.id;
      this.notify();
    }
  }

  // --- Dynamic QR Session Management ---
  startOrGetQRSession(activityId: string, cycleSeconds: number = 30): { session: QRSession; qrString: string } {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) {
      throw new Error('Hoạt động không tồn tại.');
    }
    if (activity.points <= 0) {
      throw new Error('Hoạt động chưa có mức điểm được phê duyệt.');
    }

    const existing = this.activeQRSessions[activityId];
    const now = Date.now();

    // If existing session is still within active cycle and not expired
    const sessionExpiresAt = existing?.expires_at || existing?.expiresAt || 0;
    if (existing && existing.status === 'active' && now < sessionExpiresAt) {
      const payload: DynamicQRPayload = {
        app: 'DOAN_VIEN_SO',
        activityId: activity.id,
        activityCode: activity.activity_code,
        token: existing.token,
        timestamp: existing.created_at,
        expiresAt: sessionExpiresAt,
        cycleSeconds: existing.cycle_seconds,
        signature: existing.token_hash,
      };
      return { session: existing, qrString: JSON.stringify(payload) };
    }

    // Generate new rotating dynamic token
    const generated = generateDynamicToken(activity.id, activity.activity_code, cycleSeconds);
    const newSession: QRSession = {
      id: 'qrs_' + Math.random().toString(36).substring(2, 9),
      activity_id: activityId,
      token: generated.token,
      token_hash: generated.payload.signature,
      cycle_seconds: cycleSeconds,
      created_at: generated.payload.timestamp,
      expires_at: generated.payload.expiresAt,
      expiresAt: generated.payload.expiresAt,
      revoked_at: null,
      status: 'active',
    };

    this.activeQRSessions[activityId] = newSession;

    // Log rotation occasionally
    this.addAuditLog(
      this.currentUserId,
      this.getCurrentUser().full_name,
      'REFRESH_QR_TOKEN',
      'qr_session',
      activityId,
      `Sinh mã QR động mới cho hoạt động ${activity.activity_code} (Chu kỳ ${cycleSeconds}s).`
    );

    return { session: newSession, qrString: generated.qrString };
  }

  rotateQRToken(activityId: string, cycleSeconds: number = 30) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return null;

    const generated = generateDynamicToken(activity.id, activity.activity_code, cycleSeconds);
    const newSession: QRSession = {
      id: 'qrs_' + Math.random().toString(36).substring(2, 9),
      activity_id: activityId,
      token: generated.token,
      token_hash: generated.payload.signature,
      cycle_seconds: cycleSeconds,
      created_at: generated.payload.timestamp,
      expires_at: generated.payload.expiresAt,
      expiresAt: generated.payload.expiresAt,
      revoked_at: null,
      status: 'active',
    };

    this.activeQRSessions[activityId] = newSession;
    return { session: newSession, qrString: generated.qrString };
  }

  revokeQRSession(activityId: string) {
    if (this.activeQRSessions[activityId]) {
      this.activeQRSessions[activityId].status = 'revoked';
      this.activeQRSessions[activityId].revoked_at = Date.now();
      const activity = this.activities.find(a => a.id === activityId);
      this.addAuditLog(
        this.currentUserId,
        this.getCurrentUser().full_name,
        'REVOKE_QR_SESSION',
        'qr_session',
        activityId,
        `Cán bộ đã chủ động thu hồi phiên mã QR của hoạt động ${activity?.activity_code || activityId}.`
      );
      this.notify();
    }
  }

  // --- Server-Authoritative Attendance Verification Engine ---
  processAttendanceCheckIn(
    memberId: string,
    rawPayload: string,
    proofImage?: string,
    coordinates?: Attendance['coordinates']
  ): CheckInValidationResult {
    // 1. Kiểm tra tài khoản người dùng
    const member = this.members.find(m => m.id === memberId);
    if (!member) {
      return { success: false, message: 'Vui lòng đăng nhập trước khi điểm danh.' };
    }

    if (member.status === 'locked') {
      return {
        success: false,
        message: 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ Văn phòng Đoàn để được hỗ trợ.',
      };
    }

    // 2. Parse payload và kiểm tra tính toàn vẹn
    let payload: DynamicQRPayload;
    try {
      payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    } catch {
      // Hỗ trợ nếu người dùng quét mã QR chứa chuỗi văn bản mã hoạt động (HD-2026-xxx) hoặc URL sự kiện
      const rawStr = String(rawPayload || '').trim();
      const codeMatch = rawStr.match(/HD-2026-\d{3}/i);
      const matchedAct = codeMatch
        ? this.activities.find(a => a.activity_code.toUpperCase() === codeMatch[0].toUpperCase())
        : this.activities.find(a => a.id === rawStr || a.activity_code.toUpperCase() === rawStr.toUpperCase());

      if (matchedAct) {
        const generated = this.startOrGetQRSession(matchedAct.id);
        payload = JSON.parse(generated.qrString);
      } else {
        return {
          success: false,
          message: 'Mã QR không hợp lệ hoặc không thuộc hệ thống Đoàn Viên Số.',
        };
      }
    }

    // 3. Kiểm tra chữ ký và hạn sử dụng của Token
    const integrityCheck = verifyTokenIntegrity(payload);
    if (!integrityCheck.isValid) {
      return {
        success: false,
        message: integrityCheck.reason || 'Mã QR không hợp lệ.',
      };
    }

    // 4. Kiểm tra phiên QR trên hệ thống
    const session = this.activeQRSessions[payload.activityId];
    if (session && session.status === 'revoked') {
      return {
        success: false,
        message: 'Mã QR này đã bị cán bộ Đoàn thu hồi. Vui lòng liên hệ ban tổ chức.',
      };
    }

    // 5. Kiểm tra hoạt động
    const activity = this.activities.find(a => a.id === payload.activityId);
    if (!activity) {
      return { success: false, message: 'Hoạt động không tồn tại trên hệ thống.' };
    }

    if (activity.status !== 'active') {
      return {
        success: false,
        message: `Hoạt động "${activity.title}" hiện đã đóng hoặc chưa mở điểm danh.`,
      };
    }

    // 6. Kiểm tra đối tượng tham gia
    const isTargetAll =
      activity.target_groups.includes('Tất cả đoàn viên') ||
      activity.target_groups.length === 0;

    if (!isTargetAll) {
      const matchGroup = activity.target_groups.some(group => {
        const cleanGroup = group.toLowerCase();
        return (
          member.union_unit.toLowerCase().includes(cleanGroup) ||
          member.class_name.toLowerCase().includes(cleanGroup)
        );
      });

      if (!matchGroup) {
        return {
          success: false,
          message: 'Tài khoản không thuộc đối tượng hoặc đơn vị được phép tham gia hoạt động này.',
        };
      }
    }

    // 7. RÀNG BUỘC CHỐNG ĐIỂM DANH TRÙNG (Anti-Duplicate Check)
    const existingAttendance = this.attendances.find(
      att => att.activity_id === activity.id && att.member_id === member.id && att.status === 'verified'
    );
    if (existingAttendance) {
      return {
        success: false,
        message: `Bạn đã điểm danh hoạt động này vào lúc ${new Date(existingAttendance.checked_in_at).toLocaleTimeString('vi-VN')}.`,
      };
    }

    // 8. RÀNG BUỘC MINH CHỨNG HÌNH ẢNH TRỰC TIẾP (Bắt buộc nếu hoạt động yêu cầu)
    if (activity.requires_proof && (!proofImage || !proofImage.startsWith('data:image/'))) {
      return {
        success: false,
        message: 'Hoạt động này yêu cầu chụp ảnh minh chứng trực tiếp bằng camera tại sự kiện trước khi điểm danh!',
      };
    }

    // 9. RÀNG BUỘC ĐỊNH VỊ GPS TẠI ĐỊA ĐIỂM SỰ KIỆN (Bắt buộc nếu hoạt động yêu cầu hoặc có tọa độ)
    let evaluatedCoords = coordinates;
    if (activity.requires_geo && !coordinates) {
      return {
        success: false,
        message: 'Hoạt động này bắt buộc bật định vị GPS để xác thực sự hiện diện tại khu vực tổ chức!',
      };
    }

    if (coordinates) {
      const targetLat = activity.target_lat ?? KGC_CAMPUS_COORDS.latitude;
      const targetLng = activity.target_lng ?? KGC_CAMPUS_COORDS.longitude;
      const maxRadius = activity.geo_radius_meters ?? KGC_CAMPUS_COORDS.defaultRadiusMeters;
      const distance = calculateHaversineDistance(
        coordinates.latitude,
        coordinates.longitude,
        targetLat,
        targetLng
      );
      const isWithin = distance <= maxRadius;

      evaluatedCoords = {
        ...coordinates,
        distance_meters: distance,
        is_within_radius: isWithin,
        address: coordinates.address || `${activity.location} (Trường CĐ Kiên Giang)`,
      };

      if (activity.requires_geo && !isWithin) {
        return {
          success: false,
          message: `Ràng buộc định vị không thỏa: Khoảng cách hiện tại tới điểm tổ chức là ${distance}m (vượt quá bán kính cho phép ${maxRadius}m). Vui lòng có mặt tại địa điểm sự kiện!`,
        };
      }
    }

    // 10. TÍCH LŨY NGÀY CÔNG TÁC XÃ HỘI TỪ HỆ THỐNG (Server-authoritative)
    // Tuyệt đối không lấy điểm từ client request
    const approvedPoints = activity.points;
    const nowIso = new Date().toISOString();

    const newAttendance: Attendance = {
      id: 'att_' + Math.random().toString(36).substring(2, 9),
      activity_id: activity.id,
      activity_title: activity.title,
      activity_code: activity.activity_code,
      member_id: member.id,
      member_name: member.full_name,
      student_code: member.student_code,
      class_name: member.class_name,
      union_unit: member.union_unit,
      checked_in_at: nowIso,
      qr_session_id: payload.token,
      status: 'verified',
      points_awarded: approvedPoints,
      proof_image: proofImage,
      proof_captured_at: proofImage ? nowIso : undefined,
      coordinates: evaluatedCoords,
    };

    const newTransaction: PointTransaction = {
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      member_id: member.id,
      member_name: member.full_name,
      student_code: member.student_code,
      activity_id: activity.id,
      activity_title: activity.title,
      attendance_id: newAttendance.id,
      points: approvedPoints,
      transaction_type: 'attendance',
      status: 'confirmed',
      reason: `Điểm danh QR hợp lệ tại hoạt động ${activity.activity_code}`,
      created_at: nowIso,
      created_by: 'system',
      actor_name: 'Hệ thống tự động',
    };

    // Atomic update state
    this.attendances.unshift(newAttendance);
    this.transactions.unshift(newTransaction);

    // Cập nhật điểm cho đoàn viên
    member.total_points = (member.total_points || 0) + approvedPoints;
    member.attended_count = (member.attended_count || 0) + 1;

    // Ghi nhật ký kiểm tra (Audit Log)
    const logDetails = `Đoàn viên ${member.student_code} (${member.full_name}) điểm danh thành công hoạt động ${activity.activity_code}. Tự động ghi nhận +${approvedPoints} ngày Công tác xã hội.${proofImage ? ' [Đã chụp minh chứng camera trực tiếp]' : ''}${evaluatedCoords ? ` [GPS: ${evaluatedCoords.latitude.toFixed(4)}, ${evaluatedCoords.longitude.toFixed(4)} cự ly ${evaluatedCoords.distance_meters ?? 0}m]` : ''}`;

    this.addAuditLog(
      'system',
      'Hệ thống xác thực QR',
      'RECORD_ATTENDANCE',
      'attendance',
      newAttendance.id,
      logDetails
    );

    this.notify();

    return {
      success: true,
      message: `Điểm danh thành công! Bạn được cộng +${approvedPoints} ngày Công tác xã hội.`,
      attendance: newAttendance,
      pointsAwarded: approvedPoints,
      activityTitle: activity.title,
    };
  }

  // --- Point Adjustments (Audit Logged) ---
  adjustMemberPoints(
    memberId: string,
    adjustedPoints: number, // can be positive or negative
    reason: string,
    actorId?: string
  ) {
    const actor = actorId ? (this.members.find(m => m.id === actorId) || this.getCurrentUser()) : this.getCurrentUser();
    if (actor.role === 'member') {
      throw new Error('Chỉ Quản trị viên và Cán bộ Đoàn mới có quyền điều chỉnh điểm.');
    }

    const member = this.members.find(m => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy đoàn viên.');

    if (!reason || reason.trim().length < 5) {
      throw new Error('Vui lòng nhập lý do điều chỉnh cụ thể (tối thiểu 5 ký tự).');
    }

    const prevPoints = member.total_points;
    const newTotal = Math.max(0, prevPoints + adjustedPoints);
    member.total_points = newTotal;

    const tx: PointTransaction = {
      id: 'tx_adj_' + Math.random().toString(36).substring(2, 9),
      member_id: member.id,
      member_name: member.full_name,
      student_code: member.student_code,
      activity_id: 'MANUAL_ADJUSTMENT',
      activity_title: 'Điều chỉnh điểm có kiểm duyệt',
      points: adjustedPoints,
      transaction_type: 'manual_adjustment',
      status: 'confirmed',
      reason: reason.trim(),
      created_at: new Date().toISOString(),
      created_by: actor.id,
      actor_name: `${actor.full_name} (${actor.role === 'admin' ? 'Quản trị viên' : 'Cán bộ Đoàn'})`,
      previous_points: prevPoints,
      new_points: newTotal,
    };

    this.transactions.unshift(tx);

    this.addAuditLog(
      actor.id,
      actor.full_name,
      'ADJUST_POINTS',
      'point',
      tx.id,
      `Điều chỉnh điểm của đoàn viên ${member.student_code} (${member.full_name}): từ ${prevPoints} thành ${newTotal} (Thay đổi: ${adjustedPoints > 0 ? '+' : ''}${adjustedPoints}). Lý do: ${reason.trim()}`
    );

    this.notify();
    return tx;
  }

  // --- Member Operations ---
  addMember(memberData: Omit<Profile, 'id' | 'total_points' | 'attended_count' | 'created_at'>) {
    const existing = this.members.find(
      m => m.student_code.toLowerCase() === memberData.student_code.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Mã đoàn viên "${memberData.student_code}" đã tồn tại trên hệ thống.`);
    }

    const newMember: Profile = {
      ...memberData,
      id: 'user_mem_' + Math.random().toString(36).substring(2, 9),
      student_code: memberData.student_code.trim().toUpperCase(),
      total_points: 0,
      attended_count: 0,
      created_at: new Date().toISOString(),
    };

    this.members.push(newMember);

    this.addAuditLog(
      this.currentUserId,
      this.getCurrentUser().full_name,
      'CREATE_MEMBER',
      'user',
      newMember.id,
      `Thêm mới đoàn viên ${newMember.student_code} - ${newMember.full_name} (${newMember.class_name}).`
    );

    this.notify();
    return newMember;
  }

  // --- Batch Import Members (By Template or Table) ---
  addBatchMembers(
    memberList: Array<{
      student_code: string;
      full_name: string;
      class_name?: string;
      union_unit?: string;
      email?: string;
      phone?: string;
    }>
  ): {
    successCount: number;
    errorCount: number;
    created: Profile[];
    errors: Array<{ student_code: string; reason: string }>;
  } {
    const actor = this.getCurrentUser();
    if (actor.role !== 'admin' && actor.role !== 'officer') {
      throw new Error('Chỉ Cán bộ Đoàn và Quản trị viên mới có quyền tạo và nạp danh sách đoàn viên.');
    }

    const created: Profile[] = [];
    const errors: Array<{ student_code: string; reason: string }> = [];
    const existingCodes = new Set(this.members.map(m => m.student_code.toLowerCase()));
    const batchCodes = new Set<string>();

    memberList.forEach((raw, idx) => {
      const code = (raw.student_code || '').trim().toUpperCase();
      const name = (raw.full_name || '').trim();

      if (!code) {
        errors.push({ student_code: `Dòng ${idx + 1}`, reason: 'Thiếu mã đoàn viên.' });
        return;
      }
      if (!name) {
        errors.push({ student_code: code, reason: 'Thiếu họ và tên đoàn viên.' });
        return;
      }
      if (existingCodes.has(code.toLowerCase())) {
        errors.push({ student_code: code, reason: 'Mã đoàn viên đã tồn tại trên hệ thống.' });
        return;
      }
      if (batchCodes.has(code.toLowerCase())) {
        errors.push({ student_code: code, reason: 'Mã đoàn viên bị lặp lại trong danh sách tải lên.' });
        return;
      }

      batchCodes.add(code.toLowerCase());
      const newMember: Profile = {
        id: 'user_mem_' + Math.random().toString(36).substring(2, 9),
        student_code: code,
        full_name: name,
        username: code.toLowerCase(),
        password_hash: hashPassword('doanvien123'),
        class_name: (raw.class_name || 'CN ÔTÔ 3 9+K5').trim(),
        union_unit: (raw.union_unit || `Chi đoàn ${raw.class_name || 'CN ÔTÔ 3 9+K5'}`).trim(),
        email: (raw.email || `${code.toLowerCase()}@kgc.edu.vn`).trim(),
        phone: (raw.phone || '0900000000').trim(),
        role: 'member',
        status: 'active',
        total_points: 0,
        attended_count: 0,
        created_at: new Date().toISOString(),
      };

      created.push(newMember);
      existingCodes.add(code.toLowerCase());
    });

    if (created.length > 0) {
      this.members.push(...created);

      this.addAuditLog(
        actor.id,
        actor.full_name,
        'BATCH_IMPORT_MEMBERS',
        'user',
        `batch_${Date.now()}`,
        `Cán bộ/Admin ${actor.full_name} đã nạp thành công ${created.length} tài khoản đoàn viên mới vào hệ thống (mật khẩu khởi tạo: doanvien123).`
      );

      this.notify();
    }

    return {
      successCount: created.length,
      errorCount: errors.length,
      created,
      errors,
    };
  }

  updateMember(memberId: string, updates: Partial<Profile>) {
    const actor = this.getCurrentUser();
    if (actor.role === 'member' && actor.id !== memberId) {
      throw new Error('Đoàn viên không được phép xem hoặc sửa thông tin riêng của đoàn viên khác.');
    }

    const member = this.members.find(m => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy tài khoản đoàn viên.');

    if (updates.student_code && updates.student_code !== member.student_code) {
      const duplicate = this.members.find(
        m => m.id !== memberId && m.student_code.toLowerCase() === updates.student_code?.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Mã đoàn viên "${updates.student_code}" đã bị trùng lặp.`);
      }
    }

    // Role changes are prohibited through generic update
    if (updates.role && updates.role !== member.role) {
      if (actor.role !== 'admin') {
        throw new Error('Chỉ Quản trị viên (ADMIN) mới có thẩm quyền phân quyền và đổi vai trò.');
      }
    }

    Object.assign(member, updates);

    this.addAuditLog(
      this.currentUserId,
      this.getCurrentUser().full_name,
      'UPDATE_MEMBER',
      'user',
      member.id,
      `Cập nhật thông tin đoàn viên ${member.student_code} (${member.full_name}).`
    );

    this.notify();
  }

  toggleMemberLock(memberId: string) {
    const actor = this.getCurrentUser();
    if (actor.role !== 'admin') {
      throw new Error('Chỉ Quản trị viên (ADMIN) mới có quyền khóa hoặc mở khóa tài khoản người dùng.');
    }

    const member = this.members.find(m => m.id === memberId);
    if (!member) return;

    if (member.id === actor.id) {
      throw new Error('Quản trị viên không thể tự khóa tài khoản của chính mình.');
    }

    const newStatus = member.status === 'active' ? 'locked' : 'active';
    member.status = newStatus;

    this.addAuditLog(
      this.currentUserId,
      this.getCurrentUser().full_name,
      'TOGGLE_LOCK_MEMBER',
      'user',
      member.id,
      `Quản trị viên ${actor.full_name} đã ${newStatus === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản ${member.student_code} (${member.full_name}).`
    );

    this.notify();
  }

  resetAccountPassword(memberId: string, newPass: string) {
    const actor = this.getCurrentUser();
    if (actor.role !== 'admin') {
      throw new Error('Chỉ Quản trị viên (ADMIN) mới có thẩm quyền đặt lại mật khẩu.');
    }
    const member = this.members.find(m => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy tài khoản người dùng.');

    if (!newPass || newPass.trim().length < 6) {
      throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
    }

    member.password_hash = hashPassword(newPass.trim());
    this.addAuditLog(
      actor.id,
      actor.full_name,
      'RESET_PASSWORD',
      'user',
      member.id,
      `Quản trị viên ${actor.full_name} đã đặt lại mật khẩu cho tài khoản ${member.student_code} (${member.full_name}).`
    );
    this.notify();
  }

  changeUserRole(memberId: string, newRole: UserRole) {
    const actor = this.getCurrentUser();
    if (actor.role !== 'admin') {
      throw new Error('Chỉ Quản trị viên (ADMIN) mới có quyền phân quyền và thay đổi vai trò tài khoản.');
    }
    const member = this.members.find(m => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy tài khoản.');

    if (member.id === actor.id && newRole !== 'admin') {
      throw new Error('Quản trị viên không thể tự hạ quyền của chính mình.');
    }

    const prevRole = member.role;
    member.role = newRole;

    this.addAuditLog(
      actor.id,
      actor.full_name,
      'CHANGE_ROLE',
      'user',
      member.id,
      `Quản trị viên ${actor.full_name} đã thay đổi vai trò của ${member.student_code} (${member.full_name}) từ [${prevRole.toUpperCase()}] sang [${newRole.toUpperCase()}].`
    );
    this.notify();
  }

  // --- Activity Operations ---
  createActivity(
    data: Omit<Activity, 'id' | 'activity_code' | 'created_by' | 'created_at'>
  ): Activity {
    const actor = this.getCurrentUser();
    if (actor.role === 'member') {
      throw new Error('Đoàn viên không có thẩm quyền tạo hoạt động.');
    }

    if (data.points <= 0) {
      throw new Error('Mức ngày CTXH được duyệt của hoạt động phải lớn hơn 0.');
    }

    const nextIndex = this.activities.length + 1;
    const code = `HD-2026-${String(nextIndex).padStart(3, '0')}`;

    const newAct: Activity = {
      ...data,
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      activity_code: code,
      created_by: this.currentUserId,
      created_at: new Date().toISOString(),
    };

    this.activities.unshift(newAct);

    this.addAuditLog(
      this.currentUserId,
      this.getCurrentUser().full_name,
      'CREATE_ACTIVITY',
      'activity',
      newAct.id,
      `Tạo hoạt động mới: ${newAct.activity_code} - "${newAct.title}" (Mức điểm duyệt: ${newAct.points} điểm).`
    );

    this.notify();
    return newAct;
  }

  updateActivity(id: string, updates: Partial<Activity>) {
    const act = this.activities.find(a => a.id === id);
    if (!act) throw new Error('Không tìm thấy hoạt động.');

    Object.assign(act, updates);

    this.addAuditLog(
      this.currentUserId,
      this.getCurrentUser().full_name,
      'UPDATE_ACTIVITY',
      'activity',
      act.id,
      `Cập nhật thông tin hoạt động ${act.activity_code}.`
    );

    this.notify();
  }

  setActivityStatus(id: string, newStatus: Activity['status']) {
    const act = this.activities.find(a => a.id === id);
    if (!act) return;
    const prev = act.status;
    act.status = newStatus;

    if (newStatus === 'closed' || newStatus === 'completed' || newStatus === 'cancelled') {
      // Revoke any active QR session
      this.revokeQRSession(id);
    }

    this.addAuditLog(
      this.currentUserId,
      this.getCurrentUser().full_name,
      'CHANGE_ACTIVITY_STATUS',
      'activity',
      act.id,
      `Chuyển trạng thái hoạt động ${act.activity_code} từ "${prev}" sang "${newStatus}".`
    );

    this.notify();
  }

  private addAuditLog(
    actorId: string,
    actorName: string,
    action: string,
    targetType: AuditLog['target_type'],
    targetId: string,
    details: string
  ) {
    const log: AuditLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      actor_id: actorId,
      actor_name: actorName,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    // Keep max 200 logs
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
  }
}

export const store = new DataStore();
