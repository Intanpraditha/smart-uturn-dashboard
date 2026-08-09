# Smart U-Turn Dashboard

Read-only React dashboard for the queue-centric Smart U-Turn controller. It displays U1/U2 occupancy, Q_UTURN/Q_MAIN estimates, demand classification, the fixed safety FSM, LCD output, and LOCAL/ESP timing policy.

## Run

```bash
npm install
npm run dev
```

The dashboard connects to `ws://127.0.0.1:8765` by default. Override it with:

```text
VITE_SMART_UTURN_WS_URL=ws://host:port
```

Use `http://localhost:5173/?demo=1` for deterministic hardware-free display testing. Demo mode is always labeled and is never presented as live controller data.

The local Python serial gateway lives in the main `smart-uturn` repository at `tools/dashboard_gateway`. The dashboard has no command channel and cannot change signals, FSM states, or timing.
