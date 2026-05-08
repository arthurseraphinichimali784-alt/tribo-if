
Você pediu **8 sistemas grandes** numa única mensagem. Implementar tudo de uma vez resultaria em código superficial, bugs e dívida técnica. Proponho dividir em **5 fases incrementais**, cada uma entregável e testável. Você aprova a fase e eu executo — não preciso reaprovar a cada commit dentro dela.

---

## Fase 1 — Fundamentos de dados (banco + tracking)
**Por que primeiro:** todas as outras features dependem dessas tabelas e do tracking de eventos.

**Banco (migration única):**
- `analytics_events` — `id, user_id (nullable), event_type, entity_type, entity_id, metadata jsonb, created_at` + índices em `(event_type, created_at)` e `(user_id, created_at)`.
- `material_views` — `id, user_id, material_id, duration_seconds, created_at` (alimenta tempo de leitura, retenção, recomendação).
- `favorites` já existe — adicionar policies/índices que faltam e contador `saves_count` em `materials` via trigger.
- `comments` — `id, material_id, user_id, parent_id (nullable, self-FK), body, likes, is_pinned, created_at`.
- `comment_likes` — `comment_id, user_id` (PK composta).
- `user_streaks` — `user_id PK, current_streak, longest_streak, last_activity_date`.
- `badges` + `user_badges` — sistema de conquistas extensível.
- Triggers: incrementar `saves_count`, atualizar streak no primeiro evento do dia, dar XP por ações (já existem alguns).

**Tracking client:**
- `src/lib/analytics.ts` — `track(event, props)` com batching (flush a cada 5s ou 10 eventos) para não impactar performance.
- Hook `useTrackView(materialId)` — registra entrada/saída na página de material com `duration`.

**Fallback PDF (rápido, encaixa aqui):**
- Em `material.$id.tsx`, detectar erro do `<object>` (timeout 3s sem load) e cair direto no Google Docs Viewer; botão manual "Tentar outro visualizador".

---

## Fase 2 — Perfil + Gamificação visível
- Rota `/u/$username` com avatar, bio, trust, nível, XP, streak, badges, matérias fortes (já temos `subject_scores`), materiais publicados e populares do autor.
- Componentes: `ProfileHeader`, `StreakFlame`, `BadgeGrid`, `XPBar` animado (framer-motion).
- Toast "+10 XP" e animação de level-up usando `useUserStats` realtime já existente.
- Página `/configuracoes/perfil` para editar bio/avatar (upload no bucket `avatars`).

---

## Fase 3 — Engajamento (favoritos + comentários)
- Botão favoritar no `MaterialCard` e na página de detalhe (otimista, realtime).
- Página `/salvos` listando favoritos.
- Thread de comentários na página de material: criar, responder (1 nível), curtir, ordenação por relevância (`likes * 2 + recência`), pin pelo autor do material.
- Realtime nos comentários.

---

## Fase 4 — Feed dinâmico + Recomendações
- Home `/` reformulada com seções:
  - "Recomendado para você" (baseado em matérias mais vistas/curtidas/salvas — score simples: `view*1 + like*3 + save*5 + download*2`).
  - "Em alta esta semana" (materials ordenados por `likes + downloads + saves` com decay temporal).
  - "Atividade recente" (lê de `analytics_events` filtrando tipos públicos).
  - "Continue de onde parou" (último material visto).
- Skeletons, estados vazios, animações suaves.

---

## Fase 5 — Dashboard admin
- Rota `/admin` protegida por `has_role(uid, 'admin')`.
- Cards: usuários totais/ativos 7d, materiais publicados, eventos por dia, top materiais, top matérias, taxa de retorno (D1/D7/D30).
- Gráficos com `recharts` (já no shadcn). Queries via `createServerFn` com `supabaseAdmin` para agregações.

---

## Como prosseguir
Sugiro começarmos pela **Fase 1** agora — sem ela, todo o resto fica em cima de dados frágeis.

Responda com:
- **"vai fase 1"** → começo imediatamente.
- **"vai tudo"** → executo as 5 fases em sequência (vai gastar muitos créditos e o resultado de cada fase será mais raso).
- Ou ajuste a ordem/escopo como preferir.
