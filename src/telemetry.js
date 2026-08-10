const EMPTY_TELEMETRY = {
  schema_version: 1,
  source: "arduino_usb",
  connected: false,
  received_at_ms: 0,
  controller_time_ms: 0,
  sensors: {
    u1: { raw: 0 },
    u2: { raw: 0 },
    q_uturn: { distance_cm: 0, vehicles: null, valid: false },
    q_main: { distance_cm: 0, vehicles: null, valid: false },
  },
  request: {
    classification: "QUEUE_UNKNOWN",
    pocket_full: false,
    latched: false,
    age_ms: 0,
  },
  controller: {
    fsm: "MAIN_GREEN",
    signal: "GREEN",
    lcd: "WAIT",
    policy: "LOCAL",
    main_extension_ms: 5000,
    uturn_go_ms: 4000,
    state_age_ms: 0,
  },
  optimizer: {
    mode: "NOT_AVAILABLE",
    completed_cycles: 0,
    last_reward: 0,
    selected_main_ms: 5000,
    selected_uturn_ms: 4000,
    online_action: false,
    storage_ready: false,
  },
};

const DEMO_STATES = [
  { fsm: "MAIN_GREEN", duration: 5000, signal: "GREEN", lcd: "WAIT" },
  { fsm: "REQUEST_VALIDATION", duration: 5000, signal: "GREEN", lcd: "REQUEST_PENDING" },
  { fsm: "MAIN_YELLOW", duration: 2000, signal: "YELLOW", lcd: "REQUEST_PENDING" },
  { fsm: "PRE_UTURN_ALL_RED", duration: 1500, signal: "RED", lcd: "REQUEST_PENDING" },
  { fsm: "UTURN_GO", duration: 4000, signal: "RED", lcd: "UTURN_GO" },
  { fsm: "POST_UTURN_ALL_RED", duration: 2500, signal: "RED", lcd: "WAIT" },
];

const DEMO_CYCLE_MS = DEMO_STATES.reduce((sum, state) => sum + state.duration, 0);

export function createDisconnectedTelemetry(previous = EMPTY_TELEMETRY) {
  return { ...previous, connected: false };
}

export function createDemoTelemetry(now = Date.now()) {
  let offset = now % DEMO_CYCLE_MS;
  let selected = DEMO_STATES[0];
  for (const state of DEMO_STATES) {
    if (offset < state.duration) {
      selected = state;
      break;
    }
    offset -= state.duration;
  }

  const requestActive = selected.fsm !== "MAIN_GREEN" && selected.fsm !== "POST_UTURN_ALL_RED";
  const uturnMoving = selected.fsm === "UTURN_GO";
  return {
    schema_version: 1,
    source: "deterministic_demo",
    connected: true,
    received_at_ms: now,
    controller_time_ms: now % 3600000,
    sensors: {
      u1: { raw: requestActive ? 472 : 214 },
      u2: { raw: requestActive ? 338 : 181 },
      q_uturn: { distance_cm: uturnMoving ? 11 : 7, vehicles: uturnMoving ? 1 : 2, valid: true },
      q_main: { distance_cm: requestActive ? 11 : 15, vehicles: requestActive ? 2 : 1, valid: true },
    },
    request: {
      classification: requestActive ? "UTURN_QUEUE" : "NO_DEMAND",
      pocket_full: false,
      latched: requestActive,
      age_ms: requestActive ? offset : 0,
    },
    controller: {
      fsm: selected.fsm,
      signal: selected.signal,
      lcd: selected.lcd,
      policy: "LOCAL",
      main_extension_ms: 5000,
      uturn_go_ms: 4000,
      state_age_ms: offset,
    },
    optimizer: {
      mode: "SHADOW_LEARNING",
      completed_cycles: Math.floor((now % 3600000) / DEMO_CYCLE_MS),
      last_reward: -21,
      selected_main_ms: 5000,
      selected_uturn_ms: 4000,
      online_action: false,
      storage_ready: true,
    },
  };
}

export function isTelemetry(value) {
  return Boolean(
    value &&
    value.schema_version === 1 &&
    typeof value.connected === "boolean" &&
    value.sensors?.u1 &&
    value.sensors?.u2 &&
    value.sensors?.q_uturn &&
    value.sensors?.q_main &&
    value.request &&
    value.controller &&
    typeof value.controller.fsm === "string" &&
    typeof value.controller.signal === "string" &&
    typeof value.controller.lcd === "string",
  );
}

export { EMPTY_TELEMETRY };
