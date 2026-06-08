import {
  AlertTriangle,
  Cpu,
  Gauge,
  RefreshCw,
  Thermometer,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, DeviceHealth, SensorReading } from "./api";

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 4000);

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(temperature: number) {
  if (temperature >= 30) return "text-rose-700 bg-rose-50 border-rose-200";
  if (temperature >= 26) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function statusText(temperature: number) {
  if (temperature >= 30) return "고온 주의";
  if (temperature >= 26) return "약간 높음";
  return "정상 범위";
}

export function App() {
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [health, setHealth] = useState<DeviceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      const [historyData, latestData, healthData] = await Promise.all([
        api.sensorHistory(),
        api.latestSensor(),
        api.health(),
      ]);

      setHistory([...historyData, latestData].slice(-48));
      setHealth(healthData);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const latest = history.length > 0 ? history[history.length - 1] : undefined;
  const chartData = useMemo(
    () =>
      history.map((item) => ({
        ...item,
        time: formatTime(item.timestamp),
      })),
    [history]
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">ArduiNow Demo</p>
            <h1 className="text-2xl font-bold">온도 센서 대시보드</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}

        {loading || !latest ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            온도 데이터를 불러오는 중입니다.
          </div>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">DHT 온도 센서</p>
                    <div className="mt-3 flex items-end gap-3">
                      <Thermometer className="mb-2 h-10 w-10 text-amber-600" />
                      <span className="text-6xl font-bold tracking-normal">{latest.temperature.toFixed(1)}</span>
                      <span className="mb-3 text-2xl font-bold text-slate-500">C</span>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(latest.temperature)}`}>
                    {statusText(latest.temperature)}
                  </span>
                </div>
                <p className="mt-5 text-sm text-slate-500">
                  마지막 수신: {formatDateTime(latest.timestamp)} · {POLL_INTERVAL_MS / 1000}초마다 갱신
                </p>
              </article>

              <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">장치 상태</p>
                <div className="mt-5 space-y-4">
                  {[
                    ["CPU", health?.cpu_load ?? 0, Cpu],
                    ["Memory", health?.memory_usage ?? 0, Gauge],
                    ["Network", health?.network_quality ?? 0, Wifi],
                  ].map(([label, value, Icon]) => {
                    const DeviceIcon = Icon as typeof Cpu;
                    return (
                      <div key={String(label)}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-semibold text-slate-700">
                            <DeviceIcon className="h-4 w-4" />
                            {String(label)}
                          </span>
                          <span className="font-bold">{Number(value)}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-slate-950" style={{ width: `${Number(value)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">온도 변화</p>
                  <h2 className="mt-1 text-xl font-bold">최근 수신 기록</h2>
                </div>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                  API Live
                </span>
              </div>
              <div className="mt-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} C`, "온도"]} />
                    <Area type="monotone" dataKey="temperature" stroke="#d97706" strokeWidth={3} fill="#fef3c7" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
