"use client"

import { motion } from "framer-motion"

export function DashboardTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}
