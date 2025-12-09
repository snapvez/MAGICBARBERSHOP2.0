# Configuração de Notificações WhatsApp via Twilio

Este guia explica como configurar notificações WhatsApp no sistema usando Twilio.

## 1. Configuração do Twilio WhatsApp

### Passo 1: Criar Conta Twilio
1. Acesse [twilio.com](https://www.twilio.com) e crie uma conta
2. Acesse o [Console da Twilio](https://console.twilio.com)
3. Anote os seguintes valores:
   - Account SID
   - Auth Token

### Passo 2: Configurar WhatsApp

#### Opção A: Sandbox (Para Testes - GRATUITO)
1. Acesse [Try WhatsApp](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn) no Console
2. Aceite os termos e clique em "Confirm"
3. Para conectar seu WhatsApp ao Sandbox:
   - Escaneie o código QR com seu dispositivo móvel
   - Envie a mensagem pré-preenchida (ex: `join <seu-codigo>`)
   - O Sandbox responderá confirmando a conexão
4. Anote o número do Sandbox (formato: `+14155238886`)

#### Opção B: Produção (Requer Aprovação)
1. Acesse [WhatsApp Senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders) no Console
2. Clique em "Create a Sender"
3. Registre seu WhatsApp Business Profile:
   - Nome do negócio
   - Website
   - Descrição
   - Categoria do negócio
4. Aguarde aprovação (geralmente alguns dias)
5. Configure seu número WhatsApp Business

### Passo 3: Configurar Variáveis de Ambiente no Supabase

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Vá em Project Settings > Edge Functions
3. Adicione as seguintes variáveis:

```
TWILIO_ACCOUNT_SID=seu_account_sid_aqui
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
TWILIO_PHONE_NUMBER=seu_numero_sms_aqui (ex: +351912345678)
TWILIO_WHATSAPP_NUMBER=seu_numero_whatsapp_aqui (ex: +14155238886 para sandbox)
```

**Importante:**
- Para Sandbox, use o número fornecido pela Twilio (ex: `+14155238886`)
- Para Produção, use seu número WhatsApp Business verificado
- Todos os números devem estar no formato internacional com `+`

## 2. Testar WhatsApp com Sandbox

### Conectar Utilizadores ao Sandbox
Cada pessoa que quiser receber notificações WhatsApp precisa:

1. Adicionar o número Twilio Sandbox aos contactos (ex: +1 415 523 8886)
2. Enviar a mensagem: `join <seu-codigo-sandbox>`
3. Aguardar confirmação da Twilio

**Nota:** No Sandbox, as conversações expiram após 24 horas. Os utilizadores precisarão reenviar `join` periodicamente.

## 3. Como Funciona o Sistema

### Para Clientes

1. **Configurar Preferências:**
   - Acesse "Perfil" na aplicação
   - Preencha o número de telemóvel
   - Opcionalmente, preencha um número WhatsApp diferente
   - Escolha como quer receber notificações:
     - **SMS**: Apenas mensagens de texto
     - **WhatsApp**: Apenas mensagens WhatsApp
     - **Ambos**: SMS e WhatsApp simultaneamente

2. **Receber Notificações:**
   - Confirmação de agendamento
   - Alteração de agendamento
   - Cancelamento de agendamento
   - Lembretes (24h antes)

### Para Administradores

1. **Configurar Preferências:**
   - Acesse "Painel Admin" > "Configurações do Sistema"
   - Na seção "Notificações para Administradores":
     - Escolha o canal: SMS, WhatsApp ou Ambos
     - Opcionalmente, configure um número WhatsApp partilhado para todos os admins
   - Clique em "Guardar Configurações"

2. **Receber Notificações:**
   - Sempre que um cliente faz um novo agendamento
   - Notificações incluem: nome do cliente, serviço, data, hora e barbeiro

## 4. Formato das Mensagens WhatsApp

### Cliente - Confirmação de Agendamento
```
Mayconbarber: Olá João! A sua marcação foi confirmada para 15/12/2025 às 14:00. Serviço: Corte de Cabelo. Barbeiro: Carlos. Até já!
```

### Cliente - Alteração
```
Mayconbarber: Olá João! A sua marcação foi alterada para 16/12/2025 às 15:00. Serviço: Corte de Cabelo. Para questões: +351 912 345 678
```

### Cliente - Cancelamento
```
Mayconbarber: Olá João! A sua marcação de 15/12/2025 às 14:00 foi cancelada. Para reagendar: +351 912 345 678
```

### Cliente - Lembrete
```
Mayconbarber: Olá João! Lembramos que tem marcação amanhã 15/12/2025 às 14:00. Serviço: Corte de Cabelo. Até amanhã!
```

### Admin - Novo Agendamento
```
Nova Marcação! Cliente: João Silva (+351912345678). Serviço: Corte de Cabelo (15€). Data: 15/12/2025 às 14:00. Barbeiro: Carlos
```

## 5. Resolução de Problemas

### Mensagens WhatsApp não são enviadas
1. Verifique se as variáveis de ambiente estão corretas no Supabase
2. Verifique se o número está no formato internacional (+351...)
3. Para Sandbox: Confirme que o utilizador enviou `join` e está conectado
4. Verifique os logs das Edge Functions no Supabase

### Usuário não recebe notificações
1. Verifique se o número de telefone está preenchido no perfil
2. Verifique se a preferência de notificação está configurada corretamente
3. Para WhatsApp Sandbox: Certifique-se que o utilizador enviou `join`
4. Verifique se o número está no formato correto

### Custos Twilio
- **Sandbox**: Gratuito (apenas para testes)
- **Produção SMS**: ~0.07€ por mensagem (Portugal)
- **Produção WhatsApp**: ~0.01€ por mensagem (geralmente mais barato que SMS)

## 6. Migrar de Sandbox para Produção

Quando estiver pronto para produção:

1. Complete o registro do WhatsApp Business no Twilio Console
2. Aguarde aprovação (alguns dias)
3. Atualize a variável `TWILIO_WHATSAPP_NUMBER` com seu número oficial
4. Os utilizadores não precisarão mais enviar `join`
5. Não há limite de tempo de 24 horas

## 7. Templates WhatsApp para Produção

Para mensagens fora da janela de 24 horas, você precisará criar e aprovar templates:

1. Acesse [WhatsApp Templates](https://console.twilio.com/us1/develop/sms/whatsapp/templates) no Console
2. Crie templates para:
   - Confirmação de agendamento
   - Alteração de agendamento
   - Cancelamento
   - Lembretes
3. Submeta para aprovação (geralmente aprovado em minutos)
4. Use os templates aprovados no código das Edge Functions

**Nota:** Durante a janela de 24 horas após o cliente enviar uma mensagem, você pode enviar mensagens livres sem templates.

## 8. Suporte

Para questões sobre Twilio WhatsApp:
- [Documentação Oficial Twilio WhatsApp](https://www.twilio.com/docs/whatsapp)
- [Twilio Support](https://support.twilio.com)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy/)
