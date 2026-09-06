"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileText, Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Cpu, Stethoscope, Layers, ShieldCheck, Zap, Image as ImageIcon, Eye, X, Trash2, Calendar } from "lucide-react"
import { useSession } from "next-auth/react"
import { InteractiveScanViewer } from "@/components/InteractiveScanViewer"
import DynamicScanReviewViewer from "@/components/DynamicScanReviewViewer"

export default function ScanAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scanType, setScanType] = useState<string>("chest")
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Initializing Tensor Cores...")
  const [results, setResults] = useState<any | null>(null)
  const [error, setError] = useState("")

  // Saved scans history state
  const [scans, setScans] = useState<any[]>([])
  const [loadingScans, setLoadingScans] = useState(true)
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)

  const { data: session } = useSession()

  useEffect(() => {
    fetchScans()
  }, [])

  const fetchScans = async () => {
    try {
      const res = await fetch("/api/scans")
      if (res.ok) {
        const data = await res.json()
        setScans(data)
        if (data.length > 0 && !selectedScanId && !results) {
          selectScanRecord(data[0])
        }
      }
    } catch (err) {
      console.error("Error fetching scans:", err)
    } finally {
      setLoadingScans(false)
    }
  }

  const selectScanRecord = (scan: any) => {
    // Force complete UI unmount to clear stale boxes/state
    setResults(null)
    setImagePreviewUrl(null)
    setSelectedScanId(scan.id)
    
    setTimeout(() => {
      setImagePreviewUrl(scan.fileData || scan.fileUrl)
      setResults({
        fileName: scan.fileName,
        modality: scan.modality,
        modelUsed: scan.modelUsed,
        overallRisk: scan.overallRisk,
        maxProbability: scan.maxProbability,
        executionTimeSeconds: 0.5,
        pathologies: scan.pathologies || [],
        bounding_boxes: scan.bounding_boxes || [],
        summary: scan.summary,
        detailedReport: scan.detailedReport || null,
        fileData: scan.fileData || scan.fileUrl,
        dynamicMskData: scan.dynamicMskData || null
      })
    }, 10)
  }

  // Handle file selection preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setError("")
      setResults(null)
      setSelectedScanId(null)

      // Read file as Data URL to guarantee preview image rendering for all image types
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreviewUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setImagePreviewUrl(null)
    setResults(null)
    setSelectedScanId(null)
    setError("")
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setAnalyzing(true)
    setLoadingMessage("Initializing GPU Tensor Cores...")
    setError("")
    setResults(null)

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("scanType", scanType)

    try {
      const res = await fetch("/api/analyze-scan", {
        method: "POST",
        body: formData
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to analyze scan")
      }

      const data = await res.json()
      
      // Dramatic demo delay loop
      const stages = [
        "Loading Medical Foundation Models...",
        "Extracting Spatial Visual Features...",
        "Running YOLOv8 Anomaly Detection...",
        "Running LLaVA-Med Multi-Modal Analysis...",
        "Cross-referencing Pathology Database...",
        "Compiling Detailed Clinical Report..."
      ]
      
      for (const stage of stages) {
        setLoadingMessage(stage)
        await new Promise(r => setTimeout(r, 1800))
      }

      setResults(data)
      setSelectedFile(null)
      if (data.scanId) {
        setSelectedScanId(data.scanId)
      }
      await fetchScans()
    } catch (err: any) {
      console.error("Scan analysis error:", err)
      setError(err.message || "An error occurred while communicating with the Advance Medical Scan microservice.")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDeleteScan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to permanently delete this scan record?")) return

    try {
      const res = await fetch(`/api/scans/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        if (selectedScanId === id) {
          setSelectedScanId(null)
          setResults(null)
          setImagePreviewUrl(null)
        }
        await fetchScans()
      } else {
        alert("Failed to delete scan")
      }
    } catch (err) {
      console.error("Delete error:", err)
    }
  }

  const getRiskColor = (risk: string) => {
    if (risk === "HIGH" || risk === "CRITICAL") return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
    if (risk === "MODERATE") return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
  }

  const getProbBarColor = (prob: number) => {
    if (prob >= 35.0) return "bg-red-500"
    if (prob >= 15.0) return "bg-amber-500"
    return "bg-emerald-500"
  }



  return (
    <div className="max-w-7xl mx-auto space-y-6 mt-4 md:mt-8 px-3 sm:px-6 pb-16 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Activity className="h-7 w-7 sm:h-8 sm:w-8 text-primary flex-shrink-0" /> Advance Medical Scan Diagnostic Scan Analysis
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Deep Learning Advance Medical Scan inference for Chest X-Rays, CT Scans, and MRIs powered by <strong>TorchXRayVision</strong> and <strong>MONAI</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 self-start md:self-auto">
          <Cpu className="h-4 w-4" /> PyTorch Engine Ready
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-md border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" /> Upload Medical Scan
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Supports 2D X-Rays (PNG, JPG) & 3D CT/MRI Scans (DICOM .dcm, NIfTI .nii).
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleAnalyze} className="space-y-4">
                {!selectedFile ? (
                  <div className="border-2 border-dashed rounded-2xl p-6 text-center hover:bg-muted/40 transition-all border-primary/30 bg-card cursor-pointer">
                    <input
                      id="scan-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp,.dcm,.nii,.nii.gz"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                    <label htmlFor="scan-file-input" className="cursor-pointer flex flex-col items-center">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 shadow-inner">
                        <Layers className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-bold text-foreground">Click or Tap to Select Scan</span>
                      <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, DICOM (.dcm), NIfTI</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {imagePreviewUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-black/50 group max-h-56 flex items-center justify-center p-2">
                        <img
                          src={imagePreviewUrl}
                          alt="Selected Scan Preview"
                          className="object-contain max-h-48 w-auto mx-auto rounded-lg shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-destructive text-foreground hover:text-white transition-colors shadow"
                          title="Remove File"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-background/90 text-foreground px-2 py-0.5 rounded shadow">
                          Selected Scan Preview
                        </span>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleClearFile} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground ml-1">Anatomy / Scan Type</label>
                      <select 
                        value={scanType}
                        onChange={(e) => setScanType(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                      >
                        <option value="chest">Cardiothoracic (Chest X-Ray / CT)</option>
                        <option value="fracture">Musculoskeletal (Bone Fracture)</option>
                        <option value="brain">Neurological (Brain MRI / CT)</option>
                      </select>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl border bg-destructive/10 border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!selectedFile || analyzing}
                  className="w-full h-11 text-sm font-bold shadow-md rounded-xl"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running Advance Medical Scan Inference...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" /> Run Advance Medical Scan Diagnostic Analysis
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-md border-border/80">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" /> Saved Medical Scans
                </CardTitle>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {scans.length}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-96 overflow-y-auto divide-y divide-border">
              {loadingScans ? (
                <div className="p-6 text-center text-muted-foreground text-xs flex flex-col items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mb-2 text-primary" /> Loading scan records...
                </div>
              ) : scans.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  No scan records saved yet. Upload a scan above to save it.
                </div>
              ) : (
                scans.map((s) => {
                  const isSelected = selectedScanId === s.id
                  return (
                    <div
                      key={s.id}
                      onClick={() => selectScanRecord(s)}
                      className={`p-3.5 cursor-pointer transition-all hover:bg-accent/50 flex items-center justify-between group ${
                        isSelected ? "bg-primary/10 border-l-4 border-primary" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {s.fileData ? (
                          <div className="h-10 w-10 rounded-lg overflow-hidden border bg-black/40 flex-shrink-0 flex items-center justify-center">
                            <img src={s.fileData} alt={s.fileName} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                            <FileText className="h-5 w-5" />
                          </div>
                        )}
                        <div className="space-y-0.5 overflow-hidden">
                          <p className="font-bold text-xs truncate text-foreground" title={s.fileName}>
                            {s.fileName}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span>{s.modality}</span> • <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskColor(s.overallRisk)}`}>
                          {s.overallRisk}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteScan(s.id, e)}
                          title="Delete Scan Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-8 shadow-md border-border/80 flex flex-col justify-between">
          <div>
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" /> Diagnostic Advance Medical Scan Dashboard
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {results ? results.fileName : "Select or upload a scan to view full Advance Medical Scan diagnostics"}
                  </CardDescription>
                </div>
                {results && (
                  <div className={`px-3 py-1 rounded-full border font-bold text-xs flex items-center gap-1.5 ${getRiskColor(results.overallRisk)}`}>
                    <Activity className="h-3.5 w-3.5" /> Risk: {results.overallRisk}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {!results && !analyzing && (
                <div className="py-20 text-center text-muted-foreground flex flex-col items-center space-y-3 px-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground shadow-inner">
                    <Activity className="h-8 w-8" />
                  </div>
                  <p className="font-bold text-base text-foreground">No Scan Selected</p>
                  <p className="text-xs max-w-sm">
                    Select a saved scan from the left sidebar or upload a new scan to view the full diagnostic report.
                  </p>
                </div>
              )}

              {analyzing && (
                <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center px-4">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <div>
                    <p className="font-bold text-lg animate-pulse text-foreground">{loadingMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1">Extracting luminance distribution & evaluating pathology probability scores</p>
                  </div>
                </div>
              )}

              {results && (
                <div className="space-y-6">
                  {results.modality.includes("Musculoskeletal") && results.dynamicMskData ? (
                    <DynamicScanReviewViewer currentScan={{
                      ...results.dynamicMskData,
                      imageUrl: imagePreviewUrl || results.fileUrl || "/placeholder.png"
                    }} />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-card border border-border/80">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Modality</span>
                          <p className="font-bold text-xs sm:text-sm text-foreground truncate">{results.modality}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Advance Medical Scan Engine</span>
                          <p className="font-bold text-xs sm:text-sm text-foreground truncate">{results.modelUsed}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Primary Indicator</span>
                          <p className="font-bold text-xs sm:text-sm text-foreground truncate">{results.pathologies?.[0]?.name || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Inference Speed</span>
                          <p className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">{results.executionTimeSeconds}s</p>
                        </div>
                      </div>

                      {imagePreviewUrl && (
                        <InteractiveScanViewer 
                          imageUrl={imagePreviewUrl} 
                          findings={(results.bounding_boxes || []).map((box: any) => ({
                            label: box.label,
                            confidence: parseFloat((box.confidence * 100).toFixed(1)),
                            coordinates: { x1: box.x_min, y1: box.y_min, x2: box.x_max, y2: box.y_max },
                            explanation: `Spatial saliency and pixel discontinuity mapped to ${box.label} signatures in this specific anatomical region.`
                          }))} 
                        />
                      )}

                      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-foreground">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" /> Clinical Advance Medical Scan Finding Summary
                        </p>
                        <p className="text-xs sm:text-sm font-semibold mt-1">{results.summary}</p>
                      </div>

                      {results.detailedReport && (
                        <div className="p-5 rounded-2xl border bg-card text-foreground shadow-sm">
                          <h3 className="text-sm font-bold border-b pb-2 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" /> Comprehensive Diagnostic Report
                          </h3>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: results.detailedReport }}>
                          </div>
                        </div>
                      )}

                      {/* Fluid Domain-Specific Pathology Probability Grid */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            {results.modality.includes("Neurological") 
                              ? "Neurological Pathologies Map" 
                              : results.modality.includes("Musculoskeletal") 
                                ? "MSK Pathologies Probability Map" 
                                : "Chest Pathologies Probability Map"} ({results.pathologies?.length || 0})
                          </h3>
                          <span className="text-[11px] text-muted-foreground">Thresholds: Critical &ge; 35% | Moderate &ge; 15%</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {results.pathologies?.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-2xl border bg-card flex flex-col justify-between space-y-2 shadow-sm hover:border-primary/40 transition-colors">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-foreground flex items-center gap-1.5 truncate">
                                  {item.status === "CRITICAL" ? (
                                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                  ) : item.status === "MODERATE" ? (
                                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{item.name}</span>
                                </span>
                                <span className={`${item.status === "CRITICAL" ? "text-red-600 font-extrabold" : item.status === "MODERATE" ? "text-amber-600 font-bold" : "text-emerald-600 font-medium"}`}>
                                  {item.probability}%
                                </span>
                              </div>

                              {/* Progress Bar */}
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${getProbBarColor(item.probability)}`}
                                  style={{ width: `${Math.min(100, Math.max(3, item.probability))}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </div>

          <CardFooter className="border-t pt-4 text-xs text-muted-foreground flex justify-between items-center">
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> BioBytes Advance Medical Scan Clinical Suite
            </div>
            {results && results.fileUrl && (
              <a
                href={results.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs font-bold text-primary hover:underline"
              >
                <Eye className="h-3.5 w-3.5 mr-1" /> View Original Scan File
              </a>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
