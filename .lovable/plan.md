# Professores verificados, Minha Biblioteca, licenças e denúncias

Análise do que já existe (preservado, sem recriar):
- `profiles` (com `is_teacher`, `institute`, `state`, `hourly_rate`, XP/nível/trust)
- `materials` (com `price`, `file_path`, bucket privado `materials`)
- `favorites`, `material_views`, `analytics_events`, `comments`, `follows`
- `reports` já existe (denunciante, alvo material/comentário/usuário, motivo, status pendente/resolvido/rejeitado) + área admin básica
- `user_roles` + `has_role` (admin) e rota `/admin` protegida
- Autenticação Google/e-mail funcionando; **ainda não há provedor de pagamento ativo** (Stripe/Pix pendem do plano Pro)

## 1. Verificação de professores

Novo em `profiles`: `user_type` (aluno/professor), `teaching_area`, `teaching_role`, `verification_status`
(`nao_verificado` | `pendente` | `verificado` | `rejeitado`), `verified_at`, `verification_method`.
Esses campos são **somente leitura para o próprio usuário** — só o backend admin altera status.

Nova tabela `teacher_verifications`: usuário, instituição, área, cargo, e-mail institucional, caminho do
documento, método, status, motivo da rejeição, admin revisor, datas. RLS: o professor vê e cria apenas a
própria solicitação (e só enquanto pendente); admins veem e julgam todas.

Novo bucket **privado** `verification-docs`: upload apenas em `verification-docs/{auth.uid()}/...`;
leitura apenas pelo próprio dono e por admins (via backend). Nenhuma URL pública.

Páginas: aba "Verificação" no painel do professor (`/dashboard`) para enviar/acompanhar a solicitação, e
aba "Verificações" em `/admin` para aprovar/rejeitar com motivo e histórico.

Selo: `🟢 Professor verificado` + linha "Professor de Matemática • IFES" no perfil e nos cards/página de
material. O selo indica apenas vínculo comprovado — nenhum texto de qualidade/"oficial".

## 2. Compras, licenças e acesso

Nova tabela `purchases`: `id`, `license_code` (ex. `SH-8F3K92`, único), comprador, material, autor,
`amount`, `platform_fee` (5%), `status` (`pendente`|`pago`|`cancelado`|`reembolsado`|`falhou`), provedor e
id externo do pagamento, datas. RLS: comprador vê só as próprias; **ninguém insere/atualiza pelo cliente**
(escrita só por server function/serviço). Material gratuito gera licença automática no primeiro acesso, via
server function que valida preço = 0 no banco.

Função SQL `has_material_access(user, material)` (security definer): autor, admin, material gratuito ou
compra `pago`. Usada nas policies e no backend.

Nova tabela `material_progress`: usuário + material, `progress_percent`, `last_page`, `last_accessed_at`.
RLS estrita por `auth.uid()`.

## 3. Minha Biblioteca (`/biblioteca`)

Abas: Todos • Recentes • Favoritos • Comprados. Cada item mostra capa, título, autor (com selo), disciplina,
data de aquisição, progresso e botão "Abrir material"/"Continuar estudando". Entra no menu do Header e na
MobileNav.

## 4. Antipirataria

- Bucket `materials` continua **privado**; nada de URL pública.
- A URL assinada de material pago passa a ser emitida por server function que confere a licença — hoje o
  cliente pede a URL direto ao storage, isso será fechado.
- Página de material: pagos sem licença mostram apenas prévia limitada (1ª página/descrição) + botão de compra.
- Rodapé discreto de marca d'água na visualização: `LICENÇA SH-8F3K92 • Arthur S. • conta ****4a25`.
  Observação honesta: marca d'água **dentro do PDF** exigiria reescrever o arquivo no servidor, o que não é
  viável no runtime atual (sem libs nativas). Fazemos overlay no visualizador + licença rastreável por compra.
- Downloads de pagos passam pelo backend com verificação de licença e registro do evento.

## 5. Denúncias

Reaproveita `reports` (sem recriar): acrescenta status `em_analise`, motivos de pirataria/cópia/direitos
autorais/professor falso e o admin responsável. Botão "Denunciar" já existe em materiais; passa a existir
também em perfis. Área admin ganha filtro por status e registro de quem analisou.

## 6. Segurança / auditoria

Revisão de RLS em profiles, materials, purchases, material_progress, teacher_verifications, reports,
favorites e objetos de storage; GRANTs explícitos em toda tabela nova; nenhuma policy `using(true)` para
dados sensíveis. Ao final, rodo o linter e testo no navegador: acesso sem licença negado, tentativa de
autoaprovação negada, tentativa de alterar `payment_status` negada, documentos de outro professor negados.

## Detalhes técnicos

- Migrações incrementais (`ALTER TABLE` + novas tabelas), sem drop de tabelas existentes.
- Backend em TanStack `createServerFn` (`purchases.functions.ts`, `library.functions.ts`,
  `verification.functions.ts`), com `requireSupabaseAuth`; admin valida `has_role` server-side.
- UI reutiliza os componentes atuais (glass, gradientes, MaterialCard) — sem novo estilo visual.

## Limitações conhecidas

- **Sem provedor de pagamento ativo**: a estrutura de compras fica pronta e segura, mas a confirmação de
  pagamento só será real quando Stripe/Pix for plugado (plano Pro). Até lá, compras pagas ficam `pendente` e
  não liberam acesso; apenas materiais gratuitos geram licença. Não vou simular pagamento aprovado.
- Marca d'água é overlay na visualização, não impressa no arquivo baixado.
