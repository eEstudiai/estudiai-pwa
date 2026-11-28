import React, {
  useCallback,
  useState,
} from "react";
import { voltar } from "../../../../services/navegacao";

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

import { supabase } from "../../../../services/supabase";

type Quiz = {
  id: string;
  title: string | null;
  question_count: number;
};

type Tentativa = {
  id: string;
  correct_answers: number;
  total_questions: number;
  percentage: number | string;
  completed_at: string;
  created_at: string;
};

export default function HistoricoSimuladoScreen() {
  const { quizId } =
    useLocalSearchParams<{
      quizId: string;
    }>();

  const [
    quiz,
    setQuiz,
  ] = useState<Quiz | null>(
    null
  );

  const [
    tentativas,
    setTentativas,
  ] = useState<Tentativa[]>(
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

  const carregarDados =
    useCallback(async () => {
      try {
        setMensagemErro(null);

        if (!quizId) {
          setMensagemErro(
            "Simulado não encontrado."
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
          data: quizData,
          error: quizError,
        } = await supabase
          .from(
            "material_quizzes"
          )
          .select(
            `
            id,
            title,
            question_count
          `
          )
          .eq(
            "id",
            quizId
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
            "ERRO AO CARREGAR QUIZ:",
            quizError
          );

          setMensagemErro(
            "Não foi possível carregar este simulado."
          );

          return;
        }

        setQuiz(
          quizData as Quiz
        );

        const {
          data: tentativasData,
          error: tentativasError,
        } = await supabase
          .from(
            "material_quiz_attempts"
          )
          .select(
            `
            id,
            correct_answers,
            total_questions,
            percentage,
            completed_at,
            created_at
          `
          )
          .eq(
            "quiz_id",
            quizId
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "completed_at",
            {
              ascending: false,
            }
          );

        if (tentativasError) {
          console.log(
            "ERRO AO CARREGAR TENTATIVAS:",
            tentativasError
          );

          setMensagemErro(
            "Não foi possível carregar o histórico de resultados."
          );

          return;
        }

        setTentativas(
          (tentativasData ||
            []) as Tentativa[]
        );
      } catch (error) {
        console.log(
          "ERRO INESPERADO NO HISTÓRICO:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao carregar o histórico."
        );
      } finally {
        setCarregando(false);
      }
    }, [quizId]);

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

  const abrirRevisao = (
    attemptId: string
  ) => {
    router.push(
      `/biblioteca/simulado/historico/revisao/${attemptId}` as any
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

  const classificacao = (
    percentual: number
  ) => {
    if (
      percentual >= 80
    ) {
      return {
        texto:
          "Excelente resultado",
        icone: "🏆",
      };
    }

    if (
      percentual >= 60
    ) {
      return {
        texto:
          "Bom resultado",
        icone: "👍",
      };
    }

    return {
      texto:
        "Continue estudando",
      icone: "📚",
    };
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
          Carregando resultados...
        </Text>
      </View>
    );
  }

  if (
    mensagemErro ||
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
          o histórico
        </Text>

        <Text
          style={styles.erroTexto}
        >
          {mensagemErro ||
            "Simulado não encontrado."}
        </Text>

        <Pressable
          style={
            styles.botaoVoltar
          }
          onPress={() =>
            voltar("/biblioteca")
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

  const melhorResultado =
    tentativas.length > 0
      ? Math.max(
          ...tentativas.map(
            (tentativa) =>
              percentualNumero(
                tentativa.percentage
              )
          )
        )
      : 0;

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
          voltar("/biblioteca")
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
        📊 Histórico de resultados
      </Text>

      <Text
        style={styles.subtitulo}
      >
        Acompanhe seu desempenho
        neste simulado e revise
        suas respostas.
      </Text>

      <View
        style={
          styles.quizCard
        }
      >
        <Text
          style={
            styles.quizLabel
          }
        >
          SIMULADO
        </Text>

        <Text
          style={
            styles.quizTitulo
          }
        >
          {quiz.title ||
            "Simulado"}
        </Text>

        <Text
          style={
            styles.quizQuestoes
          }
        >
          {quiz.question_count}{" "}
          questões
        </Text>
      </View>

      {tentativas.length >
      0 ? (
        <View
          style={
            styles.resumoCard
          }
        >
          <View
            style={
              styles.resumoItem
            }
          >
            <Text
              style={
                styles.resumoNumero
              }
            >
              {tentativas.length}
            </Text>

            <Text
              style={
                styles.resumoLabel
              }
            >
              Tentativas
            </Text>
          </View>

          <View
            style={
              styles.divisor
            }
          />

          <View
            style={
              styles.resumoItem
            }
          >
            <Text
              style={
                styles.resumoNumeroAzul
              }
            >
              {melhorResultado}%
            </Text>

            <Text
              style={
                styles.resumoLabel
              }
            >
              Melhor resultado
            </Text>
          </View>
        </View>
      ) : null}

      <Text
        style={
          styles.secaoTitulo
        }
      >
        Suas tentativas
      </Text>

      {tentativas.length ===
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
            📊
          </Text>

          <Text
            style={
              styles.vazioTitulo
            }
          >
            Nenhum resultado salvo
          </Text>

          <Text
            style={
              styles.vazioTexto
            }
          >
            Responda este simulado
            e salve o resultado para
            acompanhar sua evolução.
          </Text>
        </View>
      ) : (
        tentativas.map(
          (
            tentativa,
            index
          ) => {
            const percentual =
              percentualNumero(
                tentativa.percentage
              );

            const resultado =
              classificacao(
                percentual
              );

            return (
              <View
                key={
                  tentativa.id
                }
                style={
                  styles.tentativaCard
                }
              >
                <View
                  style={
                    styles.tentativaTopo
                  }
                >
                  <View
                    style={
                      styles.tentativaNumero
                    }
                  >
                    <Text
                      style={
                        styles.tentativaNumeroTexto
                      }
                    >
                      {tentativas.length -
                        index}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.tentativaInfo
                    }
                  >
                    <Text
                      style={
                        styles.tentativaTitulo
                      }
                    >
                      Tentativa{" "}
                      {tentativas.length -
                        index}
                    </Text>

                    <Text
                      style={
                        styles.tentativaData
                      }
                    >
                      {formatarData(
                        tentativa.completed_at
                      )}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.tentativaPercentual
                    }
                  >
                    {percentual}%
                  </Text>
                </View>

                <View
                  style={
                    styles.resultadoLinha
                  }
                >
                  <Text
                    style={
                      styles.resultadoAcertos
                    }
                  >
                    {
                      tentativa.correct_answers
                    }{" "}
                    de{" "}
                    {
                      tentativa.total_questions
                    }{" "}
                    acertos
                  </Text>

                  <Text
                    style={
                      styles.resultadoClassificacao
                    }
                  >
                    {
                      resultado.icone
                    }{" "}
                    {
                      resultado.texto
                    }
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.botaoRevisar
                  }
                  onPress={() =>
                    abrirRevisao(
                      tentativa.id
                    )
                  }
                >
                  <Text
                    style={
                      styles.botaoRevisarTexto
                    }
                  >
                    📝 Revisar respostas
                  </Text>

                  <Text
                    style={
                      styles.botaoRevisarSeta
                    }
                  >
                    ›
                  </Text>
                </Pressable>
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

    quizCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
    },

    quizLabel: {
      fontSize: 11,
      fontWeight: "900",
      color: "#9CA3AF",
      marginBottom: 7,
    },

    quizTitulo: {
      fontSize: 18,
      lineHeight: 25,
      fontWeight: "800",
      color: "#111827",
    },

    quizQuestoes: {
      marginTop: 7,
      fontSize: 13,
      fontWeight: "700",
      color: "#2563EB",
    },

    resumoCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 20,
      marginBottom: 24,
    },

    resumoItem: {
      flex: 1,
      alignItems: "center",
    },

    divisor: {
      width: 1,
      height: 45,
      backgroundColor:
        "#E5E7EB",
    },

    resumoNumero: {
      fontSize: 28,
      fontWeight: "900",
      color: "#111827",
    },

    resumoNumeroAzul: {
      fontSize: 28,
      fontWeight: "900",
      color: "#2563EB",
    },

    resumoLabel: {
      marginTop: 4,
      fontSize: 11,
      color: "#6B7280",
      textAlign: "center",
    },

    secaoTitulo: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111827",
      marginBottom: 12,
    },

    tentativaCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
    },

    tentativaTopo: {
      flexDirection: "row",
      alignItems: "center",
    },

    tentativaNumero: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        "#EFF6FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    tentativaNumeroTexto: {
      fontSize: 17,
      fontWeight: "900",
      color: "#2563EB",
    },

    tentativaInfo: {
      flex: 1,
    },

    tentativaTitulo: {
      fontSize: 16,
      fontWeight: "800",
      color: "#111827",
    },

    tentativaData: {
      marginTop: 3,
      fontSize: 11,
      color: "#9CA3AF",
    },

    tentativaPercentual: {
      fontSize: 25,
      fontWeight: "900",
      color: "#2563EB",
    },

    resultadoLinha: {
      marginTop: 14,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor:
        "#F3F4F6",
    },

    resultadoAcertos: {
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
    },

    resultadoClassificacao: {
      marginTop: 5,
      fontSize: 13,
      color: "#6B7280",
    },

    botaoRevisar: {
      minHeight: 48,
      marginTop: 15,
      paddingHorizontal: 14,
      borderRadius: 13,
      backgroundColor:
        "#EFF6FF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    botaoRevisarTexto: {
      fontSize: 14,
      fontWeight: "800",
      color: "#1D4ED8",
    },

    botaoRevisarSeta: {
      fontSize: 27,
      color: "#2563EB",
    },

    vazioCard: {
      minHeight: 220,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 24,
      alignItems: "center",
      justifyContent:
        "center",
    },

    vazioIcone: {
      fontSize: 42,
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