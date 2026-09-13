// Minimal inline icon set (stroke-based), matching the restrained
// graphite visual language. Uses currentColor so icons inherit tone.

import type { CSSProperties, ReactNode } from 'react'

interface IconProps {
  className?: string
  style?: CSSProperties
}

const SV = (props: IconProps & { children: ReactNode }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={props.style}
  >
    {props.children}
  </svg>
)

export const Icon = {
  Dashboard: (p: IconProps) => (
    <SV {...p}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
      <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    </SV>
  ),
  Building: (p: IconProps) => (
    <SV {...p}>
      <path d="M4 21V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v15" />
      <path d="M17 21V10h2a1 1 0 0 1 1 1v10" />
      <path d="M2 21h20" />
      <path d="M8 7h3M8 11h3M8 15h3" />
    </SV>
  ),
  Clipboard: (p: IconProps) => (
    <SV {...p}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
      <path d="M9 12h6M9 16h6M9 8h2" />
    </SV>
  ),
  Warning: (p: IconProps) => (
    <SV {...p}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4M12 17.2v.1" />
    </SV>
  ),
  Shield: (p: IconProps) => (
    <SV {...p}>
      <path d="M12 3 20 6v6c0 5-3.5 8.4-8 9-4.5-.6-8-4-8-9V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </SV>
  ),
  Scale: (p: IconProps) => (
    <SV {...p}>
      <path d="M12 3v18" />
      <path d="M4 7h16" />
      <path d="M7 4.5 4 7l4.5 6a3.5 3.5 0 0 0 7 0L20 7l-3-2.5" />
    </SV>
  ),
  Sparkles: (p: IconProps) => (
    <SV {...p}>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
      <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </SV>
  ),
  Search: (p: IconProps) => (
    <SV {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </SV>
  ),
  Plus: (p: IconProps) => (
    <SV {...p}>
      <path d="M12 5v14M5 12h14" />
    </SV>
  ),
  ChevronDown: (p: IconProps) => (
    <SV {...p}>
      <path d="m6 9 6 6 6-6" />
    </SV>
  ),
  ChevronRight: (p: IconProps) => (
    <SV {...p}>
      <path d="m9 6 6 6-6 6" />
    </SV>
  ),
  ChevronLeft: (p: IconProps) => (
    <SV {...p}>
      <path d="m15 6-6 6 6 6" />
    </SV>
  ),
  ArrowRight: (p: IconProps) => (
    <SV {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </SV>
  ),
  Close: (p: IconProps) => (
    <SV {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </SV>
  ),
  Check: (p: IconProps) => (
    <SV {...p}>
      <path d="m5 12 5 5 9-11" />
    </SV>
  ),
  X: (p: IconProps) => (
    <SV {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </SV>
  ),
  Menu: (p: IconProps) => (
    <SV {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </SV>
  ),
  Logout: (p: IconProps) => (
    <SV {...p}>
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M14 8l4 4-4 4M18 12H9" />
    </SV>
  ),
  Filter: (p: IconProps) => (
    <SV {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </SV>
  ),
  Info: (p: IconProps) => (
    <SV {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.1" />
    </SV>
  ),
  AlertCircle: (p: IconProps) => (
    <SV {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v6M12 16.2v.1" />
    </SV>
  ),
  MapPin: (p: IconProps) => (
    <SV {...p}>
      <path d="M12 21s-6.5-5-6.5-10a6.5 6.5 0 0 1 13 0c0 5-6.5 10-6.5 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </SV>
  ),
  Calendar: (p: IconProps) => (
    <SV {...p}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </SV>
  ),
  Clock: (p: IconProps) => (
    <SV {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </SV>
  ),
  User: (p: IconProps) => (
    <SV {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.6-3.4 4.2-5 7.5-5s5.9 1.6 7.5 5" />
    </SV>
  ),
  File: (p: IconProps) => (
    <SV {...p}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M13 3v5h5" />
    </SV>
  ),
  Upload: (p: IconProps) => (
    <SV {...p}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </SV>
  ),
  Target: (p: IconProps) => (
    <SV {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </SV>
  ),
  Layers: (p: IconProps) => (
    <SV {...p}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16.5 9 5 9-5" />
    </SV>
  ),
  Send: (p: IconProps) => (
    <SV {...p}>
      <path d="m3 4 18 8-18 8 4-8-4-8Z" />
      <path d="M7 12h14" />
    </SV>
  ),
  Edit: (p: IconProps) => (
    <SV {...p}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </SV>
  ),
  Trash: (p: IconProps) => (
    <SV {...p}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </SV>
  ),
  Eye: (p: IconProps) => (
    <SV {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </SV>
  ),
  TrendingUp: (p: IconProps) => (
    <SV {...p}>
      <path d="m3 16 6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </SV>
  ),
  Hash: (p: IconProps) => (
    <SV {...p}>
      <path d="M9 3 8 21M16 3l-1 18M4 8h17M3 16h17" />
    </SV>
  ),
}

export type IconName = keyof typeof Icon