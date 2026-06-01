import {
  Activity,
  AlertTriangle,
  Bell,
  Cpu,
  Droplets,
  Fan,
  Gauge,
  Home,
  Lightbulb,
  RefreshCw,
  Router,
  ShieldCheck,
  Sun,
  Thermometer,
  Wifi,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { api, ControlState, DeviceHealth, EventLog, SensorReading } from "./api";

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 4000);
type ChartKey = "temperature" | "humidity" | "light" | "air_quality";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusPill({ tone, children }: { tone: "green" | "amber" | "red" | "blue" | "gray"; children: string }) {
  const styles = {
    green: "border-emerald-200 bg-emerald-100 text-emerald-700",
    amber: "border-amber-200 bg-amber-100 text-amber-700",
    red: "border-rose-200 bg-rose-100 text-rose-700",
    blue: "border-sky-200 bg-sky-100 text-sky-700",
    gray: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", styles[tone])}>{children}</span>;
}

function MetricCard({
  icon: Icon,
  title,
  value,
  unit,
  caption,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  value: string | number;
  unit: string;
  caption: string;
  tone: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={cn("rounded-lg border p-3", tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <StatusPill tone="blue">Live</StatusPill>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-3xl font-bold text-slate-950">{value}</span>
        <span className="mb-1 text-sm font-semibold text-slate-500">{unit}</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{caption}</p>
    </article>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-slate-950" : "bg-slate-300")}
        aria-pressed={checked}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}

export function App() {
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [controls, setControls] = useState<ControlState | null>(null);
  const [health, setHealth] = useState<DeviceHealth | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [selectedChart, setSelectedChart] = useState<ChartKey>("temperature");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingControls, setSavingControls] = useState(false);

  async function loadDashboard() {
    try {
      const [historyData, latestData, controlsData, healthData, eventData] = await Promise.all([
        api.sensorHistory(),
        api.latestSensor(),
        api.controls(),
        api.health(),
        api.events(),
      ]);
      const merged = [...historyData, latestData].slice(-48);
      setHistory(merged);
      setControls(controlsData);
      setHealth(healthData);
      setEvents(eventData);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  async function updateControl(next: ControlState) {
    setSavingControls(true);
    try {
      setControls(await api.updateControls(next));
      setEvents(await api.events());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "제어 상태를 저장하지 못했습니다.");
    } finally {
      setSavingControls(false);
    }
  }

  const latest = history.at(-1);
  const chartData = useMemo(
    () =>
      history.map((item) => ({
        ...item,
        time: formatTime(item.timestamp),
      })),
    [history]
  );
  const now = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const chartOptions = [
    { key: "temperature", label: "온도", unit: "C" },
    { key: "humidity", label: "습도", unit: "%" },
    { key: "light", label: "조도", unit: "%" },
    { key: "air_quality", label: "공기질", unit: "점" },
  ] as const;
  const currentChart = chartOptions.find((option) => option.key === selectedChart) ?? chartOptions[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">UNO Q Project</p>
              <h1 className="text-lg font-bold">ArduiNow</h1>
            </div>
          </div>
          <nav className="mt-8 space-y-2">
            {[
              { label: "대시보드", icon: Home },
              { label: "센서", icon: Activity },
              { label: "자동화", icon: Zap },
              { label: "보안", icon: ShieldCheck },
            ].map((item, index) => {
              const NavIcon = item.icon;
              return (
              <button
                key={item.label}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold",
                  index === 0 ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <NavIcon className="h-5 w-5" />
                {item.label}
              </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <Router className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold">로컬 연결</p>
                <p className="text-xs text-slate-500">UNO Q 내부 네트워크</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>API</span>
              <StatusPill tone={error ? "red" : "green"}>{error ? "Offline" : "Online"}</StatusPill>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold sm:text-2xl">실내 환경 대시보드</h2>
                  <StatusPill tone={error ? "amber" : "green"}>{error ? "Fallback" : "Live"}</StatusPill>
                </div>
                <p className="mt-1 text-sm text-slate-500">{now} · HTTP polling {POLL_INTERVAL_MS / 1000}초</p>
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

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <section className="mb-6 overflow-hidden rounded-lg bg-slate-950 p-6 text-white shadow-sm">
              <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ring-1 ring-white/15">
                    <Wifi className="h-4 w-4" />
                    Qualcomm Dragonwing + STM32 기반 로컬 허브
                  </div>
                  <h2 className="text-3xl font-bold sm:text-4xl">UNO Q에서 바로 확인하는 스마트 센서 대시보드</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    현재는 더미 센서 공급자로 동작하며, 실제 센서가 정해지면 같은 API 계약 아래 provider만 교체합니다.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["서버", health?.server_status ?? "확인 중"],
                    ["센서", "4개"],
                    ["DB", "SQLite"],
                    ["모드", "Local"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
                      <p className="text-sm text-slate-300">{label}</p>
                      <p className="mt-2 text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {error && <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">{error}</div>}

            {loading || !latest ? (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">대시보드 데이터를 불러오는 중입니다.</div>
            ) : (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard icon={Thermometer} title="온도" value={latest.temperature.toFixed(1)} unit="C" caption="실내 기준 시뮬레이션 값" tone="border-amber-100 bg-amber-50 text-amber-700" />
                  <MetricCard icon={Droplets} title="습도" value={latest.humidity} unit="%" caption="쾌적 범위 근접 여부 확인" tone="border-sky-100 bg-sky-50 text-sky-700" />
                  <MetricCard icon={Sun} title="조도" value={latest.light} unit="%" caption="창가 방향 기준 더미 측정" tone="border-violet-100 bg-violet-50 text-violet-700" />
                  <MetricCard icon={Activity} title="공기질" value={latest.air_quality} unit="점" caption="높을수록 안정적인 상태" tone="border-emerald-100 bg-emerald-50 text-emerald-700" />
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-3">
                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">센서 변화 추이</p>
                        <h3 className="mt-1 text-xl font-bold">오늘의 {currentChart.label} 기록</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {chartOptions.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setSelectedChart(item.key)}
                            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", selectedChart === item.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600")}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => [`${value}${currentChart.unit}`, currentChart.label]} />
                          <Area type="monotone" dataKey={selectedChart} stroke="#0f172a" strokeWidth={3} fill="#e2e8f0" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">UNO Q 상태</p>
                        <h3 className="mt-1 text-xl font-bold">장치 모니터링</h3>
                      </div>
                      <StatusPill tone="blue">{health?.model ?? "UNO Q"}</StatusPill>
                    </div>
                    <div className="mt-6 space-y-5">
                      {([
                        ["CPU Load", health?.cpu_load ?? 0, Cpu],
                        ["Memory", health?.memory_usage ?? 0, Gauge],
                        ["Network", health?.network_quality ?? 0, Wifi],
                      ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
                        <div key={String(label)}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 font-semibold text-slate-700">
                              <Icon className="h-4 w-4" />
                              {String(label)}
                            </div>
                            <span className="font-bold">{Number(value)}%</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-slate-950" style={{ width: `${Number(value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-3">
                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">제어 패널</p>
                        <h3 className="mt-1 text-xl font-bold">연결된 장치 제어</h3>
                      </div>
                      <StatusPill tone="gray">Local Only</StatusPill>
                    </div>
                    {controls && (
                      <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <ToggleRow icon={Lightbulb} title="무드등" description="조도가 낮아지면 자동 점등될 장치" checked={controls.light} disabled={savingControls} onChange={() => void updateControl({ ...controls, light: !controls.light })} />
                        <ToggleRow icon={Fan} title="환기 팬" description="온도 또는 공기질 조건에 따라 작동" checked={controls.fan} disabled={savingControls} onChange={() => void updateControl({ ...controls, fan: !controls.fan })} />
                        <ToggleRow icon={ShieldCheck} title="외부 접속 차단" description="같은 네트워크 내부 접속만 허용" checked={controls.local_only} disabled={savingControls} onChange={() => void updateControl({ ...controls, local_only: !controls.local_only })} />
                        <ToggleRow icon={Bell} title="알림" description="센서값이 기준을 넘으면 이벤트 표시" checked={controls.alerts} disabled={savingControls} onChange={() => void updateControl({ ...controls, alerts: !controls.alerts })} />
                      </div>
                    )}
                  </article>

                  <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">환경 알림</p>
                        <h3 className="text-xl font-bold">자동 판단 결과</h3>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3 text-sm font-medium">
                      {latest.temperature >= 26 || latest.humidity <= 40 || latest.air_quality <= 90 ? (
                        <>
                          {latest.temperature >= 26 && <p className="rounded-lg bg-amber-50 p-4 text-amber-800">실내 온도가 기준보다 높습니다. 환기 팬 작동을 고려하세요.</p>}
                          {latest.humidity <= 40 && <p className="rounded-lg bg-amber-50 p-4 text-amber-800">습도가 낮습니다. 장시간 작업 시 건조함을 느낄 수 있습니다.</p>}
                          {latest.air_quality <= 90 && <p className="rounded-lg bg-amber-50 p-4 text-amber-800">공기질 점수가 낮아지고 있습니다. 환기 상태를 확인하세요.</p>}
                        </>
                      ) : (
                        <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">현재 센서값은 안정 범위 안에 있습니다.</p>
                      )}
                    </div>
                  </article>
                </section>

                <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500">최근 이벤트</p>
                  <h3 className="mt-1 text-xl font-bold">시스템 로그</h3>
                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {events.length === 0 ? (
                      <p className="text-sm text-slate-500">아직 기록된 이벤트가 없습니다.</p>
                    ) : (
                      events.map((event) => (
                        <div key={event.id} className="rounded-lg bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{event.title}</p>
                            <span className="text-xs text-slate-400">{formatTime(event.timestamp)}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{event.detail}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
