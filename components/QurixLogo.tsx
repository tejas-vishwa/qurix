import React from "react"

interface QurixLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showTagline?: boolean
}

export function QurixLogo({ className = "h-8 w-auto", size, showTagline = false, ...props }: QurixLogoProps) {
  return (
    <div className="inline-flex items-center gap-3 select-none">
      <svg
        viewBox="0 0 520 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        {/* --- CIRCUIT LINES (LEFT SIDE - CONNECTED TO Q) --- */}
        <g className="text-[#00A896] stroke-current" strokeWidth="2.5" strokeLinecap="round">
          {/* Top Left Branch */}
          <path d="M 45 42 L 20 42 L 10 30 L 2 30" />
          <circle cx="2" cy="30" r="3" fill="currentColor" />
          
          {/* Upper Middle Branch */}
          <path d="M 38 58 L 15 58 L 5 50" />
          <circle cx="5" cy="50" r="3" fill="currentColor" />

          {/* Center Left Branch */}
          <path d="M 35 70 L 12 70 L 2 70" />
          <circle cx="2" cy="70" r="3.5" fill="currentColor" />

          {/* Lower Middle Branch */}
          <path d="M 38 82 L 18 82 L 8 92" />
          <circle cx="8" cy="92" r="3" fill="currentColor" />

          {/* Bottom Left Branch */}
          <path d="M 48 98 L 22 98 L 12 110 L 2 110" />
          <circle cx="2" cy="110" r="3" fill="currentColor" />
          
          {/* Inner Q Circuit Dots */}
          <circle cx="55" cy="55" r="2.5" fill="currentColor" />
          <path d="M 55 55 L 70 55" strokeDasharray="2 2" />
          <circle cx="70" cy="55" r="2" fill="currentColor" />
        </g>

        {/* --- LETTER Q --- */}
        {/* Navy Ring Body with Theme Awareness */}
        <path
          d="M 85 25 C 55 25 35 45 35 70 C 35 95 55 115 85 115 C 98 115 110 110 118 100 L 106 88 C 101 95 93 98 85 98 C 69 98 54 85 54 70 C 54 55 69 42 85 42 C 101 42 114 54 115 70 H 134 C 133 44 112 25 85 25 Z"
          className="fill-[#0F2537] dark:fill-[#38BDF8] transition-colors duration-200"
        />
        
        {/* Q Tail Swoosh (Teal) */}
        <path
          d="M 92 78 L 115 118 C 117 122 122 124 127 123 L 132 120 C 136 118 137 112 134 108 L 110 70 Z"
          fill="#00A896"
        />
        <circle cx="104" cy="88" r="3" fill="#ffffff" />

        {/* --- LETTERS U, R, I (TEAL / CYAN) --- */}
        <g fill="#00A896">
          {/* LETTER U */}
          <path d="M 152 30 V 82 C 152 98 164 112 182 112 C 200 112 212 98 212 82 V 30 H 194 V 82 C 194 90 188 96 182 96 C 176 96 170 90 170 82 V 30 H 152 Z" />

          {/* LETTER R */}
          <path d="M 230 30 V 110 H 248 V 78 H 262 L 276 110 H 296 L 280 74 C 290 69 296 59 296 46 C 296 35 285 30 268 30 H 230 Z M 248 46 H 266 C 272 46 277 49 277 55 C 277 61 272 64 266 64 H 248 V 46 Z" />

          {/* LETTER I */}
          <path d="M 314 30 H 332 V 110 H 314 Z" />
        </g>

        {/* --- LETTER X (EMERALD GREEN WITH ARROW & CIRCUITS) --- */}
        <g>
          {/* Main Backslash Bar with Arrow Head */}
          <path
            d="M 356 110 L 418 36 L 434 46 L 372 120 Z"
            fill="#00A859"
          />
          
          {/* Arrow Top Extension */}
          <path
            d="M 405 45 L 438 18 L 442 48 L 430 42 L 405 45 Z"
            fill="#00A859"
          />
          {/* Arrow Head Tip */}
          <path
            d="M 420 12 L 452 24 L 436 50 Z"
            fill="#00A859"
          />

          {/* Crossing Forward-slash Bar */}
          <path
            d="M 425 110 L 365 30 H 384 L 444 110 H 425 Z"
            fill="#00A859"
          />

          {/* --- CIRCUIT LINES (RIGHT SIDE - CONNECTED TO X) --- */}
          <g className="text-[#00A859] stroke-current" strokeWidth="2.5" strokeLinecap="round">
            {/* Top Right Branch */}
            <path d="M 430 38 L 460 38 L 475 28 L 490 28" />
            <circle cx="490" cy="28" r="3" fill="currentColor" />

            {/* Upper Right Branch */}
            <path d="M 438 52 L 470 52 L 485 45 L 500 45" />
            <circle cx="500" cy="45" r="3" fill="currentColor" />

            {/* Center Right Branch */}
            <path d="M 440 68 L 475 68 L 512 68" />
            <circle cx="512" cy="68" r="3.5" fill="currentColor" />

            {/* Lower Right Branch */}
            <path d="M 436 84 L 468 84 L 482 95 L 498 95" />
            <circle cx="498" cy="95" r="3" fill="currentColor" />

            {/* Bottom Right Branch */}
            <path d="M 430 98 L 455 98 L 470 112 L 495 112" />
            <circle cx="495" cy="112" r="3" fill="currentColor" />
          </g>
        </g>
      </svg>
      
      {showTagline && (
        <span className="hidden xl:inline-block text-xs font-semibold tracking-wider text-muted-foreground uppercase border-l border-border pl-3">
          Health Ecosystem
        </span>
      )}
    </div>
  )
}
