import React, {
  useCallback,
  useState,
} from "react";
import { voltar } from "../../services/navegacao";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  Linking,
} from "react-native";

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";

import { supabase } from "../../services/supabase";

type Material = {
  id: string;
  title: string;
  file_path: string;
  status: string;
  created_at: string;
  processing_error: string | null;
  openai_file_id: string | null;
  vector_store_id: string | null;
};

export default function DetalhesMaterial() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [
    material,
    setMaterial,
  ] =
    useState<Material | null>(
      null
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
    abrindoPDF,
    setAbrindoPDF,
  ] = useState(false);

  const [
    excluindo,
    setExcluindo,
  ] = useState(false);

  const [
    processamentoHabilitado,
    setProcessamentoHabilitado,
  ] = useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] =
    useState<string | null>(
      null
    );

  const carregarMaterial =
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
          data,
          error,
        } = await supabase
          .from("materials")
          .select(
            `
            id,
            title,
            file_path,
            status,
            created_at,
            processing_error,
            openai_file_id,
            vector_store_id
          `
          )
          .eq("id", id)
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (
          error ||
          !data
        ) {
          console.log(
            "ERRO AO CARREGAR MATERIAL:",
            error
          );

          setMensagemErro(
            "Não foi possível carregar esta apostila."
          );

          return;
        }

        setMaterial(
          data as Material
        );

        const {
          data: configData,
          error: configError,
        } = await supabase
          .from("app_settings")
          .select("value")
          .eq(
            "key",
            "ai_processing_enabled"
          )
          .maybeSingle();

        if (configError) {
          console.log(
            "ERRO CONFIGURAÇÃO PROCESSAMENTO:",
            configError
          );

          setProcessamentoHabilitado(
            false
          );
        } else {
          const valor =
            configData?.value;

          setProcessamentoHabilitado(
            valor === true ||
              valor === "true"
          );
        }
      } catch (error) {
        console.log(
          "ERRO INESPERADO NOS DETALHES:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao carregar a apostila."
        );
      } finally {
        setCarregando(false);
      }
    }, [id]);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);

      carregarMaterial();
    }, [carregarMaterial])
  );

  const atualizar =
    async () => {
      try {
        setAtualizando(true);

        await carregarMaterial();
      } finally {
        setAtualizando(false);
      }
    };

  const abrirPDF =
    async () => {
      if (!material) {
        return;
      }

      try {
        setAbrindoPDF(true);

        const {
          data,
          error,
        } = await supabase.storage
          .from(
            "study-materials"
          )
          .createSignedUrl(
            material.file_path,
            60 * 10
          );

        if (
          error ||
          !data?.signedUrl
        ) {
          console.log(
            "ERRO AO GERAR LINK DO PDF:",
            error
          );

          Alert.alert(
            "Erro",
            "Não foi possível abrir o PDF."
          );

          return;
        }

        const podeAbrir =
          await Linking.canOpenURL(
            data.signedUrl
          );

        if (!podeAbrir) {
          Alert.alert(
            "Erro",
            "Este dispositivo não conseguiu abrir o PDF."
          );

          return;
        }

        await Linking.openURL(
          data.signedUrl
        );
      } catch (error) {
        console.log(
          "ERRO AO ABRIR PDF:",
          error
        );

        Alert.alert(
          "Erro",
          "Não foi possível abrir o PDF."
        );
      } finally {
        setAbrindoPDF(false);
      }
    };

  const avisarNaPlataforma = (
    titulo: string,
    mensagem: string
  ) => {
    if (Platform.OS === "web") {
      window.alert(`${titulo}\n\n${mensagem}`);
      return;
    }

    Alert.alert(titulo, mensagem);
  };

  const executarPreparacao = async () => {
    if (!material) {
      return;
    }

    try {
      setAtualizando(true);

      const { data, error } =
        await supabase.functions.invoke(
          "process-material",
          {
            body: {
              materialId: material.id,
            },
          }
        );

      if (error) {
        console.log("ERRO PROCESS-MATERIAL:", error);

        let mensagem =
          error.message ||
          "Não foi possível preparar a apostila.";

        try {
          const contexto: any = (error as any).context;
          if (contexto) {
            const resposta = contexto.clone
              ? contexto.clone()
              : contexto;
            const json = await resposta.json();
            mensagem = json?.error || json?.message || mensagem;
          }
        } catch {
          // Mantém a mensagem original.
        }

        avisarNaPlataforma("Não foi possível preparar", mensagem);
        await carregarMaterial();
        return;
      }

      if (data?.ok === false) {
        avisarNaPlataforma(
          "Não foi possível preparar",
          data?.error || "O processamento não foi concluído."
        );
        await carregarMaterial();
        return;
      }

      await carregarMaterial();
      avisarNaPlataforma(
        "Apostila preparada",
        data?.alreadyProcessed
          ? "Esta apostila já estava preparada para estudo."
          : "A apostila foi preparada com sucesso e está pronta para as ferramentas de IA."
      );
    } catch (error: any) {
      console.log("ERRO AO PREPARAR APOSTILA:", error);
      avisarNaPlataforma(
        "Erro",
        error?.message || "Não foi possível preparar a apostila."
      );
      await carregarMaterial();
    } finally {
      setAtualizando(false);
    }
  };

  const prepararParaEstudo =
    async () => {
      if (!material) {
        return;
      }

      if (
        !processamentoHabilitado
      ) {
        avisarNaPlataforma(
          "Processamento temporariamente desativado",
          "A preparação das apostilas pela IA está desativada neste momento."
        );

        return;
      }

      /*
        Proteção contra gasto duplicado.

        Se a apostila já estiver pronta,
        o aplicativo não chama novamente
        a Edge Function.
      */
      if (
        material.status ===
        "ready"
      ) {
        avisarNaPlataforma(
          "Apostila já preparada",
          "Esta apostila já está pronta para estudo. Não é necessário processá-la novamente."
        );

        return;
      }

      /*
        Também não permitimos uma segunda
        solicitação enquanto o processamento
        estiver em andamento.
      */
      if (
        material.status ===
        "processing"
      ) {
        avisarNaPlataforma(
          "Processamento em andamento",
          "Esta apostila já está sendo preparada. Aguarde a conclusão."
        );

        return;
      }

      const mensagemConfirmacao =
        "O EstudaIA processará esta apostila para permitir pesquisas e ferramentas de IA.";

      if (Platform.OS === "web") {
        if (
          window.confirm(
            `Preparar apostila?\n\n${mensagemConfirmacao}`
          )
        ) {
          await executarPreparacao();
        }

        return;
      }

      Alert.alert(
        "Preparar apostila?",
        mensagemConfirmacao,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Preparar",
            onPress: executarPreparacao,
          },
        ]
      );
    };

  const abrirResumo = () => {
    if (!material) {
      return;
    }

    router.push(
      `/biblioteca/resumo/${material.id}` as any
    );
  };

  const abrirSimulado = () => {
    if (!material) {
      return;
    }

    router.push(
      `/biblioteca/simulado/${material.id}` as any
    );
  };

  const abrirMapaMental = () => {
    if (!material) {
      return;
    }

    router.push(
      `/biblioteca/mapa/${material.id}` as any
    );
  };

  const excluirMaterial =
    async () => {
      if (
        !material ||
        excluindo
      ) {
        return;
      }

      try {
        setExcluindo(true);

        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            "delete-material",
            {
              body: {
                materialId:
                  material.id,
              },
            }
          );

        if (error) {
          console.log(
            "ERRO DELETE-MATERIAL:",
            error
          );

          avisarNaPlataforma(
            "Erro",
            "Não foi possível excluir a apostila."
          );

          return;
        }

        if (
          data?.ok === false
        ) {
          avisarNaPlataforma(
            "Erro",
            data?.error ||
              "Não foi possível excluir a apostila."
          );

          return;
        }

        avisarNaPlataforma(
          "Apostila excluída",
          "A apostila e os dados associados foram removidos."
        );

        router.replace(
          "/biblioteca"
        );
      } catch (error) {
        console.log(
          "ERRO AO EXCLUIR APOSTILA:",
          error
        );

        avisarNaPlataforma(
          "Erro",
          "Não foi possível excluir a apostila."
        );
      } finally {
        setExcluindo(false);
      }
    };

  const confirmarExclusao =
    () => {
      if (!material) {
        return;
      }

      const mensagem =
        material.status ===
        "ready"
          ? "O PDF, o registro da apostila e o arquivo associado à IA serão removidos. Esta ação não pode ser desfeita."
          : "O PDF e o registro da apostila serão removidos. Esta ação não pode ser desfeita.";

      if (Platform.OS === "web") {
        if (window.confirm(`Excluir apostila?\n\n${mensagem}`)) {
          void excluirMaterial();
        }

        return;
      }

      Alert.alert(
        "Excluir apostila?",
        mensagem,
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
              excluirMaterial,
          },
        ]
      );
    };

  const statusTitulo = (
    status: string
  ) => {
    switch (status) {
      case "ready":
        return "Pronta para estudo";

      case "processing":
        return "Processando";

      case "error":
        return "Erro no processamento";

      case "pending":
      default:
        return "Aguardando processamento";
    }
  };

  const statusIcone = (
    status: string
  ) => {
    switch (status) {
      case "ready":
        return "✅";

      case "processing":
        return "🔄";

      case "error":
        return "❌";

      case "pending":
      default:
        return "🕒";
    }
  };

  const statusDescricao = (
    status: string
  ) => {
    switch (status) {
      case "ready":
        return "A apostila está preparada e disponível para os recursos de estudo.";

      case "processing":
        return "A apostila está sendo preparada para pesquisa pela IA.";

      case "error":
        return "Ocorreu um erro durante a preparação desta apostila.";

      case "pending":
      default:
        return "O PDF está salvo na biblioteca e aguarda preparação pela IA.";
    }
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
          Carregando apostila...
        </Text>
      </View>
    );
  }

  if (
    mensagemErro ||
    !material
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
          a apostila
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
      </View>
    );
  }

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
        Detalhes da apostila
      </Text>

      <Text
        style={styles.subtitulo}
      >
        Consulte o arquivo e use as
        ferramentas de estudo do
        EstudaIA.
      </Text>

      <View
        style={
          styles.arquivoCard
        }
      >
        <View
          style={
            styles.arquivoIcone
          }
        >
          <Text
            style={
              styles.arquivoIconeTexto
            }
          >
            📄
          </Text>
        </View>

        <View
          style={
            styles.arquivoInfo
          }
        >
          <Text
            style={
              styles.arquivoLabel
            }
          >
            APOSTILA
          </Text>

          <Text
            style={
              styles.arquivoTitulo
            }
          >
            {material.title}
          </Text>

          <Text
            style={
              styles.arquivoData
            }
          >
            Adicionada em{" "}
            {formatarData(
              material.created_at
            )}
          </Text>
        </View>
      </View>

      <Pressable
        style={
          styles.botaoPDF
        }
        onPress={abrirPDF}
        disabled={abrindoPDF}
      >
        {abrindoPDF ? (
          <ActivityIndicator />
        ) : (
          <Text
            style={
              styles.botaoPDFTexto
            }
          >
            📖 Abrir PDF
          </Text>
        )}
      </Pressable>

      <View
        style={
          styles.statusCard
        }
      >
        <Text
          style={
            styles.statusLabel
          }
        >
          STATUS
        </Text>

        <View
          style={
            styles.statusLinha
          }
        >
          <Text
            style={
              styles.statusIcone
            }
          >
            {statusIcone(
              material.status
            )}
          </Text>

          <View
            style={
              styles.statusConteudo
            }
          >
            <Text
              style={
                styles.statusTitulo
              }
            >
              {statusTitulo(
                material.status
              )}
            </Text>

            <Text
              style={
                styles.statusDescricao
              }
            >
              {statusDescricao(
                material.status
              )}
            </Text>
          </View>
        </View>

        {material.status ===
          "error" &&
        material.processing_error ? (
          <View
            style={
              styles.erroProcessamento
            }
          >
            <Text
              style={
                styles.erroProcessamentoTexto
              }
            >
              {
                material.processing_error
              }
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={
          styles.preparacaoCard
        }
      >
        <Text
          style={
            styles.preparacaoTitulo
          }
        >
          🤖 Preparação pela IA
        </Text>

        <Text
          style={
            styles.preparacaoTexto
          }
        >
          Para responder questões
          usando esta apostila, o
          EstudaIA precisa primeiro
          prepará-la para pesquisa.
        </Text>
      </View>

      <Pressable
        style={[
          styles.botaoPreparar,
          (!processamentoHabilitado ||
            material.status ===
              "ready" ||
            material.status ===
              "processing") &&
            styles.botaoPrepararDesativado,
        ]}
        onPress={
          prepararParaEstudo
        }
        disabled={
          material.status ===
          "processing"
        }
      >
        <Text
          style={[
            styles.botaoPrepararTexto,
            (!processamentoHabilitado ||
              material.status ===
                "ready" ||
              material.status ===
                "processing") &&
              styles.botaoPrepararTextoDesativado,
          ]}
        >
          {material.status ===
          "processing"
            ? "🔄 Preparando apostila..."
            : material.status ===
                "ready"
              ? "✅ Apostila preparada"
              : "🤖 Preparar para estudo"}
        </Text>
      </Pressable>

      {!processamentoHabilitado ? (
        <Text
          style={
            styles.processamentoIndisponivel
          }
        >
          🔒 Processamento pela IA
          temporariamente indisponível
        </Text>
      ) : material.status ===
        "ready" ? (
        <Text
          style={
            styles.processamentoDisponivel
          }
        >
          ✅ Apostila pronta para as
          ferramentas de IA
        </Text>
      ) : (
        <Text
          style={
            styles.processamentoDisponivel
          }
        >
          ✅ Processamento pela IA
          disponível
        </Text>
      )}

      <View
        style={
          styles.ferramentasCard
        }
      >
        <Text
          style={
            styles.ferramentasTitulo
          }
        >
          ✨ Ferramentas de IA
        </Text>

        <Text
          style={
            styles.ferramentasDescricao
          }
        >
          Estude esta apostila de
          diferentes formas usando os
          recursos inteligentes do
          EstudaIA.
        </Text>

        {material.status !==
        "ready" ? (
          <View
            style={
              styles.avisoFerramentas
            }
          >
            <Text
              style={
                styles.avisoFerramentasTexto
              }
            >
              ⚠️ A geração pela IA
              ficará disponível após a
              preparação desta
              apostila.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={
            styles.ferramentaItem
          }
          onPress={abrirResumo}
        >
          <View
            style={
              styles.ferramentaIcone
            }
          >
            <Text
              style={
                styles.ferramentaIconeTexto
              }
            >
              📝
            </Text>
          </View>

          <View
            style={
              styles.ferramentaConteudo
            }
          >
            <Text
              style={
                styles.ferramentaTitulo
              }
            >
              Resumo com IA
            </Text>

            <Text
              style={
                styles.ferramentaTexto
              }
            >
              Gere um resumo dos
              principais conteúdos da
              apostila.
            </Text>
          </View>

          <Text
            style={
              styles.seta
            }
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.ferramentaItem
          }
          onPress={
            abrirSimulado
          }
        >
          <View
            style={
              styles.ferramentaIcone
            }
          >
            <Text
              style={
                styles.ferramentaIconeTexto
              }
            >
              🎯
            </Text>
          </View>

          <View
            style={
              styles.ferramentaConteudo
            }
          >
            <Text
              style={
                styles.ferramentaTitulo
              }
            >
              Gerar simulado
            </Text>

            <Text
              style={
                styles.ferramentaTexto
              }
            >
              Crie questões de múltipla
              escolha para praticar.
            </Text>
          </View>

          <Text
            style={
              styles.seta
            }
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.ferramentaItem,
            styles.ferramentaItemUltimo,
          ]}
          onPress={
            abrirMapaMental
          }
        >
          <View
            style={
              styles.ferramentaIcone
            }
          >
            <Text
              style={
                styles.ferramentaIconeTexto
              }
            >
              🧠
            </Text>
          </View>

          <View
            style={
              styles.ferramentaConteudo
            }
          >
            <Text
              style={
                styles.ferramentaTitulo
              }
            >
              Mapa mental
            </Text>

            <Text
              style={
                styles.ferramentaTexto
              }
            >
              Organize os principais
              tópicos da apostila.
            </Text>
          </View>

          <Text
            style={
              styles.seta
            }
          >
            ›
          </Text>
        </Pressable>
      </View>

      <View
        style={
          styles.gerenciamentoCard
        }
      >
        <Text
          style={
            styles.gerenciamentoTitulo
          }
        >
          Gerenciamento
        </Text>

        <Text
          style={
            styles.gerenciamentoTexto
          }
        >
          Ao excluir esta apostila, o
          arquivo e os dados associados
          serão removidos.
        </Text>

        <Pressable
          style={
            styles.botaoExcluir
          }
          onPress={
            confirmarExclusao
          }
          disabled={excluindo}
        >
          {excluindo ? (
            <ActivityIndicator />
          ) : (
            <Text
              style={
                styles.botaoExcluirTexto
              }
            >
              🗑️ Excluir apostila
            </Text>
          )}
        </Pressable>
      </View>
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
      fontSize: 28,
      fontWeight: "800",
      color: "#111827",
    },

    subtitulo: {
      marginTop: 6,
      marginBottom: 20,
      fontSize: 15,
      lineHeight: 22,
      color: "#6B7280",
    },

    arquivoCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
    },

    arquivoIcone: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor:
        "#EFF6FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 14,
    },

    arquivoIconeTexto: {
      fontSize: 27,
    },

    arquivoInfo: {
      flex: 1,
    },

    arquivoLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: "#9CA3AF",
      marginBottom: 5,
    },

    arquivoTitulo: {
      fontSize: 17,
      lineHeight: 23,
      fontWeight: "800",
      color: "#111827",
    },

    arquivoData: {
      marginTop: 6,
      fontSize: 12,
      color: "#9CA3AF",
    },

    botaoPDF: {
      minHeight: 56,
      borderRadius: 15,
      backgroundColor:
        "#2563EB",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 18,
    },

    botaoPDFTexto: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "800",
    },

    statusCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 20,
      marginBottom: 18,
    },

    statusLabel: {
      fontSize: 11,
      fontWeight: "900",
      color: "#6B7280",
      marginBottom: 13,
    },

    statusLinha: {
      flexDirection: "row",
      alignItems:
        "flex-start",
    },

    statusIcone: {
      fontSize: 29,
      marginRight: 12,
    },

    statusConteudo: {
      flex: 1,
    },

    statusTitulo: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111827",
    },

    statusDescricao: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 21,
      color: "#6B7280",
    },

    erroProcessamento: {
      marginTop: 14,
      borderRadius: 12,
      padding: 12,
      backgroundColor:
        "#FEF2F2",
    },

    erroProcessamentoTexto: {
      color: "#B91C1C",
      fontSize: 13,
      lineHeight: 19,
    },

    preparacaoCard: {
      backgroundColor:
        "#E0F2FE",
      borderRadius: 18,
      padding: 20,
      marginBottom: 14,
    },

    preparacaoTitulo: {
      fontSize: 18,
      fontWeight: "800",
      color: "#075985",
    },

    preparacaoTexto: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 23,
      color: "#0E7490",
    },

    botaoPreparar: {
      minHeight: 56,
      borderRadius: 15,
      backgroundColor:
        "#2563EB",
      alignItems: "center",
      justifyContent:
        "center",
    },

    botaoPrepararDesativado: {
      backgroundColor:
        "#E5E7EB",
    },

    botaoPrepararTexto: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },

    botaoPrepararTextoDesativado: {
      color: "#6B7280",
    },

    processamentoIndisponivel: {
      marginTop: 10,
      marginBottom: 22,
      textAlign: "center",
      color: "#9CA3AF",
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
    },

    processamentoDisponivel: {
      marginTop: 10,
      marginBottom: 22,
      textAlign: "center",
      color: "#166534",
      fontSize: 13,
      fontWeight: "700",
    },

    ferramentasCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 20,
      marginBottom: 18,
    },

    ferramentasTitulo: {
      fontSize: 22,
      fontWeight: "900",
      color: "#111827",
    },

    ferramentasDescricao: {
      marginTop: 7,
      fontSize: 15,
      lineHeight: 22,
      color: "#6B7280",
    },

    avisoFerramentas: {
      marginTop: 16,
      marginBottom: 8,
      padding: 14,
      borderRadius: 14,
      backgroundColor:
        "#FFF7ED",
      borderWidth: 1,
      borderColor:
        "#FED7AA",
    },

    avisoFerramentasTexto: {
      color: "#9A3412",
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "700",
    },

    ferramentaItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor:
        "#E5E7EB",
    },

    ferramentaItemUltimo: {
      borderBottomWidth: 0,
      paddingBottom: 4,
    },

    ferramentaIcone: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        "#F3F4F6",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 13,
    },

    ferramentaIconeTexto: {
      fontSize: 24,
    },

    ferramentaConteudo: {
      flex: 1,
    },

    ferramentaTitulo: {
      fontSize: 17,
      fontWeight: "800",
      color: "#111827",
    },

    ferramentaTexto: {
      marginTop: 3,
      fontSize: 14,
      lineHeight: 20,
      color: "#6B7280",
    },

    seta: {
      marginLeft: 10,
      fontSize: 31,
      color: "#9CA3AF",
    },

    gerenciamentoCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 20,
    },

    gerenciamentoTitulo: {
      fontSize: 18,
      fontWeight: "800",
      color: "#111827",
    },

    gerenciamentoTexto: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: "#6B7280",
    },

    botaoExcluir: {
      minHeight: 52,
      borderRadius: 14,
      marginTop: 16,
      backgroundColor:
        "#FEF2F2",
      alignItems: "center",
      justifyContent:
        "center",
    },

    botaoExcluirTexto: {
      color: "#B91C1C",
      fontSize: 15,
      fontWeight: "800",
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
