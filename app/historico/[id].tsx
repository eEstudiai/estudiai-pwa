import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from "react-native";
import { voltar } from "../../services/navegacao";
import ImagemAjustada from "../../components/ImagemAjustada";
import { abrirApostilaNaPagina, nomeAmigavelApostila } from "../../services/pdf";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../services/supabase";

type Resposta = {
  id: string;
  answer: string;
  alternative: string | null;
  explanation: string | null;
  confidence: number | null;
  source_page: number | null;
  hp12c_steps: string | null;
  confirmed_by_material: boolean;
  source_material_id: string | null;
  created_at: string;
};

type Questao = {
  id: string;
  user_id: string;
  image_path: string | null;
  question_text: string | null;
  created_at: string;
};

export default function HistoricoDetalhe() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [
    questao,
    setQuestao,
  ] =
    useState<Questao | null>(
      null
    );

  const [
    resposta,
    setResposta,
  ] =
    useState<Resposta | null>(
      null
    );

  const [
    imageUrl,
    setImageUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    fonteTitulo,
    setFonteTitulo,
  ] =
    useState<string | null>(
      null
    );

  const [abrindoPdf, setAbrindoPdf] =
    useState(false);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    excluindo,
    setExcluindo,
  ] =
    useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] =
    useState<string | null>(
      null
    );

  const carregarDetalhes =
    async () => {
      if (!id) {
        setMensagemErro(
          "Questão não identificada."
        );

        setCarregando(false);

        return;
      }

      try {
        setCarregando(true);
        setMensagemErro(null);

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
          data: questaoData,
          error: questaoError,
        } =
          await supabase
            .from("questions")
            .select(`
              id,
              user_id,
              image_path,
              question_text,
              created_at
            `)
            .eq(
              "id",
              id
            )
            .eq(
              "user_id",
              user.id
            )
            .single();

        if (questaoError) {
          console.log(
            "ERRO AO BUSCAR QUESTÃO:",
            questaoError
          );

          setMensagemErro(
            "Não foi possível carregar esta questão."
          );

          return;
        }

        const questaoEncontrada =
          questaoData as Questao;

        setQuestao(
          questaoEncontrada
        );

        const {
          data: respostasData,
          error: respostaError,
        } =
          await supabase
            .from("answers")
            .select(`
              id,
              answer,
              alternative,
              explanation,
              confidence,
              source_page,
              hp12c_steps,
              confirmed_by_material,
              source_material_id,
              created_at
            `)
            .eq(
              "question_id",
              id
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(1);

        if (respostaError) {
          console.log(
            "ERRO AO BUSCAR RESPOSTA:",
            respostaError
          );
        }

        const respostaEncontrada =
          respostasData?.[0]
            ? (respostasData[0] as Resposta)
            : null;

        setResposta(
          respostaEncontrada
        );

        if (
          questaoEncontrada.image_path
        ) {
          const {
            data: signedData,
            error: signedError,
          } =
            await supabase.storage
              .from(
                "question-images"
              )
              .createSignedUrl(
                questaoEncontrada.image_path,
                60 * 60
              );

          if (
            !signedError &&
            signedData?.signedUrl
          ) {
            setImageUrl(
              signedData.signedUrl
            );
          }
        }

        if (
          respostaEncontrada
            ?.source_material_id
        ) {
          const {
            data: materialData,
            error: materialError,
          } =
            await supabase
              .from("materials")
              .select("title")
              .eq(
                "id",
                respostaEncontrada
                  .source_material_id
              )
              .single();

          if (
            !materialError &&
            materialData?.title
          ) {
            setFonteTitulo(
              materialData.title
            );
          }
        }
      } catch (error) {
        console.log(
          "ERRO INESPERADO NOS DETALHES:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao carregar os detalhes."
        );
      } finally {
        setCarregando(false);
      }
    };

  useEffect(() => {
    carregarDetalhes();
  }, [id]);

  const limparMarkdown = (
    valor: string | null | undefined
  ) => {
    return String(valor ?? "")
      .replace(/\*\*(.*?)\*\*/gs, "$1")
      .replace(/__(.*?)__/gs, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/\\([%$])/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
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

  const excluirQuestao =
    async () => {
      if (
        !questao ||
        excluindo
      ) {
        return;
      }

      const mensagemConfirmacao =
        "Deseja realmente excluir esta questão do histórico?";

      if (Platform.OS === "web") {
        if (
          window.confirm(
            `Excluir questão?\n\n${mensagemConfirmacao}`
          )
        ) {
          await confirmarExclusao();
        }

        return;
      }

      Alert.alert(
        "Excluir questão",
        mensagemConfirmacao,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Excluir",
            style:
              "destructive",
            onPress:
              confirmarExclusao,
          },
        ]
      );
    };

  const confirmarExclusao =
    async () => {
      if (!questao) {
        return;
      }

      try {
        setExcluindo(true);

        const {
          data,
          error,
        } =
          await supabase.functions
            .invoke(
              "delete-question",
              {
                body: {
                  questionId:
                    questao.id,
                },
              }
            );

        if (error) {
          console.log(
            "ERRO DELETE-QUESTION:",
            error
          );

          let mensagem =
            error.message ||
            "Não foi possível excluir esta questão.";

          try {
            const contexto: any =
              (error as any)
                .context;

            if (contexto) {
              const respostaContexto =
                contexto.clone
                  ? contexto.clone()
                  : contexto;

              const json =
                await respostaContexto
                  .json();

              mensagem =
                json?.error ||
                json?.message ||
                mensagem;
            }
          } catch {
            // Mantém a mensagem original.
          }

          throw new Error(
            mensagem
          );
        }

        if (!data?.ok) {
          throw new Error(
            data?.error ||
              "Não foi possível excluir esta questão."
          );
        }

        router.replace(
          "/historico"
        );
      } catch (error: any) {
        console.log(
          "ERRO AO EXCLUIR QUESTÃO:",
          error
        );

        const mensagem =
          error?.message ||
          "Não foi possível excluir esta questão.";

        if (Platform.OS === "web") {
          window.alert(mensagem);
        } else {
          Alert.alert("Erro", mensagem);
        }
      } finally {
        setExcluindo(false);
      }
    };

  if (carregando) {
    return (
      <SafeAreaView
        style={s.centro}
        edges={["top"]}
      >
        <ActivityIndicator
          size="large"
          color="#1769D2"
        />

        <Text
          style={
            s.carregandoTexto
          }
        >
          Carregando detalhes...
        </Text>
      </SafeAreaView>
    );
  }

  if (
    mensagemErro ||
    !questao
  ) {
    return (
      <SafeAreaView
        style={s.centro}
        edges={["top"]}
      >
        <Text style={s.erroIcone}>
          ⚠️
        </Text>

        <Text style={s.erroTitulo}>
          Não foi possível abrir
        </Text>

        <Text style={s.erroTexto}>
          {mensagemErro ||
            "Questão não encontrada."}
        </Text>

        <Pressable
          style={s.botaoVoltarErro}
          onPress={() =>
            voltar("/historico")
          }
        >
          <Text
            style={
              s.botaoVoltarErroTexto
            }
          >
            Voltar
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  /*
   * CORREÇÃO DA CONFIANÇA
   *
   * Aceita os dois formatos:
   *
   * 1    = 100%
   * 0.95 = 95%
   * 100  = 100%
   * 95   = 95%
   *
   * Também impede valores menores
   * que 0% ou maiores que 100%.
   */
  const valorConfianca =
    resposta?.confidence != null
      ? Number(
          resposta.confidence
        )
      : 0;

  const confianca =
    Number.isFinite(
      valorConfianca
    )
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              valorConfianca <= 1
                ? valorConfianca *
                    100
                : valorConfianca
            )
          )
        )
      : 0;

  return (
    <SafeAreaView
      style={s.tela}
      edges={["top"]}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={
          s.container
        }
      >
      <Pressable
        style={s.voltar}
        onPress={() =>
          voltar("/historico")
        }
      >
        <Text
          style={s.voltarTexto}
        >
          ← Histórico
        </Text>
      </Pressable>

      <Text style={s.titulo}>
        Detalhes da questão
      </Text>

      <Text style={s.data}>
        {formatarData(
          questao.created_at
        )}
      </Text>

      {imageUrl ? (
        <View style={s.cardImagem}>
          <ImagemAjustada uri={imageUrl} alturaMaxima={520} />
        </View>
      ) : null}

      {resposta ? (
        resposta.confirmed_by_material ? (
          <View
            style={
              s.badgeConfirmado
            }
          >
            <Text
              style={
                s.badgeConfirmadoTitulo
              }
            >
              ✅ Confirmada pelo material
            </Text>

            <Text
              style={
                s.badgeConfirmadoTexto
              }
            >
              Esta resposta foi baseada
              nas apostilas cadastradas.
            </Text>
          </View>
        ) : (
          <View
            style={
              s.badgeDesenvolvimento
            }
          >
            <Text
              style={
                s.badgeDesenvolvimentoTitulo
              }
            >
              🧪 Modo de desenvolvimento
            </Text>

            <Text
              style={
                s.badgeDesenvolvimentoTexto
              }
            >
              Esta é uma resposta de
              teste. A IA real permanece
              desativada.
            </Text>
          </View>
        )
      ) : null}

      {resposta?.alternative ? (
        <View
          style={
            s.cardAlternativa
          }
        >
          <Text
            style={
              s.alternativaLabel
            }
          >
            ALTERNATIVA CORRETA
          </Text>

          <Text
            style={s.alternativa}
          >
            {resposta.alternative}
          </Text>
        </View>
      ) : null}

      {resposta ? (
        <>
          <View style={s.card}>
            <Text style={s.label}>
              RESPOSTA
            </Text>

            <Text
              style={
                s.respostaTexto
              }
            >
              {limparMarkdown(resposta.answer)}
            </Text>
          </View>

          <View
            style={
              s.informacoesLinha
            }
          >
            <View
              style={
                s.informacaoCard
              }
            >
              <Text style={s.label}>
                CONFIANÇA
              </Text>

              <Text
                style={s.confianca}
              >
                {confianca}%
              </Text>
            </View>

            <View
              style={
                s.informacaoCard
              }
            >
              <Text style={s.label}>
                FONTE
              </Text>

              <Text
                style={s.fonte}
              >
                {nomeAmigavelApostila(fonteTitulo) ||
                  (resposta.confirmed_by_material
                    ? "Material de estudo"
                    : "Modo de desenvolvimento")}
              </Text>
            </View>
          </View>

          {resposta.source_page ? (
            <View style={s.card}>
              <Text style={s.label}>
                PÁGINA
              </Text>

              <Text
                style={
                  s.paginaTexto
                }
              >
                Página{" "}
                {
                  resposta.source_page
                }
              </Text>

              {resposta.source_material_id ? (
                <Pressable
                  accessibilityRole="button"
                  style={s.abrirPdfBotao}
                  disabled={abrindoPdf}
                  onPress={async () => {
                    setAbrindoPdf(true);
                    await abrirApostilaNaPagina(
                      resposta.source_material_id as string,
                      resposta.source_page
                    );
                    setAbrindoPdf(false);
                  }}
                >
                  <Text style={s.abrirPdfTexto}>
                    {abrindoPdf
                      ? "Abrindo PDF..."
                      : `📖 Abrir PDF na página ${resposta.source_page}`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {resposta.hp12c_steps ? (
            <View
              style={
                s.cardHp12c
              }
            >
              <Text
                style={
                  s.hp12cTitulo
                }
              >
                🧮 HP-12C
              </Text>

              <Text
                style={
                  s.hp12cTexto
                }
              >
                {limparMarkdown(resposta.hp12c_steps)}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <View
          style={
            s.semRespostaCard
          }
        >
          <Text
            style={
              s.semRespostaTitulo
            }
          >
            Sem resposta registrada
          </Text>

          <Text
            style={
              s.semRespostaTexto
            }
          >
            Esta questão não possui uma
            resposta salva.
          </Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          s.botaoExcluir,
          pressed &&
            s.botaoPressionado,
          excluindo &&
            s.botaoDesabilitado,
        ]}
        onPress={excluirQuestao}
        disabled={excluindo}
      >
        <Text
          style={
            s.botaoExcluirTexto
          }
        >
          {excluindo
            ? "Excluindo..."
            : "🗑️ Excluir do histórico"}
        </Text>
      </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s =
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
      padding: 30,
      backgroundColor: "#F3F7FC",
    },

    carregandoTexto: {
      marginTop: 14,
      fontSize: 15,
      color: "#64748B",
    },

    voltar: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#E5EDF7",
    },

    voltarTexto: {
      fontSize: 15,
      fontWeight: "800",
      color: "#1769D2",
    },

    titulo: {
      fontSize: 27,
      lineHeight: 35,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: "#172B4D",
    },

    data: {
      marginTop: 6,
      marginBottom: 18,
      fontSize: 13,
      color: "#64748B",
    },

    cardImagem: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 10,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    imagem: {
      width: "100%",
      height: 290,
      borderRadius: 15,
      backgroundColor: "#F1F5F9",
    },

    badgeConfirmado: {
      backgroundColor: "#E8F8F0",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#BBF7D0",
    },

    badgeConfirmadoTitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#166534",
    },

    badgeConfirmadoTexto: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: "#166534",
    },

    badgeDesenvolvimento: {
      backgroundColor: "#FFF8E7",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#F5D98C",
    },

    badgeDesenvolvimentoTitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#92400E",
    },

    badgeDesenvolvimentoTexto: {
      marginTop: 5,
      fontSize: 13,
      lineHeight: 19,
      color: "#92400E",
    },

    cardAlternativa: {
      backgroundColor: "#E8F1FF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#C8DDF8",
      padding: 20,
      alignItems: "center",
      marginBottom: 14,
    },

    alternativaLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: "#1456A0",
      letterSpacing: 0.7,
    },

    alternativa: {
      marginTop: 8,
      fontSize: 42,
      fontWeight: "900",
      color: "#1456A0",
    },

    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    label: {
      fontSize: 11,
      fontWeight: "800",
      color: "#64748B",
      marginBottom: 8,
      letterSpacing: 0.7,
    },

    questaoTexto: {
      fontSize: 16,
      lineHeight: 24,
      color: "#374151",
    },

    respostaTexto: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: "800",
      color: "#172B4D",
    },

    informacoesLinha: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 14,
    },

    informacaoCard: {
      flex: 1,
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: "#E5EDF7",
    },

    confianca: {
      fontSize: 27,
      fontWeight: "900",
      color: "#15803D",
    },

    abrirPdfBotao: {
      marginTop: 12,
      backgroundColor: "#1D4ED8",
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: "center",
    },

    abrirPdfTexto: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    fonte: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      color: "#172B4D",
    },

    paginaTexto: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111827",
    },

    cardHp12c: {
      backgroundColor: "#E8F8F0",
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#BBF7D0",
    },

    hp12cTitulo: {
      fontSize: 16,
      fontWeight: "800",
      color: "#166534",
    },

    hp12cTexto: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 23,
      color: "#166534",
    },

    semRespostaCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#E5EDF7",
    },

    semRespostaTitulo: {
      fontSize: 16,
      fontWeight: "800",
      color: "#172B4D",
    },

    semRespostaTexto: {
      marginTop: 6,
      fontSize: 14,
      color: "#64748B",
    },

    botaoExcluir: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: "#FECACA",
      backgroundColor: "#FEF2F2",
      borderRadius: 16,
      minHeight: 54,
      paddingVertical: 15,
      paddingHorizontal: 16,
      alignItems: "center",
    },

    botaoExcluirTexto: {
      color: "#B91C1C",
      fontSize: 15,
      fontWeight: "800",
    },

    botaoPressionado: {
      opacity: 0.8,
    },

    botaoDesabilitado: {
      opacity: 0.55,
    },

    erroIcone: {
      fontSize: 42,
    },

    erroTitulo: {
      marginTop: 14,
      fontSize: 20,
      fontWeight: "800",
      color: "#172B4D",
    },

    erroTexto: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: "#64748B",
      textAlign: "center",
    },

    botaoVoltarErro: {
      marginTop: 20,
      backgroundColor: "#1769D2",
      borderRadius: 14,
      paddingHorizontal: 24,
      paddingVertical: 13,
    },

    botaoVoltarErroTexto: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },
  });
