"use client"

import { useState } from "react"
import Image from "next/image"

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
  priority?: boolean
}

export function UserAvatar({
  src,
  name,
  size = 40,
  className = "",
  priority = false,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false)

  // Generate deterministic medical avatar fallback via WebP-compatible edge URL
  const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "User")}&backgroundColor=059669,0284c7,4f46e5`

  if (src && !hasError) {
    return (
      <div
        className={`relative inline-block rounded-full overflow-hidden border border-border/40 shadow-sm shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={name || "User avatar"}
          width={size}
          height={size}
          priority={priority}
          sizes={`${size}px`}
          className="object-cover rounded-full"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }

  // Next.js Image with Edge-cached Dicebear SVG/WebP fallback
  return (
    <div
      className={`relative inline-block rounded-full overflow-hidden border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40 shadow-sm shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={fallbackAvatarUrl}
        alt={name || "User initials"}
        width={size}
        height={size}
        priority={priority}
        sizes={`${size}px`}
        className="object-cover rounded-full"
        onError={() => setHasError(true)}
      />
    </div>
  )
}
