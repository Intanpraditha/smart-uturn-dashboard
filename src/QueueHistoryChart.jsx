import { memo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const QueueHistoryChart = memo(function QueueHistoryChart({ history }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={history} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
        <CartesianGrid stroke="#293034" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: "#79827e", fontSize: 10 }} axisLine={{ stroke: "#39413e" }} tickLine={false} minTickGap={32} />
        <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={{ fill: "#79827e", fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "#0f1314", border: "1px solid #39413e", borderRadius: 6, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#aeb8b3" }} />
        <Line type="stepAfter" dataKey="q_uturn" name="Q_UTURN" stroke="#4db7d0" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="q_main" name="Q_MAIN" stroke="#e8c45b" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
});

export default QueueHistoryChart;
