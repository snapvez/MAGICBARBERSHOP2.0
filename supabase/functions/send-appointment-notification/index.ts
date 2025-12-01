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

async function sendTwilioSMS(to: string, message: string): Promise<boolean> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn('Twilio credentials not configured');
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
      console.error('Twilio error:', error);
      return false;
    }

    console.log('SMS sent successfully via Twilio to:', cleanPhone);
    return true;
  } catch (error) {
    console.error('Failed to send SMS via Twilio:', error);
    return false;
  }
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

    const headers = {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    };

    let clientData = null;
    if (appointment.client_id) {
      const clientResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${appointment.client_id}&select=full_name,email,phone`,
        { headers }
      );
      const clients = await clientResponse.json();
      clientData = clients[0];
    }

    let guestData = null;
    if (appointment.guest_id) {
      const guestResponse = await fetch(
        `${supabaseUrl}/rest/v1/guests?id=eq.${appointment.guest_id}&select=full_name,email,phone`,
        { headers }
      );
      const guests = await guestResponse.json();
      guestData = guests[0];
    }

    const serviceResponse = await fetch(
      `${supabaseUrl}/rest/v1/services?id=eq.${appointment.service_id}&select=name,price`,
      { headers }
    );
    const services = await serviceResponse.json();
    const service = services[0];

    let barberData = null;
    if (appointment.barber_id) {
      const barberResponse = await fetch(
        `${supabaseUrl}/rest/v1/barbers?id=eq.${appointment.barber_id}&select=name`,
        { headers }
      );
      const barbers = await barberResponse.json();
      barberData = barbers[0];
    }

    const adminUsersResponse = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?select=auth_user_id`,
      { headers }
    );
    const adminUsers = await adminUsersResponse.json();

    if (!adminUsers || adminUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No admin users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const clientName = appointment.client_name_at_booking || clientData?.full_name || guestData?.full_name || 'Cliente';
    const clientPhone = clientData?.phone || guestData?.phone || 'N/A';
    const serviceName = service?.name || 'Serviço';
    const servicePrice = service?.price || 0;
    const barberName = barberData?.name || 'Não atribuído';
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('pt-PT');
    const appointmentTime = appointment.start_time;

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

      const adminPhoneResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${admin.auth_user_id}&select=phone`,
        { headers }
      );
      const adminPhoneData = await adminPhoneResponse.json();
      const adminPhone = adminPhoneData[0]?.phone;

      if (adminPhone) {
        const adminSMS = `Nova Marcação! Cliente: ${clientName} (${clientPhone}). Serviço: ${serviceName} (${servicePrice}€). Data: ${appointmentDate} às ${appointmentTime}. Barbeiro: ${barberName}`;

        await sendTwilioSMS(adminPhone, adminSMS);
      }
    }

    if (clientPhone && clientPhone !== 'N/A') {
      const clientSMS = `Mayconbarber: Olá ${clientName}! A sua marcação foi confirmada para ${appointmentDate} às ${appointmentTime}. Serviço: ${serviceName}. Barbeiro: ${barberName}. Até já!`;

      await sendTwilioSMS(clientPhone, clientSMS);
    }

    return new Response(
      JSON.stringify({ message: 'SMS notifications sent successfully' }),
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
