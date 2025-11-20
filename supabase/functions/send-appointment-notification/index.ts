import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AppointmentPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    appointment_date: string;
    start_time: string;
    client_id: string | null;
    guest_id: string | null;
    service_id: string;
    barber_id: string | null;
    client_name_at_booking?: string;
  };
  old_record: null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: AppointmentPayload = await req.json();
    
    if (payload.type !== 'INSERT') {
      return new Response(
        JSON.stringify({ message: 'Not an INSERT operation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const appointment = payload.record;

    const clientResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${appointment.client_id}&select=full_name,email,phone`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );
    const clients = await clientResponse.json();
    const client = clients[0];

    let guestData = null;
    if (appointment.guest_id) {
      const guestResponse = await fetch(
        `${supabaseUrl}/rest/v1/guests?id=eq.${appointment.guest_id}&select=full_name,email,phone`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      );
      const guests = await guestResponse.json();
      guestData = guests[0];
    }

    const serviceResponse = await fetch(
      `${supabaseUrl}/rest/v1/services?id=eq.${appointment.service_id}&select=name,price`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );
    const services = await serviceResponse.json();
    const service = services[0];

    let barberData = null;
    if (appointment.barber_id) {
      const barberResponse = await fetch(
        `${supabaseUrl}/rest/v1/barbers?id=eq.${appointment.barber_id}&select=name`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      );
      const barbers = await barberResponse.json();
      barberData = barbers[0];
    }

    const adminUsersResponse = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?select=auth_user_id`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );
    const adminUsers = await adminUsersResponse.json();

    if (!adminUsers || adminUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No admin users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    for (const admin of adminUsers) {
      const adminProfileResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${admin.auth_user_id}`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      );
      const adminProfile = await adminProfileResponse.json();
      const adminEmail = adminProfile.email;

      if (!adminEmail) continue;

      const clientName = appointment.client_name_at_booking || client?.full_name || guestData?.full_name || 'Cliente';
      const clientPhone = client?.phone || guestData?.phone || 'N/A';
      const serviceName = service?.name || 'Serviço';
      const servicePrice = service?.price || 0;
      const barberName = barberData?.name || 'Não atribuído';
      const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('pt-PT');
      const appointmentTime = appointment.start_time;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%); color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #D4AF37; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Nova Marcação Recebida</h1>
            </div>
            <div class="content">
              <p>Olá Administrador,</p>
              <p>Foi realizada uma nova marcação no sistema:</p>
              
              <div class="info-row">
                <span class="label">Cliente:</span> ${clientName}
              </div>
              <div class="info-row">
                <span class="label">Telemóvel:</span> ${clientPhone}
              </div>
              <div class="info-row">
                <span class="label">Serviço:</span> ${serviceName}
              </div>
              <div class="info-row">
                <span class="label">Preço:</span> ${servicePrice}€
              </div>
              <div class="info-row">
                <span class="label">Data:</span> ${appointmentDate}
              </div>
              <div class="info-row">
                <span class="label">Hora:</span> ${appointmentTime}
              </div>
              <div class="info-row">
                <span class="label">Barbeiro:</span> ${barberName}
              </div>
              
              <p style="margin-top: 20px;">Acesse o painel administrativo para mais detalhes.</p>
            </div>
            <div class="footer">
              <p>Este é um email automático. Por favor não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Barbearia <onboarding@resend.dev>',
          to: [adminEmail],
          subject: `Nova Marcação - ${clientName} (${appointmentDate} às ${appointmentTime})`,
          html: emailHtml,
        }),
      });
    }

    return new Response(
      JSON.stringify({ message: 'Notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
