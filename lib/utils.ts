import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractNameFromEmail(email: string): string {
  // Converts "patient.smith88@email.com" to "Patient Smith"
  const namePart = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ')
  return namePart.replace(/\b\w/g, (char) => char.toUpperCase()).trim()
}

