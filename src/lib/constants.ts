export const SUBJECTS = [
  { value: "matematica", label: "Matemática", emoji: "🧮" },
  { value: "fisica", label: "Física", emoji: "⚛️" },
  { value: "quimica", label: "Química", emoji: "🧪" },
  { value: "biologia", label: "Biologia", emoji: "🧬" },
  { value: "portugues", label: "Português", emoji: "📚" },
  { value: "geografia", label: "Geografia", emoji: "🌍" },
  { value: "historia", label: "História", emoji: "🏛️" },
  { value: "ingles", label: "Inglês", emoji: "🗣️" },
  { value: "informatica", label: "Informática", emoji: "💻" },
] as const;

/** Matérias legadas mantidas apenas para exibir materiais antigos. */
const LEGACY_SUBJECTS: Record<string, string> = {
  ciencias: "Ciências",
};

export const SUBJECT_VALUES = [
  "matematica", "fisica", "quimica", "biologia",
  "portugues", "geografia", "historia", "ingles", "informatica", "ciencias",
] as const;

/** Sugestões de tópicos por matéria (foco Institutos Federais). */
export const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  matematica: ["Funções", "Equações do 2º grau", "Produtos notáveis", "Fatoração", "Geometria plana", "Porcentagem", "Progressões", "Trigonometria"],
  fisica: ["Cinemática", "Leis de Newton", "Energia", "Eletricidade", "Óptica", "Termologia"],
  quimica: ["Tabela periódica", "Ligações químicas", "Estequiometria", "Soluções", "Química orgânica"],
  biologia: ["Citologia", "Genética", "Ecologia", "Corpo humano", "Evolução"],
  portugues: ["Interpretação de texto", "Ortografia", "Sintaxe", "Redação", "Figuras de linguagem"],
  geografia: ["Cartografia", "Climas", "Geografia do Brasil", "Globalização", "Urbanização"],
  historia: ["Brasil colônia", "Era Vargas", "Revolução Industrial", "Guerras mundiais", "Ditadura militar"],
  ingles: ["Verb to be", "Tempos verbais", "Vocabulário", "Interpretação de texto"],
  informatica: ["Lógica de programação", "Hardware", "Redes", "Algoritmos", "Planilhas"],
};

/** Tipos de conteúdo (flairs). Extensível: basta adicionar aqui e no enum do banco. */
export const MATERIAL_TYPES = [
  { value: "pdf", label: "PDF", emoji: "📄" },
  { value: "video", label: "Vídeo", emoji: "🎥" },
  { value: "pdf_video", label: "PDF + Vídeo", emoji: "🎬" },
  { value: "lista_exercicios", label: "Lista de exercícios", emoji: "📝" },
  { value: "simulado", label: "Simulado", emoji: "📋" },
  { value: "resumo", label: "Resumo", emoji: "🧠" },
  { value: "apostila", label: "Apostila", emoji: "📚" },
  { value: "infografico", label: "Infográfico", emoji: "📊" },
  { value: "atividade", label: "Atividade prática", emoji: "🧪" },
  { value: "curso", label: "Curso", emoji: "🎓" },
  { value: "aula", label: "Aula", emoji: "👨‍🏫" },
  { value: "material_externo", label: "Material externo", emoji: "🔗" },
  { value: "prova_anterior", label: "Prova anterior", emoji: "🗂️" },
  { value: "gabarito", label: "Gabarito", emoji: "✅" },
  { value: "livro", label: "Livro/complementar", emoji: "📖" },
  { value: "flashcards", label: "Flashcards", emoji: "🃏" },
  { value: "mapa_mental", label: "Mapa mental", emoji: "🗺️" },
  { value: "outro", label: "Outro", emoji: "📦" },
] as const;

export const DIFFICULTIES = [
  { value: "facil", label: "Fácil", emoji: "🟢" },
  { value: "medio", label: "Médio", emoji: "🟡" },
  { value: "dificil", label: "Difícil", emoji: "🔴" },
] as const;

/** Nível de ensino do material. */
export const LEVELS = [
  { value: "fundamental", label: "Fundamental" },
  { value: "medio", label: "Médio" },
  { value: "tecnico", label: "Técnico" },
  { value: "vestibular", label: "Vestibular" },
  { value: "enem", label: "ENEM" },
  { value: "concurso", label: "Concurso" },
  { value: "faculdade", label: "Faculdade" },
  { value: "outro", label: "Outro" },
] as const;

export const SCHOOL_YEARS = [
  "6º Ano", "7º Ano", "8º Ano", "9º Ano",
  "1º Ano EM", "2º Ano EM", "3º Ano EM",
] as const;

/** Objetivo de estudo do material. */
export const GOALS = [
  { value: "aprender", label: "Aprender" },
  { value: "revisar", label: "Revisar" },
  { value: "praticar", label: "Praticar" },
  { value: "exercicios", label: "Fazer exercícios" },
  { value: "simulado", label: "Simulado" },
  { value: "prova", label: "Preparação para prova" },
  { value: "vestibular", label: "Preparação para vestibular" },
  { value: "ifes", label: "Preparação para IFES" },
  { value: "reforco", label: "Reforço" },
] as const;

export const subjectLabel = (v: string) =>
  SUBJECTS.find((s) => s.value === v)?.label ?? LEGACY_SUBJECTS[v] ?? v;
export const subjectEmoji = (v: string) =>
  SUBJECTS.find((s) => s.value === v)?.emoji ?? "📄";
export const typeLabel = (v: string) => MATERIAL_TYPES.find((s) => s.value === v)?.label ?? v;
export const typeEmoji = (v: string) => MATERIAL_TYPES.find((s) => s.value === v)?.emoji ?? "📦";
export const levelLabel = (v?: string | null) => LEVELS.find((l) => l.value === v)?.label ?? null;
export const goalLabel = (v: string) => GOALS.find((g) => g.value === v)?.label ?? v;
export const difficultyLabel = (v: string) => DIFFICULTIES.find((d) => d.value === v)?.label ?? v;
export const difficultyEmoji = (v: string) => DIFFICULTIES.find((d) => d.value === v)?.emoji ?? "⚪";

/** Rótulos amigáveis para o resumo "este material contém". */
export const CONTENT_FLAG_LABELS: Record<string, { label: string; emoji: string }> = {
  pdf: { label: "PDF", emoji: "📄" },
  video: { label: "videoaula(s)", emoji: "🎥" },
  exercicios: { label: "exercício(s)", emoji: "📝" },
  gabarito: { label: "Gabarito", emoji: "✅" },
  resumo: { label: "Resumo", emoji: "🧠" },
  simulado: { label: "Simulado", emoji: "📋" },
  plano_estudos: { label: "Plano de estudos", emoji: "📊" },
};

export const PROGRESS_STATUS = {
  nao_iniciado: { label: "Não iniciado", emoji: "⚪" },
  em_andamento: { label: "Em andamento", emoji: "🟡" },
  concluido: { label: "Concluído", emoji: "🟢" },
} as const;
