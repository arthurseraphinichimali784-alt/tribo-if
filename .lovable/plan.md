# StudyHUB IF — Evolução para plataforma de estudos

## 1. O que já existe (análise)

**Banco (reaproveitar, não recriar):**
- `profiles` — professor, verificação, XP, nível, trust
- `materials` — matéria, tipo, dificuldade, preço, `topics[]`, `preview_pages`, contadores
- `purchases` + `gen_license_code()` + `has_material_access()` — compras e licenças
- `material_progress`, `material_views`, `material_access_log`, `favorites`, `material_likes`
- `comments`, `notifications`, `reports`, `user_streaks`, `subject_scores`, `user_badges`
- `teacher_verifications`, `platform_settings`, `user_roles` + `has_role()`
- Buckets: `materials` (privado), `verification-docs` (privado), `avatars` (público)

**Frontend:** rotas `/`, `/marketplace`, `/material/$id`, `/biblioteca`, `/upload`, `/dashboard`, `/admin`, `/u/$username`, `/tutores`, `/salvos`, `/configuracoes`. Server functions em `src/lib/*.functions.ts`, arquivo protegido em `/api/public/material-file`.

**Lacunas reais:** tipos de conteúdo limitados (6), sem nível/série/objetivo, sem Kits, sem banco de questões/simulados, sem avaliações (rating é estático), sem trilha por objetivo de prova, home ainda “loja”.

---

## 2. Mudanças no banco (incrementais, sem DROP)

**Alterar existentes**
- `materials`: novas colunas `level`, `school_year`, `goals[]`, `content_flags jsonb` (ex.: `{pdf:true, video:3, exercicios:35, gabarito:true}`), `rating_count`. Enum `material_type` ganha: `pdf`, `video`, `pdf_video`, `apostila`, `infografico`, `atividade`, `curso`, `aula`, `material_externo`, `prova_anterior`, `gabarito`, `livro`. Enum `subject` ganha `informatica`. Valores antigos preservados.
- `notifications`: novos tipos (`kit`, `compra`, `avaliacao`, `simulado`, `recomendacao`, `meta`).

**Novas tabelas**
- `kits` + `kit_items` (referência a materiais existentes — nada duplicado)
- `questions`, `question_options`, `question_sets`, `question_set_items`
- `quiz_attempts`, `quiz_answers` (desempenho por questão)
- `topic_progress` (progresso por assunto: não iniciado / em andamento / concluído)
- `exam_tracks` + `track_topics` (trilhas por objetivo, ex.: IFES Técnico em Informática)
- `reviews` (avaliação 1–5 + critérios, 1 por usuário/produto, flag `verified_purchase`)

**Regras (RLS/GRANT em toda tabela nova)**
- Kits: leitura pública só se publicado; escrita só do autor. Compra de Kit reaproveita `purchases` (coluna `kit_id` opcional) e libera acesso a todos os materiais do Kit via extensão de `has_material_access`.
- Questões: leitura pública das publicadas, **sem** expor resposta correta ao anon — resposta/explicação servidas por server function após envio.
- `quiz_attempts`/`quiz_answers`/`topic_progress`/`reviews`: escopo `auth.uid()`.
- `reviews`: só quem tem compra `pago` (ou material gratuito adquirido) pode avaliar; média recalculada por trigger, nunca pelo frontend.
- XP por estudo/questões via trigger com limite diário para impedir farming.

---

## 3. Backend (server functions, sem Edge Functions)

- `kits.functions.ts` — criar/editar/publicar Kit, calcular economia, comprar Kit (preço vem do banco).
- `questions.functions.ts` — listar questões (sem gabarito), iniciar tentativa, enviar respostas, corrigir no servidor, devolver análise.
- `progress.functions.ts` — marcar assunto, progresso agregado por matéria/trilha.
- `reviews.functions.ts` — criar/editar avaliação com verificação de compra.
- `recommendations.functions.ts` (evoluir o existente) — “O que estudar agora?” usando erros por assunto + progresso + objetivo.
- `ai.functions.ts` — ações contextuais (explicar erro, explicar mais simples, gerar questão parecida, plano de estudo) via Lovable AI, com o contexto do aluno montado no servidor.

Tudo com validação de preço, propriedade, pagamento e acesso **somente no backend**. APIs em formato DTO simples, reutilizáveis por um app Android futuro.

---

## 4. Frontend

- **Tags/flairs visuais**: componente `ContentTypeBadge` + `TagChips` usados em card, marketplace, produto, biblioteca.
- **Marketplace**: filtros combináveis (matéria, assunto, tipo, nível, série, dificuldade, objetivo, preço, avaliação, Kits).
- **Página de produto**: “Este material contém”, avaliações com compra verificada, autor/professor verificado; para Kit, lista de itens e economia.
- **Kits**: `/kits`, `/kit/$id`, criação em `/dashboard`.
- **Estudos**: `/estudar` (trilhas por objetivo com progresso por assunto), `/questoes` e `/simulado/$id` com resultado e análise de desempenho, ações de IA no resultado.
- **Biblioteca**: agrupar por matéria/objetivo/status, incluir Kits.
- **Home**: “Continue estudando”, “Recomendado para você”, “Seus pontos fracos”, “Próximo objetivo”, Kits em destaque, professores verificados, novos materiais.
- Perfil de professor ganha abas Materiais / Kits / Avaliações.

---

## 5. Entrega em fases

1. **Fase 1** — Tags/flairs, classificação educacional (nível, série, objetivo), filtros e busca avançada, novos tipos de conteúdo.
2. **Fase 2** — Kits (banco, criação, página, compra, acesso).
3. **Fase 3** — Questões, simulados, correção server-side e análise de desempenho.
4. **Fase 4** — Progresso por assunto, trilhas de prova, recomendações e nova Home.
5. **Fase 5** — Avaliações com compra verificada + ações de IA educacional.
6. **Fase 6** — Auditoria de segurança (RLS, storage, preços, XP, permissões) e verificação de fluxos.

Cada fase é uma migração incremental própria, sem DROP e sem perda de dados.

## 6. Detalhes técnicos

- Enums estendidos com `ALTER TYPE ... ADD VALUE` (nunca recriados).
- Toda `CREATE TABLE` acompanhada de `GRANT` + RLS + policies na mesma migração.
- Acesso a arquivos continua exclusivamente por `/api/public/material-file` com marca d'água e licença.
- Sem duplicação de arquivos: Kit referencia `materials.id`.
