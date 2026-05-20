# Plano: Glow-up social, visual e de UX do StudyHub IF

Objetivo: deixar a plataforma mais viva, moderna e "viciante" (estilo Duolingo + Reddit + Notion), reforçando progresso constante e identidade do usuário. Sem inflar com features novas — apenas polir, conectar e dar feedback visual ao que já existe.

---

## 1. Homepage que respira progresso (`src/routes/index.tsx`)

Hoje a home mostra "Sem recomendações", "Sem tendências" e "Sem atividade" — empty states frios. Vou reorganizar em uma estrutura sticky que dá sensação de jornada:

- **Hero contextual**: se logado, troca o hero genérico por uma faixa "Bom dia, @user 👋 — streak de X dias, faltam Y XP pro nível Z". Barra de XP animada no topo (estilo Duolingo).
- **Quick actions** (4 botões grandes): Publicar material · Continuar lendo · Ver salvos · Meu perfil.
- **Feed reorganizado** em abas: Para você · Em alta · Novos · Seguindo (placeholder visual por ora).
- **Empty states elegantes**: ilustração leve + CTA ("Curta seu primeiro material pra destravar recomendações").
- **Sidebar direita** (desktop): mini-leaderboard top 5 da semana + sua posição, streak flame, próxima badge a desbloquear (com barra de progresso).
- **Microanimações** (framer-motion já instalado): fade-in escalonado dos cards, hover lift, contador de XP que tweena.

## 2. Cards de material redesenhados (`src/components/MaterialCard.tsx`)

- Cover com gradient overlay + emoji da matéria como fallback (sem cover_url).
- Badge de dificuldade colorido + tipo (resumo/flashcard) com ícone.
- Footer denso estilo Reddit: 👍 likes · 🔖 saves · 💬 comments · ⬇ downloads — tudo em uma linha compacta.
- Mini-avatar + @autor + trust score badge ao lado.
- Hover: leve scale + brilho do gradient + reveal de "Abrir →".
- Skeleton já existe; ajustar pra combinar com novo card.

## 3. Perfis vivos e personalizados (`src/routes/u.$username.tsx` + `dashboard.tsx`)

- **Banner customizável** (cor/gradient escolhido a partir da matéria forte do usuário — ex: roxo pra história, verde pra biologia). Por ora, gradient gerado do username.
- **Avatar com anel de nível** (estilo Discord): cor do anel muda por tier (1-5 prata, 6-10 ouro, 11+ diamante).
- **Stats em destaque**: nível grande no centro, XP barra abaixo, streak flame, trust score com tooltip explicando como é calculado.
- **Tabs**: Materiais · Conquistas · Atividade · Sobre.
- **Showcase de badges** no topo (3 destacadas) + grid completa na tab.
- **Próxima conquista** com barra: "Falta 1 publicação pra ganhar Veterano".
- Dashboard (privado): mesma identidade visual + bloco "Sua semana" (mini-gráfico de XP ganho por dia, sem precisar de lib pesada — divs).

## 4. Trust Score visualmente claro (`src/components/TrustPanel.tsx`)

- Anel circular SVG animado (0-100) com cor gradiente (vermelho→amarelo→verde).
- Breakdown clicável: "+15 por 3 materiais publicados", "+8 por 24 likes recebidos", etc.
- Tooltip "como subir": lista acionável de próximos passos.

## 5. UX de postagem (`src/routes/upload.tsx`)

Hoje é um form simples. Vou transformar em wizard de 3 passos com preview:

1. **Arquivo** — drag & drop grande, preview do PDF inline assim que sobe, validação de tamanho/tipo visível.
2. **Detalhes** — título, descrição, matéria (com emoji), tipo, dificuldade. Preview do card atualizando ao vivo à direita.
3. **Publicação** — preço (slider 0-50 com label "Grátis"/"Premium"), checkbox "publicar agora", confirmação.

Feedback de sucesso: confete leve + "+10 XP" animado + redirect pro material com toast "Publicado!".

## 6. Sistema social leve

- **Botão Seguir** no perfil (tabela `follows` simples: follower_id / following_id) — só visual + contador, sem timeline complexa.
- **Atividade na home**: a query `getActivity` já existe, mas o feed está vazio porque eventos não estão sendo registrados em algumas ações. Auditar `src/lib/analytics.ts` e garantir tracking em like, save, comment, publish.
- **Notificação leve**: sino no Header com contador de "alguém curtiu seu material" (poll a cada 60s ou realtime). Dropdown simples.
- **Reactions** no comentário (já tem like; adicionar 🔥 e 🎯) — só visual + agregação.

## 7. Header e navegação (`src/components/Header.tsx`)

- Sticky com blur (`backdrop-blur`).
- XP bar fininha no rodapé do header (estilo Duolingo top bar).
- Avatar dropdown: perfil, salvos, dashboard, sair.
- Mobile: bottom nav fixa (Home · Marketplace · Publicar · Salvos · Perfil) — padrão app moderno.

## 8. Bugs e arquivos possivelmente quebrados

Vou rodar uma auditoria:
- Verificar se todos os imports em `routeTree.gen.ts` resolvem.
- Conferir RLS/policies das tabelas novas (favorites, comments, user_streaks, badges) — se o feed tá vazio, pode ser policy bloqueando leitura anônima.
- Validar que triggers de XP estão somando (consultar `profiles.xp` de um user que curtiu/publicou).
- Confirmar bucket `materials` existe e signed URL funciona (já vimos issue no Brave).
- Checar `useAuth` persistência (problema histórico) — garantir `getSession()` no boot + `onAuthStateChange`.

## 9. Design tokens (`src/styles.css`)

- Adicionar tokens para tiers (bronze/prata/ouro/diamante), streak (flame gradient), XP bar.
- Ajustar `--gradient-hero` e `--shadow-glow` pra ter mais profundidade.
- Animações utilitárias: `xp-pulse`, `flame-flicker`, `card-lift`.

---

## Detalhes técnicos

- **Stack**: TanStack Start + Supabase + framer-motion (já instalado) + Tailwind.
- **Sem libs novas pesadas**: leaderboard e mini-gráficos em SVG/divs puras.
- **Realtime**: usar hooks já existentes (`useUserStats`, `useStreak`) — só estender pra disparar animação de "+XP" quando muda.
- **Migrations necessárias**: tabela `follows` (follower_id, following_id, created_at, unique) com RLS. Possível ajuste de policies em `analytics_events` pra permitir SELECT público no feed de atividade.
- **Arquivos a criar**:
  - `src/components/XPBar.tsx`, `src/components/LevelRing.tsx`, `src/components/TrustRing.tsx`
  - `src/components/home/HeroLogged.tsx`, `src/components/home/Leaderboard.tsx`, `src/components/home/QuickActions.tsx`
  - `src/components/profile/ProfileBanner.tsx`, `src/components/profile/NextBadge.tsx`
  - `src/components/upload/UploadWizard.tsx` (+ steps)
  - `src/components/MobileNav.tsx`, `src/components/NotificationBell.tsx`
  - `src/hooks/useFollow.ts`, `src/hooks/useLeaderboard.ts`, `src/hooks/useNotifications.ts`
- **Arquivos a refatorar**: `index.tsx`, `MaterialCard.tsx`, `Header.tsx`, `TrustPanel.tsx`, `u.$username.tsx`, `dashboard.tsx`, `upload.tsx`, `styles.css`, `lib/analytics.ts`.

---

## Ordem de execução

1. Auditoria + fixes de bugs (auth, policies, tracking)
2. Migration `follows` + ajustes de policies
3. Tokens + componentes atômicos (XPBar, LevelRing, TrustRing)
4. Header novo + MobileNav
5. MaterialCard novo
6. Homepage reorganizada
7. Perfis (público + dashboard)
8. Upload wizard
9. Notificações + follow + reactions
10. Polish final (animações, empty states)

Diz "vai" que eu executo tudo em sequência — ou me fala se quer dividir em fases menores (ex: "só fases 1-5 agora").