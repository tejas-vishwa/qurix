"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Search, FileX, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts'
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

const TIME_FILTERS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 120 }
]

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Sub-component for individual chart card to manage its own time filter state
function TrendChartCard({ trend, session }: { trend: any, session: any }) {
  const [timeFilter, setTimeFilter] = useState<number>(6) // Default 6M

  // Filter history based on local time filter
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - timeFilter)
  
  const filteredHistory = trend.history.filter((d: any) => new Date(d.testDate || d.date) >= cutoffDate)

  // Custom Dot renderer
  const CustomDot = (props: any) => {
    const { cx, cy, value, payload } = props
    if (cx == null || cy == null) return null

    const isHigh = trend.refMax !== null && value > trend.refMax
    const isLow = trend.refMin !== null && value < trend.refMin
    
    let fill = "#10b981" // Normal (Green)
    if (isHigh || isLow) fill = "#ef4444" // Abnormal (Red)

    return (
      <circle cx={cx} cy={cy} r={props.active ? 6 : 4} stroke="white" strokeWidth={2} fill={fill} />
    )
  }

  return (
    <Card id={`card-${trend.code}`} className="overflow-hidden bg-background/60 backdrop-blur-xl border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-primary">{trend.name}</CardTitle>
            <CardDescription className="font-medium mt-1">
              {trend.category}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
              {TIME_FILTERS.map(filter => (
                <button
                  key={filter.label}
                  onClick={() => setTimeFilter(filter.months)}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                    timeFilter === filter.months ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              {trend.refMin !== null && trend.refMax !== null && (
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Reference Range</span>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900">
                    {trend.refMin} - {trend.refMax} {trend.unit}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredHistory.length > 0 ? (
          <div className="h-[280px] w-full p-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredHistory}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="id" 
                  tickFormatter={(id) => {
                    const point = filteredHistory.find((d: any) => d.id === id)
                    return point ? formatDate(point.testDate || point.date) : ''
                  }}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={[
                    (dataMin: number) => {
                      const minVal = isNaN(dataMin) || dataMin === Infinity || dataMin === -Infinity ? 0 : dataMin;
                      let minBound = minVal;
                      if (trend.refMin !== null && trend.refMin !== undefined) {
                        minBound = Math.min(minVal, trend.refMin);
                      }
                      if (minBound >= 0 && minBound <= 30) {
                        return 0;
                      }
                      return Math.max(0, Math.floor(minBound * 0.85));
                    },
                    (dataMax: number) => {
                      const maxVal = isNaN(dataMax) || dataMax === Infinity || dataMax === -Infinity ? 10 : dataMax;
                      let maxBound = maxVal;
                      if (trend.refMax !== null && trend.refMax !== undefined) {
                        maxBound = Math.max(maxVal, trend.refMax);
                      }
                      return Math.ceil(Math.max(maxBound * 1.15, maxBound + 2));
                    }
                  ]}
                  tickFormatter={(val: number) => {
                    if (isNaN(val)) return ''
                    const num = Number(val)
                    return Number.isInteger(num) ? num.toString() : num.toFixed(1)
                  }}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      const exactDate = new Date(data.testDate || data.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                      
                      const val = data.value
                      let status = "Normal / Optimal"
                      let statusColor = "text-emerald-500"
                      let Icon = CheckCircle2
                      let diffText = ""

                      if (trend.refMax !== null && val > trend.refMax) {
                        status = "Elevated (High)"
                        statusColor = "text-red-500"
                        Icon = TrendingUp
                        const diff = (val - trend.refMax).toFixed(1)
                        diffText = `${diff} ${trend.unit} above maximum`
                      } else if (trend.refMin !== null && val < trend.refMin) {
                        status = "Critical Low"
                        statusColor = "text-red-500"
                        Icon = TrendingDown
                        const diff = (trend.refMin - val).toFixed(1)
                        diffText = `${diff} ${trend.unit} below minimum`
                      }

                      return (
                        <div className="bg-background/95 backdrop-blur-md p-4 border border-border/50 rounded-xl shadow-xl min-w-[200px]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-muted-foreground">{exactDate}</span>
                            <span className={`flex items-center text-xs font-bold ${statusColor}`}>
                              <Icon className="h-3 w-3 mr-1" /> {status}
                            </span>
                          </div>
                          
                          <div className="flex items-end gap-1 mb-2">
                            <span className="text-3xl font-extrabold text-foreground">{val}</span>
                            <span className="text-sm font-medium text-muted-foreground mb-1">{trend.unit}</span>
                          </div>
                          
                          {diffText && (
                            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[11px] px-2 py-1 rounded font-medium border border-red-100 dark:border-red-900 mb-2">
                              {diffText}
                            </div>
                          )}

                          <a 
                            href={`https://www.google.com/search?q=What+causes+${status.toLowerCase().includes('high') ? 'high' : 'low'}+${trend.name}`}
                            target="_blank"
                            rel="noopener noreferrer" 
                            className="text-[10px] font-semibold text-blue-500 hover:underline flex items-center mt-2 pt-2 border-t border-border/50"
                          >
                            What causes {status.toLowerCase().includes('high') ? 'high' : 'low'} {trend.name}?
                          </a>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                {trend.refMin !== null && trend.refMax !== null && (
                  <ReferenceArea 
                    y1={trend.refMin} 
                    y2={trend.refMax} 
                    fill="#10b981" 
                    fillOpacity={0.08} 
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  activeDot={<CustomDot active />}
                  dot={<CustomDot />}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state-chart h-[280px] w-full p-4 relative flex items-center justify-center">
            <div className="absolute inset-0 p-4 opacity-20 pointer-events-none grayscale">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{ id: 1, value: trend.refMax || 100 }, { id: 2, value: trend.refMin || 0 }]} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="id" tick={false} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(val: number) => `${Math.round(Number(val))}`} allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={50} />
                  <Line type="monotone" dataKey="value" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="z-10 flex flex-col items-center justify-center p-6 text-center bg-background/60 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm max-w-[80%]">
              <div className="h-12 w-12 rounded-full bg-muted/80 flex items-center justify-center mb-3 shadow-inner">
                <FileX className="h-6 w-6 text-muted-foreground/70" />
              </div>
              <h3 className="font-semibold text-foreground/90 mb-1 text-sm">No historical data in this period</h3>
              <p className="text-xs text-muted-foreground max-w-[200px] mb-4">
                Select a different time range or upload a report.
              </p>
              <Link href="/patient/upload">
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-full shadow-sm hover:shadow-md transition-all bg-background/50">
                  Upload Report
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PatientTrendsDashboard({ accessCode }: { accessCode?: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchTrends() {
      setLoading(true)
      // Always fetch all data (120 months / 10 years) so local filtering works beautifully
      const url = accessCode 
        ? `/api/metrics/trends?months=120&accessCode=${accessCode}`
        : `/api/metrics/trends?months=120`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTrends(data)
      }
      setLoading(false)
    }
    fetchTrends()
  }, [accessCode])

  const categories = ["All", ...Array.from(new Set(trends.map(t => t.category)))]

  const filteredTrends = trends.filter(t => {
    if (t.history.length === 0) return false;
    const matchesCategory = activeCategory === "All" || t.category === activeCategory
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // PDF Generation functions remain exactly as before
  const generatePDF = () => {
    setGeneratingPdf(true)
    try {
      // Instead of slow client-side html2canvas rendering, open the premium 
      // QURIX Plus Executive HTML template which natively triggers the print dialog.
      window.open('/api/qurix-plus-report', '_blank')
    } catch (err: any) {
      console.error("PDF generation failed:", err)
      alert(`PDF Generation Note: ${err?.message || "Failed to generate PDF. Please try again."}`)
    } finally {
      // Small timeout to let the UI show "Generating..." briefly before resetting
      setTimeout(() => setGeneratingPdf(false), 1000)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Trends</h1>
          <p className="text-muted-foreground">Visualize your biomarker changes over time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={generatePDF} 
            disabled={loading || generatingPdf || trends.filter(t => t.history.length > 0).length === 0}
            className="flex items-center gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            {generatingPdf ? "Generating..." : "Download Report"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search all 100 tests (e.g., Hemoglobin, SGPT, Calcium)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-background/50 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm backdrop-blur-md border ${
                activeCategory === cat 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background/60 text-muted-foreground hover:bg-muted/80 border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading your health data...</p>
        </div>
      ) : filteredTrends.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-background/50 backdrop-blur-sm">
          No tests found matching your search.
        </div>
      ) : (
        <div id="charts-container" className="grid gap-6 p-2 md:grid-cols-2">
          {filteredTrends.map((trend) => (
            <TrendChartCard 
              key={trend.code} 
              trend={trend} 
              session={session} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
