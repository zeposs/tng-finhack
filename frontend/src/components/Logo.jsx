import React from 'react';

/**
 * Inline SVG recreation of the "Talk 'n Go eWallet" badge logo.
 * Avoids any binary asset dependency so the demo works on any clone.
 */
export default function Logo({ size = 56, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 0.84}
      viewBox="0 0 200 168"
      role="img"
      aria-label="Talk 'n Go eWallet"
      className={className}
    >
      <defs>
        <linearGradient id="tngBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E78D2" />
          <stop offset="100%" stopColor="#0F3F7E" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="188" height="156" rx="28" fill="url(#tngBlue)" />
      <rect
        x="14"
        y="14"
        width="172"
        height="140"
        rx="22"
        fill="none"
        stroke="#FFD400"
        strokeWidth="4"
      />
      <text
        x="100"
        y="72"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="800"
        fontSize="40"
        fill="#FFFFFF"
        letterSpacing="-1"
      >Talk</text>
      <text
        x="100"
        y="108"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontStyle="italic"
        fontWeight="800"
        fontSize="34"
        fill="#FFFFFF"
        letterSpacing="-1"
      >'n GO</text>
      <text
        x="100"
        y="142"
        textAnchor="middle"
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#FFD400"
      >eWallet</text>
    </svg>
  );
}
