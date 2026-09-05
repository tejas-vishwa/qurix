import { prisma } from "./prisma"

export async function createTablesIfNotExist() {
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "name" TEXT,
      "role" TEXT NOT NULL DEFAULT 'PATIENT',
      "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
      "paymentStatus" TEXT NOT NULL DEFAULT 'NONE',
      "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "DoctorProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "licenseNumber" TEXT NOT NULL,
      "specialization" TEXT,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "Report" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "fileData" TEXT,
      "fileType" TEXT,
      "status" TEXT NOT NULL DEFAULT 'UPLOADED',
      "rawText" TEXT,
      "parsedJson" TEXT,
      "aiSummary" TEXT,
      "reportDate" DATETIME,
      "labName" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "BiomarkerDefinition" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "displayName" TEXT NOT NULL,
      "unit" TEXT NOT NULL,
      "refMin" REAL,
      "refMax" REAL,
      "category" TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS "ExtractedMetric" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "reportId" TEXT NOT NULL,
      "biomarkerId" TEXT NOT NULL,
      "value" REAL NOT NULL,
      "unit" TEXT NOT NULL,
      "refMin" REAL,
      "refMax" REAL,
      "isAbnormal" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE,
      FOREIGN KEY ("biomarkerId") REFERENCES "BiomarkerDefinition" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "DoctorAccessCode" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "code" TEXT NOT NULL UNIQUE,
      "expiresAt" DATETIME NOT NULL,
      "maxUses" INTEGER NOT NULL DEFAULT 5,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "isRevoked" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "AccessCodeUsage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "codeId" TEXT NOT NULL,
      "accessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ipAddress" TEXT,
      FOREIGN KEY ("codeId") REFERENCES "DoctorAccessCode" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "HealthAlert" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "metricId" TEXT,
      "severity" TEXT NOT NULL DEFAULT 'INFO',
      "message" TEXT NOT NULL,
      "isRead" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "LabPartner" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "logoUrl" TEXT,
      "bookingUrl" TEXT,
      "commissionPct" REAL NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "LabBooking" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "labId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE,
      FOREIGN KEY ("labId") REFERENCES "LabPartner" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "Appointment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "doctorId" TEXT NOT NULL,
      "scheduledTime" DATETIME NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "accessCode" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE,
      FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "UserHealthRecord" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "reportId" TEXT NOT NULL UNIQUE,
      "patientId" TEXT NOT NULL,
      "hemoglobin" REAL,
      "fasting_blood_sugar" REAL,
      "thyroid_tsh" REAL,
      "ldl_cholesterol" REAL,
      "hdl_cholesterol" REAL,
      "triglycerides" REAL,
      "vitamin_d" REAL,
      "vitamin_b12" REAL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "Prescription" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT,
      "fileData" TEXT,
      "fileType" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PARSED',
      "rawText" TEXT,
      "doctorName" TEXT,
      "medicinesJson" TEXT,
      "symptomsJson" TEXT,
      "vitalsJson" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "MedicalScan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT,
      "fileData" TEXT,
      "fileType" TEXT,
      "modality" TEXT,
      "modelUsed" TEXT,
      "overallRisk" TEXT,
      "maxProbability" REAL,
      "pathologiesJson" TEXT,
      "summary" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "ActivityLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "action" TEXT NOT NULL,
      "details" TEXT,
      "userId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "MedicineReminder" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "patientId" TEXT NOT NULL,
      "prescriptionId" TEXT,
      "medicineName" TEXT NOT NULL,
      "reminderTime" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE CASCADE,
      FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "VerificationToken" (
      "identifier" TEXT NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "expires" DATETIME NOT NULL
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");`,
    `ALTER TABLE "User" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE';`,
    `ALTER TABLE "User" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'NONE';`,
    `ALTER TABLE "User" ADD COLUMN "gender" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN "age" INTEGER;`,
    `ALTER TABLE "User" ADD COLUMN "location" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN "emailVerified" DATETIME;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "yearEstablished" INTEGER;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "contactPerson" TEXT;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "email" TEXT;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "passwordHash" TEXT;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "registrationNo" TEXT;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "certificationUrl" TEXT;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "operationalScope" TEXT;`,
    `ALTER TABLE "LabPartner" ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'pending';`
  ]

  for (const statement of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(statement)
    } catch (err) {
      console.warn("Table DDL execution note:", err)
    }
  }

  // Attempt to add new columns to existing User table (will fail silently if they already exist)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "age" INTEGER;`)
  } catch (err) {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "location" TEXT;`)
  } catch (err) {}
}

export async function seedDatabase() {
  try {
    // 0. Ensure tables exist in Turso
    await createTablesIfNotExist()

    // 1. Seed Biomarkers
    const biomarkersData = [
      { code: 'HEMOGLOBIN', displayName: 'Hemoglobin', unit: 'g/dL', refMin: 12.0, refMax: 15.5, category: 'CBC' },
      { code: 'RBC', displayName: 'Red Blood Cells', unit: 'mill/µL', refMin: 4.1, refMax: 5.1, category: 'CBC' },
      { code: 'WBC', displayName: 'White Blood Cells', unit: 'thou/µL', refMin: 4.5, refMax: 11.0, category: 'CBC' },
      { code: 'PLATELETS', displayName: 'Platelets', unit: 'thou/cumm', refMin: 150, refMax: 450, category: 'CBC' },
      { code: 'GLUCOSE_FASTING', displayName: 'Fasting Glucose', unit: 'mg/dL', refMin: 70, refMax: 99, category: 'Diabetes' },
      { code: 'HBA1C', displayName: 'HbA1c', unit: '%', refMin: 4.0, refMax: 5.6, category: 'Diabetes' },
      { code: 'CHOLESTEROL_TOTAL', displayName: 'Total Cholesterol', unit: 'mg/dL', refMin: 125, refMax: 200, category: 'Lipid' },
      { code: 'LDL', displayName: 'LDL Cholesterol', unit: 'mg/dL', refMin: 0, refMax: 99, category: 'Lipid' },
      { code: 'HDL', displayName: 'HDL Cholesterol', unit: 'mg/dL', refMin: 40, refMax: 60, category: 'Lipid' },
      { code: 'TRIGLYCERIDES', displayName: 'Triglycerides', unit: 'mg/dL', refMin: 0, refMax: 149, category: 'Lipid' },
      { code: 'VITAMIN_D', displayName: 'Vitamin D', unit: 'ng/mL', refMin: 20, refMax: 50, category: 'Vitamins' },
      { code: 'VITAMIN_B12', displayName: 'Vitamin B12', unit: 'pg/mL', refMin: 200, refMax: 900, category: 'Vitamins' },
    ]

    for (const b of biomarkersData) {
      await prisma.biomarkerDefinition.upsert({
        where: { code: b.code },
        update: { unit: b.unit },
        create: b
      })
    }

    const biomarkers = await prisma.biomarkerDefinition.findMany()

    const demoPasswordHash = "$2b$10$9Te2u47R.K/ggejiePt7m.h6FsxZ6n.QoRfeT8acNEIhVbn3qGoki"
    const adminPasswordHash = "$2b$10$d2o0hvW48JawCXP1pVaUD.2TCfwqR8nDVbh148Vs3wFNREuxMYOKW"
    const superAdminPasswordHash = "$2b$10$9Te2u47R.K/ggejiePt7m.h6FsxZ6n.QoRfeT8acNEIhVbn3qGoki"

    const priya = await prisma.user.upsert({
      where: { email: "priya@demo.com" },
      update: { passwordHash: demoPasswordHash, subscriptionTier: "FREE", paymentStatus: "NONE" },
      create: { email: "priya@demo.com", passwordHash: demoPasswordHash, name: "Priya Sharma", role: "PATIENT", subscriptionTier: "FREE", paymentStatus: "NONE" }
    })

    await prisma.user.upsert({
      where: { email: "sankalp@demo.com" },
      update: { passwordHash: demoPasswordHash, subscriptionTier: "FREE", paymentStatus: "NONE" },
      create: { email: "sankalp@demo.com", passwordHash: demoPasswordHash, name: "Sankalp Verma", role: "PATIENT", subscriptionTier: "FREE", paymentStatus: "NONE" }
    })

    await prisma.user.upsert({
      where: { email: "utkarsh@demo.com" },
      update: { passwordHash: demoPasswordHash, subscriptionTier: "FREE", paymentStatus: "NONE" },
      create: { email: "utkarsh@demo.com", passwordHash: demoPasswordHash, name: "Utkarsh Singh", role: "PATIENT", subscriptionTier: "FREE", paymentStatus: "NONE" }
    })

    await prisma.user.upsert({
      where: { email: "tejas@demo.com" },
      update: { passwordHash: demoPasswordHash, subscriptionTier: "QURIX_PLUS", paymentStatus: "ACTIVE" },
      create: { email: "tejas@demo.com", passwordHash: demoPasswordHash, name: "Tejas Vishwakarma", role: "PATIENT", subscriptionTier: "QURIX_PLUS", paymentStatus: "ACTIVE" }
    })

    await prisma.user.upsert({
      where: { email: "admin@qurix.health" },
      update: { passwordHash: adminPasswordHash },
      create: { email: "admin@qurix.health", passwordHash: adminPasswordHash, name: "QURIX Admin", role: "ADMIN" }
    })

    await prisma.user.upsert({
      where: { email: "admin@biobytes.in" },
      update: { passwordHash: adminPasswordHash },
      create: { email: "admin@biobytes.in", passwordHash: adminPasswordHash, name: "Admin User", role: "ADMIN" }
    })

    await prisma.user.upsert({
      where: { email: "admin@teamqurix.com" },
      update: { passwordHash: superAdminPasswordHash },
      create: { email: "admin@teamqurix.com", passwordHash: superAdminPasswordHash, name: "Super Admin", role: "ADMIN" }
    })

    const doctor = await prisma.user.upsert({
      where: { email: "doctor@demo.com" },
      update: { passwordHash: demoPasswordHash },
      create: { email: "doctor@demo.com", passwordHash: demoPasswordHash, name: "Dr. Rahul Verma", role: "DOCTOR" }
    })

    const docProfile = await prisma.doctorProfile.findUnique({ where: { userId: doctor.id } })
    if (!docProfile) {
      await prisma.doctorProfile.create({
        data: { userId: doctor.id, licenseNumber: "MCI-98765", specialization: "General Physician" }
      })
    }

    const labData = [
      { name: 'Dr. Lal PathLabs', commissionPct: 15.0, bookingUrl: 'https://www.lalpathlabs.com' },
      { name: 'SRL Diagnostics', commissionPct: 12.0, bookingUrl: 'https://www.srlworld.com' },
      { name: 'Thyrocare', commissionPct: 18.0, bookingUrl: 'https://www.thyrocare.com' },
    ]

    for (const l of labData) {
      const existingLab = await prisma.labPartner.findFirst({ where: { name: l.name } })
      if (!existingLab) {
        await prisma.labPartner.create({ data: l })
      }
    }

    return { success: true, message: "Database successfully created and seeded with demo accounts!" }
  } catch (error: any) {
    console.error("Database seeding error:", error)
    return { success: false, error: error?.message || "Failed to seed database" }
  }
}
