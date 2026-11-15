import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useEffect, useState, type ReactNode } from 'react'
import { money } from '../lib/format'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
)
ChartJS.defaults.font.family = 'Ubuntu, system-ui, sans-serif'
ChartJS.defaults.color = '#5a463a'

/** Chart.js treba canvas iz preglednika — renderiramo tek nakon hidracije. */
function ClientOnly({
  children,
  height,
}: {
  children: ReactNode
  height: number
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return (
    <div className="relative w-full" style={{ height }}>
      {ready ? (
        children
      ) : (
        <div className="h-full w-full animate-pulse rounded-xl bg-walnut-100/70" />
      )}
    </div>
  )
}

const tooltip = {
  backgroundColor: '#2b211b',
  titleColor: '#fbf8f3',
  bodyColor: '#e4d8cb',
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
}

export function RevenueChart({
  labels,
  values,
  highlightLast = true,
}: {
  labels: string[]
  values: number[]
  highlightLast?: boolean
}) {
  return (
    <ClientOnly height={280}>
      <Bar
        role="img"
        aria-label="Promet po mjesecima"
        data={{
          labels,
          datasets: [
            {
              label: 'Promet',
              data: values,
              backgroundColor: values.map((_, i) =>
                highlightLast && i === values.length - 1
                  ? '#F15A29'
                  : '#3d2f26',
              ),
              borderRadius: 8,
              borderSkipped: false,
              maxBarThickness: 34,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltip,
              callbacks: { label: (c) => money(c.parsed.y ?? 0) },
            },
          },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: {
              beginAtZero: true,
              border: { display: false },
              grid: { color: '#efe7dd' },
              ticks: { callback: (v) => `${Number(v) / 1000}k` },
            },
          },
        }}
      />
    </ClientOnly>
  )
}

export function EmployeeChart({
  labels,
  values,
  colors,
}: {
  labels: string[]
  values: number[]
  colors: string[]
}) {
  return (
    <ClientOnly height={Math.max(160, labels.length * 52)}>
      <Bar
        role="img"
        aria-label="Promet po zaposleniku"
        data={{
          labels,
          datasets: [
            {
              label: 'Promet',
              data: values,
              backgroundColor: colors,
              borderRadius: 6,
              barThickness: 22,
            },
          ],
        }}
        options={{
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltip,
              callbacks: { label: (c) => money(c.parsed.x ?? 0) },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              border: { display: false },
              grid: { color: '#efe7dd' },
              ticks: { callback: (v) => `${Number(v) / 1000}k` },
            },
            y: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { weight: 600 } },
            },
          },
        }}
      />
    </ClientOnly>
  )
}

export const categoryColors = [
  '#3d2f26',
  '#F15A29',
  '#F79328',
  '#58595B',
  '#8b7464',
  '#c9b8a8',
]

export function CategoryChart({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  return (
    <ClientOnly height={220}>
      <Doughnut
        role="img"
        aria-label="Promet po kategoriji"
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: categoryColors,
              borderWidth: 2,
              borderColor: '#fbf8f3',
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              ...tooltip,
              callbacks: { label: (c) => `${c.label}: ${money(c.parsed)}` },
            },
          },
        }}
      />
    </ClientOnly>
  )
}

/** Grupirani stupci (npr. prihod / nabavna vrijednost / marža po mjesecima). */
export function GroupedChart({
  labels,
  series,
  height = 280,
}: {
  labels: string[]
  series: { label: string; values: number[]; color: string }[]
  height?: number
}) {
  return (
    <ClientOnly height={height}>
      <Bar
        role="img"
        aria-label={series.map((s) => s.label).join(', ')}
        data={{
          labels,
          datasets: series.map((s) => ({
            label: s.label,
            data: s.values,
            backgroundColor: s.color,
            borderRadius: 5,
            maxBarThickness: 18,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                pointStyle: 'rectRounded',
                font: { weight: 600 },
              },
            },
            tooltip: {
              ...tooltip,
              displayColors: true,
              callbacks: {
                label: (c) => `${c.dataset.label}: ${money(c.parsed.y ?? 0)}`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: {
              beginAtZero: true,
              border: { display: false },
              grid: { color: '#efe7dd' },
              ticks: { callback: (v) => `${Number(v) / 1000}k` },
            },
          },
        }}
      />
    </ClientOnly>
  )
}
