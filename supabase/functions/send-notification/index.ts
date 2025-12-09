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

async function sendTwilioSMS(to: string, message: string): Promise<boolean> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn('Twilio SMS credentials not configured');
    return false;
  }

  const cleanPhone = to.startsWith('+') ? to : `+351${to.replace(/\s/g, '')}`;

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const formData = new URLSearchParams();
  formData.append('To', cleanPhone);
  formData.append('From', twilioPhoneNumber);
  formData.append('Body', message);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio SMS error:', error);
      return false;
    }

    console.log('SMS sent successfully via Twilio to:', cleanPhone);
    return true;
  } catch (error) {
    console.error('Failed to send SMS via Twilio:', error);
    return false;
  }
}

async function sendTwilioWhatsApp(to: string, message: string): Promise<boolean> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
    console.warn('Twilio WhatsApp credentials not configured');
    return false;
  }

  const cleanPhone = to.startsWith('+') ? to : `+351${to.replace(/\s/g, '')}`;

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const formData = new URLSearchParams();
  formData.append('To', `whatsapp:${cleanPhone}`);
  formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
  formData.append('Body', message);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio WhatsApp error:', error);
      return false;
    }

    console.log('WhatsApp message sent successfully via Twilio to:', cleanPhone);
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message via Twilio:', error);
    return false;
  }
}

async function sendNotification(
  phone: string,
  whatsappPhone: string | null,
  message: string,
  preference: string
): Promise<{ sms: boolean; whatsapp: boolean }> {
  const result = { sms: false, whatsapp: false };

  const targetWhatsApp = whatsappPhone || phone;

  if (preference === 'sms' || preference === 'both') {
    result.sms = await sendTwilioSMS(phone, message);
  }

  if (preference === 'whatsapp' || preference === 'both') {
    result.whatsapp = await sendTwilioWhatsApp(targetWhatsApp, message);
  }

  return result;
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
      `${supabaseUrl}/rest/v1/appointments?id=eq.${appointmentId}&select=*,profiles:client_id(full_name,email,phone,whatsapp_number,notification_preference),guests:guest_id(full_name,email,phone,whatsapp_number,notification_preference),services:service_id(name),barbers:barber_id(name)`,
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

    const clientName = appointment.profiles?.full_name || appointment.guests?.full_name || 'Cliente';
    const clientPhone = appointment.profiles?.phone || appointment.guests?.phone;
    const clientWhatsAppNumber = appointment.profiles?.whatsapp_number || appointment.guests?.whatsapp_number;
    const clientNotificationPreference = appointment.profiles?.notification_preference || appointment.guests?.notification_preference || 'whatsapp';
    const serviceName = appointment.services?.name || 'Serviço';
    const barberName = appointment.barbers?.name || 'Barbeiro';

    if (!clientPhone) {
      return new Response(
        JSON.stringify({ error: 'No phone number available for client' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let smsMessage = '';

    switch (notificationType) {
      case 'booking_confirmed':
        smsMessage = `${businessName}: Olá ${clientName}! A sua marcação foi confirmada para ${formattedDate} às ${formattedTime}. Serviço: ${serviceName}. Barbeiro: ${barberName}. Até já!`;
        break;
      case 'booking_changed':
        smsMessage = `${businessName}: Olá ${clientName}! A sua marcação foi alterada para ${formattedDate} às ${formattedTime}. Serviço: ${serviceName}. Para questões: ${businessPhone}`;
        break;
      case 'booking_cancelled':
        smsMessage = `${businessName}: Olá ${clientName}! A sua marcação de ${formattedDate} às ${formattedTime} foi cancelada. Para reagendar: ${businessPhone}`;
        break;
      case 'booking_reminder':
        smsMessage = `${businessName}: Olá ${clientName}! Lembramos que tem marcação amanhã ${formattedDate} às ${formattedTime}. Serviço: ${serviceName}. Até amanhã!`;
        break;
    }

    const notificationResult = await sendNotification(clientPhone, clientWhatsAppNumber, smsMessage, clientNotificationPreference);

    const notificationLogData = {
      appointment_id: appointmentId,
      notification_type: notificationType,
      recipient_email: appointment.profiles?.email || appointment.guests?.email,
      recipient_phone: clientPhone,
      status: (notificationResult.sms || notificationResult.whatsapp) ? 'sent' : 'pending',
      sent_at: (notificationResult.sms || notificationResult.whatsapp) ? new Date().toISOString() : null,
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
        message: (notificationResult.sms || notificationResult.whatsapp) ? 'Notification sent successfully' : 'Notification queued (Twilio not configured)',
        preview: {
          to: clientPhone,
          whatsapp_to: clientWhatsAppNumber || clientPhone,
          message: smsMessage,
          channels: {
            sms: notificationResult.sms,
            whatsapp: notificationResult.whatsapp,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
