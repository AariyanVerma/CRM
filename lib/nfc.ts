export const NFC_APP_RECORD_TYPE = "application/vnd.nygm.card"

export function ndefRecordDataToString(data: string | ArrayBuffer | DataView): string {
  if (typeof data === "string") return data
  const dv = data instanceof DataView ? data : new DataView(data as ArrayBuffer)
  return new TextDecoder().decode(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength))
}
