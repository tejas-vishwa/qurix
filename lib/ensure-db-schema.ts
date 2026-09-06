import { prisma } from "./prisma"

let schemaInitialized = false
let schemaInitPromise: Promise<void> | null = null

export async function ensureAppointmentSchema(force = false): Promise<void> {
  if (schemaInitialized && !force) {
    return
  }

  if (schemaInitPromise && !force) {
    return schemaInitPromise
  }

  schemaInitPromise = (async () => {
    // 1. Ensure Appointment columns exist
    const columnStatements = [
      `ALTER TABLE "Appointment" ADD COLUMN "type" TEXT DEFAULT 'OFFLINE';`,
      `ALTER TABLE "Appointment" ADD COLUMN "updatedAt" DATETIME;`,
      `ALTER TABLE "Appointment" ADD COLUMN "dailyRoomName" TEXT;`,
      `ALTER TABLE "Appointment" ADD COLUMN "dailyRoomUrl" TEXT;`,
      `ALTER TABLE "Appointment" ADD COLUMN "callStartedAt" DATETIME;`,
      `ALTER TABLE "Appointment" ADD COLUMN "callEndedAt" DATETIME;`,
      `ALTER TABLE "Appointment" ADD COLUMN "callDurationSec" INTEGER;`,
      `ALTER TABLE "Appointment" ADD COLUMN "transcript" TEXT;`,
      `ALTER TABLE "Appointment" ADD COLUMN "aiSummary" TEXT;`,
      `ALTER TABLE "Appointment" ADD COLUMN "scribeStatus" TEXT DEFAULT 'PENDING';`,
    ]

    for (const statement of columnStatements) {
      try {
        await prisma.$executeRawUnsafe(statement)
      } catch (err) {
        // SQLite will throw duplicate column name if it already exists, which is safe to ignore
      }
    }

    // 2. Normalize existing records
    try {
      await prisma.$executeRawUnsafe(`UPDATE "Appointment" SET "type" = 'OFFLINE' WHERE "type" IS NULL;`)
    } catch (err) {}

    try {
      await prisma.$executeRawUnsafe(`UPDATE "Appointment" SET "scribeStatus" = 'PENDING' WHERE "scribeStatus" IS NULL;`)
    } catch (err) {}

    // 3. Ensure companion tables exist
    const companionTables = [
      `CREATE TABLE IF NOT EXISTS "ConsultationTranscriptSegment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "appointmentId" TEXT NOT NULL,
        "speaker" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "confidence" REAL,
        "startMs" INTEGER,
        "endMs" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS "MedicationReminder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "appointmentId" TEXT NOT NULL,
        "patientId" TEXT NOT NULL,
        "drugName" TEXT NOT NULL,
        "dosage" TEXT NOT NULL,
        "frequency" TEXT NOT NULL,
        "duration" TEXT NOT NULL,
        "nextDoseAt" DATETIME,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE
      );`,
    ]

    for (const statement of companionTables) {
      try {
        await prisma.$executeRawUnsafe(statement)
      } catch (err) {}
    }

    schemaInitialized = true
  })()

  try {
    await schemaInitPromise
  } finally {
    schemaInitPromise = null
  }
}
