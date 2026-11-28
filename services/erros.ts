import { supabase } from "./supabase";

export type Alternativas = Record<string, string>;

export type ErroSimulado = {
  questaoId: string;
  tituloSimulado: string;
  pergunta: string;
  alternativas: Alternativas;
  correta: string;
  marcada: string;
  explicacao: string | null;
  paginaFonte: number | null;
};

const LIMITE_RESPOSTAS = 1000;
const LETRAS = ["A", "B", "C", "D", "E"];

export function normalizarAlternativas(valor: unknown): Alternativas {
  if (valor && typeof valor === "object" && !Array.isArray(valor)) {
    const resultado: Alternativas = {};

    Object.entries(valor as Record<string, unknown>).forEach(
      ([chave, texto]) => {
        if (typeof texto === "string") {
          resultado[chave.toUpperCase()] = texto;
        }
      }
    );

    return resultado;
  }

  if (Array.isArray(valor)) {
    const resultado: Alternativas = {};

    valor.forEach((item, indice) => {
      if (typeof item === "string" && LETRAS[indice]) {
        resultado[LETRAS[indice]] = item;
      }
    });

    return resultado;
  }

  return {};
}

type QuizTitulo = { title: string | null };

type QuestaoLinha = {
  id: string;
  question: string;
  alternatives: unknown;
  correct_alternative: string;
  explanation: string | null;
  source_page: number | null;
  material_quizzes: QuizTitulo | QuizTitulo[] | null;
};

type RespostaLinha = {
  question_id: string;
  selected_alternative: string;
  is_correct: boolean;
  created_at: string;
  material_quiz_questions: QuestaoLinha | QuestaoLinha[] | null;
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? valor[0] ?? null : valor;
}

/*
  Registra o resultado de uma questao refeita na revisao de erros.
  Falhas apenas vao para o log: nao devem atrapalhar a revisao.
*/
export async function registrarRevisao(questaoId: string, acertou: boolean) {
  try {
    const { error } = await supabase
      .from("question_review_results")
      .insert({ question_id: questaoId, is_correct: acertou });

    if (error) {
      console.log("ERRO AO REGISTRAR REVISAO:", error);
    }
  } catch (error) {
    console.log("ERRO INESPERADO AO REGISTRAR REVISAO:", error);
  }
}

type RevisaoLinha = {
  question_id: string;
  is_correct: boolean;
  created_at: string;
};

/*
  Questoes de simulado cujo resultado MAIS RECENTE foi errado, considerando
  tanto as respostas dos simulados quanto as da revisao de erros.
  Lanca erro se a consulta dos simulados falhar.
*/
export async function carregarErrosAtuais(): Promise<ErroSimulado[]> {
  const { data, error } = await supabase
    .from("material_quiz_attempt_answers")
    .select(
      `question_id, selected_alternative, is_correct, created_at,
       material_quiz_questions (
         id, question, alternatives, correct_alternative, explanation, source_page,
         material_quizzes ( title )
       )`
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE_RESPOSTAS);

  if (error) {
    throw error;
  }

  const respostas = (data as unknown as RespostaLinha[]) ?? [];

  // Se a tabela de revisao ainda nao existir, segue so com os simulados.
  const revisoes = await supabase
    .from("question_review_results")
    .select("question_id, is_correct, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_RESPOSTAS);

  const ultimaRevisao = new Map<string, RevisaoLinha>();

  if (!revisoes.error) {
    for (const revisao of (revisoes.data as RevisaoLinha[]) ?? []) {
      if (!ultimaRevisao.has(revisao.question_id)) {
        ultimaRevisao.set(revisao.question_id, revisao);
      }
    }
  } else {
    console.log("REVISOES INDISPONIVEIS:", revisoes.error);
  }

  const vistas = new Set<string>();
  const erros: ErroSimulado[] = [];

  for (const resposta of respostas) {
    if (vistas.has(resposta.question_id)) {
      continue;
    }

    vistas.add(resposta.question_id);

    const revisao = ultimaRevisao.get(resposta.question_id);

    const acertouAgora =
      revisao && new Date(revisao.created_at) > new Date(resposta.created_at)
        ? revisao.is_correct
        : resposta.is_correct;

    if (acertouAgora) {
      continue;
    }

    const questao = primeiro(resposta.material_quiz_questions);

    if (!questao) {
      continue;
    }

    erros.push({
      questaoId: questao.id,
      tituloSimulado: primeiro(questao.material_quizzes)?.title?.trim() || "Simulado",
      pergunta: questao.question,
      alternativas: normalizarAlternativas(questao.alternatives),
      correta: questao.correct_alternative.toUpperCase(),
      marcada: resposta.selected_alternative.toUpperCase(),
      explicacao: questao.explanation,
      paginaFonte: questao.source_page,
    });
  }

  return erros;
}
