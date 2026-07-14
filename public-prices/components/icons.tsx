"use client"

import { useId } from "react"

export function IconGold({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffe08a" />
          <stop offset="0.45" stopColor="#c9a227" />
          <stop offset="1" stopColor="#7a5608" />
        </linearGradient>
      </defs>
      <rect x="7" y="20" width="34" height="16" rx="3" fill={`url(#${id})`} />
      <path d="M11 20 L15.5 11 H32.5 L37 20 Z" fill="#f0d78c" />
      <rect x="14" y="25" width="20" height="2.5" rx="1" fill="#fff6d6" opacity="0.55" />
      <circle cx="24" cy="33" r="3.2" fill="#fff1b8" opacity="0.7" />
    </svg>
  )
}

export function IconSilver({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  const id2 = `${id}b`
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cbd5e1" />
          <stop offset="0.35" stopColor="#64748b" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id={id2} x1="10" y1="12" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e2e8f0" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>
      <rect x="9" y="28" width="30" height="10" rx="2" fill={`url(#${id})`} />
      <rect x="11" y="19" width="26" height="10" rx="2" fill={`url(#${id2})`} />
      <rect x="13" y="10" width="22" height="10" rx="2" fill={`url(#${id})`} />
      <text
        x="24"
        y="17.5"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="7"
        fontWeight="700"
        fontFamily="Inter, Arial, sans-serif"
      >
        Ag
      </text>
      <path d="M15 13.5 H33" stroke="#ffffff" strokeWidth="1" opacity="0.45" />
    </svg>
  )
}

export function IconPlatinum({ className = "h-7 w-7" }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bae6fd" />
          <stop offset="0.4" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>
      <path d="M24 6 L40 15.5 V32.5 L24 42 L8 32.5 V15.5 Z" fill={`url(#${id})`} />
      <path
        d="M24 13 L33 18.5 V29.5 L24 35 L15 29.5 V18.5 Z"
        stroke="#e0f2fe"
        strokeWidth="1.8"
        opacity="0.75"
      />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        fill="#f0f9ff"
        fontSize="8"
        fontWeight="800"
        fontFamily="Inter, Arial, sans-serif"
      >
        Pt
      </text>
    </svg>
  )
}

export function IconPhone({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.2 3.8 H5.3 C4.5 3.8 3.8 4.5 3.9 5.3 C4.4 10.6 8.1 14.4 13.4 15 C14.2 15.1 14.9 14.4 14.9 13.6 V11.6 C14.9 11.1 14.6 10.6 14.1 10.4 L12.5 9.9 C12 9.7 11.5 9.9 11.2 10.3 L10.4 11.2 C9 10.4 7.8 9.2 7 7.8 L7.9 7 C8.3 6.6 8.5 6.1 8.3 5.6 L7.8 4 C7.6 3.5 7.1 3.2 6.6 3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(2.2 2.2)"
      />
    </svg>
  )
}
