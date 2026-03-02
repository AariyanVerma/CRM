import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, DollarSign } from "lucide-react"
import { HomeMetalTickers } from "@/components/home-metal-tickers"

export async function HomePageContent() {

  const now = new Date()
  const currentDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const currentTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="space-y-6">
      {
}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold">{currentDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold">{currentTime}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {
}
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
