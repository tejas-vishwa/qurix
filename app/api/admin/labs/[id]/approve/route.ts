import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AdminLabApprovalParamsSchema, validateSchema } from "@/lib/validations"
import { sendEmailDirect } from "@/lib/mailersend"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const validation = validateSchema(AdminLabApprovalParamsSchema, resolvedParams)
    if (!validation.success) {
      return validation.response
    }

    const { id: labId } = validation.data

    // Update the lab's status
    const updatedLab = await prisma.labPartner.update({
      where: { id: labId },
      data: {
        accountStatus: "active",
        isActive: true
      }
    })

    // Fire welcome email via universal email dispatcher
    if (updatedLab.email) {
      await sendEmailDirect({
        to: updatedLab.email,
        subject: "Welcome to the QURIX Lab Partner Network!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #059669;">Application Approved!</h2>
            <p>Dear ${updatedLab.contactPerson || "Partner"},</p>
            <p>We are thrilled to welcome <strong>${updatedLab.name}</strong> to the QURIX network.</p>
            <p>Your lab's onboarding application has been verified and your account is now <strong>active</strong>.</p>
            <p>You can now log into your dashboard using the email and password you provided during registration.</p>
            <br />
            <p>Best Regards,</p>
            <p><strong>The QURIX Team</strong></p>
          </div>
        `,
        text: `Application Approved! Dear ${updatedLab.contactPerson || "Partner"}, We are thrilled to welcome ${updatedLab.name} to the QURIX network. Your account is now active.`,
      }).catch((err: unknown) => {
        console.error("Failed to send welcome email:", err)
      })
    }

    return NextResponse.json({ success: true, lab: updatedLab })
  } catch (error: any) {
    console.error("Error approving lab:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
