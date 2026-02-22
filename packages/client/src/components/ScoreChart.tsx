import { useState, useMemo } from 'react';

export interface DataPoint {
  x: number;
  y: number;
  label?: string;
}

interface ScoreChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 45 };

export function ScoreChart({ data, width = 400, height = 220 }: ScoreChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { points, xMin, xMax, yMin, yMax, chartW, chartH } = useMemo(() => {
    if (data.length === 0) return { points: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1, chartW: 0, chartH: 0 };

    const cw = width - PADDING.left - PADDING.right;
    const ch = height - PADDING.top - PADDING.bottom;

    const xs = data.map(d => d.x);
    const ys = data.map(d => d.y);
    let xn = Math.min(...xs);
    let xx = Math.max(...xs);
    let yn = Math.min(...ys, 0);
    let yx = Math.max(...ys, 0);

    // Add some padding to y range
    const yRange = yx - yn || 1;
    yn -= yRange * 0.1;
    yx += yRange * 0.1;

    if (xx === xn) xx = xn + 1;

    const pts = data.map(d => ({
      sx: PADDING.left + ((d.x - xn) / (xx - xn)) * cw,
      sy: PADDING.top + ((yx - d.y) / (yx - yn)) * ch,
      ...d,
    }));

    return { points: pts, xMin: xn, xMax: xx, yMin: yn, yMax: yx, chartW: cw, chartH: ch };
  }, [data, width, height]);

  if (data.length === 0) {
    return <div className="text-gray-500 text-sm">No score history data.</div>;
  }

  const polyline = points.map(p => `${p.sx},${p.sy}`).join(' ');

  // Zero line y position
  const zeroY = PADDING.top + ((yMax - 0) / (yMax - yMin)) * chartH;

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks: number[] = [];
  const yStep = (yMax - yMin) / yTickCount;
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(yMin + i * yStep);
  }

  // X-axis ticks (show a few dates)
  const xTickCount = Math.min(data.length, 5);
  const xTicks: { val: number; sx: number }[] = [];
  for (let i = 0; i < xTickCount; i++) {
    const idx = Math.round((i / (xTickCount - 1 || 1)) * (data.length - 1));
    xTicks.push({ val: data[idx].x, sx: points[idx].sx });
  }

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-lg"
      style={{ overflow: 'visible' }}
    >
      {/* Grid lines */}
      {yTicks.map((tick, i) => {
        const ty = PADDING.top + ((yMax - tick) / (yMax - yMin)) * chartH;
        return (
          <g key={i}>
            <line
              x1={PADDING.left} y1={ty}
              x2={PADDING.left + chartW} y2={ty}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
            <text
              x={PADDING.left - 6} y={ty + 3}
              textAnchor="end" fill="#6b7280" fontSize="9"
            >
              {Math.round(tick)}
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PADDING.left} y1={zeroY}
          x2={PADDING.left + chartW} y2={zeroY}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,3"
        />
      )}

      {/* X-axis labels */}
      {xTicks.map((tick, i) => (
        <text
          key={i}
          x={tick.sx} y={height - 8}
          textAnchor="middle" fill="#6b7280" fontSize="8"
        >
          {new Date(tick.val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </text>
      ))}

      {/* Area fill under line */}
      {points.length > 1 && (
        <polygon
          points={`${points[0].sx},${zeroY} ${polyline} ${points[points.length - 1].sx},${zeroY}`}
          fill="url(#areaGrad)"
          opacity="0.3"
        />
      )}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.sx} cy={p.sy} r={hoveredIndex === i ? 5 : 3}
          fill={p.y >= 0 ? '#22c55e' : '#ef4444'}
          stroke="#1f2937" strokeWidth="1.5"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ cursor: 'pointer' }}
        />
      ))}

      {/* Hover interactive areas (wider hit targets) */}
      {points.map((p, i) => (
        <circle
          key={`hit-${i}`}
          cx={p.sx} cy={p.sy} r={12}
          fill="transparent"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        />
      ))}

      {/* Tooltip */}
      {hovered && (
        <g>
          <rect
            x={hovered.sx - 50} y={hovered.sy - 32}
            width="100" height="22" rx="4"
            fill="#1f2937" stroke="#374151" strokeWidth="1"
          />
          <text
            x={hovered.sx} y={hovered.sy - 18}
            textAnchor="middle" fill="#e5e7eb" fontSize="10"
          >
            {hovered.label ?? new Date(hovered.x).toLocaleDateString()} : {hovered.y >= 0 ? '+' : ''}{hovered.y}
          </text>
        </g>
      )}
    </svg>
  );
}
