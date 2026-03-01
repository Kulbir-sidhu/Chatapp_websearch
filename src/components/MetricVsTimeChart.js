import { useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const LINE_COLOR = '#818cf8';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="metric-vs-time-tooltip">
      <p className="metric-vs-time-tooltip-label">{label}</p>
      <p className="metric-vs-time-tooltip-value">{payload[0].value?.toLocaleString()}</p>
    </div>
  );
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }) : str;
}

export default function MetricVsTimeChart({ data, metricLabel, onEnlarge, chartId, inline }) {
  const wrapRef = useRef(null);

  if (!data?.length) return null;

  const chartData = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!wrapRef.current) return;
    const svg = wrapRef.current.querySelector('svg');
    if (svg) {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metric-vs-time-${(metricLabel || 'chart').replace(/\s/g, '-')}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className="metric-vs-time-wrap"
      ref={wrapRef}
      onClick={!inline && onEnlarge ? () => onEnlarge({ data, metricLabel, chartId }) : undefined}
      role={!inline && onEnlarge ? 'button' : undefined}
      tabIndex={!inline && onEnlarge ? 0 : undefined}
      onKeyDown={!inline && onEnlarge ? (e) => e.key === 'Enter' && onEnlarge({ data, metricLabel, chartId }) : undefined}
    >
      <p className="metric-vs-time-label">{metricLabel} vs time</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={{ fill: LINE_COLOR, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {!inline && (
        <p className="metric-vs-time-hint">Click to enlarge · <button type="button" className="metric-vs-time-download-btn" onClick={handleDownload}>Download</button></p>
      )}
    </div>
  );
}
