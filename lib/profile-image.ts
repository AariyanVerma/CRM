export function toProfileImageSrc(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith("/")) return url
  const i = url.indexOf("/api/profile-image/")
  if (i !== -1) return url.slice(i)
  return url
}
