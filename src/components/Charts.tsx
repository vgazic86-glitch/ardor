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
import { useTheme } from '../lib/theme'

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
  // Nova tema → grafikon se nanovo napravi (Chart.js zadane boje čita samo pri stvaranju).
  const theme = useTheme()
  ChartJS.defaults.color = ct().text
  return (
    <div className="relative w-full" style={{ height }}>
      {ready ? (
        <div key={theme} className="h-full w-full">
          {children}
        </div>
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
  useTheme() // ponovo iscrtaj grafikon kad se promijeni svijetli/tamni način
  ChartJS.defaults.color = ct().text
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
                  : ct().ink,
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
              grid: { color: ct().grid },
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
  useTheme() // ponovo iscrtaj grafikon kad se promijeni svijetli/tamni način
  ChartJS.defaults.color = ct().text
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
              grid: { color: ct().grid },
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

/** Boje grafikona prema temi (čita se pri iscrtavanju). */
function ct() {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  return dark
    ? { ink: '#c9b8a8', grid: '#3d3129', text: '#d6c7b8', paper: '#1e1814' }
    : { ink: '#3d2f26', grid: '#efe7dd', text: '#5a463a', paper: '#fbf8f3' }
}

export const categoryColors = [
  '#6f5a4c',
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
  useTheme() // ponovo iscrtaj grafikon kad se promijeni svijetli/tamni način
  ChartJS.defaults.color = ct().text
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
              borderColor: ct().paper,
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
  useTheme() // ponovo iscrtaj grafikon kad se promijeni svijetli/tamni način
  ChartJS.defaults.color = ct().text
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
              grid: { color: ct().grid },
              ticks: { callback: (v) => `${Number(v) / 1000}k` },
            },
          },
        }}
      />
    </ClientOnly>
  )
}
