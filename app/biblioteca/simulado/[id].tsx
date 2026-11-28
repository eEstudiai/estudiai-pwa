import React, {
  useCallback,
  useState,
  useRef,
} from "react";
import { voltar } from "../../../services/navegacao";

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

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../../services/supabase";
import { avisar } from "../../../services/avisos";

type Material = {
  id: string;
  title: string;
  status: string;
};

type QuantidadeQuestoes =
  | 5
  | 10
  | 20
  | 30;

type SimuladoSalvo = {
  id: string;
  title: string | null;
  question_count: number;
  created_at: string;
};

export default function SimuladoMaterialScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [
    material,
    setMaterial,
  ] = useState<Material | null>(
    null
  );

  const [
    simulados,
    setSimulados,
  ] = useState<SimuladoSalvo[]>(
    []
  );

  const [
    quantidade,
    setQuantidade,
  ] =
    useState<QuantidadeQuestoes>(
      10
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
    gerando,
    setGerando,
  ] = useState(false);

  const [
    iaHabilitada,
    setIaHabilitada,
  ] = useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] =
    useState<string | null>(
      null
    );

  const carregarDados =
    useCallback(async () => {
      try {
        setMensagemErro(null);

        if (!id) {
          setMensagemErro(
            "Apostila não encontrada."
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
          data: materialData,
          error: materialError,
        } = await supabase
          .from("materials")
          .select(
            "id, title, status"
          )
          .eq("id", id)
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (
          materialError ||
          !materialData
        ) {
          console.log(
            "ERRO AO CARREGAR MATERIAL:",
            materialError
          );

          setMensagemErro(
            "Não foi possível carregar esta apostila."
          );

          return;
        }

        setMaterial(
          materialData as Material
        );

        const {
          data: configData,
          error: configError,
        } = await supabase
          .from("app_settings")
          .select("value")
          .eq(
            "key",
            "quiz_ai_enabled"
          )
          .maybeSingle();

        if (configError) {
          console.log(
            "ERRO CONFIGURAÇÃO SIMULADO:",
            configError
          );

          setIaHabilitada(
            false
          );
        } else {
          const valor =
            configData?.value;

          setIaHabilitada(
            valor === true ||
              valor === "true"
          );
        }

        const {
          data: simuladosData,
          error: simuladosError,
        } = await supabase
          .from(
            "material_quizzes"
          )
          .select(
            `
            id,
            title,
            question_count,
            created_at
          `
          )
          .eq(
            "material_id",
            id
          )
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

        if (simuladosError) {
          console.log(
            "ERRO AO CARREGAR SIMULADOS:",
            simuladosError
          );

          setSimulados([]);
        } else {
          setSimulados(
            (simuladosData ||
              []) as SimuladoSalvo[]
          );
        }
      } catch (error) {
        console.log(
          "ERRO INESPERADO NA TELA DE SIMULADO:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao carregar o simulado."
        );
      } finally {
        setCarregando(false);
      }
    }, [id]);

  // Tela cheia de carregamento so na primeira vez; ao voltar de outra tela,
  // atualiza em segundo plano.
  const primeiraCarga = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (primeiraCarga.current) {
        setCarregando(true);
      }

      Promise.resolve(carregarDados()).finally(() => {
        primeiraCarga.current = false;
      });
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

  const gerarSimulado =
    async () => {
      if (!material) {
        return;
      }

      if (
        material.status !==
        "ready"
      ) {
        avisar(
          "Apostila ainda não preparada",
          "Esta apostila precisa ser preparada antes que a IA possa gerar o simulado."
        );

        return;
      }

      if (!iaHabilitada) {
        avisar(
          "Simulado com IA desativado",
          "A geração de novos simulados está temporariamente desativada. Simulados já salvos continuam disponíveis normalmente."
        );

        return;
      }

      try {
        setGerando(true);

        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            "generate-quiz",
            {
              body: {
                materialId:
                  material.id,

                questionCount:
                  quantidade,
              },
            }
          );

        if (error) {
          console.log(
            "ERRO GENERATE-QUIZ:",
            error
          );

          await carregarDados();

          const status =
            (error as any)
              ?.context?.status;

          if (status === 429) {
            avisar(
              "Limite de simulados atingido",
              "Você atingiu o limite de simulados disponível no seu plano atual. O EstudaIA Plus amplia esses limites."
            );

            return;
          }

          avisar(
            "Não foi possível gerar",
            "O servidor não conseguiu gerar o simulado. Tente novamente em alguns instantes."
          );

          return;
        }

        if (
          data?.code ===
          "QUIZ_AI_DISABLED"
        ) {
          setIaHabilitada(false);

          avisar(
            "Simulado com IA desativado",
            "A geração foi bloqueada pelo servidor. Nenhum crédito da API foi utilizado."
          );

          return;
        }

        if (data?.quiz) {
          await carregarDados();

          avisar(
            "Simulado gerado",
            `O simulado com ${
              data.quiz
                .question_count ??
              quantidade
            } questões foi criado e salvo com sucesso.`
          );

          return;
        }

        avisar(
          "Não foi possível gerar",
          data?.error ||
            "O servidor não retornou um simulado."
        );
      } catch (error) {
        console.log(
          "ERRO AO GERAR SIMULADO:",
          error
        );

        avisar(
          "Erro",
          "Não foi possível comunicar com o servidor."
        );
      } finally {
        setGerando(false);
      }
    };

  const abrirSimulado = (
    quizId: string
  ) => {
    router.push(
      `/biblioteca/simulado/responder/${quizId}` as any
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
    !material
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
            "Apostila não encontrada."}
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
      </SafeAreaView>
    );
  }

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
        🎯 Simulado com IA
      </Text>

      <Text
        style={styles.subtitulo}
      >
        Crie e responda simulados
        usando somente o conteúdo
        desta apostila.
      </Text>

      <View
        style={
          styles.materialCard
        }
      >
        <Text
          style={
            styles.materialLabel
          }
        >
          APOSTILA
        </Text>

        <Text
          style={
            styles.materialTitulo
          }
          numberOfLines={2}
        >
          {material.title}
        </Text>

        <Text
          style={
            styles.materialStatus
          }
        >
          Status:{" "}
          {material.status ===
          "ready"
            ? "Preparada"
            : material.status ===
                "processing"
              ? "Processando"
              : material.status ===
                  "error"
                ? "Erro"
                : "Aguardando preparação"}
        </Text>
      </View>

      <Text
        style={
          styles.secaoTitulo
        }
      >
        Quantidade de questões
      </Text>

      <Text
        style={
          styles.secaoDescricao
        }
      >
        Escolha quantas questões
        deseja no novo simulado.
      </Text>

      <View
        style={
          styles.quantidades
        }
      >
        {(
          [
            5,
            10,
            20,
            30,
          ] as QuantidadeQuestoes[]
        ).map((numero) => {
          const selecionado =
            quantidade === numero;

          return (
            <Pressable
              key={numero}
              style={[
                styles.quantidadeBotao,
                selecionado &&
                  styles.quantidadeBotaoAtivo,
              ]}
              onPress={() =>
                setQuantidade(
                  numero
                )
              }
            >
              <Text
                style={[
                  styles.quantidadeNumero,
                  selecionado &&
                    styles.quantidadeNumeroAtivo,
                ]}
              >
                {numero}
              </Text>

              <Text
                style={[
                  styles.quantidadeTexto,
                  selecionado &&
                    styles.quantidadeTextoAtivo,
                ]}
              >
                questões
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={
          styles.configuracaoCard
        }
      >
        <Text
          style={
            styles.configuracaoTitulo
          }
        >
          📋 Como será o simulado
        </Text>

        <View
          style={
            styles.itemConfiguracao
          }
        >
          <Text
            style={
              styles.itemIcone
            }
          >
            ✓
          </Text>

          <Text
            style={
              styles.itemTexto
            }
          >
            {quantidade} questões
            de múltipla escolha
          </Text>
        </View>

        <View
          style={
            styles.itemConfiguracao
          }
        >
          <Text
            style={
              styles.itemIcone
            }
          >
            ✓
          </Text>

          <Text
            style={
              styles.itemTexto
            }
          >
            Questões baseadas
            somente nesta apostila
          </Text>
        </View>

        <View
          style={
            styles.itemConfiguracao
          }
        >
          <Text
            style={
              styles.itemIcone
            }
          >
            ✓
          </Text>

          <Text
            style={
              styles.itemTexto
            }
          >
            Correção das respostas
          </Text>
        </View>

        <View
          style={
            styles.itemConfiguracao
          }
        >
          <Text
            style={
              styles.itemIcone
            }
          >
            ✓
          </Text>

          <Text
            style={
              styles.itemTexto
            }
          >
            Explicação da alternativa
            correta
          </Text>
        </View>

        <View
          style={[
            styles.itemConfiguracao,
            styles.itemConfiguracaoUltimo,
          ]}
        >
          <Text
            style={
              styles.itemIcone
            }
          >
            ✓
          </Text>

          <Text
            style={
              styles.itemTexto
            }
          >
            Resultado ao final do
            simulado
          </Text>
        </View>
      </View>

      {material.status !==
      "ready" ? (
        <View
          style={
            styles.avisoMaterial
          }
        >
          <Text
            style={
              styles.avisoMaterialTitulo
            }
          >
            ⏳ Apostila ainda não
            preparada
          </Text>

          <Text
            style={
              styles.avisoMaterialTexto
            }
          >
            Você pode configurar o
            simulado agora, mas a
            geração de novas questões
            ficará disponível somente
            depois que a apostila for
            preparada.
          </Text>
        </View>
      ) : null}

      {!iaHabilitada ? (
        <View
          style={styles.avisoIA}
        >
          <Text
            style={
              styles.avisoIATitulo
            }
          >
            🔒 Geração pela IA
            desativada
          </Text>

          <Text
            style={
              styles.avisoIATexto
            }
          >
            O recurso de geração está
            preparado, porém nenhuma
            chamada para a API será
            feita neste momento.
            Simulados já salvos podem
            ser respondidos
            normalmente.
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.avisoIAAtiva
          }
        >
          <Text
            style={
              styles.avisoIAAtivaTitulo
            }
          >
            ✅ Simulado com IA
            habilitado
          </Text>
        </View>
      )}

      <Pressable
        style={[
          styles.botaoGerar,
          (gerando ||
            !iaHabilitada ||
            material.status !==
              "ready") &&
            styles.botaoGerarDesativado,
        ]}
        onPress={
          gerarSimulado
        }
        disabled={gerando}
      >
        {gerando ? (
          <>
            <ActivityIndicator />

            <Text
              style={
                styles.botaoGerarTexto
              }
            >
              Preparando...
            </Text>
          </>
        ) : (
          <Text
            style={
              styles.botaoGerarTexto
            }
          >
            🎯 Gerar novo simulado
          </Text>
        )}
      </Pressable>

      <Text
        style={
          styles.listaTitulo
        }
      >
        Simulados salvos
      </Text>

      <Text
        style={
          styles.listaDescricao
        }
      >
        Responda novamente qualquer
        simulado que já tenha sido
        criado para esta apostila.
      </Text>

      {simulados.length ===
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
            🎯
          </Text>

          <Text
            style={
              styles.vazioTitulo
            }
          >
            Nenhum simulado gerado
          </Text>

          <Text
            style={
              styles.vazioTexto
            }
          >
            Quando um simulado for
            gerado, ele aparecerá
            aqui e poderá ser
            respondido quantas vezes
            desejar.
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.listaContainer
          }
        >
          {simulados.map(
            (
              simulado,
              index
            ) => (
              <View
                key={
                  simulado.id
                }
                style={[
                  styles.simuladoCard,
                  index ===
                    simulados.length -
                      1 &&
                    styles.simuladoCardUltimo,
                ]}
              >
                <View
                  style={
                    styles.simuladoTopo
                  }
                >
                  <View
                    style={
                      styles.simuladoIcone
                    }
                  >
                    <Text
                      style={
                        styles.simuladoIconeTexto
                      }
                    >
                      🎯
                    </Text>
                  </View>

                  <View
                    style={
                      styles.simuladoInfo
                    }
                  >
                    <Text
                      style={
                        styles.simuladoTitulo
                      }
                    >
                      {simulado.title ||
                        "Simulado"}
                    </Text>

                    <Text
                      style={
                        styles.simuladoDetalhes
                      }
                    >
                      {
                        simulado.question_count
                      }{" "}
                      questões
                    </Text>

                    <Text
                      style={
                        styles.simuladoData
                      }
                    >
                      Criado em{" "}
                      {formatarData(
                        simulado.created_at
                      )}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={
                    styles.botaoResponder
                  }
                  onPress={() =>
                    abrirSimulado(
                      simulado.id
                    )
                  }
                >
                  <Text
                    style={
                      styles.botaoResponderTexto
                    }
                  >
                    ▶ Responder
                    simulado
                  </Text>
                </Pressable>
              </View>
            )
          )}
        </View>
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
      fontSize: 27,
      lineHeight: 35,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: "#172B4D",
    },

    subtitulo: {
      marginTop: 5,
      marginBottom: 18,
      fontSize: 14,
      lineHeight: 21,
      color: "#64748B",
    },

    materialCard: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5EDF7",
      marginBottom: 22,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    materialLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: "#64748B",
      marginBottom: 7,
    },

    materialTitulo: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "800",
      color: "#172B4D",
    },

    materialStatus: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: "#E8F1FF",
      fontSize: 13,
      fontWeight: "700",
      color: "#1769D2",
    },

    secaoTitulo: {
      fontSize: 16,
      fontWeight: "800",
      color: "#172B4D",
    },

    secaoDescricao: {
      marginTop: 4,
      marginBottom: 13,
      fontSize: 13,
      lineHeight: 19,
      color: "#64748B",
    },

    quantidades: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },

    quantidadeBotao: {
      flex: 1,
      minWidth: 0,
      minHeight: 76,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      backgroundColor: "#FFFFFF",
    },

    quantidadeBotaoAtivo: {
      borderColor: "#1769D2",
      backgroundColor: "#E8F1FF",
    },

    quantidadeNumero: {
      fontSize: 22,
      fontWeight: "900",
      color: "#526078",
    },

    quantidadeNumeroAtivo: {
      color: "#1456A0",
    },

    quantidadeTexto: {
      marginTop: 2,
      fontSize: 11,
      color: "#64748B",
    },

    quantidadeTextoAtivo: {
      color: "#1769D2",
    },

    configuracaoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      padding: 18,
      marginBottom: 16,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    configuracaoTitulo: {
      fontSize: 17,
      fontWeight: "800",
      color: "#172B4D",
      marginBottom: 12,
    },

    itemConfiguracao: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#E5EDF7",
    },

    itemConfiguracaoUltimo: {
      borderBottomWidth: 0,
    },

    itemIcone: {
      width: 28,
      height: 28,
      lineHeight: 28,
      textAlign: "center",
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "#E8F8F0",
      color: "#15803D",
      fontSize: 14,
      fontWeight: "900",
      marginRight: 10,
    },

    itemTexto: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: "#334155",
    },

    avisoMaterial: {
      backgroundColor: "#FFF8E7",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#F5D98C",
    },

    avisoMaterialTitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#92400E",
    },

    avisoMaterialTexto: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: "#78350F",
    },

    avisoIA: {
      backgroundColor: "#F1F5F9",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
    },

    avisoIATitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#4B5563",
    },

    avisoIATexto: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: "#64748B",
    },

    avisoIAAtiva: {
      backgroundColor: "#ECFDF5",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
    },

    avisoIAAtivaTitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#166534",
    },

    botaoGerar: {
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: "#1769D2",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 26,
      shadowColor: "#1456A0",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 3,
    },

    botaoGerarDesativado: {
      backgroundColor: "#A9BDD5",
      shadowOpacity: 0,
      elevation: 0,
    },

    botaoGerarTexto: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },

    listaTitulo: {
      fontSize: 19,
      fontWeight: "800",
      color: "#172B4D",
    },

    listaDescricao: {
      marginTop: 5,
      marginBottom: 14,
      fontSize: 13,
      lineHeight: 20,
      color: "#64748B",
    },

    listaContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      paddingHorizontal: 16,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    simuladoCard: {
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor:
        "#E5E7EB",
    },

    simuladoCardUltimo: {
      borderBottomWidth: 0,
    },

    simuladoTopo: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    simuladoIcone: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        "#EFF6FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    simuladoIconeTexto: {
      fontSize: 22,
    },

    simuladoInfo: {
      flex: 1,
    },

    simuladoTitulo: {
      fontSize: 16,
      fontWeight: "800",
      color: "#111827",
    },

    simuladoDetalhes: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: "700",
      color: "#2563EB",
    },

    simuladoData: {
      marginTop: 3,
      fontSize: 11,
      color: "#9CA3AF",
    },

    botaoResponder: {
      minHeight: 46,
      borderRadius: 12,
      backgroundColor:
        "#EFF6FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 14,
    },

    botaoResponderTexto: {
      fontSize: 14,
      fontWeight: "800",
      color: "#1D4ED8",
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
