import { useState, useEffect } from "react";
import {
  Activity, AlertTriangle, Car, CheckCircle2, Circle, Clock, Cpu,
  Gauge, Power, Radio, RotateCcw, Settings, TrafficCone, Zap, Wifi,
  Timer, BarChart3, TrendingUp, ChevronRight, ArrowUpDown, ScanLine
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

// ---------------------------------------------------------------------------
// Design tokens
// bg        #0a0e16   near-black navy
// surface   #10151f   card surface
// surface-2 #161d2b   raised surface (LCD, decision card)
// line      #1f2937   hairline border
// blue      #3b82f6   primary accent
// cyan      #22d3ee   secondary accent / signature glow
// green     #22c55e   go / active / completed
// amber     #f59e0b   wait / yellow phase
// red       #ef4444   stop / alert
// text hi   #e5edf7
// text lo   #7c8aa0
// display font: "Inter" (system stack) | mono: "JetBrains Mono", monospace
// Signature: radar-scan intersection panel with a rotating sweep + sensor
// pulses, echoing an actual traffic-ops control room screen.
// ---------------------------------------------------------------------------

const vehicleCountSeries = [
  { t: "08:00", vehicles: 22 }, { t: "08:05", vehicles: 28 },
  { t: "08:10", vehicles: 31 }, { t: "08:15", vehicles: 26 },
  { t: "08:20", vehicles: 35 }, { t: "08:25", vehicles: 42 },
  { t: "08:30", vehicles: 38 }, { t: "08:35", vehicles: 45 },
  { t: "08:40", vehicles: 40 }, { t: "08:45", vehicles: 33 },
];

const densitySeries = [
  { lane: "Through N", density: 62 }, { lane: "Through S", density: 48 },
  { lane: "U-Turn", density: 71 }, { lane: "Conflict Z", density: 35 },
];

const sensors = [
  { id: "CdS-U1", label: "U-Turn Entry Photocell", value: "812 lux", status: "active" },
  { id: "CdS-U2", label: "U-Turn Demand Photocell", value: "18 evt/min", status: "active" },
  { id: "CdS-T1", label: "Through Lane Photocell", value: "7 evt/min", status: "active" },
  { id: "Ultrasonic C1", label: "Conflict Zone Clearance", value: "412 cm", status: "idle" },
  { id: "Ultrasonic C2", label: "Movement Monitor", value: "—", status: "idle" },
];

const timelineSteps = [
  "Through Signal GREEN",
  "LCD shows U-TURN WAIT",
  "CdS-U1 detects vehicle",
  "Compare CdS-U2 and CdS-T1",
  "Classify U-turn demand",
  "Request validated",
  "Signal YELLOW",
  "Signal RED",
  "Ultrasonic C1 checks clearance",
  "LCD shows U-TURN GO",
  "Ultrasonic C2 monitors movement",
  "LCD returns to WAIT",
  "Conflict zone cleared",
  "Through Signal GREEN",
];

const eventLog = [
  { t: "08:47:12", event: "U-turn request validated", status: "ok" },
  { t: "08:46:58", event: "CdS-U2 demand threshold exceeded", status: "warn" },
  { t: "08:46:40", event: "Through signal cycled to GREEN", status: "ok" },
  { t: "08:46:21", event: "Ultrasonic C1 clearance confirmed", status: "ok" },
  { t: "08:45:59", event: "Conflict zone occupancy timeout", status: "error" },
  { t: "08:45:33", event: "System mode set to AUTO", status: "ok" },
];

function StatusDot({ tone }) {
  const map = {
    green: "bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.55)]",
    amber: "bg-amber-400 shadow-[0_0_10px_2px_rgba(251,191,36,0.55)]",
    red: "bg-red-400 shadow-[0_0_10px_2px_rgba(248,113,113,0.55)]",
    blue: "bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.55)]",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[tone]}`} />;
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-[#1c2433] bg-[#10151f] shadow-[0_1px_0_rgba(255,255,255,0.02)_inset] ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, meta }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-sky-400" strokeWidth={2} />}
        <h3 className="text-[13px] font-medium tracking-wide text-slate-300 uppercase">{title}</h3>
      </div>
      {meta && <span className="text-[11px] text-slate-500">{meta}</span>}
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, tone, sub }) {
  const toneText = {
    green: "text-emerald-400", amber: "text-amber-400",
    red: "text-red-400", blue: "text-sky-400", slate: "text-slate-200",
  };
  return (
    <Card className="relative overflow-hidden p-5 transition-all hover:border-[#2a3547] hover:-translate-y-0.5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-500/5 blur-2xl" />
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className={`mt-3 flex items-baseline gap-2 text-2xl font-semibold ${toneText[tone]}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </Card>
  );
}

function SensorCard({ s }) {
  const tone = s.status === "active" ? "green" : "slate";
  return (
    <Card className="p-4 transition-colors hover:border-[#2a3547]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] text-slate-200">{s.id}</span>
        <StatusDot tone={s.status === "active" ? "green" : "amber"} />
      </div>
      <p className="mt-1 text-[11px] leading-tight text-slate-500">{s.label}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-lg text-slate-100">{s.value}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
          s.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
        }`}>
          {s.status}
        </span>
      </div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#25304487] bg-[#0d1119] px-3 py-2 text-[11px] shadow-lg">
      <p className="text-slate-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-sky-300">{p.value}</p>
      ))}
    </div>
  );
}

export default function TrafficDashboard() {
  const [mode, setMode] = useState("AUTO");
  const [currentStep] = useState(4); // "Classify U-turn demand" is active
  const [sweep, setSweep] = useState(0);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setSweep((s) => (s + 1) % 360), 40);
    const c = setInterval(() => setClock(new Date()), 1000);
    return () => { clearInterval(i); clearInterval(c); };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0a0e16] text-slate-200" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* background grid texture */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.035]" style={{
        backgroundImage: "linear-gradient(#7dd3fc 1px, transparent 1px), linear-gradient(90deg, #7dd3fc 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }} />

      {/* Top navigation */}
      <header className="sticky top-0 z-20 border-b border-[#1c2433] bg-[#0a0e16]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
              <TrafficCone className="h-5 w-5 text-[#0a0e16]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-slate-100">Smart U-Turn Traffic Control System</h1>
              <p className="text-[11px] text-slate-500">Intersection Node · JL-014 · Live</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-2 rounded-full border border-[#1c2433] bg-[#10151f] px-3 py-1.5 sm:flex">
              <StatusDot tone="green" />
              <span className="text-[11px] font-medium text-slate-400">System Online</span>
            </div>
            <span className="hidden font-mono text-[12px] text-slate-500 md:block">
              {clock.toLocaleTimeString("en-GB")}
            </span>
            <Settings className="h-4 w-4 cursor-pointer text-slate-500 transition-colors hover:text-sky-400" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">

        {/* 1. Overview cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard icon={Circle} label="Through Traffic Signal" value="GREEN" tone="green" sub="Cycle stable · 42s remaining" />
          <OverviewCard icon={ArrowUpDown} label="U-Turn Status" value="WAIT" tone="amber" sub="Demand under evaluation" />
          <OverviewCard icon={Car} label="Vehicle Count" value="187" tone="blue" sub="+12 in last 5 min" />
          <OverviewCard icon={Cpu} label="System Mode" value={mode} tone={mode === "AUTO" ? "green" : "amber"} sub="Decision engine active" />
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* 2. Live intersection monitoring — signature panel */}
          <Card className="lg:col-span-8">
            <CardHeader icon={ScanLine} title="Live Intersection Monitoring" meta="Sensor overlay · scanning" />
            <div className="relative mx-5 mb-5 aspect-[16/10] overflow-hidden rounded-lg border border-[#1c2433] bg-[#0b0f18]">
              <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
                backgroundImage: "linear-gradient(#7dd3fc 1px, transparent 1px), linear-gradient(90deg, #7dd3fc 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }} />
              <svg viewBox="0 0 400 250" className="absolute inset-0 h-full w-full">
                {/* road base */}
                <rect x="0" y="95" width="400" height="60" fill="#141a26" />
                <rect x="170" y="0" width="60" height="250" fill="#141a26" />
                {/* lane markings */}
                <line x1="0" y1="125" x2="400" y2="125" stroke="#2a3547" strokeWidth="1.5" strokeDasharray="8 8" />
                <line x1="200" y1="0" x2="200" y2="250" stroke="#2a3547" strokeWidth="1.5" strokeDasharray="8 8" />
                {/* u-turn lane arc */}
                <path d="M 170 140 A 30 30 0 0 0 170 110" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
                {/* radar sweep, rotating around intersection center */}
                <g transform={`rotate(${sweep} 200 125)`} opacity="0.5">
                  <path d="M 200 125 L 200 55 A 70 70 0 0 1 249.5 75.5 Z" fill="url(#sweepGrad)" />
                </g>
                <defs>
                  <radialGradient id="sweepGrad" cx="0" cy="1" r="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* traffic light */}
                <g transform="translate(206,60)">
                  <rect x="0" y="0" width="14" height="34" rx="3" fill="#1c2433" stroke="#2a3547" />
                  <circle cx="7" cy="8" r="3.2" fill="#ef4444" opacity="0.25" />
                  <circle cx="7" cy="17" r="3.2" fill="#f59e0b" opacity="0.25" />
                  <circle cx="7" cy="26" r="3.2" fill="#22c55e">
                    <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>
                {/* vehicles */}
                <g>
                  <rect x="60" y="103" width="18" height="9" rx="2" fill="#38bdf8">
                    <animate attributeName="x" values="40;150;40" dur="6s" repeatCount="indefinite" />
                  </rect>
                  <rect x="300" y="134" width="18" height="9" rx="2" fill="#38bdf8">
                    <animate attributeName="x" values="330;230;330" dur="7s" repeatCount="indefinite" />
                  </rect>
                  <rect x="182" y="150" width="9" height="18" rx="2" fill="#f59e0b" />
                </g>
                {/* sensor pulse points */}
                {[[178, 148, "#22c55e"], [222, 148, "#22c55e"], [222, 100, "#f59e0b"], [130, 118, "#38bdf8"], [270, 132, "#38bdf8"]].map(([cx, cy, c], i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="3" fill={c} />
                    <circle cx={cx} cy={cy} r="3" fill={c} opacity="0.6">
                      <animate attributeName="r" values="3;12;3" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
              </svg>
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-[#0a0e16]/80 px-2 py-1 text-[10px] text-slate-500 backdrop-blur">
                <Radio className="h-3 w-3 text-cyan-400" /> live feed placeholder — WebSocket ready
              </div>
            </div>
          </Card>

          {/* 3. LCD display */}
          <Card className="flex flex-col lg:col-span-4">
            <CardHeader icon={Zap} title="LCD Display" meta="16×2" />
            <div className="mx-5 mb-5 flex flex-1 flex-col items-center justify-center rounded-lg border border-[#0f2a1c] bg-[#08150e] p-6">
              <div className="w-full rounded-md border border-[#123a25] bg-[#0b1f14] p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                <p className="text-center font-mono text-[19px] tracking-[0.15em] text-[#5eead4]" style={{ fontFamily: "'JetBrains Mono', monospace", textShadow: "0 0 8px rgba(94,234,212,0.6)" }}>
                  U-TURN&nbsp;WAIT
                </p>
                <p className="mt-1 text-center font-mono text-[11px] tracking-[0.2em] text-[#2f6e58]">
                  DEMAND: EVALUATING
                </p>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-600">character LCD emulation</p>
            </div>
          </Card>
        </section>

        {/* 4. Sensor monitoring */}
        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Gauge className="h-4 w-4 text-sky-400" />
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-slate-300">Sensor Monitoring</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {sensors.map((s) => <SensorCard key={s.id} s={s} />)}
          </div>
        </section>

        {/* 5. Traffic analysis */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <CardHeader icon={BarChart3} title="Traffic Analysis" />
            <div className="grid grid-cols-2 gap-3 px-5 pb-5">
              {[
                { label: "Vehicle Count", value: "187", icon: Car },
                { label: "U-turn Requests", value: "34", icon: ArrowUpDown },
                { label: "Avg Wait Time", value: "26s", icon: Timer },
                { label: "Traffic Density", value: "Med", icon: TrendingUp },
              ].map((m, i) => (
                <div key={i} className="rounded-lg border border-[#1c2433] bg-[#0d1119] p-3">
                  <m.icon className="h-3.5 w-3.5 text-slate-600" />
                  <p className="mt-2 text-lg font-semibold text-slate-100">{m.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{m.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader icon={TrendingUp} title="Vehicle Count Over Time" />
            <div className="h-[190px] px-3 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vehicleCountSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1c2433" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={{ stroke: "#1c2433" }} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="vehicles" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#22d3ee" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader icon={BarChart3} title="Traffic Density" />
            <div className="h-[190px] px-3 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={densitySeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1c2433" vertical={false} />
                  <XAxis dataKey="lane" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={{ stroke: "#1c2433" }} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="density" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* 6. Decision engine + 7. Control flow timeline */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card className="lg:col-span-5 border-sky-500/20 bg-gradient-to-b from-[#0f1b2e] to-[#10151f]">
            <CardHeader icon={Cpu} title="Decision Engine" meta="rule-based" />
            <div className="px-5 pb-5">
              <div className="space-y-2 rounded-lg border border-[#1c2433] bg-[#0a0e16] p-4 font-mono text-[13px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>CdS-U2</span><span className="text-sky-300">18</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>CdS-T1</span><span className="text-slate-500">7</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-emerald-400/80">Decision</p>
                  <p className="text-[15px] font-semibold text-emerald-300">Priority → U-Turn</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader icon={ChevronRight} title="Control Flow Timeline" meta={`step ${currentStep + 1} / ${timelineSteps.length}`} />
            <div className="max-h-[280px] overflow-y-auto px-5 pb-5">
              <ol className="relative ml-3 space-y-0 border-l border-[#1c2433]">
                {timelineSteps.map((step, i) => {
                  const state = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
                  const dotColor = state === "done" ? "bg-emerald-400" : state === "active" ? "bg-sky-400" : "bg-slate-600";
                  const textColor = state === "done" ? "text-emerald-400" : state === "active" ? "text-sky-300 font-medium" : "text-slate-500";
                  return (
                    <li key={i} className="relative py-2 pl-6">
                      <span className={`absolute -left-[5px] top-3.5 h-2.5 w-2.5 rounded-full ${dotColor} ${state === "active" ? "shadow-[0_0_10px_2px_rgba(56,189,248,0.6)]" : ""}`} />
                      <span className={`text-[12.5px] ${textColor}`}>{step}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Card>
        </section>

        {/* 8. Event logs */}
        <Card>
          <CardHeader icon={Activity} title="Event Logs" meta="last 6 events" />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-[#1c2433] text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {eventLog.map((e, i) => (
                  <tr key={i} className="border-b border-[#151b27] last:border-0">
                    <td className="py-2.5 font-mono text-slate-500">{e.t}</td>
                    <td className="py-2.5 text-slate-300">{e.event}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                        e.status === "ok" ? "bg-emerald-500/10 text-emerald-400"
                        : e.status === "warn" ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                      }`}>
                        {e.status === "ok" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 9. Manual control panel */}
        <Card>
          <CardHeader icon={Power} title="Manual Control Panel" meta="future functionality — disabled" />
          <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Green", tone: "border-emerald-500/30 text-emerald-400" },
                { label: "Yellow", tone: "border-amber-500/30 text-amber-400" },
                { label: "Red", tone: "border-red-500/30 text-red-400" },
                { label: "Open U-Turn", tone: "border-sky-500/30 text-sky-400" },
                { label: "Close U-Turn", tone: "border-sky-500/30 text-sky-400" },
              ].map((b) => (
                <button key={b.label} disabled className={`cursor-not-allowed rounded-lg border bg-[#0d1119] px-3.5 py-2 text-[12px] font-medium opacity-50 ${b.tone}`}>
                  {b.label}
                </button>
              ))}
              <button disabled className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#2a3547] bg-[#0d1119] px-3.5 py-2 text-[12px] font-medium text-slate-400 opacity-50">
                <RotateCcw className="h-3.5 w-3.5" /> Reset System
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[#1c2433] bg-[#0d1119] px-4 py-2.5">
              <span className={`text-[11px] font-medium ${mode === "MANUAL" ? "text-amber-400" : "text-slate-500"}`}>MANUAL</span>
              <button
                onClick={() => setMode((m) => (m === "AUTO" ? "MANUAL" : "AUTO"))}
                className={`relative h-6 w-11 rounded-full transition-colors ${mode === "AUTO" ? "bg-emerald-500/80" : "bg-amber-500/80"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${mode === "AUTO" ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-[11px] font-medium ${mode === "AUTO" ? "text-emerald-400" : "text-slate-500"}`}>AUTO</span>
            </div>
          </div>
        </Card>

        <footer className="py-4 text-center text-[11px] text-slate-600">
          Smart U-Turn Traffic Control System · dummy data shown · ready for WebSocket / REST integration
        </footer>
      </main>
    </div>
  );
}
