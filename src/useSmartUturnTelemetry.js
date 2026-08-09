import { useEffect, useRef, useState } from "react";

import {
  createDemoTelemetry,
  createDisconnectedTelemetry,
  EMPTY_TELEMETRY,
  isTelemetry,
} from "./telemetry";

const DEFAULT_WS_URL = "ws://127.0.0.1:8765";
const STALE_AFTER_MS = 3000;
const HISTORY_LIMIT = 60;
const EVENT_LIMIT = 40;

function isDemoMode() {
  const query = new URLSearchParams(window.location.search);
  return query.get("demo") === "1" || import.meta.env.VITE_SMART_UTURN_DEMO === "true";
}

function clockLabel(timestamp) {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useSmartUturnTelemetry() {
  const demo = isDemoMode();
  const [telemetry, setTelemetry] = useState(() => demo ? createDemoTelemetry() : EMPTY_TELEMETRY);
  const [mode, setMode] = useState(demo ? "DEMO" : "CONNECTING");
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const previousRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let socket;
    let reconnectTimer;
    let staleTimer;

    const accept = (next, nextMode) => {
      if (disposed) return;
      const timestamp = next.received_at_ms || Date.now();
      const previous = previousRef.current;
      previousRef.current = next;
      setTelemetry(next);
      setMode(nextMode);
      setHistory((items) => [
        ...items,
        {
          time: clockLabel(timestamp),
          qUturn: next.sensors.q_uturn.valid ? next.sensors.q_uturn.vehicles : null,
          qMain: next.sensors.q_main.valid ? next.sensors.q_main.vehicles : null,
        },
      ].slice(-HISTORY_LIMIT));

      const newEvents = [];
      if (!previous || previous.controller.fsm !== next.controller.fsm) {
        newEvents.push({ id: `${timestamp}-fsm`, time: clockLabel(timestamp), label: `FSM → ${next.controller.fsm}` });
      }
      if (!previous || previous.request.classification !== next.request.classification) {
        newEvents.push({ id: `${timestamp}-demand`, time: clockLabel(timestamp), label: `Demand → ${next.request.classification}` });
      }
      if (newEvents.length) {
        setEvents((items) => [...newEvents, ...items].slice(0, EVENT_LIMIT));
      }
    };

    if (demo) {
      accept(createDemoTelemetry(), "DEMO");
      const timer = window.setInterval(() => accept(createDemoTelemetry(), "DEMO"), 500);
      return () => {
        disposed = true;
        window.clearInterval(timer);
      };
    }

    const wsUrl = import.meta.env.VITE_SMART_UTURN_WS_URL || DEFAULT_WS_URL;
    const connect = () => {
      if (disposed) return;
      setMode("CONNECTING");
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const next = JSON.parse(event.data);
          if (isTelemetry(next)) {
            accept(next, next.connected ? "LIVE" : "OFFLINE");
          }
        } catch {
          // Malformed payloads do not replace the last known good state.
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        setTelemetry((current) => createDisconnectedTelemetry(current));
        setMode("OFFLINE");
        reconnectTimer = window.setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();
    };

    staleTimer = window.setInterval(() => {
      setTelemetry((current) => {
        if (current.connected && Date.now() - current.received_at_ms > STALE_AFTER_MS) {
          setMode("OFFLINE");
          return createDisconnectedTelemetry(current);
        }
        return current;
      });
    }, 500);
    connect();

    return () => {
      disposed = true;
      window.clearInterval(reconnectTimer);
      window.clearInterval(staleTimer);
      socket?.close();
    };
  }, [demo]);

  return { telemetry, mode, history, events };
}
