/** Gráficos SVG sin librerías externas, calculados con datos reales. */

export function BarChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const w = 560
  const bw = w / Math.max(1, data.length)
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="chart" role="img" aria-label="Gráfico de barras">
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * (height - 34))
        return (
          <g key={i}>
            <rect x={i * bw + 10} y={height - 24 - h} width={bw - 20} height={h} rx={4} fill="#2563eb" />
            <text x={i * bw + bw / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="#94a3b8">{d.label}</text>
            <text x={i * bw + bw / 2} y={height - 30 - h} textAnchor="middle" fontSize={11} fill="#e2e8f0">{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function AreaChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const w = 560
  const pts = data.map((d, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * (w - 20) + 10
    const y = height - 26 - (d.value / max) * (height - 44)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="chart" role="img" aria-label="Gráfico de área">
      <polyline points={`10,${height - 26} ${pts} ${w - 10},${height - 26}`} fill="rgba(37,99,235,.18)" stroke="none" />
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth={2.5} />
      {data.map((d, i) => {
        const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * (w - 20) + 10
        const y = height - 26 - (d.value / max) * (height - 44)
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#38bdf8"><title>{`${d.label}: ${d.value}`}</title></circle>
      })}
      {data.map((d, i) => (
        <text key={i} x={data.length === 1 ? w / 2 : (i / (data.length - 1)) * (w - 20) + 10} y={height - 8} textAnchor="middle" fontSize={11} fill="#94a3b8">{d.label}</text>
      ))}
    </svg>
  )
}
