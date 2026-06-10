import { Activity, Droplets, RefreshCw, Thermometer, Wind } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, SensorReading } from "./api";

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
    second: "2-digit",
  }).format(new Date(value));
}

function airQualityText(score: number) {
  if (score >= 80) return "좋음";
  if (score >= 50) return "보통";
  return "환기 필요";
}

function SensorCard({
  icon: Icon,
  label,
  value,
  unit,
  detail,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  unit: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-4xl font-bold tracking-normal text-slate-950">{value}</span>
        <span className="mb-1 text-lg font-semibold text-slate-500">{unit}</span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

export function App() {
  const [latest, setLatest] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  async function loadSensors(includeHistory = false) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setRefreshing(true);

    try {
      const latestData = await api.latestSensor();
      setLatest(latestData);
      setHistory((current) => [...current, latestData].slice(-12));

      if (includeHistory) {
        const historyData = await api.sensorHistory();
        setHistory([...historyData, latestData].slice(-12));
      }

      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "센서 데이터를 불러오지 못했습니다.");
    } finally {
      requestInFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSensors(true);
    const timer = window.setInterval(() => void loadSensors(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => [...history].reverse(), [history]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">ArduiNow Live Sensors</p>
            <h1 className="text-2xl font-bold">DHT 3번 포트 / 공기질 A0 모니터</h1>
          </div>
          <button
            type="button"
            onClick={() => void loadSensors(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            {error}
          </div>
        )}

        {loading || !latest ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
            센서 데이터를 불러오는 중입니다.
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SensorCard icon={Thermometer} label="온도" value={latest.temperature.toFixed(1)} unit="C" detail="DHT 센서, 디지털 3번 포트" />
              <SensorCard icon={Droplets} label="습도" value={String(latest.humidity)} unit="%" detail="DHT 센서, 디지털 3번 포트" />
              <SensorCard icon={Wind} label="공기질 점수" value={String(latest.air_quality)} unit="/ 100" detail={airQualityText(latest.air_quality)} />
              <SensorCard icon={Activity} label="A0 원시값" value={String(latest.air_quality_raw)} unit="/ 1023" detail="공기질 센서, 아날로그 A0" />
            </section>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">마지막 수신</p>
                  <h2 className="mt-1 text-xl font-bold">{formatDateTime(latest.timestamp)}</h2>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  COM7 / 115200 / {POLL_INTERVAL_MS / 1000}초 갱신
                </span>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-3 pr-4 font-semibold">시간</th>
                      <th className="py-3 pr-4 font-semibold">온도</th>
                      <th className="py-3 pr-4 font-semibold">습도</th>
                      <th className="py-3 pr-4 font-semibold">공기질</th>
                      <th className="py-3 pr-4 font-semibold">A0</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={`${row.timestamp}-${row.air_quality_raw}`}>
                        <td className="py-3 pr-4 text-slate-600">{formatTime(row.timestamp)}</td>
                        <td className="py-3 pr-4 font-semibold">{row.temperature.toFixed(1)} C</td>
                        <td className="py-3 pr-4 font-semibold">{row.humidity}%</td>
                        <td className="py-3 pr-4 font-semibold">{row.air_quality}</td>
                        <td className="py-3 pr-4 font-semibold">{row.air_quality_raw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
