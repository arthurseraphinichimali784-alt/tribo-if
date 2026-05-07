export const SUBJECTS = [
  { value: "matematica", label: "Matemática", emoji: "🧮" },
  { value: "portugues", label: "Português", emoji: "📚" },
  { value: "ciencias", label: "Ciências", emoji: "🔬" },
  { value: "geografia", label: "Geografia", emoji: "🌍" },
  { value: "historia", label: "História", emoji: "🏛️" },
  { value: "ingles", label: "Inglês", emoji: "🗣️" },
] as const;

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

export const subjectLabel = (v: string) => SUBJECTS.find(s => s.value === v)?.label ?? v;
export const typeLabel = (v: string) => MATERIAL_TYPES.find(s => s.value === v)?.label ?? v;
