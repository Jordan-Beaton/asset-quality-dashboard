import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      eventType,
      documentNumber,
      documentTitle,
      originatorName,
      originatorEmail,
      recipientEmails,
      message,
    } = body;

    // ✅ DEBUG LOG (you will see this in terminal)
    console.log("EMAIL TRIGGERED", {
      eventType,
      documentNumber,
      recipientEmails,
    });

    if (!recipientEmails || recipientEmails.length === 0) {
      return NextResponse.json(
        { error: "No recipients provided" },
        { status: 400 }
      );
    }

    const subjectMap: Record<string, string> = {
      submitted_for_review: `${documentNumber} submitted for review`,
      reviewed: `${documentNumber} reviewed`,
      approved: `${documentNumber} approved`,
      rejected: `${documentNumber} rejected`,
      superseded: `${documentNumber} superseded`,
    };

    const subject =
      subjectMap[eventType] || `${documentNumber} update`;

    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <p><strong>Document:</strong> ${documentNumber}</p>
        <p><strong>Title:</strong> ${documentTitle}</p>
        <p><strong>Event:</strong> ${eventType}</p>
        ${
          message
            ? `<p><strong>Message:</strong> ${message}</p>`
            : ""
        }
        <br/>
        <p>This is an automated notification from the Document Control System.</p>
      </div>
    `;

    const sendResult = await resend.emails.send({
      from: process.env.DOCUMENT_NOTIFICATIONS_FROM_EMAIL!,
      to: recipientEmails,
      subject,
      html,
    });

    console.log("EMAIL RESULT", sendResult);

    return NextResponse.json({
      ok: true,
      id: sendResult.data?.id || null,
    });
  } catch (error) {
    console.error("EMAIL ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown notification error.",
      },
      { status: 500 }
    );
  }
}