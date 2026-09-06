import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivitySquare, FileText, LineChart, ShieldCheck, Stethoscope, UploadCloud, TestTube, QrCode, ArrowRight, CheckCircle2, Calendar, Smartphone } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-teal-500/10 via-background to-background">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-50 dark:bg-teal-950/50 px-4 py-1.5 text-sm font-medium text-teal-700 dark:text-teal-300 shadow-sm">
              <Calendar className="mr-2 h-4 w-4 text-emerald-500" />
              <span>Sync Your Health, Worldwide</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter sm:text-5xl">
                Your complete healthcare ecosystem, <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
                  appointments, OCR lab trends & prescriptions.
                </span>
              </h1>
              <p className="mx-auto max-w-[750px] text-muted-foreground md:text-xl">
                Book doctor appointments instantly, upload lab reports for AI 100-test trends, and share secure access codes with your physician.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all bg-emerald-600 hover:bg-emerald-700">
                  <Calendar className="mr-2 h-5 w-5" />
                  Book Appointment Now
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-2">
                  <UploadCloud className="mr-2 h-5 w-5" />
                  Upload your document
                </Button>
              </Link>
              <Link href="/doctor/access">
                <Button size="lg" variant="ghost" className="w-full sm:w-auto h-14 px-6 text-lg rounded-full">
                  <Stethoscope className="mr-2 h-5 w-5 text-teal-600" />
                  Doctor Access Code
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="w-full py-20 bg-slate-50 dark:bg-slate-900/50">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">How QURIX Works</h2>
              <p className="text-muted-foreground">Four simple steps to take control of your health data.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { icon: FileText, title: "1. Upload", desc: "Upload your physical or PDF lab reports." },
                { icon: ActivitySquare, title: "2. Extract", desc: "Our AI instantly parses key biomarkers." },
                { icon: LineChart, title: "3. Track", desc: "Visualize trends over 3, 6, or 12 months." },
                { icon: ShieldCheck, title: "4. Share", desc: "Generate a secure code for your doctor." },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QR Code Feature Marketing */}
        <section className="w-full py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
          <div className="container px-4 md:px-6 max-w-6xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-sm font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                  New Feature
                </div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Instant Hospital Queuing via QR Code.
                </h2>
                <p className="text-primary-foreground/80 text-lg md:text-xl max-w-[600px] leading-relaxed">
                  No more crowded waiting rooms. Patients can simply scan a unique QR code in your hospital lobby to instantly join the doctor's live digital queue.
                </p>
                <ul className="space-y-3 pt-4">
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-emerald-400" /> Real-time queue tracking on patient phones</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-emerald-400" /> Digital queue management for doctors</li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-emerald-400" /> Free infrastructure for partner hospitals</li>
                </ul>
                <div className="pt-6">
                  <Link href="/login">
                    <Button size="lg" className="bg-white text-primary hover:bg-slate-100 font-semibold h-12 px-8 rounded-full">
                      Try the Demo <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="flex justify-center lg:justify-end">
                <div className="relative w-full max-w-sm rounded-2xl glass-panel bg-white/10 border-white/20 p-8 shadow-2xl backdrop-blur-md transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="absolute -top-6 -left-6 bg-emerald-500 p-4 rounded-2xl shadow-lg transform -rotate-12">
                    <QrCode className="h-10 w-10 text-white" />
                  </div>
                  <div className="bg-white p-6 rounded-xl aspect-square flex items-center justify-center shadow-inner">
                    <QrCode className="w-full h-full text-slate-800 opacity-80" />
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="text-xl font-bold text-white">Scan to Book</h3>
                    <p className="text-primary-foreground/70 text-sm mt-1">Dr. Sarah Jenkins • Cardiology</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Personas Section */}
        <section className="w-full py-20">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
                <CardHeader>
                  <ActivitySquare className="h-8 w-8 text-blue-500 mb-2" />
                  <CardTitle>For Patients</CardTitle>
                  <CardDescription>Never lose a medical record again.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Centralized health history</p>
                  <p>• Proactive health alerts</p>
                  <p>• Beautiful trend graphs</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-emerald-500 hover:shadow-md transition-shadow">
                <CardHeader>
                  <Stethoscope className="h-8 w-8 text-emerald-500 mb-2" />
                  <CardTitle>For Doctors</CardTitle>
                  <CardDescription>Instant context without the friction.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Access via temporary codes</p>
                  <p>• Zero registration required</p>
                  <p>• View 12-month patient history instantly</p>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-purple-500 hover:shadow-md transition-shadow">
                <CardHeader>
                  <TestTube className="h-8 w-8 text-purple-500 mb-2" />
                  <CardTitle>For Lab Partners</CardTitle>
                  <CardDescription>Grow your diagnostic business.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Integrated booking links</p>
                  <p>• Commission-based tracking</p>
                  <p>• Direct patient referrals</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
