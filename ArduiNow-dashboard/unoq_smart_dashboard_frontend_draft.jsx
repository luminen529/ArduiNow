import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Cpu,
  Droplets,
  Fan,
  Gauge,
  Home,
  Lightbulb,
  Menu,
  Moon,
  PlugZap,
  RefreshCw,
  Router,
  Settings,
  ShieldCheck,
  Sun,
  Thermometer,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const initialHistory = [
  { time: "00:00", temp: 23.1, humidity: 48, light: 62, air: 94 },
  { time: "02:00", temp: 22.8, humidity: 51, light: 44, air: 95 },
  { time: "04:00", temp: 22.4, humidity: 53, light: 30, air: 96 },
  { time: "06:00", temp: 22.9, humidity: 52, light: 58, air: 95 },
  { time: "08:00", temp: 24.2, humidity: 49, light: 74, air: 93 },
  { time: "10:00", temp: 25.0, humidity: 45, light: 88, air: 92 },
  { time: "12:00", temp: 25.6, humidity: 43, light: 91, air: 91 },
  { time: "14:00", temp: 26.1, humidity: 42, light: 86, air: 90 },
  { time: "16:00", temp: 25.7, humidity: 44, light: 78, air: 92 },
  { time: "18:00", temp: 24.9, humidity: 47, light: 66, air: 94 },
];

const deviceLogs = [
  { level: "info", title: "웹 서버 정상 응답", time: "방금 전", detail: "대시보드 요청 처리 완료" },
  { level: "warning", title: "조도 변화 감지", time: "3분 전", detail: "창가 방향 조도가 급격히 낮아짐" },
  { level: "info", title: "센서 데이터 갱신", time: "8분 전", detail: "DHT22, 조도, 공기질 센서 동기화" },
  { level: "info", title: "클라이언트 접속", time: "15분 전", detail: "태블릿 브라우저에서 접속" },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value, digits = 1) {
  return Number(value).toFixed(digits);
}

function StatusPill({ tone = "green", children }) {
  const styles = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
    blue: "bg-sky-100 text-sky-700 border-sky-200",
    gray: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", styles[tone])}>
      {children}
    </span>
  );
}

function MetricCard({ icon: Icon, title, value, unit, caption, trend, tone = "blue" }) {
  const toneStyles = {
    blue: "bg-sky-50 text-sky-700 border-sky-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  const TrendIcon = trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("rounded-2xl border p-3", toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
          <TrendIcon className="h-3.5 w-3.5" />
          {Math.abs(trend)}%
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="mt-1 flex items-end gap-1">
          <span className="text-3xl font-bold tracking-tight text-slate-950">{value}</span>
          <span className="mb-1 text-sm font-semibold text-slate-500">{unit}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{caption}</p>
      </div>
    </motion.div>
  );
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
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
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-slate-950" : "bg-slate-300"
        )}
        aria-label={`${title} 전환`}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function Sidebar({ open, onClose, active, setActive }) {
  const items = [
    { key: "dashboard", label: "대시보드", icon: Home },
    { key: "sensors", label: "센서", icon: Activity },
    { key: "automation", label: "자동화", icon: Zap },
    { key: "security", label: "보안", icon: ShieldCheck },
    { key: "settings", label: "설정", icon: Settings },
  ];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-slate-200 bg-white p-5 transition-transform lg:sticky lg:top-0 lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">UNO Q Project</p>
              <h1 className="text-lg font-bold text-slate-950">Smart Hub</h1>
            </div>
          </div>
          <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActive(item.key);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                  selected ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-2 text-emerald-600 shadow-sm">
              <Router className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">로컬 접속</p>
              <p className="text-xs text-slate-500">192.168.0.42:3000</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Device</span>
            <StatusPill tone="green">Online</StatusPill>
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenuClick, currentTime, lastUpdated, darkMode, setDarkMode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">실내 환경 대시보드</h2>
              <StatusPill tone="green">Live</StatusPill>
            </div>
            <p className="mt-1 text-sm text-slate-500">{currentTime} · 마지막 갱신 {lastUpdated}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            className="hidden rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-100 sm:inline-flex"
            aria-label="테마 전환"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:bg-slate-100">
            <Bell className="h-5 w-5" />
          </button>
          <button className="hidden items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:flex">
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </div>
    </header>
  );
}

function ChartCard({ history, selectedChart, setSelectedChart }) {
  const chartOptions = [
    { key: "temp", label: "온도", unit: "°C" },
    { key: "humidity", label: "습도", unit: "%" },
    { key: "light", label: "조도", unit: "%" },
    { key: "air", label: "공기질", unit: "점" },
  ];

  const currentOption = chartOptions.find((item) => item.key === selectedChart) ?? chartOptions[0];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-slate-500">센서 변화 추이</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">오늘의 {currentOption.label} 기록</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {chartOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedChart(item.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                selectedChart === item.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ left: -20, right: 10, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="sensorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid rgb(226 232 240)",
                boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
              }}
              formatter={(value) => [`${value}${currentOption.unit}`, currentOption.label]}
            />
            <Area
              type="monotone"
              dataKey={selectedChart}
              stroke="currentColor"
              strokeWidth={3}
              fill="url(#sensorGradient)"
              className="text-slate-950"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DeviceHealth({ cpuLoad, memoryUsage }) {
  const rows = [
    { label: "CPU Load", value: cpuLoad, icon: Cpu },
    { label: "Memory", value: memoryUsage, icon: Gauge },
    { label: "Network", value: 82, icon: Wifi },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">UNO Q 상태</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">장치 모니터링</h3>
        </div>
        <StatusPill tone="blue">2GB Model</StatusPill>
      </div>

      <div className="mt-6 space-y-5">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-700">
                  <Icon className="h-4 w-4" />
                  {row.label}
                </div>
                <span className="font-bold text-slate-950">{row.value}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${row.value}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <PlugZap className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-semibold text-slate-950">전원 및 서버 정상</p>
            <p className="mt-1 text-sm text-slate-500">Docker 기반 웹 서버와 센서 수집 프로세스가 실행 중입니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlPanel({ controls, setControls }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">제어 패널</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">연결된 장치 제어</h3>
        </div>
        <StatusPill tone="gray">Local Only</StatusPill>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <ToggleRow
          icon={Lightbulb}
          title="무드등"
          description="조도값이 낮아지면 자동 점등"
          checked={controls.light}
          onChange={() => setControls((prev) => ({ ...prev, light: !prev.light }))}
        />
        <ToggleRow
          icon={Fan}
          title="환기 팬"
          description="온도 또는 공기질 조건에 따라 작동"
          checked={controls.fan}
          onChange={() => setControls((prev) => ({ ...prev, fan: !prev.fan }))}
        />
        <ToggleRow
          icon={ShieldCheck}
          title="외부 접속 차단"
          description="같은 네트워크 내부 접속만 허용"
          checked={controls.localOnly}
          onChange={() => setControls((prev) => ({ ...prev, localOnly: !prev.localOnly }))}
        />
        <ToggleRow
          icon={Bell}
          title="알림"
          description="센서값이 임계치를 넘으면 알림 표시"
          checked={controls.alert}
          onChange={() => setControls((prev) => ({ ...prev, alert: !prev.alert }))}
        />
      </div>
    </section>
  );
}

function ActivityLog() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">최근 이벤트</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">시스템 로그</h3>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {deviceLogs.map((log, index) => (
          <div key={`${log.title}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
            <div
              className={cn(
                "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                log.level === "warning" ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-slate-950">{log.title}</p>
                <span className="text-xs text-slate-400">{log.time}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{log.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlertBox({ temp, humidity, air }) {
  const isHot = temp >= 26;
  const isDry = humidity <= 40;
  const airWarning = air <= 90;

  const messages = [
    isHot ? "실내 온도가 기준보다 높습니다. 환기 팬 자동 작동을 고려하세요." : null,
    isDry ? "습도가 낮습니다. 장시간 작업 시 건조함을 느낄 수 있습니다." : null,
    airWarning ? "공기질 점수가 낮아지고 있습니다. 환기 상태를 확인하세요." : null,
  ].filter(Boolean);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">환경 알림</p>
          <h3 className="text-xl font-bold text-slate-950">자동 판단 결과</h3>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div key={message} className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
              {message}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            현재 센서값은 안정 범위 안에 있습니다.
          </div>
        )}
      </div>
    </section>
  );
}

export default function SmartDashboardDraft() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [history, setHistory] = useState(initialHistory);
  const [selectedChart, setSelectedChart] = useState("temp");
  const [darkMode, setDarkMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("방금 전");
  const [controls, setControls] = useState({
    light: true,
    fan: false,
    localOnly: true,
    alert: true,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setHistory((prev) => {
        const now = new Date();
        const next = {
          time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          temp: Number((23.5 + Math.random() * 3).toFixed(1)),
          humidity: Math.round(42 + Math.random() * 12),
          light: Math.round(48 + Math.random() * 45),
          air: Math.round(89 + Math.random() * 8),
        };
        return [...prev.slice(-9), next];
      });
      setLastUpdated("방금 전");
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const latest = history[history.length - 1];
  const currentTime = useMemo(() => {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }, [history.length]);

  const cpuLoad = useMemo(() => Math.round(34 + latest.temp * 1.2), [latest.temp]);
  const memoryUsage = useMemo(() => Math.round(46 + latest.humidity * 0.35), [latest.humidity]);

  return (
    <div className={cn("min-h-screen bg-slate-50 text-slate-950", darkMode && "bg-slate-100")}>
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} active={active} setActive={setActive} />

        <main className="min-w-0 flex-1">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            currentTime={currentTime}
            lastUpdated={lastUpdated}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm"
            >
              <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-slate-100 ring-1 ring-white/15">
                    <Wifi className="h-4 w-4" />
                    로컬 네트워크 기반 스마트 대시보드
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">센서 데이터를 웹에서 바로 확인하는 UNO Q 셋톱박스</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Arduino UNO Q가 센서 데이터를 수집하고, 같은 네트워크의 태블릿·노트북·스마트폰에서 웹 화면으로 접속해 실시간 상태를 확인하는 구조의 초안입니다.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-sm text-slate-300">서버</p>
                    <p className="mt-2 text-2xl font-bold">Online</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-sm text-slate-300">센서</p>
                    <p className="mt-2 text-2xl font-bold">4개</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-sm text-slate-300">응답</p>
                    <p className="mt-2 text-2xl font-bold">32ms</p>
                  </div>
                  <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                    <p className="text-sm text-slate-300">전력</p>
                    <p className="mt-2 text-2xl font-bold">Low</p>
                  </div>
                </div>
              </div>
            </motion.section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Thermometer}
                title="온도"
                value={formatNumber(latest.temp)}
                unit="°C"
                caption="실내 기준 약간 높은 편"
                trend={4}
                tone="amber"
              />
              <MetricCard
                icon={Droplets}
                title="습도"
                value={latest.humidity}
                unit="%"
                caption="쾌적 범위에 근접"
                trend={-2}
                tone="blue"
              />
              <MetricCard
                icon={Sun}
                title="조도"
                value={latest.light}
                unit="%"
                caption="창가 방향 기준 측정"
                trend={8}
                tone="violet"
              />
              <MetricCard
                icon={Activity}
                title="공기질"
                value={latest.air}
                unit="점"
                caption="높을수록 안정적"
                trend={-1}
                tone="green"
              />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <ChartCard history={history} selectedChart={selectedChart} setSelectedChart={setSelectedChart} />
              <DeviceHealth cpuLoad={cpuLoad} memoryUsage={memoryUsage} />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <ControlPanel controls={controls} setControls={setControls} />
              <AlertBox temp={latest.temp} humidity={latest.humidity} air={latest.air} />
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <ActivityLog />
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">개발 메모</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-950">다음 연결 지점</h3>
                  </div>
                  <StatusPill tone="amber">Prototype</StatusPill>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">1. 센서 API</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">백엔드에서 /api/sensors/latest 형태로 최신 센서값을 반환하도록 연결합니다.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">2. 제어 API</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">팬, LED, 부저 등의 상태를 POST 요청으로 바꾸는 구조를 추가합니다.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-950">3. 보안 설정</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">공유기 내부망 접속을 기본으로 두고, 외부 공개는 인증 이후에만 고려합니다.</p>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
