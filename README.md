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

For the ESP8266 built-in access point, connect the computer to
`Smart-Uturn-ESP` and use `VITE_SMART_UTURN_WS_URL=ws://192.168.4.1:81`.
The ESP feed also displays online-learning mode, completed cycles, latest
reward, and the selected bounded timing action.

Use `http://localhost:5173/?demo=1` for deterministic hardware-free display testing. Demo mode is always labeled and is never presented as live controller data.

The local Python serial gateway lives in the main `smart-uturn` repository at `tools/dashboard_gateway`. The dashboard has no command channel and cannot change signals, FSM states, or timing. Use either the USB gateway or the direct ESP WebSocket, not both at the same URL.
