"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type ChartFrameSize = {
  width: number;
  height: number;
};

/**
 * Waits for a positive layout measurement before mounting a responsive chart.
 * This keeps the server and first client render identical and prevents
 * Recharts from attempting to render into a transient -1px container.
 */
export default function ClientChartFrame({
  children,
  className,
}: {
  children: (size: ChartFrameSize) => ReactNode;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartFrameSize | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        const nextSize = { width: Math.round(width), height: Math.round(height) };
        setSize((current) =>
          current?.width === nextSize.width && current.height === nextSize.height
            ? current
            : nextSize
        );
      }
    });

    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className={className}>
      {size ? (
        children(size)
      ) : (
        <div
          aria-hidden="true"
          className="h-full w-full animate-pulse bg-[var(--sg-panel-2)]"
        />
      )}
    </div>
  );
}
