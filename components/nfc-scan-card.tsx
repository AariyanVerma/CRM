"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NFCScanCard() {
  const router = useRouter()
  const { toast } = useToast()
  const [scanning, setScanning] = useState(false)
  const [nfcSupported, setNfcSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ndefReaderRef = useRef<any>(null)
  const isSecureContext = typeof window !== "undefined" && window.isSecureContext

  useEffect(() => {
    // Check if Web NFC API is supported
    const checkNFCSupport = () => {
      const isLocalhost = typeof window !== "undefined" && 
        (window.location.hostname === "localhost" || 
         window.location.hostname === "127.0.0.1" ||
         window.location.hostname === "[::1]")
      
      const isHTTPS = typeof window !== "undefined" && window.location.protocol === "https:"
      
      if (!isSecureContext && !isLocalhost) {
        setError("NFC requires a secure connection (HTTPS).")
        return false
      }

      if ("NDEFReader" in window) {
        setNfcSupported(true)
        return true
      } else {
        setError("NFC scanning is not supported in this browser.")
        return false
      }
    }

    if (checkNFCSupport()) {
      // Small delay to ensure component is mounted
      setTimeout(() => {
        startScanning()
      }, 100)
    }

    // Cleanup: stop scanning when component unmounts
    return () => {
      if (ndefReaderRef.current) {
        setScanning(false)
        ndefReaderRef.current = null
      }
    }
  }, [])

  async function startScanning() {
    if (!("NDEFReader" in window)) {
      setError("NDEFReader not available")
      return
    }

    try {
      setScanning(true)
      setError(null)
      const ndef = new (window as any).NDEFReader()
      ndefReaderRef.current = ndef

      console.log("Starting NFC scan...")
      
      // Start scanning - this will wait for a tag to be tapped
      await ndef.scan()
      
      console.log("✓ NFC scan active - ready to read tags")
      console.log("Note: Only NDEF-formatted cards will work (not debit/credit cards)")

      ndef.addEventListener("reading", async (event: any) => {
        try {
          console.log("NFC tag detected!", event)
          console.log("Event details:", {
            message: event.message,
            serialNumber: event.serialNumber,
            type: event.type
          })
          
          const message = event.message
          
          if (!message) {
            console.warn("No message in NFC event - card may not be NDEF formatted")
            toast({
              title: "Card Detected",
              description: "Card detected but not in expected format. This card may not be a membership card.",
              variant: "default",
            })
            setTimeout(() => {
              if (ndefReaderRef.current) {
                startScanning()
              }
            }, 2000)
            return
          }
          
          if (!message.records || message.records.length === 0) {
            console.warn("No records found in NFC message")
            toast({
              title: "Card Detected",
              description: "Card detected but contains no readable data. This may not be a membership card.",
              variant: "default",
            })
            // Restart scanning
            setTimeout(() => {
              if (ndefReaderRef.current) {
                startScanning()
              }
            }, 2000)
            return
          }
          
          console.log(`Found ${message.records.length} record(s) in NFC message`)
          message.records.forEach((record: any, index: number) => {
            console.log(`Record ${index + 1}:`, {
              type: record.recordType,
              mediaType: record.mediaType,
              dataLength: record.data?.byteLength || record.data?.length || 'unknown'
            })
          })

        // Try to decode each record
        for (const record of message.records) {
          try {
            let text = ""

            if (record.recordType === "url") {
              // NDEF URL records: first byte is prefix, rest is URL
              let dataView: DataView
              if (record.data instanceof DataView) {
                dataView = record.data
              } else if (record.data instanceof ArrayBuffer) {
                dataView = new DataView(record.data)
              } else {
                const buffer = new Uint8Array(record.data as any).buffer
                dataView = new DataView(buffer)
              }

              if (dataView.byteLength === 0) continue

              const prefixByte = dataView.getUint8(0)
              const urlBytes = new Uint8Array(
                dataView.buffer,
                dataView.byteOffset + 1,
                dataView.byteLength - 1
              )
              const urlString = new TextDecoder().decode(urlBytes)

              // Common URL prefixes
              const prefixes: { [key: number]: string } = {
                0x01: "http://www.",
                0x02: "https://www.",
                0x03: "http://",
                0x04: "https://",
              }

              text = (prefixes[prefixByte] || "https://") + urlString
            } else if (record.recordType === "text") {
              // NDEF Text records
              let dataView: DataView
              if (record.data instanceof DataView) {
                dataView = record.data
              } else if (record.data instanceof ArrayBuffer) {
                dataView = new DataView(record.data)
              } else {
                const buffer = new Uint8Array(record.data as any).buffer
                dataView = new DataView(buffer)
              }

              if (dataView.byteLength === 0) continue

              const statusByte = dataView.getUint8(0)
              const langCodeLength = statusByte & 0x3f
              if (dataView.byteLength <= 1 + langCodeLength) continue

              const textBytes = new Uint8Array(
                dataView.buffer,
                dataView.byteOffset + 1 + langCodeLength,
                dataView.byteLength - 1 - langCodeLength
              )
              text = new TextDecoder().decode(textBytes)
            } else if (record.recordType === "empty") {
              continue
            } else {
              // Try to decode as plain text
              let dataView: DataView
              if (record.data instanceof DataView) {
                dataView = record.data
              } else if (record.data instanceof ArrayBuffer) {
                dataView = new DataView(record.data)
              } else {
                const buffer = new Uint8Array(record.data as any).buffer
                dataView = new DataView(buffer)
              }

              if (dataView.byteLength === 0) continue
              const textBytes = new Uint8Array(
                dataView.buffer,
                dataView.byteOffset,
                dataView.byteLength
              )
              text = new TextDecoder().decode(textBytes)
            }

            console.log("Decoded text:", text)

            // Extract token from URL (format: /scan/{token} or full URL)
            const urlMatch = text.match(/\/scan\/([a-f0-9]{64})/i)
            if (urlMatch && urlMatch[1]) {
              const token = urlMatch[1]
              console.log("Token extracted from URL:", token)
              setScanning(false)
              toast({
                title: "Card Scanned!",
                description: "Redirecting to transaction page...",
              })
              router.push(`/scan/${token}`)
              return
            }

            // Check if the text itself is a token (64 hex characters)
            const trimmedText = text.trim()
            if (/^[a-f0-9]{64}$/i.test(trimmedText)) {
              console.log("Token found in text:", trimmedText)
              setScanning(false)
              toast({
                title: "Card Scanned!",
                description: "Redirecting to transaction page...",
              })
              router.push(`/scan/${trimmedText}`)
              return
            }
          } catch (e) {
            console.error("Error decoding record:", e)
            continue
          }
        }

          console.warn("Could not extract token from NFC data")
          console.log("All decoded texts from records:", 
            message.records.map((r: any, i: number) => `Record ${i}: ${r.recordType}`)
          )
          toast({
            title: "Card Detected",
            description: "Card detected but doesn't contain a membership token. This may be a different type of card (debit/credit). Please use a membership card or enter token manually.",
            variant: "default",
          })
          // Restart scanning after error
          setTimeout(() => {
            if (ndefReaderRef.current) {
              startScanning()
            }
          }, 3000)
        } catch (readingError: any) {
          console.error("Error processing NFC reading:", readingError)
          toast({
            title: "Reading Error",
            description: "Error processing NFC data. Please try again.",
            variant: "destructive",
          })
          setTimeout(() => {
            if (ndefReaderRef.current) {
              startScanning()
            }
          }, 2000)
        }
      })

      ndef.addEventListener("readingerror", (errorEvent: any) => {
        // Extract error message from various possible locations
        const errorMessage = errorEvent?.message || 
                            errorEvent?.error?.message ||
                            errorEvent?.error?.toString() ||
                            (errorEvent?.error ? String(errorEvent.error) : null)
        
        // Check if error object is empty or has no meaningful content
        const isEmpty = !errorEvent || 
                       (Object.keys(errorEvent).length === 0) ||
                       (!errorMessage || errorMessage.trim().length === 0)
        
        // Empty error objects are normal when card moves away or read is interrupted
        // Do NOT log empty error objects - this is expected behavior
        if (!isEmpty && errorMessage) {
          // Only log meaningful errors
          const isCommonError = errorMessage.includes("timeout") || 
                               errorMessage.includes("abort") ||
                               errorMessage.includes("cancel")
          
          if (!isCommonError) {
            console.warn("NFC reading error:", errorMessage)
            toast({
              title: "Scan Error",
              description: "Failed to read NFC card. Make sure the card is close to the device and try again.",
              variant: "destructive",
            })
          }
        }
        // Empty error = card moved away (normal) - silently restart scanning
        
        // Always restart scanning after error
        setTimeout(() => {
          if (ndefReaderRef.current && scanning) {
            startScanning()
          }
        }, 1000)
      })
    } catch (error: any) {
      console.error("NFC scan error:", error)
      setError(error.message || "Failed to start NFC scan. Make sure NFC is enabled on your device.")
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to start NFC scan. Make sure NFC is enabled on your device.",
        variant: "destructive",
      })
      setScanning(false)
    }
  }

  if (!nfcSupported && !error) {
    return null
  }

  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 text-destructive mb-4 animate-pulse" />
            <h2 className="text-lg font-semibold mb-2 text-destructive">NFC Not Available</h2>
            <p className="text-muted-foreground text-center text-sm max-w-sm">
              NFC scanning is not supported in this browser. Please use the manual entry option below.
            </p>
          </>
        ) : scanning ? (
          <>
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <CreditCard className="w-16 h-16 text-primary relative z-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tap Your Membership Card</h2>
            <p className="text-muted-foreground text-center mb-2">
              Hold your NFC card near the screen
            </p>
            <p className="text-xs text-muted-foreground text-center mb-2">
              Waiting for NFC tag...
            </p>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-2 mt-2">
              <p className="text-xs text-amber-800 dark:text-amber-200 text-center">
                ⚠ <strong>Note:</strong> Debit/credit cards won't work. Only NDEF-formatted membership cards.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startScanning()}
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Restart Scan
            </Button>
          </>
        ) : (
          <>
            <CreditCard className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ready to Scan</h2>
            <p className="text-muted-foreground text-center text-sm mb-4">
              Tap your membership card to start
            </p>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-2 mb-4">
              <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
                ℹ️ <strong>Important:</strong> Only NDEF-formatted membership cards work. Debit/credit cards use a different protocol and won't be detected.
              </p>
            </div>
            <Button
              onClick={() => startScanning()}
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Start NFC Scan
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

