import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

interface WelcomeEmailRequest {
  email: string
  displayName?: string
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function getWelcomeEmailHtml(displayName?: string): string {
  const name = displayName || "there"

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to STEAM Reader</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Welcome to STEAM Reader!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hey ${name}! 👋
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Thanks for joining STEAM Reader! We're excited to have you as part of our community of curious learners.
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Here's what you can do now:
              </p>

              <ul style="margin: 0 0 20px; padding-left: 20px; color: #374151; font-size: 16px; line-height: 1.8;">
                <li><strong>Explore articles</strong> - Browse tutorials on Science, Technology, Engineering, Arts, and Math</li>
                <li><strong>Mark as Read</strong> - Keep track of what you've learned</li>
                <li><strong>Verify tutorials</strong> - Help others by confirming tutorials work</li>
                <li><strong>Endorse content</strong> - Share your seal of approval on great articles</li>
              </ul>

              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                Your feedback helps our community find the best educational content!
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://steamreader.com" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Start Exploring
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                Happy learning! 🚀
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} STEAM Reader. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }

    const { email, displayName }: WelcomeEmailRequest = await req.json()

    if (!email) {
      throw new Error("Missing required field: email")
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "STEAM Reader <noreply@steamreader.com>",
        to: [email],
        subject: "Welcome to STEAM Reader! 🎉",
        html: getWelcomeEmailHtml(displayName),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || "Failed to send welcome email")
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
