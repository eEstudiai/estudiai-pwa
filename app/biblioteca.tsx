import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useCallback,
  useState,
  useRef,
} from "react";

import {
  router,
  useFocusEffect,
} from "expo-router";

import * as DocumentPicker from "expo-document-picker";

import { supabase } from "../services/supabase";
import { uploadMaterial } from "../services/materials";
import ConnectionStatus from "../components/ConnectionStatus";

type Material = {
  id: string;
  title: string;
  file_path: string;
  status: string;
  created_at: string;
  processing_error: string | null;
};

export default function Biblioteca() {
  const [materiais, setMateriais] =
    useState<Material[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [enviando, setEnviando] =
    useState(false);

  const [avisoEnvio, setAvisoEnvio] =
    useState<{ texto: string; erro: boolean } | null>(null);

  const [erroConexao, setErroConexao] =
    useState(false);

  const carregarMateriais =
    useCallback(async () => {
      try {
        /*
          Uma nova tentativa de carregamento
          começa sem erro.

          Se o Supabase falhar, o aviso de
          conexão será exibido.
        */
        setErroConexao(false);

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          console.log(
            "ERRO AO CARREGAR USUÁRIO NA BIBLIOTECA:",
            userError
          );

          setErroConexao(true);
          setMateriais([]);
          return;
        }

        if (!user) {
          console.log(
            "USUÁRIO NÃO AUTENTICADO NA BIBLIOTECA"
          );

          setMateriais([]);
          return;
        }

        const { data, error } =
          await supabase
            .from("materials")
            .select(`
              id,
              title,
              file_path,
              status,
              created_at,
              processing_error
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
            "ERRO AO CARREGAR APOSTILAS:",
            error
          );

          setErroConexao(true);
          setMateriais([]);
          return;
        }

        setMateriais(
          (data as Material[]) ||
            []
        );

        setErroConexao(false);
      } catch (error) {
        console.log(
          "ERRO INESPERADO NA BIBLIOTECA:",
          error
        );

        setErroConexao(true);
        setMateriais([]);
      } finally {
        setCarregando(false);
      }
    }, []);

  /*
    Sempre que a Biblioteca ganhar
    foco novamente, os materiais serão
    recarregados.

    Exemplo:
    Biblioteca
      ↓
    Detalhes da apostila
      ↓
    Excluir apostila
      ↓
    Voltar

    A lista será atualizada
    automaticamente.
  */
  // Tela cheia de carregamento so na primeira vez; ao voltar de outra tela,
  // atualiza em segundo plano.
  const primeiraCarga = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (primeiraCarga.current) {
        setCarregando(true);
      }

      Promise.resolve(carregarMateriais()).finally(() => {
        primeiraCarga.current = false;
      });
    }, [carregarMateriais])
  );

  const atualizar = async () => {
    setAtualizando(true);

    await carregarMateriais();

    setAtualizando(false);
  };

  const escolherPDF = async () => {
    try {
      const resultado =
        await DocumentPicker.getDocumentAsync(
          {
            type: "application/pdf",
            copyToCacheDirectory: true,
            base64: false,
          }
        );

      if (resultado.canceled) {
        return;
      }

      const arquivo =
        resultado.assets[0];

      if (!arquivo) {
        return;
      }

      setEnviando(true);
      setAvisoEnvio(null);

      const resultadoEnvio =
        await uploadMaterial(
          arquivo.uri,
          arquivo.name,
          arquivo.file
        );

      setAvisoEnvio(
        resultadoEnvio.processingError
          ? {
              texto: `PDF salvo, mas a preparação com IA falhou: ${resultadoEnvio.processingError}`,
              erro: true,
            }
          : {
              texto: "PDF enviado e preparado para estudo.",
              erro: false,
            }
      );

      await carregarMateriais();
      console.log(
        "MATERIAL CRIADO:",
        resultadoEnvio.material.id
      );
    } catch (error: any) {
      console.log(
        "ERRO AO ENVIAR PDF:",
        error
      );

      const mensagemErro =
        typeof error?.message === "string"
          ? error.message
          : "";
      const erroDeConexao =
        /fetch failed|failed to fetch|network request failed|network connection.*lost|network error|timeout|timed out|internet|expomodulescore|promise\.swift|unexpectedexception/i.test(
          mensagemErro
        );

      setAvisoEnvio({
        texto: erroDeConexao
          ? "Não foi possível enviar o PDF. Verifique sua conexão com a internet e tente novamente."
          : mensagemErro ||
            "Não foi possível enviar o PDF. Verifique sua conexão e tente novamente.",
        erro: true,
      });
    } finally {
      setEnviando(false);
    }
  };

  const abrirMaterial = (
    id: string
  ) => {
    router.push(
      `/biblioteca/${id}`
    );
  };

  const statusTexto = (
    status: string
  ) => {
    switch (status) {
      case "ready":
        return "Pronta para estudo";

      case "processing":
        return "Processando material...";

      case "pending":
        return "Aguardando processamento";

      case "error":
        return "Erro no processamento";

      default:
        return "Aguardando processamento";
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

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.cabecalho}>
        <Text style={s.etiqueta}>ESTUDAIA · BIBLIOTECA</Text>
        <Text style={s.titulo}>Minha biblioteca</Text>
        <Text style={s.subtitulo}>
          Seus materiais de estudo, sempre à mão.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          s.botaoAdicionar,
          pressed && s.botaoAdicionarPressionado,
          enviando && s.botaoAdicionando,
        ]}
        onPress={escolherPDF}
        disabled={enviando}
        accessibilityRole="button"
      >
        <View style={s.botaoAdicionarIcone}>
          <Text style={s.botaoAdicionarIconeTexto}>＋</Text>
        </View>
        <View style={s.botaoAdicionarConteudo}>
          <Text style={s.botaoAdicionarTitulo}>
            {enviando ? "Enviando PDF..." : "Adicionar apostila em PDF"}
          </Text>
          <Text style={s.botaoAdicionarDescricao}>
            {enviando
              ? "Aguarde enquanto o arquivo é enviado"
              : "Escolha um arquivo PDF no dispositivo"}
          </Text>
        </View>
        <Text style={s.botaoAdicionarSeta}>›</Text>
      </Pressable>

      <ConnectionStatus
        visible={erroConexao}
        message="Não foi possível carregar sua biblioteca. Verifique sua conexão com a internet e puxe a tela para baixo para tentar novamente."
      />

      {avisoEnvio ? (
        <View
          style={[
            s.avisoEnvio,
            avisoEnvio.erro
              ? s.avisoEnvioErro
              : s.avisoEnvioSucesso,
          ]}
        >
          <Text style={s.avisoEnvioTexto}>{avisoEnvio.texto}</Text>
        </View>
      ) : null}

      <View style={s.espaco} />

      {carregando ? (
        <View style={s.centro}>
          <Text style={s.carregandoIcone}>📚</Text>
          <Text style={s.info}>
            Carregando biblioteca...
          </Text>
        </View>
      ) : (
        <FlatList
          style={s.listaScroll}
          showsVerticalScrollIndicator
          data={materiais}
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
            materiais.length === 0
              ? s.listaVazia
              : s.lista
          }
          ListEmptyComponent={
            erroConexao ? (
              <View style={s.vazio}>
                <Text
                  style={
                    s.vazioIcone
                  }
                >
                  📡
                </Text>

                <Text
                  style={
                    s.vazioTitulo
                  }
                >
                  Biblioteca indisponível
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
                <Text
                  style={
                    s.vazioIcone
                  }
                >
                  📚
                </Text>

                <Text
                  style={
                    s.vazioTitulo
                  }
                >
                  Nenhuma apostila
                  cadastrada
                </Text>

                <Text
                  style={
                    s.vazioTexto
                  }
                >
                  Adicione um PDF para
                  começar sua biblioteca
                  de estudos.
                </Text>
              </View>
            )
          }
          renderItem={({
            item,
          }) => (
            <Pressable
              onPress={() =>
                abrirMaterial(
                  item.id
                )
              }
              style={({
                pressed,
              }) => [
                s.card,
                pressed &&
                  s.cardPressionado,
              ]}
            >
              <View style={s.iconePDF}>
                <Text style={s.iconePDFTexto}>PDF</Text>
              </View>

              <View
                style={
                  s.cardConteudo
                }
              >
                <Text style={s.nome}>
                  {item.title}
                </Text>

                <View
                  style={[
                    s.statusBadge,
                    item.status === "ready"
                      ? s.statusPronto
                      : item.status === "processing"
                        ? s.statusProcessando
                        : item.status === "error"
                          ? s.statusErro
                          : s.statusPendente,
                  ]}
                >
                  <Text
                    style={[
                      s.statusIcone,
                      item.status === "ready"
                        ? s.statusIconePronto
                        : item.status === "processing"
                          ? s.statusIconeProcessando
                          : item.status === "error"
                            ? s.statusIconeErro
                            : s.statusIconePendente,
                    ]}
                  >
                    {item.status === "ready"
                      ? "✓"
                      : item.status === "processing"
                        ? "↻"
                        : item.status === "error"
                          ? "!"
                          : "◷"}
                  </Text>
                  <Text
                    style={[
                      s.status,
                      item.status === "ready"
                        ? s.statusTextoPronto
                        : item.status === "processing"
                          ? s.statusTextoProcessando
                          : item.status === "error"
                            ? s.statusTextoErro
                            : s.statusTextoPendente,
                    ]}
                  >
                    {statusTexto(item.status)}
                  </Text>
                </View>

                <Text
                  style={s.data}
                >
                  {formatarData(
                    item.created_at
                  )}
                </Text>

                {item.status ===
                  "error" &&
                item.processing_error ? (
                  <Text
                    style={s.erro}
                    numberOfLines={2}
                  >
                    {
                      item.processing_error
                    }
                  </Text>
                ) : null}

                <Text
                  style={
                    s.detalhes
                  }
                >
                  Ver detalhes →
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: "#F3F7FC",
    },

    cabecalho: {
      marginBottom: 18,
    },

    etiqueta: {
      marginBottom: 6,
      color: "#1769D2",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
    },

    titulo: {
      fontSize: 29,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: "#172B4D",
    },

    subtitulo: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      color: "#64748B",
    },

    botaoAdicionar: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderRadius: 18,
      backgroundColor: "#1769D2",
      shadowColor: "#1456A0",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 3,
    },

    botaoAdicionarPressionado: {
      opacity: 0.88,
    },

    botaoAdicionando: {
      backgroundColor: "#1456A0",
    },

    botaoAdicionarIcone: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },

    botaoAdicionarIconeTexto: {
      color: "#FFFFFF",
      fontSize: 27,
      lineHeight: 30,
      fontWeight: "500",
    },

    botaoAdicionarConteudo: {
      flex: 1,
      minWidth: 0,
      marginLeft: 12,
    },

    botaoAdicionarTitulo: {
      color: "#FFFFFF",
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "800",
    },

    botaoAdicionarDescricao: {
      marginTop: 2,
      color: "#DBEAFE",
      fontSize: 11,
      lineHeight: 15,
    },

    botaoAdicionarSeta: {
      marginLeft: 8,
      color: "#FFFFFF",
      fontSize: 28,
      lineHeight: 30,
    },

    espaco: {
      height: 8,
    },

    avisoEnvio: {
      marginTop: 10,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1,
    },

    avisoEnvioSucesso: {
      backgroundColor: "#ECFDF3",
      borderColor: "#A7F3D0",
    },

    avisoEnvioErro: {
      backgroundColor: "#FEF2F2",
      borderColor: "#FECACA",
    },

    avisoEnvioTexto: {
      color: "#334155",
      fontSize: 13,
      lineHeight: 19,
    },

    listaScroll: {
      flex: 1,
      minHeight: 0,
      width: "100%",
    },

    centro: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    carregandoIcone: {
      marginBottom: 10,
      fontSize: 30,
    },

    info: {
      color: "#64748B",
      fontSize: 14,
      fontWeight: "600",
    },

    lista: {
      paddingBottom: 32,
    },

    listaVazia: {
      flexGrow: 1,
      justifyContent: "center",
    },

    vazio: {
      marginHorizontal: 2,
      paddingHorizontal: 24,
      paddingVertical: 32,
      alignItems: "center",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      backgroundColor: "#FFFFFF",
    },

    vazioIcone: {
      width: 68,
      height: 68,
      textAlign: "center",
      textAlignVertical: "center",
      overflow: "hidden",
      borderRadius: 22,
      backgroundColor: "#E8F1FF",
      fontSize: 34,
    },

    vazioTitulo: {
      marginTop: 18,
      fontSize: 18,
      fontWeight: "800",
      color: "#172B4D",
      textAlign: "center",
    },

    vazioTexto: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: "#64748B",
      textAlign: "center",
    },

    card: {
      flexDirection: "row",
      alignItems: "flex-start",
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

    iconePDF: {
      width: 46,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: "#E8F1FF",
      marginRight: 13,
    },

    iconePDFTexto: {
      color: "#1769D2",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.5,
    },

    cardConteudo: {
      flex: 1,
      minWidth: 0,
    },

    nome: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800",
      color: "#172B4D",
    },

    statusBadge: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      marginTop: 9,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 10,
    },

    statusPronto: {
      backgroundColor: "#E8F8F0",
    },

    statusProcessando: {
      backgroundColor: "#E8F1FF",
    },

    statusPendente: {
      backgroundColor: "#FFF7E8",
    },

    statusErro: {
      backgroundColor: "#FEF0F0",
    },

    statusIcone: {
      marginRight: 5,
      fontSize: 12,
      fontWeight: "900",
    },

    statusIconePronto: {
      color: "#15803D",
    },

    statusIconeProcessando: {
      color: "#1769D2",
    },

    statusIconePendente: {
      color: "#B45309",
    },

    statusIconeErro: {
      color: "#B91C1C",
    },

    status: {
      flexShrink: 1,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
    },

    statusTextoPronto: {
      color: "#166534",
    },

    statusTextoProcessando: {
      color: "#1D4ED8",
    },

    statusTextoPendente: {
      color: "#92400E",
    },

    statusTextoErro: {
      color: "#991B1B",
    },

    data: {
      marginTop: 9,
      fontSize: 12,
      lineHeight: 17,
      color: "#64748B",
    },

    erro: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 18,
      color: "#B91C1C",
    },

    detalhes: {
      marginTop: 11,
      fontSize: 13,
      fontWeight: "800",
      color: "#1769D2",
    },
  });
