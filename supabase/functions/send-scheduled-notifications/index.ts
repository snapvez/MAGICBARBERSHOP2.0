import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScheduledNotification {
  id: string;
  appointment_id: string;
  notification_type: 'reminder_client' | 'reminder_admin';
  recipient_email: string | null;
  recipient_phone: string | null;
  client_name: string | null;
  service_name: string | null;
  appointment_datetime: string | null;
  barber_name: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications to send', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const notification of pendingNotifications as ScheduledNotification[]) {
      try {
        if (notification.notification_type === 'reminder_client') {
          await sendClientReminder(notification, resendApiKey, supabase);
        } else if (notification.notification_type === 'reminder_admin') {
          await sendAdminReminder(notification, resendApiKey, supabase);
        }

        await supabase
          .from('scheduled_notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', notification.id);

        results.sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'failed',
            error_message: errorMessage,
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        results.failed++;
        results.errors.push(`Notification ${notification.id}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Notifications processed',
        results,
        total: pendingNotifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendClientReminder(
  notification: ScheduledNotification,
  resendApiKey: string | undefined,
  supabase: any
) {
  const clientName = notification.client_name || 'Cliente';
  const serviceName = notification.service_name || 'Serviço';
  const appointmentDateTime = notification.appointment_datetime || 'Data não disponível';
  const barberName = notification.barber_name || 'Não atribuído';

  if (notification.recipient_email && resendApiKey) {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #000; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37; }
          .info-row { margin: 12px 0; }
          .label { font-weight: bold; color: #D4AF37; display: inline-block; width: 120px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Lembrete de Marcação</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Magic Barbershop</p>
          </div>
          <div class="content">
            <p>Olá <strong>${clientName}</strong>,</p>

            <div class="alert">
              <strong>🔔 A sua marcação está próxima!</strong><br>
              Lembramos que tem uma marcação agendada em breve.
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #D4AF37;">Detalhes da Marcação</h3>
              <div class="info-row">
                <span class="label">Serviço:</span>
                <span>${serviceName}</span>
              </div>
              <div class="info-row">
                <span class="label">Data/Hora:</span>
                <span>${appointmentDateTime}</span>
              </div>
              <div class="info-row">
                <span class="label">Barbeiro:</span>
                <span>${barberName}</span>
              </div>
            </div>

            <p style="margin-top: 20px;">Por favor, chegue com 5 minutos de antecedência.</p>
            <p>Se não puder comparecer, por favor entre em contacto connosco o mais rápido possível.</p>

            <p style="margin-top: 30px;">Obrigado pela sua preferência!</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor não responda.</p>
            <p>Magic Barbershop - Na Régua Como Deve Ser</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Magic Barbershop <onboarding@resend.dev>',
        to: [notification.recipient_email],
        subject: `⏰ Lembrete: Marcação em breve - ${appointmentDateTime}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to send email: ${errorData}`);
    }
  }

  if (notification.recipient_phone) {
    const smsMessage = `🔔 Magic Barbershop: Olá ${clientName}! Lembrete da sua marcação de ${serviceName} em ${appointmentDateTime}${barberName !== 'Não atribuído' ? ` com ${barberName}` : ''}. Obrigado!`;

    await supabase
      .from('notification_log')
      .insert({
        appointment_id: notification.appointment_id,
        notification_type: 'reminder_sms',
        recipient_phone: notification.recipient_phone,
        status: 'pending',
      });
  }
}

async function sendAdminReminder(
  notification: ScheduledNotification,
  resendApiKey: string | undefined,
  supabase: any
) {
  const clientName = notification.client_name || 'Cliente';
  const serviceName = notification.service_name || 'Serviço';
  const appointmentDateTime = notification.appointment_datetime || 'Data não disponível';
  const barberName = notification.barber_name || 'Não atribuído';
  const clientPhone = notification.recipient_phone || 'N/A';

  if (notification.recipient_email && resendApiKey) {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
          .info-row { margin: 12px 0; }
          .label { font-weight: bold; color: #dc2626; display: inline-block; width: 120px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .alert { background: #fee; border: 1px solid #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Lembrete de Marcação (Admin)</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Marcação em Breve</p>
          </div>
          <div class="content">
            <p>Olá Administrador,</p>

            <div class="alert">
              <strong>🔔 Marcação próxima!</strong><br>
              Uma marcação está agendada para breve.
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #dc2626;">Detalhes da Marcação</h3>
              <div class="info-row">
                <span class="label">Cliente:</span>
                <span>${clientName}</span>
              </div>
              <div class="info-row">
                <span class="label">Telemóvel:</span>
                <span>${clientPhone}</span>
              </div>
              <div class="info-row">
                <span class="label">Serviço:</span>
                <span>${serviceName}</span>
              </div>
              <div class="info-row">
                <span class="label">Data/Hora:</span>
                <span>${appointmentDateTime}</span>
              </div>
              <div class="info-row">
                <span class="label">Barbeiro:</span>
                <span>${barberName}</span>
              </div>
            </div>

            <p style="margin-top: 20px;">Acesse o painel administrativo para mais detalhes.</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor não responda.</p>
            <p>Magic Barbershop - Sistema de Gestão</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Magic Barbershop Admin <onboarding@resend.dev>',
        to: [notification.recipient_email],
        subject: `⏰ Lembrete Admin: Marcação - ${clientName} (${appointmentDateTime})`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to send admin email: ${errorData}`);
    }
  }
}
