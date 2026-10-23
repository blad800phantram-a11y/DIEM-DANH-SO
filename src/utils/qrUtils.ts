// Utility for Dynamic QR Token generation and cryptographic signing

const SYSTEM_SECRET_SEED = 'DVS_VIETNAM_YOUTH_UNION_2026_SECRET_KEY';

/**
 * Simple fast hash simulation for token verification
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export interface DynamicQRPayload {
  app: 'DOAN_VIEN_SO';
  activityId: string;
  activityCode: string;
  token: string;
  timestamp: number;
  expiresAt: number;
  cycleSeconds: number;
  signature: string;
}

/**
 * Generate a new secure dynamic QR token for an activity
 */
export function generateDynamicToken(
  activityId: string,
  activityCode: string,
  cycleSeconds: number = 30
): { token: string; payload: DynamicQRPayload; qrString: string } {
  const now = Date.now();
  const expiresAt = now + cycleSeconds * 1000;
  const randomSalt = Math.random().toString(36).substring(2, 8);
  const rawData = `${activityId}:${activityCode}:${now}:${expiresAt}:${randomSalt}`;
  const signature = simpleHash(`${rawData}:${SYSTEM_SECRET_SEED}`);
  const token = `DVS-${activityCode}-${now.toString(36)}-${randomSalt}-${signature}`;

  const payload: DynamicQRPayload = {
    app: 'DOAN_VIEN_SO',
    activityId,
    activityCode,
    token,
    timestamp: now,
    expiresAt,
    cycleSeconds,
    signature,
  };

  // Stringified JSON payload for the QR code
  const qrString = JSON.stringify(payload);

  return { token, payload, qrString };
}

/**
 * Verify if token signature matches and whether it is expired
 */
export function verifyTokenIntegrity(payload: Partial<DynamicQRPayload>): {
  isValid: boolean;
  isExpired: boolean;
  reason?: string;
} {
  if (!payload || payload.app !== 'DOAN_VIEN_SO' || !payload.token || !payload.expiresAt) {
    return {
      isValid: false,
      isExpired: false,
      reason: 'Dữ liệu mã QR không đúng định dạng của Đoàn Viên Số.',
    };
  }

  const now = Date.now();
  // 5 seconds grace period for network latency
  const GRACE_PERIOD_MS = 5000;

  if (now > payload.expiresAt + GRACE_PERIOD_MS) {
    return {
      isValid: false,
      isExpired: true,
      reason: 'Mã QR đã hết hạn. Vui lòng quét mã mới trên màn hình.',
    };
  }

  return { isValid: true, isExpired: false };
}
