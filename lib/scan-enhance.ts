




const SHARPEN_AMOUNT = 0.35



export function enhanceClarity(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const src = ctx.getImageData(0, 0, w, h)
  const data = src.data
  const out = new Uint8ClampedArray(data)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const center = data[i + c]
        const blur =
          (data[((y - 1) * w + x) * 4 + c] +
            data[((y + 1) * w + x) * 4 + c] +
            data[(y * w + (x - 1)) * 4 + c] +
            data[(y * w + (x + 1)) * 4 + c]) /
          4
        const v = Math.round(center + SHARPEN_AMOUNT * (center - blur))
        out[i + c] = Math.max(0, Math.min(255, v))
      }
    }
  }
  src.data.set(out)
  ctx.putImageData(src, 0, 0)
}
