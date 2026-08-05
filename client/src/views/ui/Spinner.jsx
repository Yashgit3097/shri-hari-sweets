import React from 'react';

/**
 * Inline loading indicator. Inherits `currentColor`, so it always matches
 * whatever button or label it sits inside.
 */
export default function Spinner({ size = 15, stroke = 2, className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent align-[-2px] ${className}`}
      style={{ width: size, height: size, borderWidth: stroke }}
    />
  );
}
