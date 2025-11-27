# Sistema de Permissões de Administradores

## Visão Geral

O Magic Barbershop possui um sistema hierárquico de permissões com 3 níveis de acesso:

### 1. **Super Administrador** (Maycon)
- Acesso total e irrestrito a todas as funcionalidades
- Único que pode gerenciar permissões de outros administradores
- Não pode ter permissões removidas

### 2. **Administrador**
- Acesso controlado pelo Super Administrador
- Apenas tem acesso às funcionalidades com permissão concedida
- Ideal para gerentes ou funcionários de confiança

### 3. **Barbeiro**
- Acesso limitado aos seus próprios agendamentos e dados
- Não pode ver dados de outros barbeiros
- Foco em atendimento ao cliente

## Permissões Disponíveis

| Permissão | Descrição |
|-----------|-----------|
| **Ver Dashboard** | Visualizar dashboard principal com métricas gerais |
| **Gerenciar Agendamentos** | Ver e gerenciar todos os agendamentos |
| **Gerenciar Clientes** | Ver e gerenciar clientes |
| **Gerenciar Serviços** | Criar, editar e remover serviços |
| **Gerenciar Barbeiros** | Criar, editar e remover barbeiros |
| **Gerenciar Assinaturas** | Ver e gerenciar planos e assinaturas |
| **Ver Receitas** | Visualizar receitas e relatórios financeiros |
| **Gerenciar Receitas** | Registrar pagamentos e gerenciar receitas |
| **Gerenciar Comissões** | Ver e gerenciar comissões de barbeiros |
| **Ver Relatórios** | Visualizar relatórios e estatísticas |
| **Gerenciar Horários** | Gerenciar horários de funcionamento |
| **Gerenciar Configurações** | Alterar configurações do sistema |
| **Gerenciar Administradores** | Criar e gerenciar administradores (APENAS super admin) |
| **Gerenciar Marca** | Alterar logo, cores e visual do sistema |

## Como Usar

### Promover Barbeiro a Administrador

1. Vá em **Admin Dashboard** → **Barbeiros**
2. Clique no ícone de **coroa dourada** ao lado do barbeiro
3. Confirme a promoção
4. O barbeiro será convertido em administrador SEM PERMISSÕES
5. Vá em **Permissões** para conceder acesso

### Gerenciar Permissões

1. Vá em **Admin Dashboard** → **Permissões**
2. Selecione um administrador da lista à esquerda
3. Clique nas permissões que deseja conceder/remover
4. Use "Conceder Todas" ou "Remover Todas" para ações em massa

### Botões Rápidos

- **Conceder Todas**: Dá todas as permissões ao administrador selecionado
- **Remover Todas**: Remove todas as permissões do administrador

## Importante

- Super Administrador sempre tem todas as permissões (não pode ser alterado)
- Barbeiros não aparecem na lista de permissões (têm acesso próprio)
- Administradores sem permissões não conseguem acessar nenhuma funcionalidade
- Permissão "Gerenciar Administradores" é exclusiva do Super Admin

## Estrutura Técnica

### Banco de Dados

```sql
-- Tabela de permissões disponíveis
admin_permissions (
  permission_key TEXT,   -- Chave única (ex: 'view_dashboard')
  permission_name TEXT,  -- Nome amigável
  description TEXT       -- Descrição
)

-- Tabela de permissões por usuário
admin_user_permissions (
  admin_user_id UUID,    -- ID do administrador
  permission_key TEXT,   -- Permissão concedida
  granted_by UUID,       -- Quem concedeu
  granted_at TIMESTAMP   -- Quando foi concedido
)
```

### Funções Úteis

```typescript
// No componente React
const { hasPermission } = useAuth();

if (hasPermission('manage_appointments')) {
  // Mostrar funcionalidade
}
```

## Fluxo Completo

1. **Criar Barbeiro** → Barbeiro trabalha normalmente
2. **Promover a Admin** → Perde acesso de barbeiro, vira admin sem permissões
3. **Conceder Permissões** → Define o que pode acessar no sistema
4. **Login do Admin** → Vê apenas o que tem permissão

## Segurança

- Row Level Security (RLS) ativado em todas as tabelas
- Super admin tem acesso total sempre
- Admins só veem dados que têm permissão
- Barbeiros isolados aos seus próprios dados
- Auditoria: registra quem concedeu cada permissão
