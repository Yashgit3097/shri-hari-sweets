import React from 'react';

/** Shimmering placeholder block. Shape it with utility classes. */
export default function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return <div aria-hidden="true" className={`skeleton ${rounded} ${className}`} />;
}

/** A few stacked lines of fake text. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          rounded="rounded-md"
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
