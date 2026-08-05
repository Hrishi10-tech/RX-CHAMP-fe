"use client";

import { motion, type Variants } from "framer-motion";

import type { PageWrapperProps } from "./types";

const variants: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
};

const PageWrapper = ({ children }: PageWrapperProps) => {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4, ease: "easeInOut" }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;
