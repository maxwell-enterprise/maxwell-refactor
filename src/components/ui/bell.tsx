"use client";
/** From registry: `pnpm dlx shadcn@latest add "https://lucide-animated.com/r/bell.json"` — not `shadcn add @lucide-animated` (missing on ui.shadcn.com). */

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import { cn } from "@/lib/utils";

export interface BellIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BellIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  /** When true, shakes in a loop (shake → pause 1s → repeat). Hover animation is disabled. */
  alertLoop?: boolean;
}

const SVG_VARIANTS: Variants = {
  normal: { rotate: 0 },
  animate: { rotate: [0, -10, 10, -10, 0] },
};

const BellIcon = forwardRef<BellIconHandle, BellIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      alertLoop = false,
      ...props
    },
    ref
  ) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    useEffect(() => {
      if (!alertLoop) return;

      let cancelled = false;
      const run = async () => {
        while (!cancelled) {
          await controls.start({
            rotate: [0, -10, 10, -10, 0],
            transition: { duration: 0.55, ease: "easeInOut" },
          });
          if (cancelled) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
      };
      void run();
      return () => {
        cancelled = true;
      };
    }, [alertLoop, controls]);

    useEffect(() => {
      if (alertLoop) return;
      void controls.start("normal");
    }, [alertLoop, controls]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (alertLoop) {
          onMouseEnter?.(e);
          return;
        }
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [alertLoop, controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (alertLoop) {
          onMouseLeave?.(e);
          return;
        }
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [alertLoop, controls, onMouseLeave]
    );
    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          transition={{
            duration: 0.5,
            ease: "easeInOut",
          }}
          variants={SVG_VARIANTS}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </motion.svg>
      </div>
    );
  }
);

BellIcon.displayName = "BellIcon";

export { BellIcon };
