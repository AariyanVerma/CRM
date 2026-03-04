import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { HomeMetalTickers } from "@/components/home-metal-tickers"
import { LiveDateTime } from "@/components/live-date-time"

export function HomePageContent() {
  return (
    <div className="space-y-6">
      <LiveDateTime />
      <Card className="border-2 overflow-hidden">
        <CardHeader className="px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg truncate">
              Today&apos;s Metal Prices (per oz)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <HomeMetalTickers />
        </CardContent>
      </Card>
    </div>
  )
}
