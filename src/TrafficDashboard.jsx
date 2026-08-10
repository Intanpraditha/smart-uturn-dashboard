import { lazy, Suspense } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Car,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Cpu,
  Lightbulb,
  Radio,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useSmartUturnTelemetry } from "./useSmartUturnTelemetry";

const QueueHistoryChart = lazy(() => import("./QueueHistoryChart"));

const FSM_STEPS = [
  "MAIN_GREEN",
  "REQUEST_VALIDATION",
  "MAIN_YELLOW",
  "PRE_UTURN_ALL_RED",
  "UTURN_GO",
  "POST_UTURN_ALL_RED",
];

const SENSOR_THRESHOLDS = { u1: 350, u2: 300 };
const EMPTY_OPTIMIZER = {
  mode: "NOT_AVAILABLE",
  completed_cycles: 0,
  last_reward: 0,
  selected_main_ms: 5000,
  selected_uturn_ms: 4000,
  online_action: false,
  storage_ready: false,
};

const LABELS = {
  MAIN_GREEN: "Main green",
  REQUEST_VALIDATION: "Request validation",
  MAIN_YELLOW: "Main yellow",
  PRE_UTURN_ALL_RED: "Pre U-turn all-red",
  UTURN_GO: "U-turn go",
  POST_UTURN_ALL_RED: "Post U-turn all-red",
  FAULT_SAFE: "Fault safe",
  NO_DEMAND: "No demand",
  PASSING_EVENT: "Passing event",
  UTURN_REQUEST: "U-turn request",
  UTURN_QUEUE: "U-turn queue",
  POCKET_FULL: "Pocket full",
  QUEUE_UNKNOWN: "Queue unknown",
  INVALID_PATTERN: "Invalid pattern",
};

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-md border border-[#293034] bg-[#151a1c] ${className}`}>
      {children}
    </section>
  );
}

function PanelHeader({ icon: Icon, title, meta }) {
  return (
    <header className="flex min-h-11 items-center justify-between border-b border-[#293034] px-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#63d6c5]" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-[#e7ece9]">{title}</h2>
      </div>
      {meta && <span className="font-mono text-xs text-[#89928e]">{meta}</span>}
    </header>
  );
}

function ConnectionBadge({ mode }) {
  const config = {
    LIVE: { icon: Wifi, label: "Live", classes: "border-emerald-700 bg-emerald-950 text-emerald-300" },
    DEMO: { icon: Radio, label: "Demo", classes: "border-amber-700 bg-amber-950 text-amber-300" },
    CONNECTING: { icon: Radio, label: "Connecting", classes: "border-[#5b6662] bg-[#1b2221] text-[#b2bbb7]" },
    OFFLINE: { icon: WifiOff, label: "Offline", classes: "border-red-800 bg-red-950 text-red-300" },
  }[mode];
  const Icon = config.icon;

  return (
    <span className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${config.classes}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function Metric({ icon: Icon, label, value, detail, tone = "neutral" }) {
  const tones = {
    green: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-300",
    cyan: "text-[#63d6c5]",
    neutral: "text-[#e7ece9]",
  };

  return (
    <Card className="min-h-28 p-4">
      <div className="flex items-center justify-between text-[#89928e]">
        <span className="text-xs font-medium">{label}</span>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className={`mt-3 min-h-8 text-xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="mt-1 min-h-4 text-xs text-[#89928e]">{detail}</div>
    </Card>
  );
}

function SignalLamp({ active, color }) {
  const classes = {
    RED: active ? "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.7)]" : "bg-red-950",
    YELLOW: active ? "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)]" : "bg-amber-950",
    GREEN: active ? "bg-emerald-500 shadow-[0_0_14px_rgba(34,197,94,0.7)]" : "bg-emerald-950",
  };
  return <span className={`h-5 w-5 rounded-full border border-black/50 ${classes[color]}`} />;
}

function QueueVehicle({ x, y, color }) {
  return <rect x={x} y={y} width="38" height="18" rx="3" fill={color} stroke="#e7ece9" strokeOpacity="0.25" />;
}

function IntersectionMap({ telemetry }) {
  const qUturnValid = telemetry.sensors.q_uturn.valid;
  const qMainValid = telemetry.sensors.q_main.valid;
  const qUturn = qUturnValid ? Math.max(0, Math.min(3, telemetry.sensors.q_uturn.vehicles ?? 0)) : 0;
  const qMain = qMainValid ? Math.max(0, Math.min(3, telemetry.sensors.q_main.vehicles ?? 0)) : 0;
  const signal = telemetry.controller.signal;

  return (
    <Card className="lg:col-span-8">
      <PanelHeader icon={CircleGauge} title="Intersection state" meta={`controller ${telemetry.controller_time_ms} ms`} />
      <div className="p-4">
        <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-[#293034] bg-[#0e1213] sm:aspect-[16/7]">
          <svg viewBox="0 0 720 315" className="h-full w-full" role="img" aria-label="Current queue and signal state">
            <rect width="720" height="315" fill="#0e1213" />
            <defs>
              <marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#aeb8b3" />
              </marker>
              <marker id="uturnArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#e8c45b" />
              </marker>
            </defs>

            <rect x="0" y="48" width="720" height="84" fill="#292f31" />
            <rect x="0" y="132" width="720" height="51" fill="#3d4541" />
            <rect x="0" y="183" width="720" height="84" fill="#292f31" />
            <rect x="250" y="132" width="60" height="51" fill="#292f31" />
            <line x1="310" y1="48" x2="310" y2="132" stroke="#f2f5f3" strokeWidth="4" />
            <line x1="310" y1="183" x2="310" y2="267" stroke="#f2f5f3" strokeWidth="4" />

            <text x="18" y="70" fill="#aeb8b3" fontSize="13">Opposing main lane · one lane</text>
            <text x="18" y="205" fill="#aeb8b3" fontSize="13">U-turn waiting queue · one lane</text>
            <line x1="365" y1="91" x2="455" y2="91" stroke="#aeb8b3" strokeWidth="2" markerEnd="url(#flowArrow)" opacity="0.8" />
            <line x1="670" y1="226" x2="580" y2="226" stroke="#aeb8b3" strokeWidth="2" markerEnd="url(#flowArrow)" opacity="0.8" />

            <g transform="translate(326 52)">
              <rect width="48" height="76" rx="5" fill="#111516" stroke="#505a56" />
              <circle cx="24" cy="18" r="9" fill={signal === "RED" ? "#ef4444" : "#431719"} />
              <circle cx="24" cy="38" r="9" fill={signal === "YELLOW" ? "#fbbf24" : "#453817"} />
              <circle cx="24" cy="58" r="9" fill={signal === "GREEN" ? "#22c55e" : "#153c25"} />
            </g>

            <g>
              <rect x="72" y="99" width="17" height="28" rx="3" fill="#63d6c5" />
              <path d="M89 113 L300 113" stroke="#63d6c5" strokeDasharray="5 6" opacity="0.65" />
              <text x="54" y="149" fill="#63d6c5" fontSize="12">Q_MAIN · {qMainValid ? `${qMain} veh` : "UNKNOWN"}</text>
            </g>
            {Array.from({ length: qMain }, (_, index) => (
              <QueueVehicle key={`main-${index}`} x={266 - index * 43} y={101} color="#e8c45b" />
            ))}

            <g>
              <rect x="520" y="233" width="17" height="28" rx="3" fill="#63d6c5" />
              <path d="M520 247 L320 247" stroke="#63d6c5" strokeDasharray="5 6" opacity="0.65" />
              <text x="472" y="288" fill="#63d6c5" fontSize="12">Q_UTURN · {qUturnValid ? `${qUturn} veh` : "UNKNOWN"}</text>
            </g>
            {Array.from({ length: qUturn }, (_, index) => (
              <QueueVehicle key={`uturn-${index}`} x={318 + index * 43} y={238} color="#4db7d0" />
            ))}

            <circle cx="337" cy="260" r="7" fill={telemetry.sensors.u1.raw >= SENSOR_THRESHOLDS.u1 ? "#ef4444" : "#4b5551"} />
            <circle cx="380" cy="260" r="7" fill={telemetry.sensors.u2.raw >= SENSOR_THRESHOLDS.u2 ? "#ef4444" : "#4b5551"} />
            <text x="327" y="296" fill="#aeb8b3" fontSize="11">U1</text>
            <text x="370" y="296" fill="#aeb8b3" fontSize="11">U2</text>
            <path d="M318 247 C270 247 244 220 260 183 C270 157 300 142 344 116" fill="none" stroke="#e8c45b" strokeWidth="3" strokeDasharray="7 7" markerEnd="url(#uturnArrow)" />
          </svg>
        </div>
      </div>
    </Card>
  );
}

function ControllerPanel({ telemetry }) {
  const signal = telemetry.controller.signal;
  const optimizer = telemetry.optimizer ?? EMPTY_OPTIMIZER;
  return (
    <Card className="lg:col-span-4">
      <PanelHeader icon={Cpu} title="Controller output" meta={telemetry.controller.policy} />
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between rounded-md border border-[#293034] bg-[#0f1314] p-4">
          <div>
            <div className="text-xs text-[#89928e]">Main signal</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#e7ece9]">{signal}</div>
          </div>
          <div className="flex gap-2 rounded-md bg-black/40 p-2">
            {(["RED", "YELLOW", "GREEN"]).map((color) => (
              <SignalLamp key={color} color={color} active={signal === color} />
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[#31554e] bg-[#0b1d19] p-4 text-center">
          <div className="text-xs text-[#7ba69d]">16x2 LCD</div>
          <div className="mt-2 font-mono text-lg font-semibold text-[#70e1c7]">{telemetry.controller.lcd.replaceAll("_", " ")}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-[#293034] bg-[#0f1314] p-3">
            <div className="text-xs text-[#89928e]">Main extension</div>
            <div className="mt-1 font-mono text-base text-[#e7ece9]">{formatSeconds(telemetry.controller.main_extension_ms)}</div>
          </div>
          <div className="rounded-md border border-[#293034] bg-[#0f1314] p-3">
            <div className="text-xs text-[#89928e]">U-turn go</div>
            <div className="mt-1 font-mono text-base text-[#e7ece9]">{formatSeconds(telemetry.controller.uturn_go_ms)}</div>
          </div>
        </div>

        <div className="border-t border-[#293034] pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-[#89928e]">Online optimizer</div>
            <div className="break-all text-right font-mono text-xs text-[#63d6c5]">{optimizer.mode}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[#79827e]">Completed cycles</div>
              <div className="mt-1 font-mono text-[#e7ece9]">{optimizer.completed_cycles}</div>
            </div>
            <div>
              <div className="text-[#79827e]">Last reward</div>
              <div className="mt-1 font-mono text-[#e7ece9]">{optimizer.last_reward}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-[#79827e]">
            Proposed {formatSeconds(optimizer.selected_main_ms)} / {formatSeconds(optimizer.selected_uturn_ms)}
            {optimizer.online_action ? " - learned action" : " - baseline action"}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SensorRow({ name, role, value, secondary, valid = true, occupied }) {
  return (
    <div className="grid min-h-16 grid-cols-[92px_1fr_auto] items-center gap-3 border-b border-[#252c2f] px-4 last:border-0">
      <div className="font-mono text-sm font-semibold text-[#e7ece9]">{name}</div>
      <div>
        <div className="text-sm text-[#c2cac6]">{role}</div>
        <div className="mt-0.5 text-xs text-[#79827e]">{secondary}</div>
      </div>
      <div className="text-right">
        <div className={`font-mono text-base ${valid ? "text-[#63d6c5]" : "text-red-300"}`}>{value}</div>
        {occupied !== undefined && (
          <div className={`mt-0.5 text-xs ${occupied ? "text-amber-300" : "text-[#79827e]"}`}>{occupied ? "Occupied" : "Clear"}</div>
        )}
      </div>
    </div>
  );
}

function FsmTimeline({ fsm, stateAgeMs }) {
  const currentIndex = FSM_STEPS.indexOf(fsm);
  return (
    <Card>
      <PanelHeader icon={ShieldCheck} title="Safety FSM" meta={`state age ${formatSeconds(stateAgeMs)}`} />
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 xl:grid-cols-6">
        {FSM_STEPS.map((state, index) => {
          const active = state === fsm;
          const completed = currentIndex >= 0 && index < currentIndex;
          return (
            <div
              key={state}
              className={`min-h-20 rounded-md border p-3 ${active ? "border-[#63d6c5] bg-[#12302b]" : "border-[#293034] bg-[#0f1314]"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#79827e]">{String(index + 1).padStart(2, "0")}</span>
                {active ? <Activity className="h-4 w-4 text-[#63d6c5]" /> : completed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : null}
              </div>
              <div className={`mt-2 text-xs font-semibold ${active ? "text-[#86eadb]" : "text-[#aeb8b3]"}`}>{LABELS[state]}</div>
            </div>
          );
        })}
      </div>
      {fsm === "FAULT_SAFE" && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4" /> Controller is in fault-safe state
        </div>
      )}
    </Card>
  );
}

function QueueChart({ history }) {
  return (
    <Card className="lg:col-span-7">
      <PanelHeader icon={ArrowDownUp} title="Queue history" meta="last 60 samples" />
      <div className="h-64 p-3">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-[#79827e]">Loading queue history</div>}>
          <QueueHistoryChart history={history} />
        </Suspense>
      </div>
    </Card>
  );
}

function EventLog({ events }) {
  return (
    <Card className="lg:col-span-5">
      <PanelHeader icon={Clock3} title="State events" meta={`${events.length} retained`} />
      <div className="max-h-64 overflow-auto">
        {events.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#79827e]">No state transitions received</div>
        ) : events.map((event) => (
          <div key={event.id} className="grid grid-cols-[72px_1fr] gap-3 border-b border-[#252c2f] px-4 py-3 last:border-0">
            <span className="font-mono text-xs text-[#79827e]">{event.time}</span>
            <span className="text-sm text-[#cbd2cf]">{event.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function TrafficDashboard() {
  const { telemetry, mode, history, events } = useSmartUturnTelemetry();
  const qUturn = telemetry.sensors.q_uturn;
  const qMain = telemetry.sensors.q_main;
  const demand = telemetry.request.classification;
  const demandTone = demand === "POCKET_FULL" || demand === "INVALID_PATTERN" ? "red" : demand === "NO_DEMAND" ? "neutral" : "amber";
  const signalTone = telemetry.controller.signal === "GREEN" ? "green" : telemetry.controller.signal === "YELLOW" ? "amber" : "red";
  const optimizer = telemetry.optimizer ?? EMPTY_OPTIMIZER;

  return (
    <div className="min-h-screen bg-[#0c1011] text-[#dce3df]">
      <header className="sticky top-0 z-20 border-b border-[#293034] bg-[#0c1011]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#63d6c5] text-[#0c1011]">
              <ArrowDownUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-[#f0f4f2] sm:text-base">Smart U-Turn Control Monitor</h1>
              <p className="truncate text-xs text-[#79827e]">Indonesian left-hand traffic model · Node JL-014</p>
            </div>
          </div>
          <ConnectionBadge mode={mode} />
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={Lightbulb} label="Main signal" value={telemetry.controller.signal} detail={LABELS[telemetry.controller.fsm] ?? telemetry.controller.fsm} tone={signalTone} />
          <Metric icon={ArrowDownUp} label="U-turn display" value={telemetry.controller.lcd.replaceAll("_", " ")} detail={`state ${formatSeconds(telemetry.controller.state_age_ms)}`} tone={telemetry.controller.lcd === "UTURN_GO" ? "green" : "amber"} />
          <Metric icon={Car} label="Demand" value={LABELS[demand] ?? demand} detail={telemetry.request.latched ? `latched ${formatSeconds(telemetry.request.age_ms)}` : "not latched"} tone={demandTone} />
          <Metric icon={Cpu} label="Timing policy" value={telemetry.controller.policy} detail={optimizer.mode === "NOT_AVAILABLE" ? `${formatSeconds(telemetry.controller.main_extension_ms)} / ${formatSeconds(telemetry.controller.uturn_go_ms)}` : optimizer.mode} tone={telemetry.controller.policy === "ESP" ? "cyan" : "neutral"} />
          <Metric icon={mode === "LIVE" ? Wifi : WifiOff} label="Telemetry" value={mode} detail={mode === "LIVE" ? `fresh ${telemetry.source} data` : mode === "DEMO" ? "deterministic fixture" : "no fresh controller data"} tone={mode === "LIVE" ? "green" : mode === "DEMO" ? "amber" : "red"} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <IntersectionMap telemetry={telemetry} />
          <ControllerPanel telemetry={telemetry} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <PanelHeader icon={Radio} title="Sensor observations" meta="Arduino inputs" />
            <SensorRow name="U1" role="First stopped U-turn vehicle" value={telemetry.sensors.u1.raw} secondary={`occupied threshold ${SENSOR_THRESHOLDS.u1}`} occupied={telemetry.sensors.u1.raw >= SENSOR_THRESHOLDS.u1} />
            <SensorRow name="U2" role="Second vehicle / pocket occupancy" value={telemetry.sensors.u2.raw} secondary={`occupied threshold ${SENSOR_THRESHOLDS.u2}`} occupied={telemetry.sensors.u2.raw >= SENSOR_THRESHOLDS.u2} />
          </Card>
          <Card>
            <PanelHeader icon={Car} title="Queue estimates" meta="3 s stabilized" />
            <SensorRow name="Q_UTURN" role="Dedicated U-turn pocket" value={qUturn.valid ? `${qUturn.vehicles} veh` : "UNKNOWN"} secondary={`${qUturn.distance_cm} cm · capacity 3`} valid={qUturn.valid} />
            <SensorRow name="Q_MAIN" role="Opposing main stop-line queue" value={qMain.valid ? `${qMain.vehicles} veh` : "UNKNOWN"} secondary={`${qMain.distance_cm} cm · reference 17 cm`} valid={qMain.valid} />
          </Card>
        </div>

        <FsmTimeline fsm={telemetry.controller.fsm} stateAgeMs={telemetry.controller.state_age_ms} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <QueueChart history={history} />
          <EventLog events={events} />
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-[#293034] py-3 text-xs text-[#68716d] sm:flex-row">
          <span>Safety transitions remain owned by Arduino Uno</span>
          <span className="font-mono">schema v{telemetry.schema_version} · {telemetry.source}</span>
        </div>
      </main>
    </div>
  );
}
