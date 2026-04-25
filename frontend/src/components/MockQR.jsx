import React, { useMemo } from 'react';

/**
 * Tiny deterministic pseudo-QR generator.
 * Renders a grid of black/white cells using a hashed seed of the payload.
 * Not a scannable QR — purely visual for the demo.
 */
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

export default function MockQR({ payload = 'TNG-DEMO', size = 220 }) {
  const cells = 21;
  const cellSize = size / cells;
  const grid = useMemo(() => {
    const r = rng(hash(payload));
    const g = [];
    for (let y = 0; y < cells; y += 1) {
      const row = [];
      for (let x = 0; x < cells; x += 1) {
        const isMarker =
          (x < 7 && y < 7) ||
          (x >= cells - 7 && y < 7) ||
          (x < 7 && y >= cells - 7);
        if (isMarker) {
          const localX = x < 7 ? x : x - (cells - 7);
          const localY = y < 7 ? y : y - (cells - 7);
          const onBorder = localX === 0 || localY === 0 || localX === 6 || localY === 6;
          const inCenter = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
          row.push(onBorder || inCenter ? 1 : 0);
        } else {
          row.push(r() > 0.5 ? 1 : 0);
        }
      }
      g.push(row);
    }
    return g;
  }, [payload]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code">
      <rect x="0" y="0" width={size} height={size} fill="#ffffff" />
      {grid.map((row, y) =>
        row.map((c, x) =>
          c ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
