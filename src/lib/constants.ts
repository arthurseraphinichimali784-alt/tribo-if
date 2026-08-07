export const SUBJECTS = [
  { value: "matematica", label: "Matemática", emoji: "🧮" },
  { value: "fisica", label: "Física", emoji: "⚛️" },
  { value: "quimica", label: "Química", emoji: "🧪" },
  { value: "biologia", label: "Biologia", emoji: "🧬" },
  { value: "portugues", label: "Português", emoji: "📚" },
  { value: "geografia", label: "Geografia", emoji: "🌍" },
  { value: "historia", label: "História", emoji: "🏛️" },
  { value: "ingles", label: "Inglês", emoji: "🗣️" },
] as const;

/** Matérias legadas mantidas apenas para exibir materiais antigos. */
const LEGACY_SUBJECTS: Record<string, string> = {
  ciencias: "Ciências",
};

export const SUBJECT_VALUES = [
  "matematica", "fisica", "quimica", "biologia",
  "portugues", "geografia", "historia", "ingles", "ciencias",
] as const;

/** Sugestões de tópicos por matéria (foco Institutos Federais). */
export const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  matematica: ["Funções", "Equações do 2º grau", "Geometria plana", "Porcentagem", "Progressões", "Trigonometria"],
  fisica: ["Cinemática", "Leis de Newton", "Energia", "Eletricidade", "Óptica", "Termologia"],
  quimica: ["Tabela periódica", "Ligações químicas", "Estequiometria", "Soluções", "Química orgânica"],
  biologia: ["Citologia", "Genética", "Ecologia", "Corpo humano", "Evolução"],
  portugues: ["Interpretação de texto", "Ortografia", "Sintaxe", "Redação", "Figuras de linguagem"],
  geografia: ["Cartografia", "Climas", "Geografia do Brasil", "Globalização", "Urbanização"],
  historia: ["Brasil colônia", "Era Vargas", "Revolução Industrial", "Guerras mundiais", "Ditadura militar"],
  ingles: ["Verb to be", "Tempos verbais", "Vocabulário", "Interpretação de texto"],
};

export const MATERIAL_TYPES = [
  { value: "resumo", label: "Resumo" },
  { value: "flashcards", label: "Flashcards" },
  { value: "mapa_mental", label: "Mapa Mental" },
  { value: "lista_exercicios", label: "Lista de Exercícios" },
  { value: "simulado", label: "Simulado" },
  { value: "outro", label: "Outro" },
] as const;

export const DIFFICULTIES = [
  { value: "facil", label: "Fácil" },
  { value: "medio", label: "Médio" },
  { value: "dificil", label: "Difícil" },
] as const;

export const subjectLabel = (v: string) =>
  SUBJECTS.find((s) => s.value === v)?.label ?? LEGACY_SUBJECTS[v] ?? v;
export const subjectEmoji = (v: string) =>
  SUBJECTS.find((s) => s.value === v)?.emoji ?? "📄";
export const typeLabel = (v: string) => MATERIAL_TYPES.find(s => s.value === v)?.label ?? v;
