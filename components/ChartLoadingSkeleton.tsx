import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function ChartLoadingSkeleton({ title = "Loading Health Trends..." }: { title?: string }) {
  return (
    <Card className="overflow-hidden bg-background/60 backdrop-blur-xl border-white/20 shadow-lg animate-pulse">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-muted rounded-md" />
            <div className="h-3.5 w-24 bg-muted/60 rounded-md" />
          </div>
          <div className="h-7 w-32 bg-muted/50 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[240px] w-full flex flex-col justify-end space-y-4">
          <div className="w-full flex items-end justify-between gap-3 h-full pb-2">
            {[40, 65, 30, 85, 55, 90, 70, 45].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-primary/20 to-primary/5 rounded-t-md transition-all"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center pt-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
