import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";

import {
  useCallback,
  useState,
} from "react";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../services/supabase";
import ConnectionStatus from "../components/ConnectionStatus";

type Resposta = {
  answer: string;
  confidence: number | null;
  source_page: number | null;
  hp12c_steps: string | null;
  created_at: string;
};

type QuestaoHistorico = {
  id: string;
  question_text: string | null;
  image_path: string | null;
  created_at: string;
  answers?: Resposta[] | null;
  image_url?: string | null;
};

export default function Historico() {
  const [items, setItems] =
    useState<QuestaoHistorico[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [erroConexao, setErroConexao] =
    useState(false);

  const gerarUrlImagem = async (
    imagePath: string | null
  ) => {
    if (!imagePath) {
      return null;
    }

    try {
      const { data, error } =
        await supabase.storage
          .from("question-images")
          .createSignedUrl(
            imagePath,
            60 * 60
          );

      if (error) {
        console.log(
          "ERRO AO GERAR URL DA IMAGEM:",
          error
        );

        return null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.log(
        "ERRO INESPERADO NA IMAGEM:",
        error
      );

      return null;
    }
  };

  const carregarHistorico =
    async () => {
      try {
        setErroConexao(false);

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          console.log(
            "ERRO AO CARREGAR USUÁRIO NO HISTÓRICO:",
            userError
          );

          setErroConexao(true);
          setItems([]);

          return;
        }

        if (!user) {
          console.log(
            "USUÁRIO NÃO AUTENTICADO"
          );

          setItems([]);

          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            image_path,
            created_at,
            answers (
              answer,
              confidence,
              source_page,
              hp12c_steps,
              created_at
            )
          `)
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.log(
            "ERRO AO CARREGAR HISTÓRICO:",
            error
          );

          setErroConexao(true);
          setItems([]);

          return;
        }

        const questoes =
          (data as QuestaoHistorico[]) ||
          [];

        const questoesComImagem =
          await Promise.all(
            questoes.map(
              async (questao) => {
                const imageUrl =
                  await gerarUrlImagem(
                    questao.image_path
                  );

                return {
                  ...questao,
                  image_url: imageUrl,
                };
              }
            )
          );

        setItems(
          questoesComImagem
        );

        setErroConexao(false);
      } catch (error) {
        console.log(
          "ERRO INESPERADO NO HISTÓRICO:",
          error
        );

        setErroConexao(true);
        setItems([]);
      } finally {
        setCarregando(false);
      }
    };

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);

      carregarHistorico();

      return () => {};
    }, [])
  );

  const atualizar =
    async () => {
      setAtualizando(true);

      await carregarHistorico();

      setAtualizando(false);
    };

  const formatarData = (
    data: string
  ) => {
    try {
      return new Date(
        data
      ).toLocaleString(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return data;
    }
  };

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

  const normalizarConfianca = (
    valor: number | null | undefined
  ) => {
    if (valor == null) {
      return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return null;
    }

    // Formato decimal:
    // 0.95 = 95%
    // 1 = 100%
    if (
      numero >= 0 &&
      numero <= 1
    ) {
      return Math.round(
        numero * 100
      );
    }

    // Formato percentual:
    // 10 = 10%
    // 95 = 95%
    // 100 = 100%
    if (
      numero > 1 &&
      numero <= 100
    ) {
      return Math.round(
        numero
      );
    }

    // Proteção para nunca
    // exibir mais de 100%.
    if (numero > 100) {
      return 100;
    }

    return 0;
  };

  const abrirQuestao = (
    id: string
  ) => {
    router.push(
      `/historico/${id}`
    );
  };

  return (
  <SafeAreaView
    style={s.tela}
    edges={["top"]}
  >
    <FlatList
        data={items}
        keyExtractor={(item) =>
          item.id
        }
        refreshControl={
          <RefreshControl
            refreshing={
              atualizando
            }
            onRefresh={
              atualizar
            }
          />
        }
        contentContainerStyle={
          items.length === 0 &&
          !carregando
            ? s.listaVazia
            : s.lista
        }
        ListHeaderComponent={
          <View>
            <Text style={s.titulo}>
              Histórico
            </Text>

            <Text
              style={s.subtitulo}
            >
              Consulte as questões
              resolvidas anteriormente
              e abra os detalhes de cada
              resposta.
            </Text>

            <ConnectionStatus
              visible={
                erroConexao
              }
              message="Não foi possível carregar seu histórico. Verifique sua conexão com a internet e puxe a tela para baixo para tentar novamente."
            />

            {!carregando &&
            !erroConexao &&
            items.length > 0 ? (
              <View
                style={
                  s.resumoCard
                }
              >
                <View
                  style={
                    s.resumoIcone
                  }
                >
                  <Text
                    style={
                      s.resumoIconeTexto
                    }
                  >
                    📝
                  </Text>
                </View>

                <View
                  style={
                    s.resumoConteudo
                  }
                >
                  <Text
                    style={
                      s.resumoNumero
                    }
                  >
                    {items.length}
                  </Text>

                  <Text
                    style={
                      s.resumoTexto
                    }
                  >
                    {items.length === 1
                      ? "questão registrada"
                      : "questões registradas"}
                  </Text>
                </View>
              </View>
            ) : null}

            {!carregando &&
            !erroConexao &&
            items.length > 0 ? (
              <Text
                style={
                  s.secaoTitulo
                }
              >
                Questões recentes
              </Text>
            ) : null}

            {carregando ? (
              <View
                style={
                  s.carregandoCard
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#1769D2"
                />

                <Text
                  style={
                    s.carregandoTitulo
                  }
                >
                  Carregando histórico...
                </Text>

                <Text
                  style={
                    s.carregandoTexto
                  }
                >
                  Buscando suas questões
                  anteriores.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !carregando ? (
            erroConexao ? (
              <View style={s.vazio}>
                <View
                  style={
                    s.vazioIconeContainer
                  }
                >
                  <Text
                    style={
                      s.vazioIcone
                    }
                  >
                    📡
                  </Text>
                </View>

                <Text
                  style={
                    s.vazioTitulo
                  }
                >
                  Histórico indisponível
                </Text>

                <Text
                  style={
                    s.vazioTexto
                  }
                >
                  Reconecte-se à internet
                  e puxe a tela para baixo
                  para tentar novamente.
                </Text>
              </View>
            ) : (
              <View style={s.vazio}>
                <View
                  style={
                    s.vazioIconeContainer
                  }
                >
                  <Text
                    style={
                      s.vazioIcone
                    }
                  >
                    📝
                  </Text>
                </View>

                <Text
                  style={
                    s.vazioTitulo
                  }
                >
                  Nenhuma questão
                  resolvida ainda
                </Text>

                <Text
                  style={
                    s.vazioTexto
                  }
                >
                  Quando você fotografar
                  e analisar uma questão,
                  ela aparecerá aqui
                  automaticamente.
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    s.botaoResolver,
                    pressed &&
                      s.botaoPressionado,
                  ]}
                  onPress={() =>
                    router.push(
                      "/questao"
                    )
                  }
                >
                  <Text
                    style={
                      s.botaoResolverTexto
                    }
                  >
                    📷 Resolver questão
                  </Text>
                </Pressable>
              </View>
            )
          ) : undefined
        }
        renderItem={({ item }) => {
          const resposta =
            item.answers?.[0];

          const confianca =
            normalizarConfianca(
              resposta?.confidence
            );

          return (
            <Pressable
              onPress={() =>
                abrirQuestao(
                  item.id
                )
              }
              style={({ pressed }) => [
                s.card,
                pressed &&
                  s.cardPressionado,
              ]}
            >
              <View
                style={
                  s.cardTopo
                }
              >
                <View
                  style={
                    s.dataContainer
                  }
                >
                  <Text
                    style={
                      s.dataIcone
                    }
                  >
                    🕒
                  </Text>

                  <Text
                    style={s.data}
                  >
                    {formatarData(
                      item.created_at
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    s.cardSeta
                  }
                >
                  ›
                </Text>
              </View>

              {item.image_url ? (
                <Image
                  source={{
                    uri: item.image_url,
                  }}
                  style={s.imagem}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={
                    s.semImagem
                  }
                >
                  <Text
                    style={
                      s.semImagemIcone
                    }
                  >
                    📷
                  </Text>

                  <Text
                    style={
                      s.semImagemTexto
                    }
                  >
                    Questão sem imagem
                  </Text>
                </View>
              )}

              {resposta ? (
                <>
                  <View
                    style={
                      s.divisor
                    }
                  />

                  <Text
                    style={
                      s.labelResposta
                    }
                  >
                    RESPOSTA
                  </Text>

                  <Text
                    style={
                      s.resposta
                    }
                    numberOfLines={3}
                  >
                    {limparMarkdown(resposta.answer)}
                  </Text>

                  <View
                    style={
                      s.metadados
                    }
                  >
                    {confianca !==
                    null ? (
                      <View
                        style={
                          s.badge
                        }
                      >
                        <Text
                          style={
                            s.badgeTexto
                          }
                        >
                          Confiança{" "}
                          {confianca}%
                        </Text>
                      </View>
                    ) : null}

                    {resposta.source_page ? (
                      <View
                        style={
                          s.badge
                        }
                      >
                        <Text
                          style={
                            s.badgeTexto
                          }
                        >
                          Página{" "}
                          {
                            resposta.source_page
                          }
                        </Text>
                      </View>
                    ) : null}

                    {resposta.hp12c_steps ? (
                      <View
                        style={
                          s.badgeHp
                        }
                      >
                        <Text
                          style={
                            s.badgeHpTexto
                          }
                        >
                          🧮 HP-12C
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : (
                <View
                  style={
                    s.semRespostaCard
                  }
                >
                  <Text
                    style={
                      s.semResposta
                    }
                  >
                    Sem resposta
                    registrada.
                  </Text>
                </View>
              )}

              <View
                style={
                  s.abrirContainer
                }
              >
                <Text
                  style={
                    s.abrirTexto
                  }
                >
                  Ver detalhes
                </Text>

                <Text
                  style={
                    s.abrirSeta
                  }
                >
                  →
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s =
  StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: "#F3F7FC",
    },

    lista: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
    },

    listaVazia: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
    },

    titulo: {
      fontSize: 29,
      lineHeight: 37,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: "#172B4D",
    },

    subtitulo: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 21,
      color: "#64748B",
    },

    resumoCard: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#D8E7FA",
      padding: 16,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 1,
    },

    resumoIcone: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: "#E8F1FF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    resumoIconeTexto: {
      fontSize: 26,
    },

    resumoConteudo: {
      marginLeft: 15,
    },

    resumoNumero: {
      fontSize: 28,
      fontWeight: "900",
      color: "#1769D2",
    },

    resumoTexto: {
      marginTop: 1,
      fontSize: 13,
      color: "#64748B",
    },

    secaoTitulo: {
      marginTop: 24,
      marginBottom: 10,
      fontSize: 16,
      fontWeight: "800",
      color: "#172B4D",
    },

    carregandoCard: {
      marginTop: 28,
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      padding: 26,
      alignItems: "center",
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    carregandoTitulo: {
      marginTop: 14,
      fontSize: 17,
      fontWeight: "800",
      color: "#172B4D",
    },

    carregandoTexto: {
      marginTop: 5,
      fontSize: 13,
      color: "#64748B",
    },

    vazio: {
      paddingTop: 36,
      alignItems: "center",
      paddingHorizontal: 20,
    },

    vazioIconeContainer: {
      width: 88,
      height: 88,
      borderRadius: 28,
      backgroundColor: "#E8F1FF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    vazioIcone: {
      fontSize: 40,
    },

    vazioTitulo: {
      marginTop: 18,
      fontSize: 20,
      fontWeight: "800",
      color: "#172B4D",
      textAlign: "center",
    },

    vazioTexto: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: "#64748B",
      textAlign: "center",
    },

    botaoResolver: {
      marginTop: 22,
      backgroundColor: "#1769D2",
      borderRadius: 16,
      minHeight: 52,
      paddingVertical: 14,
      paddingHorizontal: 22,
      justifyContent: "center",
      shadowColor: "#1456A0",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 3,
    },

    botaoResolverTexto: {
      fontSize: 15,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    botaoPressionado: {
      opacity: 0.8,
    },

    card: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 16,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    cardPressionado: {
      opacity: 0.86,
    },

    cardTopo: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 13,
    },

    dataContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    dataIcone: {
      fontSize: 13,
      marginRight: 8,
    },

    data: {
      flexShrink: 1,
      fontSize: 12,
      color: "#64748B",
    },

    cardSeta: {
      fontSize: 27,
      color: "#94A3B8",
    },

    imagem: {
      width: "100%",
      height: 180,
      borderRadius: 16,
      marginBottom: 14,
      backgroundColor: "#F1F5F9",
    },

    semImagem: {
      height: 82,
      borderRadius: 14,
      marginBottom: 14,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#EEF2F7",
      alignItems: "center",
      justifyContent:
        "center",
    },

    semImagemIcone: {
      fontSize: 22,
    },

    semImagemTexto: {
      marginTop: 5,
      fontSize: 12,
      color: "#94A3B8",
    },

    label: {
      fontSize: 11,
      fontWeight: "800",
      color: "#64748B",
      letterSpacing: 0.7,
    },

    questao: {
      marginTop: 6,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600",
      color: "#111827",
    },

    divisor: {
      height: 1,
      backgroundColor: "#E5EDF7",
      marginVertical: 14,
    },

    labelResposta: {
      fontSize: 11,
      fontWeight: "800",
      color: "#64748B",
      letterSpacing: 0.7,
    },

    resposta: {
      marginTop: 6,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "800",
      color: "#172B4D",
    },

    metadados: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 13,
    },

    badge: {
      backgroundColor: "#E8F1FF",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    badgeTexto: {
      fontSize: 11,
      fontWeight: "700",
      color: "#1456A0",
    },

    badgeHp: {
      backgroundColor: "#E8F8F0",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    badgeHpTexto: {
      fontSize: 11,
      fontWeight: "700",
      color: "#15803D",
    },

    semRespostaCard: {
      marginTop: 14,
      backgroundColor: "#F8FAFC",
      borderRadius: 12,
      padding: 11,
    },

    semResposta: {
      fontSize: 13,
      color: "#94A3B8",
      fontStyle: "italic",
    },

    abrirContainer: {
      marginTop: 17,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor: "#E5EDF7",
      flexDirection: "row",
      justifyContent:
        "flex-end",
      alignItems: "center",
    },

    abrirTexto: {
      fontSize: 13,
      fontWeight: "800",
      color: "#1769D2",
    },

    abrirSeta: {
      marginLeft: 5,
      fontSize: 17,
      color: "#1769D2",
    },
  });