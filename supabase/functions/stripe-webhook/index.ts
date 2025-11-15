import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@14.10.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey || !webhookSecret) {
      throw new Error('Stripe keys não configuradas');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Sem assinatura Stripe');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const clientId = session.client_reference_id || session.metadata?.user_id;
        const metadata = session.metadata;

        if (!clientId) {
          console.error('Sem client_reference_id ou metadata.user_id');
          break;
        }

        const { data: existingSubscription } = await supabaseClient
          .from('client_subscriptions')
          .select('id')
          .eq('client_id', clientId)
          .eq('status', 'active')
          .maybeSingle();

        if (existingSubscription) {
          console.log('Cliente já tem assinatura ativa');
          break;
        }

        const { data: plans } = await supabaseClient
          .from('subscription_plans')
          .select('id, stripe_payment_link')
          .eq('is_active', true);

        let planId = metadata?.plan_id;
        if (!planId && plans) {
          const matchingPlan = plans.find(p => p.stripe_payment_link && session.url?.includes(p.stripe_payment_link));
          if (!matchingPlan) {
            planId = plans[0]?.id;
          } else {
            planId = matchingPlan.id;
          }
        }

        if (!planId) {
          console.error('Não foi possível determinar o plano');
          break;
        }

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const { data: newSubscription, error } = await supabaseClient
          .from('client_subscriptions')
          .insert({
            client_id: clientId,
            plan_id: planId,
            barber_id: metadata?.barber_id || null,
            status: 'active',
            stripe_subscription_id: session.subscription as string,
            stripe_payment_intent_id: session.payment_intent as string,
            cuts_used_this_month: 0,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_status: 'paid',
            last_payment_date: now.toISOString(),
            last_payment_method: 'card',
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar assinatura:', error);
        } else if (newSubscription) {
          const { data: plan } = await supabaseClient
            .from('subscription_plans')
            .select('price')
            .eq('id', planId)
            .single();

          if (plan) {
            await supabaseClient
              .from('payments')
              .insert({
                payment_type: 'subscription',
                subscription_id: newSubscription.id,
                barber_id: metadata?.barber_id || null,
                amount: plan.price,
                payment_method: 'card',
                payment_status: 'paid',
                payment_date: now.toISOString(),
                notes: `Pagamento Stripe - Session: ${session.id}`,
              });
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        const { data: subscription } = await supabaseClient
          .from('client_subscriptions')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (subscription) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await supabaseClient
            .from('client_subscriptions')
            .update({
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              cuts_used_this_month: 0,
              payment_status: 'paid',
              last_payment_date: now.toISOString(),
              last_payment_method: 'card',
            })
            .eq('stripe_subscription_id', subscriptionId);

          const { data: plan } = await supabaseClient
            .from('subscription_plans')
            .select('price')
            .eq('id', subscription.plan_id)
            .single();

          if (plan) {
            await supabaseClient
              .from('payments')
              .insert({
                payment_type: 'subscription',
                subscription_id: subscription.id,
                barber_id: subscription.barber_id,
                amount: plan.price,
                payment_method: 'card',
                payment_status: 'paid',
                payment_date: now.toISOString(),
                notes: `Renovação Stripe - Invoice: ${invoice.id}`,
              });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabaseClient
          .from('client_subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        await supabaseClient
          .from('client_subscriptions')
          .update({ payment_status: 'failed' })
          .eq('stripe_subscription_id', subscriptionId);
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});