"use client";

import { motion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface Props extends MotionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right" | "top";
}

const offsets = {
  bottom: { y: 24, x: 0 },
  top: { y: -24, x: 0 },
  left: { y: 0, x: -24 },
  right: { y: 0, x: 24 },
};

export function FadeIn({
  children,
  className,
  delay = 0,
  from = "bottom",
  ...rest
}: Props) {
  const offset = offsets[from];
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
