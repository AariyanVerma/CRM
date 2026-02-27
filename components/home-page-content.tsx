import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDecimal } from "@/lib/utils"
import { Calendar, Clock, DollarSign } from "lucide-react"

export async function HomePageContent() {
  // Get today's prices (with error handling for build time)
  let todayPrice = null
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    todayPrice = await prisma.dailyPrice.findFirst({
      where: {
        date: { lte: today },
      },
      orderBy: { date: "desc" },
    })
  } catch (error) {
    // Silently fail during build or if database is unavailable
    console.error("Error fetching daily prices:", error)
    todayPrice = null
  }

  // Get current date and time
  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return (
    <div className="space-y-6">
      {/* Current Date & Time */}
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

      {/* Metal Prices */}
      {todayPrice && (
        <Card className="border-2 overflow-hidden">
          <CardHeader className="px-3 sm:px-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <CardTitle className="text-base sm:text-lg truncate">Today&apos;s Metal Prices (per oz)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 min-w-0 overflow-hidden">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Gold</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600 break-words overflow-wrap-anywhere">${formatDecimal(todayPrice.gold)}</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-gradient-to-br from-gray-400/10 to-gray-500/5 border border-gray-400/20 min-w-0 overflow-hidden">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Silver</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-600 break-words overflow-wrap-anywhere">${formatDecimal(todayPrice.silver)}</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 min-w-0 overflow-hidden">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Platinum</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 break-words overflow-wrap-anywhere">${formatDecimal(todayPrice.platinum)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


