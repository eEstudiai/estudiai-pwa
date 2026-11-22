import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";

import { supabase } from "../../../../../services/supabase";

type Tentativa = {
  id: string;
  quiz_id: string;
  correct_answers: number;
  total_questions: number;
  percentage: number | string;
  completed_at: string;
};

type Quiz = {
  id: string;
  title: string | null;
};

type Questao = {
  id: string;
  position: number;
  question: string;
  alternatives: unknown;
  correct_alternative: string;
  explanation: string | null;
  source_page: number | null;
};

type RespostaTentativa = {
  id: string;
  question_id: string;
  selected_alternative: string;
  is_correct: boolean;
};

type Alternativas = Record<
  string,
  string
>;

type QuestaoRevisao = {
  respostaId: string;
  questaoId: string;
  position: number;
  question: string;
  alternatives: Alternativas;
  correctAlternative: string;
  selectedAlternative: string;
  isCorrect: boolean;
  explanation: string | null;
  sourcePage: number | null;
};

export default function RevisaoTentativaScreen() {
  const { attemptId } =
    useLocalSearchParams<{
      attemptId: string;
    }>();

  const [
    tentativa,
    setTentativa,
  ] = useState<Tentativa | null>(
    null
  );

  const [
    quiz,
    setQuiz,
  ] = useState<Quiz | null>(
    null
  );

  const [
    questoes,
    setQuestoes,
  ] = useState<QuestaoRevisao[]>(
    []
  );

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    atualizando,
    setAtualizando,
  ] = useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState<string | null>(
    null
  );

  const normalizarAlternativas = (
    valor: unknown
  ): Alternativas => {
    if (
      valor &&
      typeof valor === "object" &&
      !Array.isArray(valor)
    ) {
      const objeto =
        valor as Record<
          string,
          unknown
        >;

      const resultado: Alternativas =
        {};

      Object.entries(
        objeto
      ).forEach(
        ([chave, texto]) => {
          if (
            typeof texto ===
            "string"
          ) {
            resultado[
              chave.toUpperCase()
            ] = texto;
          }
        }
      );

      return resultado;
    }

    if (Array.isArray(valor)) {
      const letras = [
        "A",
        "B",
        "C",
        "D",
        "E",
      ];

      const resultado: Alternativas =
        {};

      valor.forEach(
        (item, index) => {
          if (
            typeof item ===
              "string" &&
            letras[index]
          ) {
            resultado[
              letras[index]
            ] = item;
          }
        }
      );

      return resultado;
    }

    return {};
  };

  const carregarDados =
    useCallback(async () => {
      try {
        setMensagemErro(null);

        if (!attemptId) {
          setMensagemErro(
            "Tentativa não encontrada."
          );

          return;
        }

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          setMensagemErro(
            "Usuário não autenticado."
          );

          return;
        }

        const {
          data: tentativaData,
          error: tentativaError,
        } = await supabase
          .from(
            "material_quiz_attempts"
          )
          .select(
            `
            id,
            quiz_id,
            correct_answers,
            total_questions,
            percentage,
            completed_at
          `
          )
          .eq(
            "id",
            attemptId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (
          tentativaError ||
          !tentativaData
        ) {
          console.log(
            "ERRO AO CARREGAR TENTATIVA:",
            tentativaError
          );

          setMensagemErro(
            "Não foi possível carregar esta tentativa."
          );

          return;
        }

        const tentativaAtual =
          tentativaData as Tentativa;

        setTentativa(
          tentativaAtual
        );

        const {
          data: quizData,
          error: quizError,
        } = await supabase
          .from(
            "material_quizzes"
          )
          .select(
            `
            id,
            title
          `
          )
          .eq(
            "id",
            tentativaAtual.quiz_id
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (
          quizError ||
          !quizData
        ) {
          console.log(
            "ERRO AO CARREGAR SIMULADO:",
            quizError
          );

          setMensagemErro(
            "Não foi possível carregar os dados do simulado."
          );

          return;
        }

        setQuiz(
          quizData as Quiz
        );

        const {
          data: respostasData,
          error: respostasError,
        } = await supabase
          .from(
            "material_quiz_attempt_answers"
          )
          .select(
            `
            id,
            question_id,
            selected_alternative,
            is_correct
          `
          )
          .eq(
            "attempt_id",
            tentativaAtual.id
          );

        if (respostasError) {
          console.log(
            "ERRO AO CARREGAR RESPOSTAS:",
            respostasError
          );

          setMensagemErro(
            "Não foi possível carregar as respostas desta tentativa."
          );

          return;
        }

        const respostas =
          (respostasData ||
            []) as RespostaTentativa[];

        if (
          respostas.length === 0
        ) {
          setQuestoes([]);

          return;
        }

        const idsQuestoes =
          respostas.map(
            (resposta) =>
              resposta.question_id
          );

        const {
          data: questoesData,
          error: questoesError,
        } = await supabase
          .from(
            "material_quiz_questions"
          )
          .select(
            `
            id,
            position,
            question,
            alternatives,
            correct_alternative,
            explanation,
            source_page
          `
          )
          .in(
            "id",
            idsQuestoes
          )
          .order(
            "position",
            {
              ascending: true,
            }
          );

        if (questoesError) {
          console.log(
            "ERRO AO CARREGAR QUESTÕES:",
            questoesError
          );

          setMensagemErro(
            "Não foi possível carregar as questões desta tentativa."
          );

          return;
        }

        const questoesOriginais =
          (questoesData ||
            []) as Questao[];

        const revisao =
          questoesOriginais
            .map((questao) => {
              const resposta =
                respostas.find(
                  (item) =>
                    item.question_id ===
                    questao.id
                );

              if (!resposta) {
                return null;
              }

              return {
                respostaId:
                  resposta.id,

                questaoId:
                  questao.id,

                position:
                  questao.position,

                question:
                  questao.question,

                alternatives:
                  normalizarAlternativas(
                    questao.alternatives
                  ),

                correctAlternative:
                  questao.correct_alternative.toUpperCase(),

                selectedAlternative:
                  resposta.selected_alternative.toUpperCase(),

                isCorrect:
                  resposta.is_correct,

                explanation:
                  questao.explanation,

                sourcePage:
                  questao.source_page,
              };
            })
            .filter(
              (
                item
              ): item is QuestaoRevisao =>
                item !== null
            );

        setQuestoes(
          revisao
        );
      } catch (error) {
        console.log(
          "ERRO INESPERADO NA REVISÃO:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao carregar a revisão."
        );
      } finally {
        setCarregando(false);
      }
    }, [attemptId]);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);

      carregarDados();
    }, [carregarDados])
  );

  const atualizar =
    async () => {
      try {
        setAtualizando(true);

        await carregarDados();
      } finally {
        setAtualizando(false);
      }
    };

  const percentualNumero = (
    valor: number | string
  ) => {
    const numero =
      Number(valor);

    if (
      Number.isNaN(numero)
    ) {
      return 0;
    }

    return Math.round(
      numero
    );
  };

  const formatarData = (
    data: string
  ) => {
    try {
      return new Date(
        data
      ).toLocaleString(
        "pt-BR"
      );
    } catch {
      return data;
    }
  };

  if (carregando) {
    return (
      <View
        style={styles.centro}
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.carregandoTexto
          }
        >
          Carregando revisão...
        </Text>
      </View>
    );
  }

  if (
    mensagemErro ||
    !tentativa ||
    !quiz
  ) {
    return (
      <View
        style={styles.erroTela}
      >
        <Text
          style={styles.erroIcone}
        >
          ⚠️
        </Text>

        <Text
          style={styles.erroTitulo}
        >
          Não foi possível abrir
          a revisão
        </Text>

        <Text
          style={styles.erroTexto}
        >
          {mensagemErro ||
            "Tentativa não encontrada."}
        </Text>

        <Pressable
          style={
            styles.botaoVoltar
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.botaoVoltarTexto
            }
          >
            Voltar
          </Text>
        </Pressable>
      </View>
    );
  }

  const percentual =
    percentualNumero(
      tentativa.percentage
    );

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={
        styles.container
      }
      refreshControl={
        <RefreshControl
          refreshing={
            atualizando
          }
          onRefresh={atualizar}
        />
      }
    >
      <Pressable
        style={
          styles.voltarTopo
        }
        onPress={() =>
          router.back()
        }
      >
        <Text
          style={
            styles.voltarTopoTexto
          }
        >
          ← Voltar
        </Text>
      </Pressable>

      <Text
        style={styles.titulo}
      >
        📝 Revisão do simulado
      </Text>

      <Text
        style={styles.subtitulo}
      >
        Confira suas respostas,
        os acertos e as explicações
        de cada questão.
      </Text>

      <View
        style={
          styles.resumoCard
        }
      >
        <Text
          style={
            styles.resumoLabel
          }
        >
          SIMULADO
        </Text>

        <Text
          style={
            styles.resumoTitulo
          }
        >
          {quiz.title ||
            "Simulado"}
        </Text>

        <Text
          style={
            styles.resumoData
          }
        >
          {formatarData(
            tentativa.completed_at
          )}
        </Text>

        <View
          style={
            styles.resultadoLinha
          }
        >
          <View
            style={
              styles.resultadoItem
            }
          >
            <Text
              style={
                styles.resultadoNumero
              }
            >
              {
                tentativa.total_questions
              }
            </Text>

            <Text
              style={
                styles.resultadoTexto
              }
            >
              Questões
            </Text>
          </View>

          <View
            style={
              styles.resultadoItem
            }
          >
            <Text
              style={
                styles.resultadoNumeroVerde
              }
            >
              {
                tentativa.correct_answers
              }
            </Text>

            <Text
              style={
                styles.resultadoTexto
              }
            >
              Acertos
            </Text>
          </View>

          <View
            style={
              styles.resultadoItem
            }
          >
            <Text
              style={
                styles.resultadoNumeroAzul
              }
            >
              {percentual}%
            </Text>

            <Text
              style={
                styles.resultadoTexto
              }
            >
              Resultado
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={
          styles.secaoTitulo
        }
      >
        Respostas
      </Text>

      {questoes.length ===
      0 ? (
        <View
          style={
            styles.vazioCard
          }
        >
          <Text
            style={
              styles.vazioIcone
            }
          >
            📭
          </Text>

          <Text
            style={
              styles.vazioTitulo
            }
          >
            Respostas não encontradas
          </Text>

          <Text
            style={
              styles.vazioTexto
            }
          >
            Esta tentativa possui
            resultado salvo, mas não
            encontramos as respostas
            individuais.
          </Text>
        </View>
      ) : (
        questoes.map(
          (questao) => {
            const letras =
              Object.keys(
                questao.alternatives
              ).sort();

            return (
              <View
                key={
                  questao.questaoId
                }
                style={
                  styles.questaoCard
                }
              >
                <View
                  style={
                    styles.questaoTopo
                  }
                >
                  <View
                    style={[
                      styles.numeroQuestao,
                      questao.isCorrect
                        ? styles.numeroQuestaoCorreto
                        : styles.numeroQuestaoErrado,
                    ]}
                  >
                    <Text
                      style={
                        styles.numeroQuestaoTexto
                      }
                    >
                      {
                        questao.position
                      }
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.statusQuestao,
                      questao.isCorrect
                        ? styles.statusCorreto
                        : styles.statusErrado,
                    ]}
                  >
                    {questao.isCorrect
                      ? "✅ Acertou"
                      : "❌ Errou"}
                  </Text>
                </View>

                <Text
                  style={
                    styles.enunciado
                  }
                >
                  {questao.question}
                </Text>

                <View
                  style={
                    styles.alternativas
                  }
                >
                  {letras.map(
                    (letra) => {
                      const selecionada =
                        letra ===
                        questao.selectedAlternative;

                      const correta =
                        letra ===
                        questao.correctAlternative;

                      return (
                        <View
                          key={
                            letra
                          }
                          style={[
                            styles.alternativa,
                            correta &&
                              styles.alternativaCorreta,
                            selecionada &&
                              !correta &&
                              styles.alternativaErrada,
                          ]}
                        >
                          <View
                            style={[
                              styles.letra,
                              correta &&
                                styles.letraCorreta,
                              selecionada &&
                                !correta &&
                                styles.letraErrada,
                            ]}
                          >
                            <Text
                              style={[
                                styles.letraTexto,
                                (correta ||
                                  (selecionada &&
                                    !correta)) &&
                                  styles.letraTextoDestaque,
                              ]}
                            >
                              {letra}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.alternativaConteudo
                            }
                          >
                            <Text
                              style={
                                styles.alternativaTexto
                              }
                            >
                              {
                                questao.alternatives[
                                  letra
                                ]
                              }
                            </Text>

                            {correta ? (
                              <Text
                                style={
                                  styles.marcacaoCorreta
                                }
                              >
                                ✓ Alternativa
                                correta
                              </Text>
                            ) : null}

                            {selecionada &&
                            !correta ? (
                              <Text
                                style={
                                  styles.marcacaoErrada
                                }
                              >
                                Sua resposta
                              </Text>
                            ) : null}

                            {selecionada &&
                            correta ? (
                              <Text
                                style={
                                  styles.suaRespostaCorreta
                                }
                              >
                                Sua resposta
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    }
                  )}
                </View>

                {questao.explanation ? (
                  <View
                    style={
                      styles.explicacaoCard
                    }
                  >
                    <Text
                      style={
                        styles.explicacaoTitulo
                      }
                    >
                      💡 Explicação
                    </Text>

                    <Text
                      style={
                        styles.explicacaoTexto
                      }
                    >
                      {
                        questao.explanation
                      }
                    </Text>
                  </View>
                ) : null}

                {questao.sourcePage !==
                null ? (
                  <Text
                    style={
                      styles.fonte
                    }
                  >
                    📖 Página{" "}
                    {
                      questao.sourcePage
                    }{" "}
                    da apostila
                  </Text>
                ) : null}
              </View>
            );
          }
        )
      )}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor:
        "#F7F8FA",
    },

    container: {
      padding: 24,
      paddingTop: 55,
      paddingBottom: 90,
    },

    centro: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F7F8FA",
    },

    carregandoTexto: {
      marginTop: 14,
      fontSize: 15,
      color: "#6B7280",
    },

    voltarTopo: {
      alignSelf:
        "flex-start",
      paddingVertical: 8,
      marginBottom: 10,
    },

    voltarTopoTexto: {
      fontSize: 16,
      fontWeight: "700",
      color: "#374151",
    },

    titulo: {
      fontSize: 27,
      fontWeight: "900",
      color: "#111827",
    },

    subtitulo: {
      marginTop: 6,
      marginBottom: 20,
      fontSize: 15,
      lineHeight: 22,
      color: "#6B7280",
    },

    resumoCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
    },

    resumoLabel: {
      fontSize: 11,
      fontWeight: "900",
      color: "#9CA3AF",
    },

    resumoTitulo: {
      marginTop: 7,
      fontSize: 18,
      lineHeight: 25,
      fontWeight: "800",
      color: "#111827",
    },

    resumoData: {
      marginTop: 5,
      fontSize: 12,
      color: "#9CA3AF",
    },

    resultadoLinha: {
      flexDirection: "row",
      marginTop: 20,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor:
        "#F3F4F6",
    },

    resultadoItem: {
      flex: 1,
      alignItems: "center",
    },

    resultadoNumero: {
      fontSize: 23,
      fontWeight: "900",
      color: "#111827",
    },

    resultadoNumeroVerde: {
      fontSize: 23,
      fontWeight: "900",
      color: "#16A34A",
    },

    resultadoNumeroAzul: {
      fontSize: 23,
      fontWeight: "900",
      color: "#2563EB",
    },

    resultadoTexto: {
      marginTop: 4,
      fontSize: 11,
      color: "#6B7280",
    },

    secaoTitulo: {
      fontSize: 20,
      fontWeight: "900",
      color: "#111827",
      marginBottom: 12,
    },

    questaoCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
    },

    questaoTopo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 14,
    },

    numeroQuestao: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
    },

    numeroQuestaoCorreto: {
      backgroundColor:
        "#DCFCE7",
    },

    numeroQuestaoErrado: {
      backgroundColor:
        "#FEE2E2",
    },

    numeroQuestaoTexto: {
      fontSize: 16,
      fontWeight: "900",
      color: "#111827",
    },

    statusQuestao: {
      fontSize: 14,
      fontWeight: "800",
    },

    statusCorreto: {
      color: "#15803D",
    },

    statusErrado: {
      color: "#DC2626",
    },

    enunciado: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "700",
      color: "#111827",
      marginBottom: 15,
    },

    alternativas: {
      gap: 8,
    },

    alternativa: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      borderRadius: 14,
      padding: 12,
      backgroundColor:
        "#FFFFFF",
    },

    alternativaCorreta: {
      borderColor:
        "#86EFAC",
      backgroundColor:
        "#F0FDF4",
    },

    alternativaErrada: {
      borderColor:
        "#FCA5A5",
      backgroundColor:
        "#FEF2F2",
    },

    letra: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        "#F3F4F6",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    letraCorreta: {
      backgroundColor:
        "#16A34A",
    },

    letraErrada: {
      backgroundColor:
        "#DC2626",
    },

    letraTexto: {
      fontSize: 14,
      fontWeight: "900",
      color: "#374151",
    },

    letraTextoDestaque: {
      color: "#FFFFFF",
    },

    alternativaConteudo: {
      flex: 1,
    },

    alternativaTexto: {
      fontSize: 14,
      lineHeight: 20,
      color: "#374151",
    },

    marcacaoCorreta: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: "800",
      color: "#15803D",
    },

    marcacaoErrada: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: "800",
      color: "#DC2626",
    },

    suaRespostaCorreta: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: "800",
      color: "#15803D",
    },

    explicacaoCard: {
      marginTop: 14,
      padding: 14,
      borderRadius: 14,
      backgroundColor:
        "#EFF6FF",
    },

    explicacaoTitulo: {
      fontSize: 14,
      fontWeight: "800",
      color: "#1D4ED8",
    },

    explicacaoTexto: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: "#374151",
    },

    fonte: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "700",
      color: "#6B7280",
    },

    vazioCard: {
      minHeight: 210,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 24,
      alignItems: "center",
      justifyContent:
        "center",
    },

    vazioIcone: {
      fontSize: 40,
    },

    vazioTitulo: {
      marginTop: 10,
      fontSize: 17,
      fontWeight: "800",
      color: "#374151",
      textAlign: "center",
    },

    vazioTexto: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: "#9CA3AF",
      textAlign: "center",
    },

    erroTela: {
      flex: 1,
      justifyContent:
        "center",
      alignItems: "center",
      padding: 30,
      backgroundColor:
        "#F7F8FA",
    },

    erroIcone: {
      fontSize: 42,
    },

    erroTitulo: {
      marginTop: 12,
      fontSize: 20,
      fontWeight: "800",
      color: "#111827",
      textAlign: "center",
    },

    erroTexto: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: "#6B7280",
      textAlign: "center",
    },

    botaoVoltar: {
      marginTop: 20,
      backgroundColor:
        "#111827",
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 12,
    },

    botaoVoltarTexto: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
  });