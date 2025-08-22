import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts'

type VoteInfo = { name: string; value: number | null }

type VoteChartProps = {
  votes: Record<string, VoteInfo>
  revealed: boolean
  participantCount: number
  allowedValues?: number[]
}

const DEFAULT_ALLOWED = [3, 5, 8, 13]

const COLORS: Record<number, string> = {
  3: '#60a5fa',
  5: '#34d399',
  8: '#f59e0b',
  13: '#ef4444',
}

const VoteChart: React.FC<VoteChartProps> = ({ votes, revealed, participantCount, allowedValues = DEFAULT_ALLOWED }) => {
  const submittedCount = useMemo(() => Object.values(votes).filter((v) => v.value != null).length, [votes])

  const data = useMemo(() => {
    const counts = new Map<number, number>()
    for (const val of allowedValues) counts.set(val, 0)
    for (const v of Object.values(votes)) {
      if (v.value != null && counts.has(v.value)) {
        counts.set(v.value, (counts.get(v.value) || 0) + 1)
      }
    }
    return allowedValues.map((val) => ({ point: val, count: counts.get(val) || 0 }))
  }, [votes, allowedValues])

  const average = useMemo(() => {
    const vals = Object.values(votes)
      .map((v) => v.value)
      .filter((n): n is number => typeof n === 'number')
    if (vals.length === 0) return null
    const sum = vals.reduce((acc, n) => acc + n, 0)
    return Number((sum / vals.length).toFixed(2))
  }, [votes])

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500">Votes distribution</h3>
        {!revealed ? (
          <div className="text-xs text-gray-500">Waiting to reveal…</div>
        ) : (
          <div className="text-xs text-gray-700">Avg: {average ?? '—'}</div>
        )}
      </div>

      {!revealed ? (
        <div className="mt-4 p-4 border border-dashed rounded-xl bg-white/60">
          <div className="text-sm text-gray-600">
            {submittedCount}/{participantCount} votes submitted
          </div>
          <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${participantCount > 0 ? Math.min(100, Math.round((submittedCount / Math.max(1, participantCount)) * 100)) : 0}%` }}
            />
          </div>
          <div className="mt-3 text-xs text-gray-500">Reveal to see the chart.</div>
        </div>
      ) : (
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <defs>
                {allowedValues.map((val) => (
                  <linearGradient id={`grad-${val}`} key={val} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[val] || '#6366f1'} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={COLORS[val] || '#6366f1'} stopOpacity={0.5} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="point" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive>
                <LabelList
                  dataKey="count"
                  position="top"
                  offset={8}
                  fill="#374151"
                  formatter={(label) => (typeof label === 'number' && label > 0 ? String(label) : '')}
                />
                {data.map((entry) => (
                  <Cell key={entry.point} fill={`url(#grad-${entry.point})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default VoteChart


