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
  Alert,
} from "react-native";

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../../../services/supabase";

type Alternativas = {
  A: string;
  B: string;
  C: string;
  D: string;
};

type Questao = {
  id: string;
  position: number;
  question: string;
  alternatives: Alternativas;
  correct_alternative: string;
  explanation: string | null;
  source_page: number | null;
};

type Quiz = {
  id: string;
  title: string | null;
  question_count: number;
  material_id: string;
};

type RespostaSalva = {
  questionId: string;
  selectedAlternative: string;
  isCorrect: boolean;
};

export default function ResponderSimuladoScreen() {
  const { quizId } =
    useLocalSearchParams<{
      quizId: string;
    }>();

  const [
    quiz,
    setQuiz,
  ] =
    useState<Quiz | null>(
      null
    );

  const [
    questoes,
    setQuestoes,
  ] =
    useState<Questao[]>(
      []
    );

  const [
    indiceAtual,
    setIndiceAtual,
  ] = useState(0);

  const [
    alternativaSelecionada,
    setAlternativaSelecionada,
  ] =
    useState<string | null>(
      null
    );

  const [
    respostaConfirmada,
    setRespostaConfirmada,
  ] = useState(false);

  const [
    respostas,
    setRespostas,
  ] =
    useState<RespostaSalva[]>(
      []
    );

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    concluido,
    setConcluido,
  ] = useState(false);

  const [
    tentativaSalva,
    setTentativaSalva,
  ] = useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] =
    useState<string | null>(
      null
    );

  const carregarSimulado =
    useCallback(async () => {
      try {
        setCarregando(true);
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
          .from("material_quizzes")
          .select(
            `
            id,
            title,
            question_count,
            material_id
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
          .eq(
            "quiz_id",
            quizId
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
            "Não foi possível carregar as questões do simulado."
          );

          return;
        }

        if (
          !questoesData ||
          questoesData.length ===
            0
        ) {
          setMensagemErro(
            "Este simulado ainda não possui questões."
          );

          return;
        }

        setQuiz(
          quizData as Quiz
        );

        setQuestoes(
          questoesData as Questao[]
        );

        setIndiceAtual(0);
        setAlternativaSelecionada(
          null
        );
        setRespostaConfirmada(
          false
        );
        setRespostas([]);
        setConcluido(false);
        setTentativaSalva(
          false
        );
      } catch (error) {
        console.log(
          "ERRO INESPERADO NO SIMULADO:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao abrir o simulado."
        );
      } finally {
        setCarregando(false);
      }
    }, [quizId]);

  useFocusEffect(
    useCallback(() => {
      carregarSimulado();
    }, [carregarSimulado])
  );

  const questaoAtual =
    questoes[indiceAtual];

  const confirmarResposta =
    () => {
      if (
        !questaoAtual ||
        !alternativaSelecionada ||
        respostaConfirmada
      ) {
        return;
      }

      const correta =
        alternativaSelecionada ===
        questaoAtual.correct_alternative;

      setRespostas(
        (anteriores) => [
          ...anteriores,
          {
            questionId:
              questaoAtual.id,

            selectedAlternative:
              alternativaSelecionada,

            isCorrect:
              correta,
          },
        ]
      );

      setRespostaConfirmada(
        true
      );
    };

  const proximaQuestao =
    () => {
      if (!respostaConfirmada) {
        return;
      }

      const ultimo =
        indiceAtual ===
        questoes.length - 1;

      if (ultimo) {
        setConcluido(true);

        return;
      }

      setIndiceAtual(
        (anterior) =>
          anterior + 1
      );

      setAlternativaSelecionada(
        null
      );

      setRespostaConfirmada(
        false
      );
    };

  const salvarResultado =
    async () => {
      if (
        !quiz ||
        salvando ||
        tentativaSalva ||
        respostas.length !==
          questoes.length
      ) {
        return;
      }

      try {
        setSalvando(true);

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          Alert.alert(
            "Erro",
            "Usuário não autenticado."
          );

          return;
        }

        const acertos =
          respostas.filter(
            (resposta) =>
              resposta.isCorrect
          ).length;

        const total =
          questoes.length;

        const percentual =
          total > 0
            ? Number(
                (
                  (acertos /
                    total) *
                  100
                ).toFixed(2)
              )
            : 0;

        const {
          data: tentativa,
          error:
            tentativaError,
        } = await supabase
          .from(
            "material_quiz_attempts"
          )
          .insert({
            user_id:
              user.id,

            quiz_id:
              quiz.id,

            correct_answers:
              acertos,

            total_questions:
              total,

            percentage:
              percentual,
          })
          .select("id")
          .single();

        if (
          tentativaError ||
          !tentativa
        ) {
          console.log(
            "ERRO AO SALVAR TENTATIVA:",
            tentativaError
          );

          Alert.alert(
            "Erro",
            "Não foi possível salvar o resultado do simulado."
          );

          return;
        }

        const respostasParaSalvar =
          respostas.map(
            (resposta) => ({
              attempt_id:
                tentativa.id,

              question_id:
                resposta.questionId,

              selected_alternative:
                resposta.selectedAlternative,

              is_correct:
                resposta.isCorrect,
            })
          );

        const {
          error:
            respostasError,
        } = await supabase
          .from(
            "material_quiz_attempt_answers"
          )
          .insert(
            respostasParaSalvar
          );

        if (respostasError) {
          console.log(
            "ERRO AO SALVAR RESPOSTAS:",
            respostasError
          );

          /*
            Remove a tentativa incompleta
            para não deixar um resultado
            sem as respostas associadas.
          */
          await supabase
            .from(
              "material_quiz_attempts"
            )
            .delete()
            .eq(
              "id",
              tentativa.id
            )
            .eq(
              "user_id",
              user.id
            );

          Alert.alert(
            "Erro",
            "Não foi possível salvar todas as respostas do simulado."
          );

          return;
        }

        setTentativaSalva(
          true
        );

        Alert.alert(
          "Resultado salvo",
          "Sua tentativa foi registrada com sucesso."
        );
      } catch (error) {
        console.log(
          "ERRO INESPERADO AO SALVAR RESULTADO:",
          error
        );

        Alert.alert(
          "Erro",
          "Não foi possível salvar o resultado."
        );
      } finally {
        setSalvando(false);
      }
    };

  const reiniciar =
    () => {
      setIndiceAtual(0);

      setAlternativaSelecionada(
        null
      );

      setRespostaConfirmada(
        false
      );

      setRespostas([]);

      setConcluido(false);

      setTentativaSalva(
        false
      );
    };

  if (carregando) {
    return (
      <SafeAreaView
        style={styles.centro}
        edges={["top"]}
      >
        <ActivityIndicator
          size="large"
          color="#1769D2"
        />

        <Text
          style={
            styles.carregandoTexto
          }
        >
          Carregando simulado...
        </Text>
      </SafeAreaView>
    );
  }

  if (
    mensagemErro ||
    !quiz ||
    questoes.length === 0
  ) {
    return (
      <SafeAreaView
        style={styles.erroTela}
        edges={["top"]}
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
          o simulado
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
      </SafeAreaView>
    );
  }

  const acertos =
    respostas.filter(
      (resposta) =>
        resposta.isCorrect
    ).length;

  const percentual =
    questoes.length > 0
      ? Math.round(
          (acertos /
            questoes.length) *
            100
        )
      : 0;

  if (concluido) {
    return (
      <SafeAreaView
        style={styles.tela}
        edges={["top"]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.container
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

        <View
          style={
            styles.resultadoCard
          }
        >
          <Text
            style={
              styles.resultadoIcone
            }
          >
            🏆
          </Text>

          <Text
            style={
              styles.resultadoTitulo
            }
          >
            Simulado concluído
          </Text>

          <Text
            style={
              styles.resultadoNome
            }
          >
            {quiz.title ||
              "Simulado"}
          </Text>

          <Text
            style={
              styles.percentual
            }
          >
            {percentual}%
          </Text>

          <Text
            style={
              styles.resultadoAcertos
            }
          >
            {acertos} de{" "}
            {questoes.length}{" "}
            questões corretas
          </Text>
        </View>

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
              {questoes.length}
            </Text>

            <Text
              style={
                styles.resumoLabel
              }
            >
              Questões
            </Text>
          </View>

          <View
            style={
              styles.resumoItem
            }
          >
            <Text
              style={[
                styles.resumoNumero,
                styles.textoCorreto,
              ]}
            >
              {acertos}
            </Text>

            <Text
              style={
                styles.resumoLabel
              }
            >
              Acertos
            </Text>
          </View>

          <View
            style={
              styles.resumoItem
            }
          >
            <Text
              style={[
                styles.resumoNumero,
                styles.textoErrado,
              ]}
            >
              {questoes.length -
                acertos}
            </Text>

            <Text
              style={
                styles.resumoLabel
              }
            >
              Erros
            </Text>
          </View>
        </View>

        <Pressable
          style={[
            styles.botaoPrincipal,
            tentativaSalva &&
              styles.botaoSalvo,
          ]}
          onPress={
            salvarResultado
          }
          disabled={
            salvando ||
            tentativaSalva
          }
        >
          {salvando ? (
            <ActivityIndicator />
          ) : (
            <Text
              style={
                styles.botaoPrincipalTexto
              }
            >
              {tentativaSalva
                ? "✅ Resultado salvo"
                : "💾 Salvar resultado"}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={
            styles.botaoSecundario
          }
          onPress={reiniciar}
        >
          <Text
            style={
              styles.botaoSecundarioTexto
            }
          >
            🔄 Refazer simulado
          </Text>
        </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const letras = [
    "A",
    "B",
    "C",
    "D",
  ] as const;

  return (
    <SafeAreaView
      style={styles.tela}
      edges={["top"]}
    >
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={
        styles.container
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
          ← Sair do simulado
        </Text>
      </Pressable>

      <Text
        style={styles.titulo}
        numberOfLines={2}
      >
        🎯 {quiz.title ||
          "Simulado"}
      </Text>

      <Text
        style={
          styles.progressoTexto
        }
      >
        Questão{" "}
        {indiceAtual + 1} de{" "}
        {questoes.length}
      </Text>

      <View
        style={
          styles.progressoFundo
        }
      >
        <View
          style={[
            styles.progressoBarra,
            {
              width: `${
                ((indiceAtual +
                  1) /
                  questoes.length) *
                100
              }%`,
            },
          ]}
        />
      </View>

      <View
        style={
          styles.questaoCard
        }
      >
        <Text
          style={
            styles.questaoNumero
          }
        >
          QUESTÃO{" "}
          {indiceAtual + 1}
        </Text>

        <Text
          style={
            styles.questaoTexto
          }
        >
          {questaoAtual.question}
        </Text>
      </View>

      <View
        style={
          styles.alternativasContainer
        }
      >
        {letras.map(
          (letra) => {
            const texto =
              questaoAtual
                .alternatives?.[
                letra
              ];

            const selecionada =
              alternativaSelecionada ===
              letra;

            const correta =
              respostaConfirmada &&
              letra ===
                questaoAtual.correct_alternative;

            const errada =
              respostaConfirmada &&
              selecionada &&
              letra !==
                questaoAtual.correct_alternative;

            return (
              <Pressable
                key={letra}
                style={[
                  styles.alternativa,
                  selecionada &&
                    !respostaConfirmada &&
                    styles.alternativaSelecionada,
                  correta &&
                    styles.alternativaCorreta,
                  errada &&
                    styles.alternativaErrada,
                ]}
                onPress={() => {
                  if (
                    !respostaConfirmada
                  ) {
                    setAlternativaSelecionada(
                      letra
                    );
                  }
                }}
              >
                <View
                  style={[
                    styles.letraCirculo,
                    selecionada &&
                      !respostaConfirmada &&
                      styles.letraCirculoSelecionada,
                    correta &&
                      styles.letraCirculoCorreta,
                    errada &&
                      styles.letraCirculoErrada,
                  ]}
                >
                  <Text
                    style={[
                      styles.letraTexto,
                      (selecionada ||
                        correta ||
                        errada) &&
                        styles.letraTextoAtivo,
                    ]}
                  >
                    {letra}
                  </Text>
                </View>

                <Text
                  style={
                    styles.alternativaTexto
                  }
                >
                  {texto ||
                    "Alternativa não disponível"}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>

      {!respostaConfirmada ? (
        <Pressable
          style={[
            styles.botaoPrincipal,
            !alternativaSelecionada &&
              styles.botaoDesativado,
          ]}
          onPress={
            confirmarResposta
          }
          disabled={
            !alternativaSelecionada
          }
        >
          <Text
            style={
              styles.botaoPrincipalTexto
            }
          >
            Confirmar resposta
          </Text>
        </Pressable>
      ) : (
        <>
          <View
            style={[
              styles.feedbackCard,
              alternativaSelecionada ===
              questaoAtual.correct_alternative
                ? styles.feedbackCorreto
                : styles.feedbackErrado,
            ]}
          >
            <Text
              style={
                styles.feedbackTitulo
              }
            >
              {alternativaSelecionada ===
              questaoAtual.correct_alternative
                ? "✅ Resposta correta!"
                : "❌ Resposta incorreta"}
            </Text>

            {alternativaSelecionada !==
            questaoAtual.correct_alternative ? (
              <Text
                style={
                  styles.feedbackResposta
                }
              >
                Resposta correta:{" "}
                {
                  questaoAtual.correct_alternative
                }
              </Text>
            ) : null}

            {questaoAtual.explanation ? (
              <Text
                style={
                  styles.explicacao
                }
              >
                {
                  questaoAtual.explanation
                }
              </Text>
            ) : null}

            {questaoAtual.source_page ? (
              <Text
                style={
                  styles.paginaFonte
                }
              >
                📖 Página de referência:{" "}
                {
                  questaoAtual.source_page
                }
              </Text>
            ) : null}
          </View>

          <Pressable
            style={
              styles.botaoPrincipal
            }
            onPress={
              proximaQuestao
            }
          >
            <Text
              style={
                styles.botaoPrincipalTexto
              }
            >
              {indiceAtual ===
              questoes.length - 1
                ? "Ver resultado"
                : "Próxima questão →"}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: "#F3F7FC",
    },

    scroll: {
      flex: 1,
    },

    container: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
    },

    centro: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#F3F7FC",
    },

    carregandoTexto: {
      marginTop: 14,
      fontSize: 15,
      color: "#64748B",
    },

    voltarTopo: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#E5EDF7",
    },

    voltarTopoTexto: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1769D2",
    },

    titulo: {
      fontSize: 25,
      lineHeight: 33,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: "#172B4D",
    },

    progressoTexto: {
      marginTop: 16,
      fontSize: 14,
      fontWeight: "700",
      color: "#526078",
    },

    progressoFundo: {
      height: 9,
      borderRadius: 5,
      backgroundColor: "#DCE7F4",
      overflow: "hidden",
      marginTop: 9,
      marginBottom: 20,
    },

    progressoBarra: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: "#1769D2",
    },

    questaoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      padding: 20,
      marginBottom: 18,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    questaoNumero: {
      fontSize: 11,
      fontWeight: "900",
      color: "#1769D2",
      marginBottom: 10,
    },

    questaoTexto: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: "700",
      color: "#172B4D",
    },

    alternativasContainer: {
      gap: 10,
      marginBottom: 18,
    },

    alternativa: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      padding: 14,
    },

    alternativaSelecionada: {
      borderWidth: 2,
      borderColor: "#1769D2",
      backgroundColor: "#E8F1FF",
    },

    alternativaCorreta: {
      borderColor:
        "#16A34A",
      backgroundColor:
        "#F0FDF4",
    },

    alternativaErrada: {
      borderColor:
        "#DC2626",
      backgroundColor:
        "#FEF2F2",
    },

    letraCirculo: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor: "#F1F5F9",
      marginRight: 12,
      marginTop: 1,
    },

    letraCirculoSelecionada: {
      backgroundColor: "#1769D2",
    },

    letraCirculoCorreta: {
      backgroundColor:
        "#16A34A",
    },

    letraCirculoErrada: {
      backgroundColor:
        "#DC2626",
    },

    letraTexto: {
      fontSize: 15,
      fontWeight: "900",
      color: "#334155",
    },

    letraTextoAtivo: {
      color: "#FFFFFF",
    },

    alternativaTexto: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: "#374151",
    },

    botaoPrincipal: {
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: "#1769D2",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 12,
      shadowColor: "#1456A0",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 3,
    },

    botaoPrincipalTexto: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },

    botaoDesativado: {
      backgroundColor: "#A9BDD5",
      shadowOpacity: 0,
      elevation: 0,
    },

    feedbackCard: {
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
    },

    feedbackCorreto: {
      backgroundColor:
        "#F0FDF4",
      borderColor:
        "#BBF7D0",
    },

    feedbackErrado: {
      backgroundColor:
        "#FEF2F2",
      borderColor:
        "#FECACA",
    },

    feedbackTitulo: {
      fontSize: 17,
      fontWeight: "800",
      color: "#172B4D",
    },

    feedbackResposta: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: "700",
      color: "#374151",
    },

    explicacao: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 21,
      color: "#4B5563",
    },

    paginaFonte: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: "700",
      color: "#6B7280",
    },

    resultadoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      padding: 24,
      alignItems: "center",
      marginBottom: 14,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    resultadoIcone: {
      fontSize: 48,
    },

    resultadoTitulo: {
      marginTop: 10,
      fontSize: 24,
      fontWeight: "900",
      color: "#172B4D",
      textAlign: "center",
    },

    resultadoNome: {
      marginTop: 6,
      fontSize: 14,
      color: "#64748B",
      textAlign: "center",
    },

    percentual: {
      marginTop: 18,
      fontSize: 50,
      fontWeight: "900",
      color: "#1769D2",
    },

    resultadoAcertos: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: "700",
      color: "#526078",
    },

    resumoCard: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },

    resumoItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 88,
      paddingHorizontal: 4,
      paddingVertical: 12,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#E5EDF7",
    },

    resumoNumero: {
      fontSize: 24,
      fontWeight: "900",
      color: "#172B4D",
    },

    resumoLabel: {
      marginTop: 4,
      fontSize: 12,
      color: "#64748B",
    },

    textoCorreto: {
      color: "#16A34A",
    },

    textoErrado: {
      color: "#DC2626",
    },

    botaoSalvo: {
      backgroundColor: "#15803D",
    },

    botaoSecundario: {
      minHeight: 54,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#C8DDF8",
      alignItems: "center",
      justifyContent:
        "center",
    },

    botaoSecundarioTexto: {
      fontSize: 15,
      fontWeight: "800",
      color: "#1769D2",
    },

    erroTela: {
      flex: 1,
      justifyContent:
        "center",
      alignItems: "center",
      padding: 30,
      backgroundColor: "#F3F7FC",
    },

    erroIcone: {
      fontSize: 42,
    },

    erroTitulo: {
      marginTop: 12,
      fontSize: 20,
      fontWeight: "800",
      color: "#172B4D",
      textAlign: "center",
    },

    erroTexto: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: "#64748B",
      textAlign: "center",
    },

    botaoVoltar: {
      marginTop: 20,
      backgroundColor: "#1769D2",
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