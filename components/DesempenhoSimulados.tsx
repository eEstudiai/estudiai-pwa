import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { supabase } from "../services/supabase";

type TituloQuiz = { title: string | null };

type Tentativa = {
  id: string;
  quiz_id: string;
  correct_answers: number | null;
  total_questions: number | null;
  percentage: number | string | null;
  completed_at: string;
  material_quizzes: TituloQuiz | TituloQuiz[] | null;
};

type Resumo = {
  tentativas: number;
  acertos: number;
  erros: number;
  aproveitamento: number;
  evolucao: number[];
  reforcar: { titulo: string; percentual: number } | null;
};

const LIMITE_TENTATIVAS = 200;

function numero(valor: unknown) {
  const n = Number(valor);

  return Number.isFinite(n) ? n : 0;
}

function tituloDoQuiz(tentativa: Tentativa) {
  const quiz = Array.isArray(tentativa.material_quizzes)
    ? tentativa.material_quizzes[0]
    : tentativa.material_quizzes;

  return quiz?.title?.trim() || "Simulado";
}

function calcularResumo(tentativas: Tentativa[]): Resumo {
  let acertos = 0;
  let total = 0;

  for (const t of tentativas) {
    acertos += numero(t.correct_answers);
    total += numero(t.total_questions);
  }

  const ultimas = tentativas.slice(0, 5).reverse();

  const evolucao = ultimas.map((t) =>
    Math.max(0, Math.min(100, Math.round(numero(t.percentage))))
  );

  const ultimaPorQuiz = new Map<string, Tentativa>();

  for (const t of tentativas) {
    if (!ultimaPorQuiz.has(t.quiz_id)) {
      ultimaPorQuiz.set(t.quiz_id, t);
    }
  }

  let pior: Tentativa | null = null;

  for (const t of ultimaPorQuiz.values()) {
    if (!pior || numero(t.percentage) < numero(pior.percentage)) {
      pior = t;
    }
  }

  return {
    tentativas: tentativas.length,
    acertos,
    erros: Math.max(0, total - acertos),
    aproveitamento: total > 0 ? Math.round((acertos / total) * 100) : 0,
    evolucao,
    reforcar: pior
      ? {
          titulo: tituloDoQuiz(pior),
          percentual: Math.round(numero(pior.percentage)),
        }
      : null,
  };
}

export default function DesempenhoSimulados() {
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      const carregar = async () => {
        try {
          const { data, error } = await supabase
            .from("material_quiz_attempts")
            .select(
              "id, quiz_id, correct_answers, total_questions, percentage, completed_at, material_quizzes ( title )"
            )
            .order("completed_at", { ascending: false })
            .limit(LIMITE_TENTATIVAS);

          if (!ativo) {
            return;
          }

          if (error) {
            console.log("ERRO AO CARREGAR DESEMPENHO:", error);
            setResumo(null);
            return;
          }

          const tentativas = (data as unknown as Tentativa[]) ?? [];

          setResumo(tentativas.length > 0 ? calcularResumo(tentativas) : null);
        } catch (error) {
          console.log("ERRO INESPERADO NO DESEMPENHO:", error);

          if (ativo) {
            setResumo(null);
          }
        }
      };

      void carregar();

      return () => {
        ativo = false;
      };
    }, [])
  );

  if (!resumo) {
    return null;
  }

  const precisaReforco =
    resumo.reforcar !== null && resumo.reforcar.percentual < 70;

  return (
    <View style={s.card}>
      <Text style={s.titulo}>Desempenho nos simulados</Text>

      <Text style={s.legenda}>
        {resumo.tentativas === 1
          ? "Baseado em 1 simulado respondido"
          : `Baseado em ${resumo.tentativas} simulados respondidos`}
      </Text>

      <View style={s.metricas}>
        <View style={s.metrica}>
          <Text style={s.metricaNumero}>{resumo.aproveitamento}%</Text>
          <Text style={s.metricaTexto}>Aproveitamento</Text>
        </View>

        <View style={s.metrica}>
          <Text style={[s.metricaNumero, s.verde]}>{resumo.acertos}</Text>
          <Text style={s.metricaTexto}>Acertos</Text>
        </View>

        <View style={s.metrica}>
          <Text style={[s.metricaNumero, s.vermelho]}>{resumo.erros}</Text>
          <Text style={s.metricaTexto}>Erros</Text>
        </View>
      </View>

      {resumo.evolucao.length > 1 ? (
        <View style={s.evolucao}>
          <Text style={s.evolucaoTitulo}>Evolução das últimas tentativas</Text>

          <View style={s.barras}>
            {resumo.evolucao.map((percentual, indice) => (
              <View key={indice} style={s.barraColuna}>
                <Text style={s.barraValor}>{percentual}%</Text>
                <View
                  style={[
                    s.barra,
                    { height: Math.max(6, Math.round(percentual * 0.5)) },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {resumo.reforcar ? (
        <View style={[s.aviso, precisaReforco ? s.avisoAtencao : s.avisoOk]}>
          <Text style={s.avisoTexto}>
            {precisaReforco
              ? `Para reforçar: ${resumo.reforcar.titulo} (${resumo.reforcar.percentual}% na última tentativa)`
              : "Bom trabalho! Seus simulados mais recentes estão acima de 70%."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8E7FA",
    padding: 16,
  },
  titulo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172B4D",
  },
  legenda: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
  },
  metricas: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  metrica: {
    flex: 1,
    backgroundColor: "#EEF4FD",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  metricaNumero: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1769D2",
  },
  metricaTexto: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
  },
  verde: {
    color: "#15803D",
  },
  vermelho: {
    color: "#DC2626",
  },
  evolucao: {
    marginTop: 16,
  },
  evolucaoTitulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172B4D",
  },
  barras: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 8,
    minHeight: 70,
  },
  barraColuna: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barraValor: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 3,
  },
  barra: {
    width: "100%",
    borderRadius: 6,
    backgroundColor: "#1769D2",
  },
  aviso: {
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
  },
  avisoAtencao: {
    backgroundColor: "#FFF3E0",
  },
  avisoOk: {
    backgroundColor: "#E8F6EC",
  },
  avisoTexto: {
    fontSize: 13,
    lineHeight: 19,
    color: "#172B4D",
  },
});
