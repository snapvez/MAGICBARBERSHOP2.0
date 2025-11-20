/*
  # Sistema de Gestão de Conteúdo do Site

  ## Alterações
  - Cria tabela `site_content` para armazenar todos os textos editáveis do site
  - Cada entrada tem uma chave única (key) para identificar o conteúdo
  - Suporta conteúdo em diferentes seções (home, subscriptions, loyalty, etc)
  - Insere conteúdo padrão para todas as páginas do site

  ## Segurança
  - RLS ativado
  - Todos podem ler o conteúdo
  - Apenas admins podem editar
*/

-- Criar tabela de conteúdo do site
CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section, key)
);

-- Ativar RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Everyone can view site content"
  ON site_content
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can update site content"
  ON site_content
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can insert site content"
  ON site_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Inserir conteúdo padrão - HOME PAGE
INSERT INTO site_content (section, key, value, description) VALUES
('home', 'hero_title', 'Barbearia The Boss Man', 'Título principal da página inicial'),
('home', 'hero_subtitle', 'Onde o Estilo Encontra a Excelência', 'Subtítulo da página inicial'),
('home', 'hero_description', 'Mais do que cortes de cabelo - criamos experiências. Marca o teu horário e descobre porque somos a escolha dos homens que valorizam qualidade.', 'Descrição hero da página inicial'),
('home', 'cta_book', 'Marcar Agora', 'Botão de marcação'),
('home', 'cta_subscription', 'Ver Assinaturas', 'Botão de assinaturas'),
('home', 'services_title', 'Os Nossos Serviços Premium', 'Título da seção de serviços'),
('home', 'services_subtitle', 'Qualidade superior em cada detalhe', 'Subtítulo da seção de serviços'),
('home', 'features_title', 'Porquê Escolher-nos?', 'Título das características'),
('home', 'feature_quality_title', 'Qualidade Premium', 'Título característica 1'),
('home', 'feature_quality_desc', 'Barbeiros experientes e produtos de topo para resultados impecáveis.', 'Descrição característica 1'),
('home', 'feature_comfort_title', 'Ambiente Confortável', 'Título característica 2'),
('home', 'feature_comfort_desc', 'Espaço moderno e acolhedor onde podes relaxar enquanto cuidas do teu visual.', 'Descrição característica 2'),
('home', 'feature_loyalty_title', 'Programa de Fidelidade', 'Título característica 3'),
('home', 'feature_loyalty_desc', 'Ganha pontos a cada visita e desbloqueia recompensas exclusivas.', 'Descrição característica 3')
ON CONFLICT (section, key) DO NOTHING;

-- SUBSCRIPTION PAGE
INSERT INTO site_content (section, key, value, description) VALUES
('subscription', 'header_badge', 'Assinatura Premium', 'Badge do cabeçalho'),
('subscription', 'main_title', 'Corta Sempre que Quiseres', 'Título principal'),
('subscription', 'main_subtitle', 'Poupa até 40% com a nossa assinatura mensal. Liberdade total para manteres o teu estilo sempre impecável.', 'Subtítulo principal'),
('subscription', 'spots_available', 'Apenas {spots} vaga{plural} disponível{plural} de {max}', 'Texto de vagas disponíveis'),
('subscription', 'no_spots', 'Sem vagas disponíveis', 'Texto quando não há vagas'),
('subscription', 'active_title', 'Assinatura Ativa', 'Título assinatura ativa'),
('subscription', 'cuts_label', 'Cortes este mês', 'Label cortes usados'),
('subscription', 'monthly_fee_label', 'Mensalidade', 'Label mensalidade'),
('subscription', 'renews_label', 'Renova em', 'Label renovação'),
('subscription', 'cancel_button', 'Cancelar Assinatura', 'Botão cancelar'),
('subscription', 'subscribe_button', 'Subscrever Agora', 'Botão subscrever'),
('subscription', 'no_spots_button', 'Sem Vagas', 'Botão sem vagas'),
('subscription', 'benefits_title', 'Porque Escolher a Assinatura?', 'Título benefícios'),
('subscription', 'benefits_subtitle', 'Vantagens exclusivas para membros premium', 'Subtítulo benefícios'),
('subscription', 'benefit_save_title', 'Poupa Muito Dinheiro', 'Título benefício 1'),
('subscription', 'benefit_save_desc', 'Até 40% de desconto comparado com cortes individuais. Quanto mais cortas, mais poupas.', 'Descrição benefício 1'),
('subscription', 'benefit_flex_title', 'Flexibilidade Total', 'Título benefício 2'),
('subscription', 'benefit_flex_desc', 'Marca quando quiseres, sem compromissos. Cancela a qualquer momento sem penalizações.', 'Descrição benefício 2'),
('subscription', 'benefit_style_title', 'Estilo Sempre Perfeito', 'Título benefício 3'),
('subscription', 'benefit_style_desc', 'Mantém o teu visual sempre impecável sem te preocupares com custos extra.', 'Descrição benefício 3'),
('subscription', 'faq_title', 'Perguntas Frequentes', 'Título FAQ'),
('subscription', 'faq_unused_q', 'O que acontece se não usar todos os cortes?', 'Pergunta 1'),
('subscription', 'faq_unused_a', 'Os cortes não utilizados não acumulam para o mês seguinte. Cada mês começa com o número total de cortes incluídos no teu plano.', 'Resposta 1'),
('subscription', 'faq_cancel_q', 'Posso cancelar a qualquer momento?', 'Pergunta 2'),
('subscription', 'faq_cancel_a', 'Sim! Podes cancelar a tua assinatura quando quiseres, sem taxas ou penalizações. A assinatura mantém-se ativa até ao fim do período pago.', 'Resposta 2'),
('subscription', 'faq_booking_q', 'Como funcionam as marcações?', 'Pergunta 3'),
('subscription', 'faq_booking_a', 'Como membro premium, tens acesso prioritário às marcações. Basta ligares ou usar o sistema de marcações online como habitualmente.', 'Resposta 3')
ON CONFLICT (section, key) DO NOTHING;

-- LOYALTY PAGE
INSERT INTO site_content (section, key, value, description) VALUES
('loyalty', 'title', 'Programa de Fidelidade', 'Título principal'),
('loyalty', 'subtitle', 'Sistema de recompensas inspirado no xadrez', 'Subtítulo'),
('loyalty', 'current_tier', 'Nível Atual', 'Label nível atual'),
('loyalty', 'total_points', 'Pontos Totais', 'Label pontos totais'),
('loyalty', 'total_visits', 'Visitas Totais', 'Label visitas totais'),
('loyalty', 'next_tier', 'Próximo Nível', 'Label próximo nível'),
('loyalty', 'points_to_next', 'pontos até ao próximo nível', 'Texto pontos para próximo'),
('loyalty', 'how_it_works', 'Como Funciona', 'Título como funciona'),
('loyalty', 'earn_title', 'Ganha Pontos', 'Título ganhar'),
('loyalty', 'earn_desc', 'Cada serviço dá-te pontos. Cortes de cabelo, barbas e tratamentos especiais todos contribuem.', 'Descrição ganhar'),
('loyalty', 'level_title', 'Sobe de Nível', 'Título subir nível'),
('loyalty', 'level_desc', 'Progride de Peão a Rei, desbloqueando benefícios cada vez melhores a cada nível.', 'Descrição subir nível'),
('loyalty', 'rewards_title', 'Resgata Recompensas', 'Título resgatar'),
('loyalty', 'rewards_desc', 'Usa os teus pontos para descontos em serviços e benefícios exclusivos.', 'Descrição resgatar')
ON CONFLICT (section, key) DO NOTHING;

-- BOOKING PAGE
INSERT INTO site_content (section, key, value, description) VALUES
('booking', 'title', 'Marcar Serviço', 'Título principal'),
('booking', 'select_service', 'Selecionar Serviço', 'Label selecionar serviço'),
('booking', 'select_barber', 'Selecionar Barbeiro', 'Label selecionar barbeiro'),
('booking', 'any_barber', 'Qualquer Barbeiro Disponível', 'Opção qualquer barbeiro'),
('booking', 'select_date', 'Selecionar Data', 'Label selecionar data'),
('booking', 'select_time', 'Selecionar Horário', 'Label selecionar horário'),
('booking', 'no_slots', 'Sem horários disponíveis', 'Texto sem horários'),
('booking', 'confirm_button', 'Confirmar Marcação', 'Botão confirmar'),
('booking', 'guest_name', 'Nome Completo', 'Label nome convidado'),
('booking', 'guest_phone', 'Telemóvel', 'Label telefone convidado'),
('booking', 'guest_email', 'Email (opcional)', 'Label email convidado')
ON CONFLICT (section, key) DO NOTHING;

-- LOGIN PAGE
INSERT INTO site_content (section, key, value, description) VALUES
('login', 'title_login', 'Entrar na Conta', 'Título login'),
('login', 'title_register', 'Criar Conta', 'Título registo'),
('login', 'phone_label', 'Telemóvel', 'Label telefone'),
('login', 'phone_placeholder', '+351 931 423 262', 'Placeholder telefone'),
('login', 'name_label', 'Nome Completo', 'Label nome'),
('login', 'email_label', 'Email', 'Label email'),
('login', 'login_button', 'Entrar', 'Botão entrar'),
('login', 'register_button', 'Criar Conta', 'Botão criar conta'),
('login', 'switch_to_register', 'Criar nova conta', 'Link para registo'),
('login', 'switch_to_login', 'Já tenho conta', 'Link para login'),
('login', 'guest_link', 'Continuar como convidado', 'Link convidado')
ON CONFLICT (section, key) DO NOTHING;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_site_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS site_content_updated_at ON site_content;
CREATE TRIGGER site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW
  EXECUTE FUNCTION update_site_content_updated_at();
