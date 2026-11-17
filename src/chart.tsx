import { useState } from 'react'
import { usd, usdCompact } from './ui'

export type Series<K extends string> = { key: K; label: string; color: string; width?: number; dashed?: boolean }

const W = 640
const H = 280
const PAD = { top: 12, right: 12, bottom: 28, left: 56 }

/** Round a maximum up to a tidy axis ceiling with four intervals. */
function niceMax(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0, 1] }
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) }
}

export function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-0.5 w-3.5 shrink-0 rounded-full"
      style={dashed ? { backgroundImage: `linear-gradient(90deg, ${color} 60%, transparent 60%)`, backgroundSize: '5px 2px' } : { background: color }}
    />
  )
}

export function Legend<K extends string>({ series }: { series: Series<K>[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <Swatch color={s.color} dashed={s.dashed} />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

/** Line chart over years. Points are evenly spaced; `year` labels the x axis. */
export function LineChart<K extends string, P extends { year: number } & Record<K, number>>({
  points,
  series,
  label,
  xLabel = (y) => `Year ${y}`,
}: {
  points: P[]
  series: Series<K>[]
  label: string
  xLabel?: (year: number) => string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const n = points.length
  const { top, ticks } = niceMax(Math.max(0, ...points.flatMap((p) => series.map((s) => p[s.key]))))
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * (W - PAD.left - PAD.right) : 0)
  const y = (v: number) => H - PAD.bottom - (Math.min(top, Math.max(0, v)) / top) * (H - PAD.top - PAD.bottom)
  const path = (k: K) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join('')
  const everyN = n > 32 ? 10 : n > 12 ? 5 : n > 6 ? 2 : 1
  const h = hover !== null ? points[hover] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={label}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - box.left) / box.width) * W
          const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1))
          setHover(Math.min(n - 1, Math.max(0, i)))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" className="num">
              {usdCompact(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          p.year % everyN === 0 || i === n - 1 ? (
            <text key={p.year} x={x(i)} y={H - 8} textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize="11" fill="var(--muted)" className="num">
              {p.year}
            </text>
          ) : null,
        )}
        {[...series].reverse().map((s) => (
          <path
            key={s.key}
            d={path(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width ?? 2}
            strokeDasharray={s.dashed ? '5 4' : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--field)" strokeWidth="1" />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(h[s.key])} r="4" fill={s.color} stroke="var(--card)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="num pointer-events-none absolute top-2 z-10 min-w-44 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-sm"
          style={hover > n / 2 ? { right: `${100 - (x(hover) / W) * 100 + 2}%` } : { left: `${(x(hover) / W) * 100 + 2}%` }}
        >
          <p className="mb-1 font-medium">{xLabel(h.year)}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2 whitespace-nowrap">
              <Swatch color={s.color} dashed={s.dashed} />
              {s.label}
              <span className="ml-auto pl-4 font-medium">{usd(h[s.key])}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
