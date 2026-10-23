export type UserRole = 'admin' | 'officer' | 'member';

export type AccountStatus = 'active' | 'locked';

export type ActivityStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  student_code: string;
  full_name: string;
  username?: string;
  password_hash?: string;
  class_name: string;
  union_unit: string; // Chi đoàn / Liên chi đoàn
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  total_points: number;
  attended_count: number;
  avatar_url?: string;
  created_at: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  user?: Profile;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: Profile | null;
}

export interface Activity {
  id: string;
  activity_code: string;
  title: string;
  description: string;
  location: string;
  organizer: string;
  person_in_charge: string;
  start_time: string; // ISO date string
  end_time: string;
  attendance_start: string;
  attendance_end: string;
  points: number;
  target_groups: string[]; // e.g. ["Tất cả đoàn viên", "Khoa CNTT", "Khoa Kinh tế"]
  status: ActivityStatus;
  requires_proof?: boolean;
  requires_geo?: boolean;
  target_lat?: number;
  target_lng?: number;
  geo_radius_meters?: number; // bán kính GPS tối đa cho phép (mét), ví dụ 500m
  max_attendees?: number;
  created_by: string;
  created_at: string;
}

export interface QRSession {
  id: string;
  activity_id: string;
  token: string;
  token_hash: string;
  cycle_seconds: number;
  created_at: number; // timestamp ms
  expires_at: number; // timestamp ms
  expiresAt?: number;
  revoked_at: number | null;
  status: 'active' | 'revoked' | 'expired';
}

export interface Attendance {
  id: string;
  activity_id: string;
  activity_title: string;
  activity_code: string;
  member_id: string;
  member_name: string;
  student_code: string;
  class_name: string;
  union_unit: string;
  checked_in_at: string;
  qr_session_id: string;
  status: 'verified' | 'rejected' | 'pending_proof';
  verification_note?: string;
  points_awarded: number;
  proof_image?: string;
  proof_captured_at?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    distance_meters?: number;
    is_within_radius?: boolean;
  };
}

export interface PointTransaction {
  id: string;
  member_id: string;
  member_name: string;
  student_code: string;
  activity_id: string;
  activity_title: string;
  attendance_id?: string;
  points: number;
  transaction_type: 'attendance' | 'manual_adjustment' | 'bonus' | 'penalty';
  status: 'confirmed' | 'revoked';
  reason: string;
  created_at: string;
  created_by: string;
  actor_name: string;
  previous_points?: number;
  new_points?: number;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: 'activity' | 'attendance' | 'point' | 'user' | 'qr_session' | 'system';
  target_id: string;
  details: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  badge: string;
  isUrgent?: boolean;
}

export interface CheckInValidationResult {
  success: boolean;
  message: string;
  attendance?: Attendance;
  pointsAwarded?: number;
  activityTitle?: string;
}
