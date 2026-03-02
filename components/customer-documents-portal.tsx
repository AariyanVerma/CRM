"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { FileUp, Camera, FileText, Trash2, Loader2, Download, Eye, Plus, X } from "lucide-react"
import { jsPDF } from "jspdf"
import { enhanceClarity } from "@/lib/scan-enhance"

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.*,text/plain,text/csv"

type DocSummary = { id: string; name: string; mimeType: string; size: number; uploadedAt: string }

export interface CustomerDocumentsPortalProps {
  customerId: string
  canManage?: boolean
}

export function CustomerDocumentsPortal({ customerId, canManage = false }: CustomerDocumentsPortalProps) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [accumulatedPages, setAccumulatedPages] = useState<Blob[]>([])
  const [savingPdf, setSavingPdf] = useState(false)

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/documents`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load documents")
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Could not load documents", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [customerId, toast])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files)
    if (!list.length) return
    setUploading(true)
    try {
      const form = new FormData()
      list.forEach((f) => form.append("file", f))
      const res = await fetch(`/api/customers/${customerId}/documents`, {
        method: "POST",
        body: form,
        credentials: "include",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || "Upload failed")
      }
      await loadDocuments()
      toast({ title: "Uploaded", description: `${list.length} file(s) saved.`, variant: "success" })
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) uploadFiles(files)
  }

  const startScan = async () => {
    setShowScanner(true)
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (e) {
      toast({ title: "Camera error", description: e instanceof Error ? e.message : "Could not access camera", variant: "destructive" })
      setShowScanner(false)
    } finally {
      setScanning(false)
    }
  }

  const stopScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setShowScanner(false)
  }

  const captureToPreview = () => {
    const video = videoRef.current
    if (!video || !video.srcObject) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    enhanceClarity(canvas)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stopScan()
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setPreviewBlob(blob)
        setShowPreview(true)
      },
      "image/png",
      1
    )
  }

  const closePreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewBlob(null)
    setShowPreview(false)
    setAccumulatedPages([])
  }, [previewUrl])

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String((r.result as string) ?? ""))
      r.onerror = reject
      r.readAsDataURL(blob)
    })

  const createPdfFromBlobs = async (blobs: Blob[]): Promise<Blob> => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW = 210
    const pageH = 297
    for (let i = 0; i < blobs.length; i++) {
      if (i > 0) pdf.addPage()
      const dataUrl = await blobToBase64(blobs[i])
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = dataUrl
      })
      const imgW = img.naturalWidth
      const imgH = img.naturalHeight
      const scale = Math.min(pageW / imgW, pageH / imgH)
      const drawW = imgW * scale
      const drawH = imgH * scale
      const x = (pageW - drawW) / 2
      const y = (pageH - drawH) / 2
      pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH)
    }
    return pdf.output("blob")
  }

  const handleSaveFromPreview = async () => {
    if (!previewBlob) return
    const allPages = [...accumulatedPages, previewBlob]
    setSavingPdf(true)
    try {
      if (allPages.length === 1) {
        const file = new File([allPages[0]], `scan-${Date.now()}.png`, { type: "image/png" })
        await uploadFiles([file])
      } else {
        const pdfBlob = await createPdfFromBlobs(allPages)
        const file = new File([pdfBlob], `scan-${Date.now()}.pdf`, { type: "application/pdf" })
        await uploadFiles([file])
      }
      closePreview()
      toast({ title: "Saved", description: allPages.length > 1 ? "Document saved as PDF." : "Scan saved.", variant: "success" })
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    } finally {
      setSavingPdf(false)
    }
  }

  const handleDiscardPreview = () => {
    closePreview()
    toast({ title: "Discarded", description: "Scan not saved.", variant: "default" })
  }

  const handleAddMorePages = () => {
    if (!previewBlob) return
    setAccumulatedPages((prev) => [...prev, previewBlob])
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewBlob(null)
    setShowPreview(false)
    toast({ title: "Page added", description: "Position next page and capture.", variant: "default" })
    startScan()
  }

  const deleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Delete failed")
      await loadDocuments()
      toast({ title: "Deleted", description: "Document removed.", variant: "success" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Could not delete", variant: "destructive" })
    }
  }

  const documentUrl = (docId: string, inline = false) =>
    `/api/customers/${customerId}/documents/${docId}${inline ? "?inline=1" : ""}`

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Customer Documents
        </CardTitle>
        <CardDescription>
          {canManage
            ? "Upload or scan documents and store them under this customer. You can manage and delete."
            : "Documents stored for this customer. You can view and download."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        )}

        {canManage && !showScanner && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
              Upload files
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={startScan} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
              Scan document
            </Button>
          </div>
        )}

        {canManage && showScanner && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex-1 relative flex items-center justify-center min-h-0">
              <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full w-full h-full object-contain" />
            </div>
            <div className="p-4 flex gap-3 justify-center bg-black/90 border-t border-white/10">
              <Button size="lg" onClick={captureToPreview}>
                <Camera className="h-5 w-5 mr-2" />
                Capture
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={stopScan}
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <X className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {canManage && showPreview && previewUrl && previewBlob && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 overflow-auto">
              <p className="text-white/90 text-sm mb-2">
                Review your scan. Save as single image, or add more pages to create a PDF.
              </p>
              <img src={previewUrl} alt="Scan preview" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" />
              {accumulatedPages.length > 0 && (
                <p className="text-white/80 text-sm mt-2">
                  {accumulatedPages.length} page(s) added. This will be page {accumulatedPages.length + 1} in the PDF.
                </p>
              )}
            </div>
            <div className="p-4 flex flex-wrap gap-3 justify-center bg-black/90 border-t border-white/10">
              <Button size="lg" onClick={handleSaveFromPreview} disabled={savingPdf}>
                {savingPdf ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Download className="h-5 w-5 mr-2" />}
                {accumulatedPages.length === 0 ? "Save this scan" : "Save as PDF"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleAddMorePages}
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add more pages
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleDiscardPreview}
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <X className="h-5 w-5 mr-2" />
                Discard
              </Button>
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2">Saved documents ({documents.length})</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet. Upload or scan to add.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/50 text-sm"
                >
                  <span className="truncate flex-1" title={doc.name}>
                    {doc.name}
                  </span>
                  <span className="text-muted-foreground shrink-0">{formatSize(doc.size)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={documentUrl(doc.id, true)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-primary hover:underline"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    <a
                      href={documentUrl(doc.id)}
                      download={doc.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-primary hover:underline"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteDoc(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
