import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

interface EmailRequest {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

interface EmailResponse {
  success: boolean
  id?: string
  error?: string
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }

    const { to, subject, html, from, replyTo }: EmailRequest = await req.json()

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html")
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || "STEAM Reader <noreply@steamreader.com>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || "Failed to send email")
    }

    const response: EmailResponse = {
      success: true,
      id: data.id,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const response: EmailResponse = {
      success: false,
      error: error.message,
    }

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
