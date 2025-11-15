import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  appointmentId: string;
  notificationType: 'booking_confirmed' | 'booking_changed' | 'booking_cancelled' | 'booking_reminder';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { appointmentId, notificationType }: NotificationRequest = await req.json();

    if (!appointmentId || !notificationType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
    };

    const appointmentResponse = await fetch(
      `${supabaseUrl}/rest/v1/appointments?id=eq.${appointmentId}&select=*,profiles:client_id(full_name,email,phone),services:service_id(name),barbers:barber_id(name)`,
      { headers }
    );

    const appointments = await appointmentResponse.json();
    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const appointment = appointments[0];

    const templateResponse = await fetch(
      `${supabaseUrl}/rest/v1/sms_templates?template_type=eq.${notificationType}&active=eq.true`,
      { headers }
    );

    const templates = await templateResponse.json();
    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'SMS template not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const template = templates[0];

    const siteContentResponse = await fetch(
      `${supabaseUrl}/rest/v1/site_content?limit=1`,
      { headers }
    );

    const siteContent = await siteContentResponse.json();
    const businessName = siteContent?.[0]?.business_name || 'Mayconbarber';
    const businessPhone = siteContent?.[0]?.phone || '+351 123 456 789';

    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedTime = appointment.start_time;

    const cancelLink = `${supabaseUrl}/cancel-appointment/${appointmentId}`;

    let smsTitle = template.message_title
      .replace(/%NOME_NEGOCIO%/g, businessName);

    let smsBody = template.message_body
      .replace(/%NOME%/g, appointment.profiles?.full_name || 'Cliente')
      .replace(/%NOME_NEGOCIO%/g, businessName)
      .replace(/%DATA%/g, `${formattedDate} às ${formattedTime}`)
      .replace(/%LINK_CANCELAR%/g, cancelLink)
      .replace(/%TELEFONE%/g, businessPhone);

    const recipientEmail = appointment.profiles?.email;
    const recipientPhone = appointment.profiles?.phone;

    if (!recipientPhone) {
      return new Response(
        JSON.stringify({ error: 'No phone number available for client' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('SMS to send:', {
      to: recipientPhone,
      title: smsTitle,
      message: smsBody,
    });

    const notificationLogData = {
      appointment_id: appointmentId,
      notification_type: notificationType,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      status: 'sent',
      sent_at: new Date().toISOString(),
    };

    await fetch(
      `${supabaseUrl}/rest/v1/notification_log`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(notificationLogData),
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS notification logged successfully',
        preview: {
          to: recipientPhone,
          title: smsTitle,
          message: smsBody,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});