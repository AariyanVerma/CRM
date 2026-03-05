export const NFC_APP_RECORD_TYPE = "application/vnd.nygm.card"

export function ndefRecordDataToString(data: string | ArrayBuffer | DataView): string {
  if (typeof data === "string") return data
  const dv = data instanceof DataView ? data : new DataView(data as ArrayBuffer)
  return new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength))
}

export type ParsedNfcCard = { type: "scan"; token: string } | { type: "login"; slug: string }

export function parseNfcCardFromUrl(urlString: string): ParsedNfcCard | null {
  try {
    const scanMatch = urlString.match(/\/scan\/([a-zA-Z0-9]+)/)
    if (scanMatch && scanMatch[1]) return { type: "scan", token: scanMatch[1] }
    const u = new URL(urlString)
    const card = u.searchParams.get("card")
    if (card && /^[a-zA-Z0-9]{8,64}$/.test(card)) return { type: "login", slug: card }
    const loginMatch = urlString.match(/\/login\/c\/([a-zA-Z0-9]+)/)
    if (loginMatch && loginMatch[1]) return { type: "login", slug: loginMatch[1] }
    if (/^[a-zA-Z0-9]{8,64}$/.test(urlString.trim())) return { type: "scan", token: urlString.trim() }
    return null
  } catch {
    return null
  }
}
