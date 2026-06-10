import {
  Activity,
  Camera,
  Clock3,
  CloudSun,
  Cpu,
  Droplets,
  Gauge,
  RefreshCw,
  RotateCcw,
  Thermometer,
  Video,
  Wind,
  X,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, DeviceHealth, SensorReading, StudyToday, WeatherCurrent } from "./api";

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
      detect(source: CanvasImageSource): Promise<unknown[]>;
    };
  }
}

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 4000);
const SEOUL_LOCATION = { lat: 37.5665, lon: 126.978, label: "서울" };

type DetailKey = "clock" | "weather" | "indoor" | "air" | "device" | "study";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remain = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function airQualityText(score: number) {
  if (score >= 80) return "좋음";
  if (score >= 50) return "보통";
  return "환기 필요";
}

function airQualityTone(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
}

function DashboardCard({
  icon: Icon,
  title,
  value,
  unit,
  subtitle,
  tone,
  onClick,
}: {
  icon: typeof Thermometer;
  title: string;
  value: string;
  unit?: string;
  subtitle: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-44 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={cn("rounded-lg border p-2.5", tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">상세</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-slate-500">{title}</p>
      <div className="mt-2 flex min-h-11 items-end gap-1.5">
        <span className="break-all text-3xl font-bold tracking-normal text-slate-950">{value}</span>
        {unit && <span className="mb-1 text-sm font-bold text-slate-500">{unit}</span>}
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{subtitle}</p>
    </button>
  );
}

function StatusPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", className)}>
      {children}
    </span>
  );
}

function DetailModal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(88vh-73px)] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}

function SensorChart({ history, metric }: { history: SensorReading[]; metric: "temperature" | "humidity" | "air_quality" }) {
  const labels = {
    temperature: "온도",
    humidity: "습도",
    air_quality: "공기질",
  };
  const data = history.map((row) => ({
    time: new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(row.timestamp)),
    value: row[metric],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => [String(value), labels[metric]]} />
          <Area type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={3} fill="#e2e8f0" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function App() {
  const [now, setNow] = useState(new Date());
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [weatherLocation, setWeatherLocation] = useState(SEOUL_LOCATION.label);
  const [health, setHealth] = useState<DeviceHealth | null>(null);
  const [study, setStudy] = useState<StudyToday | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<DetailKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [cameraMessage, setCameraMessage] = useState("카메라 대기 중");
  const [cameraActive, setCameraActive] = useState(false);
  const [presence, setPresence] = useState({ present: false, confidence: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestInFlight = useRef(false);

  async function loadDashboard(includeHistory = false) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    try {
      const [latestData, healthData, studyData] = await Promise.all([
        api.latestSensor(),
        api.health(),
        api.studyToday(),
      ]);
      setLatest(latestData);
      setHealth(healthData);
      setStudy(studyData);
      setHistory((current) => [...current, latestData].slice(-24));
      if (includeHistory) {
        const historyData = await api.sensorHistory();
        setHistory([...historyData, latestData].slice(-24));
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      requestInFlight.current = false;
    }
  }

  async function loadWeather(lat: number, lon: number, label: string) {
    try {
      const data = await api.currentWeather(lat, lon);
      setWeather(data);
      setWeatherLocation(label);
      setWeatherError(null);
    } catch {
      setWeather(null);
      setWeatherError("날씨 연결 대기");
    }
  }

  async function enableCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraMessage(window.FaceDetector ? "얼굴 감지 중" : "FaceDetector 미지원: 카메라 활성 상태로 기록");
    } catch {
      setCameraActive(false);
      setCameraMessage("카메라 권한을 확인해 주세요");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setPresence({ present: false, confidence: 0 });
    setCameraMessage("카메라 대기 중");
    void api.postPresence({ present: false, confidence: 0, source: "browser_camera" }).then(setStudy).catch(() => undefined);
  }

  async function resetStudy() {
    const next = await api.resetStudySession();
    setStudy(next);
  }

  useEffect(() => {
    void loadDashboard(true);
    const timer = window.setInterval(() => void loadDashboard(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      void loadWeather(SEOUL_LOCATION.lat, SEOUL_LOCATION.lon, SEOUL_LOCATION.label);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadWeather(position.coords.latitude, position.coords.longitude, "현재 위치");
      },
      () => {
        void loadWeather(SEOUL_LOCATION.lat, SEOUL_LOCATION.lon, SEOUL_LOCATION.label);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
    );
  }, []);

  useEffect(() => {
    if (!cameraActive) return undefined;

    const detector = window.FaceDetector ? new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }) : null;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const detect = detector
        ? detector.detect(video).then((faces) => ({ present: faces.length > 0, confidence: faces.length > 0 ? 0.9 : 0.1 }))
        : Promise.resolve({ present: true, confidence: 0.55 });

      void detect
        .then((result) => {
          setPresence(result);
          return api.postPresence({ ...result, source: "browser_camera" });
        })
        .then(setStudy)
        .catch(() => setCameraMessage("감지 결과 전송 대기"));
    }, 2000);

    return () => window.clearInterval(timer);
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const modalTitle = {
    clock: "시간 상세",
    weather: "실외 날씨 상세",
    indoor: "실내 온습도 상세",
    air: "실내 공기질 상세",
    device: "장치 상태 상세",
    study: "공부 타이머 상세",
  };

  const detailContent = useMemo(() => {
    if (!selectedDetail) return null;

    if (selectedDetail === "clock") {
      return (
        <div className="space-y-4">
          <p className="text-5xl font-bold tracking-normal text-slate-950">{formatClock(now)}</p>
          <p className="text-slate-500">{formatDate(now)}</p>
          <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            대시보드 기준 시간입니다. 센서 갱신 주기는 {POLL_INTERVAL_MS / 1000}초입니다.
          </p>
        </div>
      );
    }

    if (selectedDetail === "weather") {
      return weather ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoBlock label="위치" value={weatherLocation} />
          <InfoBlock label="상태" value={weather.description} />
          <InfoBlock label="기온" value={`${weather.temperature.toFixed(1)} C`} />
          <InfoBlock label="체감" value={`${weather.apparent_temperature.toFixed(1)} C`} />
          <InfoBlock label="습도" value={`${weather.humidity}%`} />
          <InfoBlock label="풍속" value={`${weather.wind_speed.toFixed(1)} km/h`} />
          <InfoBlock label="강수량" value={`${weather.precipitation} mm`} />
          <InfoBlock label="갱신" value={formatDateTime(weather.timestamp)} />
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 p-4 font-semibold text-amber-800">{weatherError ?? "날씨 연결 대기"}</p>
      );
    }

    if (selectedDetail === "indoor" && latest) {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock label="온도" value={`${latest.temperature.toFixed(1)} C`} />
            <InfoBlock label="습도" value={`${latest.humidity}%`} />
            <InfoBlock label="최근 수신" value={formatDateTime(latest.timestamp)} />
            <InfoBlock label="센서" value="DHT / 디지털 3번 포트" />
          </div>
          <SensorChart history={history} metric="temperature" />
        </div>
      );
    }

    if (selectedDetail === "air" && latest) {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock label="공기질 점수" value={`${latest.air_quality} / 100`} />
            <InfoBlock label="상태" value={airQualityText(latest.air_quality)} />
            <InfoBlock label="A0 원시값" value={`${latest.air_quality_raw} / 1023`} />
            <InfoBlock label="센서" value="아날로그 A0" />
          </div>
          <SensorChart history={history} metric="air_quality" />
        </div>
      );
    }

    if (selectedDetail === "device" && health) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoBlock label="모델" value={health.model} />
          <InfoBlock label="서버 상태" value={health.server_status} />
          <InfoBlock label="CPU" value={`${health.cpu_load}%`} />
          <InfoBlock label="메모리" value={`${health.memory_usage}%`} />
          <InfoBlock label="네트워크" value={`${health.network_quality}%`} />
          <InfoBlock label="API" value="FastAPI online" />
        </div>
      );
    }

    if (selectedDetail === "study") {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock label="오늘 누적" value={formatDuration(study?.total_seconds ?? 0)} />
            <InfoBlock label="현재 세션" value={formatDuration(study?.current_session_seconds ?? 0)} />
            <InfoBlock label="착석 상태" value={study?.present ? "감지됨" : "자리 비움"} />
            <InfoBlock label="감지 소스" value={study?.last_source ?? "대기 중"} />
            <InfoBlock label="신뢰도" value={`${Math.round((study?.last_confidence ?? 0) * 100)}%`} />
            <InfoBlock label="마지막 감지" value={study?.last_observed_at ? formatDateTime(study.last_observed_at) : "기록 없음"} />
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            얼굴이 5초 이상 연속 감지되면 자동 시작하고, 15초 이상 감지되지 않으면 자동 일시정지합니다.
          </div>
        </div>
      );
    }

    return null;
  }, [health, history, latest, now, selectedDetail, study, weather, weatherError, weatherLocation]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500">ArduiNow Smart Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">실내 환경과 공부 시간을 한 화면에서 확인</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{error}</div>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardCard
            icon={Clock3}
            title="현재 시간"
            value={formatClock(now)}
            subtitle={formatDate(now)}
            tone="border-slate-200 bg-slate-50 text-slate-700"
            onClick={() => setSelectedDetail("clock")}
          />
          <DashboardCard
            icon={CloudSun}
            title={`실외 날씨 - ${weatherLocation}`}
            value={weather ? weather.description : "대기"}
            subtitle={weather ? `${weather.temperature.toFixed(1)} C / 체감 ${weather.apparent_temperature.toFixed(1)} C` : weatherError ?? "위치와 날씨 정보를 확인 중입니다."}
            tone="border-sky-200 bg-sky-50 text-sky-700"
            onClick={() => setSelectedDetail("weather")}
          />
          <DashboardCard
            icon={Thermometer}
            title="실내 온도"
            value={latest ? latest.temperature.toFixed(1) : "--"}
            unit="C"
            subtitle={latest ? `습도 ${latest.humidity}% / ${formatDateTime(latest.timestamp)} 수신` : "센서 데이터 대기 중"}
            tone="border-amber-200 bg-amber-50 text-amber-700"
            onClick={() => setSelectedDetail("indoor")}
          />
          <DashboardCard
            icon={Wind}
            title="실내 공기질"
            value={latest ? String(latest.air_quality) : "--"}
            unit="/ 100"
            subtitle={latest ? `${airQualityText(latest.air_quality)} / A0 ${latest.air_quality_raw}` : "공기질 센서 데이터 대기 중"}
            tone={latest ? airQualityTone(latest.air_quality) : "border-slate-200 bg-slate-50 text-slate-700"}
            onClick={() => setSelectedDetail("air")}
          />
          <DashboardCard
            icon={Cpu}
            title="장치 상태"
            value={health ? health.server_status : "대기"}
            subtitle={health ? `CPU ${health.cpu_load}% / 메모리 ${health.memory_usage}%` : "서버 상태 확인 중"}
            tone="border-violet-200 bg-violet-50 text-violet-700"
            onClick={() => setSelectedDetail("device")}
          />
          <DashboardCard
            icon={Activity}
            title="오늘 공부 시간"
            value={formatDuration(study?.total_seconds ?? 0)}
            subtitle={study?.active ? "착석 감지로 자동 기록 중" : "얼굴이 감지되면 자동으로 시작합니다."}
            tone="border-emerald-200 bg-emerald-50 text-emerald-700"
            onClick={() => setSelectedDetail("study")}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">센서 추이</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">최근 실내 온도 기록</h2>
              </div>
              <StatusPill className="border-emerald-200 bg-emerald-50 text-emerald-700">Live</StatusPill>
            </div>
            <div className="mt-4">
              <SensorChart history={history} metric="temperature" />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">공부 타이머</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">{formatDuration(study?.total_seconds ?? 0)}</h2>
              </div>
              <StatusPill className={study?.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                {study?.active ? "기록 중" : "대기"}
              </StatusPill>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg bg-slate-950">
              <video ref={videoRef} className="aspect-video w-full object-cover opacity-90" muted playsInline />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoBlock label="착석" value={presence.present ? "감지됨" : "미감지"} />
              <InfoBlock label="신뢰도" value={`${Math.round(presence.confidence * 100)}%`} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void enableCamera()}
                disabled={cameraActive}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Camera className="h-4 w-4" />
                카메라 켜기
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <Video className="h-4 w-4" />
                카메라 끄기
              </button>
              <button
                type="button"
                onClick={() => void resetStudy()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                오늘 초기화
              </button>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">{cameraMessage}</p>
          </section>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniStatus icon={Droplets} label="습도" value={latest ? `${latest.humidity}%` : "--"} />
          <MiniStatus icon={Gauge} label="A0 원시값" value={latest ? String(latest.air_quality_raw) : "--"} />
          <MiniStatus icon={Wind} label="풍속" value={weather ? `${weather.wind_speed.toFixed(1)} km/h` : "--"} />
        </section>
      </div>

      <DetailModal
        open={selectedDetail !== null}
        title={selectedDetail ? modalTitle[selectedDetail] : ""}
        onClose={() => setSelectedDetail(null)}
      >
        {detailContent}
      </DetailModal>
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function MiniStatus({ icon: Icon, label, value }: { icon: typeof Thermometer; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
      </div>
    </div>
  );
}
