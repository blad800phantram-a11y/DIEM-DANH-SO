import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { store } from '../../services/store';
import { Profile, CheckInValidationResult, Activity } from '../../types';
import { calculateHaversineDistance, KGC_CAMPUS_COORDS, formatCoordinates } from '../../utils/geoUtils';
import { DynamicQRPayload } from '../../utils/qrUtils';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  MapPin,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  SwitchCamera,
  CameraOff,
  Navigation,
  Check,
  X,
  Award,
  Layers,
  MapPinOff,
} from 'lucide-react';

interface MemberQRScannerProps {
  currentUser: Profile;
  onGoToPoints?: () => void;
  onGoToHistory?: () => void;
}

// Audio feedback using browser AudioContext
function playBeep(freq = 880, duration = 0.12, type: OscillatorType = 'sine') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors if blocked
  }
}

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  } catch {
    // Ignore
  }
}

export const MemberQRScanner: React.FC<MemberQRScannerProps> = ({
  currentUser,
  onGoToPoints,
  onGoToHistory,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'real_scanner' | 'demo' | 'manual'>('real_scanner');

  // Camera State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(true);

  // Scanned QR Payload & Target Activity
  const [scannedRawPayload, setScannedRawPayload] = useState<string>('');
  const [parsedActivity, setParsedActivity] = useState<Activity | null>(null);

  // Geolocation Constraint State
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    distance_meters?: number;
    is_within_radius?: boolean;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('idle'); // idle | fetching | success | error
  const [locationErrorMessage, setLocationErrorMessage] = useState<string>('');
  const [isSimulatedGps, setIsSimulatedGps] = useState<boolean>(false);

  // Live Camera Proof Photo State (Strictly live camera snapshot only - no file uploads!)
  const [isCapturingProof, setIsCapturingProof] = useState<boolean>(false);
  const [proofImage, setProofImage] = useState<string>('');
  const [proofCaptureTime, setProofCaptureTime] = useState<string>('');

  // Check-in Execution State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<CheckInValidationResult | null>(null);
  const [validationWarning, setValidationWarning] = useState<string>('');

  // Manual code input
  const [manualCode, setManualCode] = useState<string>('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const proofVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(true);

  // Keep scanning ref synced
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  // Request & Update GPS location
  const fetchCurrentLocation = useCallback(() => {
    setIsSimulatedGps(false);
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationErrorMessage('Trình duyệt không hỗ trợ Geolocation GPS.');
      return;
    }

    setLocationStatus('fetching');
    setLocationErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Calculate distance to target activity location or KGC campus
        const targetLat = parsedActivity?.target_lat ?? KGC_CAMPUS_COORDS.latitude;
        const targetLng = parsedActivity?.target_lng ?? KGC_CAMPUS_COORDS.longitude;
        const maxRadius = parsedActivity?.geo_radius_meters ?? KGC_CAMPUS_COORDS.defaultRadiusMeters;

        const distance = calculateHaversineDistance(latitude, longitude, targetLat, targetLng);
        const isWithin = distance <= maxRadius;

        setLocationCoords({
          latitude,
          longitude,
          accuracy,
          distance_meters: distance,
          is_within_radius: isWithin,
          address: parsedActivity?.location || KGC_CAMPUS_COORDS.name,
        });

        setLocationStatus('success');
      },
      err => {
        console.warn('Geolocation error:', err);
        setLocationStatus('error');
        let msg = 'Không thể lấy tọa độ GPS. Vui lòng cấp quyền vị trí cho trang web.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Quyền truy cập vị trí bị từ chối. Vui lòng bật GPS trong cài đặt trình duyệt.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Quá thời gian chờ định vị GPS. Vui lòng thử lại.';
        }
        setLocationErrorMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [parsedActivity]);

  // Quick helper to simulate being at Kiên Giang College campus (for testing/judging remotely)
  const setKienGiangCampusLocation = () => {
    setIsSimulatedGps(true);
    setLocationStatus('success');
    setLocationErrorMessage('');
    setLocationCoords({
      latitude: KGC_CAMPUS_COORDS.latitude,
      longitude: KGC_CAMPUS_COORDS.longitude,
      accuracy: 5,
      distance_meters: 10,
      is_within_radius: true,
      address: 'Trường Cao đẳng Kiên Giang (Cơ sở 425 Mạc Cửu, TP. Rạch Giá)',
    });
  };

  // Auto fetch location on component mount or activity change
  useEffect(() => {
    if (!locationCoords) {
      fetchCurrentLocation();
    }
  }, [fetchCurrentLocation, locationCoords]);

  // Start Real Camera Stream
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError('');
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Trình duyệt không hỗ trợ API Camera.');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      if (proofVideoRef.current) {
        proofVideoRef.current.srcObject = stream;
        proofVideoRef.current.setAttribute('playsinline', 'true');
        proofVideoRef.current.muted = true;
        await proofVideoRef.current.play().catch(() => {});
      }

      setCameraActive(true);
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'Không thể mở camera. Vui lòng cấp quyền truy cập máy ảnh hoặc sử dụng tính năng Quét Thử Nghiệm 1-Chạm.'
      );
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Switch between front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Process detected QR string
  const handleDetectedQRCode = useCallback((qrData: string, force = false) => {
    if (!qrData) return;
    if (!force && !isScanningRef.current) return;

    // Haptic & Sound Feedback
    try {
      navigator.vibrate?.([60, 40, 60]);
    } catch {
      // Ignore
    }
    playBeep(987.77, 0.15, 'sine');

    // Pause scanning to display verification card
    setIsScanning(false);
    setScannedRawPayload(qrData);
    setValidationWarning('');

    // Parse payload and match activity
    try {
      let payload: DynamicQRPayload | null = null;
      if (qrData.startsWith('{') && qrData.endsWith('}')) {
        payload = JSON.parse(qrData);
      }

      if (payload && payload.activityId) {
        const found = store.activities.find(a => a.id === payload?.activityId);
        if (found) {
          setParsedActivity(found);
          return;
        }
      }

      // Check for activity code format e.g. HD-2026-001 or URL containing code
      const match = qrData.match(/HD-2026-\d{3}/i);
      if (match) {
        const code = match[0].toUpperCase();
        const found = store.activities.find(a => a.activity_code.toUpperCase() === code);
        if (found) {
          setParsedActivity(found);
          return;
        }
      }

      // Match by activity ID directly
      const byId = store.activities.find(a => a.id === qrData);
      if (byId) {
        setParsedActivity(byId);
        return;
      }

      // Fallback: Default to first active activity
      const activeAct = store.activities.find(a => a.status === 'active') || store.activities[0];
      setParsedActivity(activeAct);
    } catch {
      const activeAct = store.activities.find(a => a.status === 'active') || store.activities[0];
      setParsedActivity(activeAct);
    }
  }, []);

  // Continuous Camera QR Code Detection Loop using native BarcodeDetector or jsQR
  useEffect(() => {
    if (!cameraActive || !isScanning) {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
      return;
    }

    let isDetecting = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = async () => {
      const video = videoRef.current;

      if (
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        isScanningRef.current &&
        !isDetecting
      ) {
        isDetecting = true;
        try {
          // 1. Try Native BarcodeDetector if available
          if ('BarcodeDetector' in window) {
            try {
              const barcodeDetector = new (window as any).BarcodeDetector({
                formats: ['qr_code'],
              });
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDetectedQRCode(barcodes[0].rawValue);
                return;
              }
            } catch {
              // Fall through to jsQR
            }
          }

          // 2. jsQR Canvas Decoding (Downscaled to max 640px for smooth 60fps processing)
          if (ctx) {
            const maxDim = 640;
            const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
            const targetW = Math.max(1, Math.floor(video.videoWidth * scale));
            const targetH = Math.max(1, Math.floor(video.videoHeight * scale));

            canvas.width = targetW;
            canvas.height = targetH;
            ctx.drawImage(video, 0, 0, targetW, targetH);

            const imageData = ctx.getImageData(0, 0, targetW, targetH);
            const qrCode = jsQR(imageData.data, targetW, targetH, {
              inversionAttempts: 'dontInvert',
            });

            if (qrCode && qrCode.data) {
              handleDetectedQRCode(qrCode.data);
              return;
            }
          }
        } catch {
          // ignore frame read error
        } finally {
          isDetecting = false;
        }
      }

      if (isScanningRef.current) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      }
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [cameraActive, isScanning, handleDetectedQRCode]);

  // Synchronize stream with proofVideoRef when proof capture opens
  useEffect(() => {
    if (isCapturingProof && streamRef.current && proofVideoRef.current) {
      proofVideoRef.current.srcObject = streamRef.current;
      proofVideoRef.current.setAttribute('playsinline', 'true');
      proofVideoRef.current.muted = true;
      proofVideoRef.current.play().catch(() => {});
    }
  }, [isCapturingProof, cameraActive]);

  // Handle Tab Switch
  useEffect(() => {
    if (activeTab === 'real_scanner') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // LIVE CAMERA SNAPSHOT CAPTURE (NO FILE UPLOAD ALLOWED - STRICT IN-APP CAMERA ONLY)
  const handleSnapLiveProof = () => {
    setValidationWarning('');
    const video = (proofVideoRef.current && proofVideoRef.current.readyState >= 2)
      ? proofVideoRef.current
      : (videoRef.current || proofVideoRef.current);

    if (!video || video.readyState < 2) {
      setValidationWarning('Camera chưa sẵn sàng. Vui lòng đợi 1 giây hoặc kiểm tra quyền truy cập máy ảnh!');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw camera image
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // WATERMARK OVERLAY: Timestamp + Đoàn Viên Info + GPS Coordinates for Authenticity
    const bannerHeight = 90;
    const yStart = canvas.height - bannerHeight;

    // Gradient dark banner
    const gradient = ctx.createLinearGradient(0, yStart, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.98)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, yStart, canvas.width, bannerHeight);

    // Red-Blue Accent stripe
    ctx.fillStyle = '#dc2626'; // Red
    ctx.fillRect(0, yStart, canvas.width * 0.45, 3);
    ctx.fillStyle = '#2563eb'; // Blue
    ctx.fillRect(canvas.width * 0.45, yStart, canvas.width * 0.55, 3);

    // Watermark header
    ctx.fillStyle = '#38bdf8'; // Sky blue
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('★ ĐOÀN VIÊN SỐ — MINH CHỨNG THAM GIA THỰC TẾ (CHỐNG GIAN LẬN)', 14, yStart + 20);

    // Member identity
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `Đoàn viên: ${currentUser.full_name} (${currentUser.student_code}) • ${currentUser.class_name} • ${currentUser.union_unit}`,
      14,
      yStart + 38
    );

    const nowStr = `${new Date().toLocaleTimeString('vi-VN')} ngày ${new Date().toLocaleDateString('vi-VN')}`;
    const gpsStr = locationCoords
      ? `GPS: ${locationCoords.latitude.toFixed(5)}°N, ${locationCoords.longitude.toFixed(5)}°E (±${Math.round(locationCoords.accuracy || 0)}m)${locationCoords.distance_meters !== undefined ? ` • Cự ly: ${locationCoords.distance_meters}m` : ''}`
      : 'GPS: Chưa có tọa độ';

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    ctx.fillText(`Thời gian: ${nowStr} (Giờ VN) | ${gpsStr}`, 14, yStart + 56);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 10px sans-serif';
    ctx.fillText('Đoàn khoa Cơ khí - Đoàn trường Cao đẳng Kiên Giang • Xác thực máy ảnh trực tiếp', 14, yStart + 74);

    // Encode to Data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setProofImage(dataUrl);
    setProofCaptureTime(nowStr);
    setIsCapturingProof(false);

    // Audio chime for snapshot
    playBeep(1200, 0.1, 'triangle');
  };

  // Submit and verify Check-In with Server
  const handleExecuteCheckIn = () => {
    setValidationWarning('');

    if (!scannedRawPayload) {
      setValidationWarning('Vui lòng quét hoặc chọn mã QR hoạt động trước khi bấm xác nhận.');
      return;
    }

    if (parsedActivity?.requires_proof && (!proofImage || !proofImage.startsWith('data:image/'))) {
      setValidationWarning('Hoạt động này bắt buộc chụp ảnh minh chứng trực tiếp bằng camera tại sự kiện!');
      return;
    }

    if (parsedActivity?.requires_geo && !locationCoords) {
      setValidationWarning('Hoạt động này bắt buộc thu thập định vị GPS để xác thực vị trí!');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    setTimeout(() => {
      const res = store.processAttendanceCheckIn(
        currentUser.id,
        scannedRawPayload,
        proofImage || undefined,
        locationCoords ? { latitude: locationCoords.latitude, longitude: locationCoords.longitude } : undefined
      );

      setIsProcessing(false);
      setResult(res);

      if (res.success) {
        playSuccessChime();
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#0284c7', '#22c55e', '#eab308', '#dc2626'],
          });
        } catch {
          // ignore
        }
      }
    }, 350);
  };

  // Reset scanner to scan another code
  const handleResetScanner = () => {
    setScannedRawPayload('');
    setParsedActivity(null);
    setResult(null);
    setValidationWarning('');
    setIsScanning(true);
    setIsCapturingProof(false);
  };

  // 1-Click Test Demo for Judges
  const handleTriggerDemoCheckIn = (activityId?: string) => {
    const activeAct = activityId
      ? store.activities.find(a => a.id === activityId)
      : store.activities.find(a => a.status === 'active') || store.activities[0];

    if (!activeAct) {
      setResult({
        success: false,
        message: 'Hiện không có hoạt động nào đang mở điểm danh.',
      });
      return;
    }

    try {
      const { qrString } = store.startOrGetQRSession(activeAct.id);
      setScannedRawPayload(qrString);
      setParsedActivity(activeAct);
      handleDetectedQRCode(qrString, true);
    } catch (e: any) {
      setResult({
        success: false,
        message: e.message || 'Lỗi khởi tạo phiên QR.',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mb-2 shadow-xs">
          <QrCode size={14} /> Điểm danh quét camera QR thật & Minh chứng thực tế
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Quét Mã QR & Thu Thập Minh Chứng
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Đoàn viên: <strong className="text-blue-900">{currentUser.full_name}</strong> • Mã ĐV: <strong className="text-slate-800">{currentUser.student_code}</strong> ({currentUser.class_name})
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl text-xs sm:text-sm font-semibold">
        <button
          onClick={() => {
            setActiveTab('real_scanner');
            handleResetScanner();
          }}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'real_scanner'
              ? 'bg-white text-blue-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera size={16} className="text-blue-600" /> Quét Camera Thật
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'demo'
              ? 'bg-white text-blue-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap size={16} className="text-amber-500" /> Trình Diễn 1-Chạm
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'manual'
              ? 'bg-white text-blue-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Nhập mã thủ công
        </button>
      </div>

      {/* VALIDATION WARNING TOAST */}
      {validationWarning && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl flex items-start gap-2.5 text-xs font-semibold animate-in fade-in">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">{validationWarning}</div>
          <button onClick={() => setValidationWarning('')} className="text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* RESULT BANNER (SUCCESS / FAILURE) */}
      {result && (
        <div
          className={`p-5 rounded-2xl border transition-all animate-in fade-in zoom-in-95 shadow-lg ${
            result.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-2xl shrink-0 text-white ${
                result.success ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {result.success ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
            </div>

            <div className="flex-1">
              <h3 className="font-extrabold text-base sm:text-lg">
                {result.success ? 'Xác Thực Điểm Danh Thành Công!' : 'Không Thể Ghi Nhận Điểm Danh'}
              </h3>
              <p className="text-xs sm:text-sm mt-1 font-medium">{result.message}</p>

              {result.success && result.pointsAwarded && (
                <div className="mt-3 p-3 bg-white/90 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold shadow-xs">
                  <span className="text-emerald-900 flex items-center gap-1.5">
                    <Award size={16} className="text-amber-500" /> Ngày Công tác xã hội cộng thêm:
                  </span>
                  <span className="text-base font-black text-emerald-600">
                    +{result.pointsAwarded} NGÀY
                  </span>
                </div>
              )}

              {/* Verified Metadata summary */}
              {result.success && result.attendance && (
                <div className="mt-2 text-[11px] text-slate-600 space-y-0.5 bg-emerald-100/50 p-2.5 rounded-lg">
                  <div>• Thời gian: {new Date(result.attendance.checked_in_at).toLocaleTimeString('vi-VN')} ngày {new Date(result.attendance.checked_in_at).toLocaleDateString('vi-VN')}</div>
                  {result.attendance.coordinates && (
                    <div>• GPS: {result.attendance.coordinates.latitude.toFixed(5)}°N, {result.attendance.coordinates.longitude.toFixed(5)}°E (Cự ly: {result.attendance.coordinates.distance_meters ?? 0}m)</div>
                  )}
                  {result.attendance.proof_image && (
                    <div>• Ảnh minh chứng: Đã lưu ảnh chụp trực tiếp từ camera có đóng dấu kỹ thuật số</div>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleResetScanner}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-300 hover:bg-slate-50 transition shadow-xs"
                >
                  Quét hoạt động khác
                </button>
                {result.success && onGoToPoints && (
                  <button
                    onClick={onGoToPoints}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-xs"
                  >
                    Xem sổ ngày CTXH <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: REAL CAMERA SCANNER VIEW */}
      {activeTab === 'real_scanner' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Camera size={15} className="text-blue-600" />
              <span>Máy ảnh trực tiếp (Tự động nhận diện QR liên tục)</span>
            </div>
            {cameraActive && (
              <button
                onClick={handleToggleFacingMode}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                title="Đổi camera trước/sau"
              >
                <SwitchCamera size={13} />
                <span>{facingMode === 'environment' ? 'Camera sau' : 'Camera trước'}</span>
              </button>
            )}
          </div>

          {/* Video Viewfinder Container */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square max-w-sm mx-auto flex items-center justify-center shadow-inner">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Live Scanner Target Overlay */}
                {isScanning && (
                  <div className="absolute inset-8 border-2 border-dashed border-cyan-400/90 rounded-2xl pointer-events-none flex flex-col justify-between p-3 shadow-2xl">
                    {/* Laser Scan line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-md" />
                    
                    <div className="text-center">
                      <span className="text-[11px] bg-slate-900/85 text-cyan-200 px-3 py-1 rounded-full font-mono border border-cyan-500/30 backdrop-blur-xs">
                        Hướng máy ảnh vào mã QR trên màn hình hoặc giấy
                      </span>
                    </div>
                  </div>
                )}

                {/* Scanned Badge / Freeze State */}
                {!isScanning && scannedRawPayload && (
                  <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce mb-2">
                      <Check size={32} />
                    </div>
                    <span className="text-sm font-black text-white bg-emerald-600/90 px-3 py-1 rounded-full">
                      Đã nhận diện mã QR thành công!
                    </span>
                    <button
                      onClick={() => setIsScanning(true)}
                      className="mt-3 px-3 py-1 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-1 shadow-sm"
                    >
                      <RefreshCw size={12} /> Quét lại mã khác
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <CameraOff size={44} className="mx-auto text-slate-500" />
                <p className="text-xs text-slate-300 px-4">
                  {cameraError || 'Camera đang tắt hoặc chưa được cấp quyền.'}
                </p>
                <button
                  onClick={() => startCamera()}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  Bật Camera Ngay
                </button>
              </div>
            )}
          </div>

          {/* Quick Helper to auto test without another device */}
          <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-blue-900 block">Thử nghiệm nhanh trên 1 thiết bị:</span>
              <span className="text-[11px] text-blue-700">Tự động nạp mã QR của hoạt động đang mở mà không cần 2 máy</span>
            </div>
            <button
              onClick={() => handleTriggerDemoCheckIn()}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs shrink-0 transition"
            >
              <Zap size={13} className="text-amber-400" /> Quét thử QR Đang Mở (1-Chạm)
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: DEMO 1-CLICK TEST BENCH */}
      {activeTab === 'demo' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950">
            <strong>Chế độ Trình diễn Ban Giám Khảo:</strong> Giúp kiểm thử các tình huống xác thực mã QR mà không bắt buộc dùng camera quét từ thiết bị khác.
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleTriggerDemoCheckIn('act_001')}
              className="w-full p-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-bold text-xs sm:text-sm text-left flex items-center justify-between shadow-xs transition"
            >
              <div>
                <div className="font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  Mô phỏng 1: Quét mã hoạt động HD-2026-001 (Yêu cầu GPS + Ảnh minh chứng)
                </div>
                <div className="text-[11px] text-blue-100 font-normal mt-0.5">
                  Hiến máu tình nguyện 'Giọt hồng thanh niên' - Mức duyệt: +5 Ngày CTXH
                </div>
              </div>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => handleTriggerDemoCheckIn('act_002')}
              className="w-full p-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xs sm:text-sm text-left flex items-center justify-between shadow-xs transition"
            >
              <div>
                <div className="font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-cyan-300" />
                  Mô phỏng 2: Quét mã hoạt động HD-2026-002 (Chủ nhật xanh - +3 Ngày CTXH)
                </div>
                <div className="text-[11px] text-slate-300 font-normal mt-0.5">
                  Ra quân bảo vệ môi trường & phân loại rác thải
                </div>
              </div>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => {
                const activeAct = store.activities.find(a => a.status === 'active') || store.activities[0];
                const expiredPayload = {
                  app: 'DOAN_VIEN_SO',
                  activityId: activeAct.id,
                  activityCode: activeAct.activity_code,
                  token: 'DVS-EXPIRED-TOKEN-TEST',
                  timestamp: Date.now() - 300000,
                  expiresAt: Date.now() - 200000, // expired long ago
                  cycleSeconds: 30,
                  signature: 'dummy-sig',
                };
                setScannedRawPayload(JSON.stringify(expiredPayload));
                setParsedActivity(activeAct);
                handleDetectedQRCode(JSON.stringify(expiredPayload), true);
              }}
              className="w-full p-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-950 rounded-2xl font-bold text-xs sm:text-sm text-left flex items-center justify-between transition"
            >
              <div>
                <div className="font-extrabold flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle size={16} />
                  Mô phỏng 3: Quét mã QR đã hết hạn (&gt;30s xoay vòng)
                </div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Kiểm tra máy chủ từ chối mã cũ nhằm chống chụp lén mã QR phát lại
                </div>
              </div>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: MANUAL CODE ENTRY */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <p className="text-xs text-slate-600">
            Dán chuỗi token, JSON mã QR hoặc nhập mã hoạt động (ví dụ: <strong className="font-mono text-blue-700">HD-2026-001</strong>) do cán bộ Đoàn cung cấp:
          </p>
          <textarea
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            placeholder="Dán mã JSON, token hoặc nhập HD-2026-001 tại đây..."
            rows={3}
            className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
          <button
            onClick={() => handleDetectedQRCode(manualCode, true)}
            disabled={!manualCode.trim()}
            className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-xs"
          >
            Nhận diện mã đã nhập
          </button>
        </div>
      )}

      {/* SECTION 4: ACTIVITY & VERIFICATION REQUIREMENTS CARD (WHEN QR IS SCANNED) */}
      {parsedActivity && (
        <div className="bg-white rounded-3xl border-2 border-blue-500/80 p-5 shadow-xl space-y-5 animate-in fade-in slide-in-from-bottom-3">
          <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {parsedActivity.activity_code}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  +{parsedActivity.points} NGÀY CTXH
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                {parsedActivity.title}
              </h3>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-rose-500 shrink-0" />
                <span>{parsedActivity.location}</span>
              </div>
            </div>
            <button
              onClick={handleResetScanner}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Hủy quét"
            >
              <X size={18} />
            </button>
          </div>

          {/* RÀNG BUỘC 1: THU THẬP & KIỂM TRA ĐỊNH VỊ GPS */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Navigation size={14} className="text-blue-600" />
                Ràng buộc Định vị GPS:
                {parsedActivity.requires_geo ? (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                    Bắt buộc có mặt tại sự kiện
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Tùy chọn
                  </span>
                )}
              </span>
              <button
                onClick={fetchCurrentLocation}
                disabled={locationStatus === 'fetching'}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-bold flex items-center gap-1 shadow-2xs"
              >
                <RefreshCw size={11} className={locationStatus === 'fetching' ? 'animate-spin' : ''} />
                <span>Cập nhật GPS</span>
              </button>
            </div>

            {locationStatus === 'fetching' && (
              <div className="text-[11px] text-blue-600 flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" />
                Đang kết nối vệ tinh GPS thu thập tọa độ thực tế...
              </div>
            )}

            {locationStatus === 'error' && (
              <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 space-y-1.5">
                <div>{locationErrorMessage}</div>
                <button
                  onClick={setKienGiangCampusLocation}
                  className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                >
                  <MapPin size={11} /> Kích hoạt GPS kiểm thử tại Trường CĐ Kiên Giang
                </button>
              </div>
            )}

            {locationStatus === 'success' && locationCoords && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-500">Tọa độ GPS thu thập:</span>
                  <span className="font-bold text-slate-900">
                    {formatCoordinates(locationCoords.latitude, locationCoords.longitude)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Khoảng cách đến điểm tổ chức:</span>
                  <span
                    className={`font-black ${
                      locationCoords.is_within_radius ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {locationCoords.distance_meters}m {locationCoords.is_within_radius ? '(✓ Hợp lệ trong bán kính)' : '(Ngoài bán kính sự kiện)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Độ chính xác: ±{Math.round(locationCoords.accuracy || 0)}m</span>
                  {isSimulatedGps ? (
                    <span className="text-blue-600 font-semibold">[Chế độ mô phỏng BGK]</span>
                  ) : (
                    <button
                      onClick={setKienGiangCampusLocation}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Mô phỏng tại trường Kiên Giang
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RÀNG BUỘC 2: HÌNH ẢNH MINH CHỨNG (CHỈ CHỤP TRỰC TIẾP TỪ CAMERA - KHÔNG CHO TẢI ẢNH) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Camera size={14} className="text-blue-600" />
                Hình ảnh Minh chứng Tham gia Có mặt:
                {parsedActivity.requires_proof ? (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                    Bắt buộc chụp trực tiếp
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                    Tùy chọn
                  </span>
                )}
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              * Quy định bảo mật: <strong className="text-slate-900">Tuyệt đối không nhận ảnh từ thư viện máy</strong>. Đoàn viên phải bấm nút chụp ảnh trực tiếp tại sự kiện để hệ thống đóng dấu số Watermark.
            </p>

            {/* If proof already captured, show preview */}
            {proofImage ? (
              <div className="bg-white p-3 rounded-2xl border border-emerald-300 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Đã chụp ảnh minh chứng có mặt trực tiếp
                  </span>
                  <button
                    onClick={() => {
                      setProofImage('');
                      setIsCapturingProof(true);
                      startCamera('user');
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold underline text-[11px]"
                  >
                    Chụp lại ảnh khác
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-w-xs mx-auto shadow-xs">
                  <img
                    src={proofImage}
                    alt="Minh chứng trực tiếp"
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Live Verified
                  </div>
                </div>
              </div>
            ) : (
              /* Live Camera Capture Viewfinder */
              <div className="space-y-2">
                <div className="bg-slate-900 p-3 rounded-2xl space-y-2 text-center text-white">
                  <div className="text-[11px] text-cyan-300 font-semibold flex items-center justify-between px-1">
                    <span>Khung hình chụp minh chứng có mặt</span>
                    <button
                      onClick={handleToggleFacingMode}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] flex items-center gap-1 font-bold"
                    >
                      <SwitchCamera size={11} />
                      {facingMode === 'user' ? 'Đổi sang camera sau' : 'Đổi sang camera trước'}
                    </button>
                  </div>

                  <div className="relative aspect-video max-w-xs mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    <video
                      ref={proofVideoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    {/* Visual Oval Framing Guide */}
                    <div className="absolute inset-3 border-2 border-dashed border-cyan-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] bg-slate-950/70 text-slate-200 px-2 py-0.5 rounded-full">
                        Căn góc mặt hoặc sự kiện
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSnapLiveProof}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <Camera size={16} /> BẤM CHỤP ẢNH MINH CHỨNG TRỰC TIẾP
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FINAL SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              onClick={handleExecuteCheckIn}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-800 active:scale-99 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Máy chủ đang kiểm tra chữ ký & vị trí...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} className="text-emerald-300" />
                  <span>XÁC NHẬN ĐIỂM DANH & TÍCH LŨY NGÀY CTXH</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
