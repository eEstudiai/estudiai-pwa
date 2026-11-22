import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useCallback,
  useState,
} from "react";

import Constants from "expo-constants";

import { supabase } from "../services/supabase";
import ConnectionStatus from "../components/ConnectionStatus";
import PromotionalNotificationsSettings from "../components/PromotionalNotificationsSettings";

export default function ConfiguracoesScreen() {
  const [email, setEmail] =
    useState("");

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    atualizando,
    setAtualizando,
  ] = useState(false);

  const [
    saindo,
    setSaindo,
  ] = useState(false);

  const [
    excluindoConta,
    setExcluindoConta,
  ] = useState(false);

  const [
    processamentoIA,
    setProcessamentoIA,
  ] = useState(false);

  const [
    questoesIA,
    setQuestoesIA,
  ] = useState(false);

  const [
    configuracoesCarregadas,
    setConfiguracoesCarregadas,
  ] = useState(false);

  const [
    erroConexao,
    setErroConexao,
  ] = useState(false);

  const versao =
    Constants.expoConfig?.version ||
    "0.1.0";

  const carregarDados =
    useCallback(async () => {
      try {
        setErroConexao(false);

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          console.log(
            "ERRO AO CARREGAR USUÁRIO NOS AJUSTES:",
            userError
          );

          setEmail(
            "E-mail não disponível"
          );

          setProcessamentoIA(false);
          setQuestoesIA(false);
          setConfiguracoesCarregadas(
            false
          );

          setErroConexao(true);

          return;
        }

        setEmail(
          user?.email ||
            "E-mail não disponível"
        );

        const {
          data: configuracoes,
          error: configuracoesError,
        } =
          await supabase
            .from("app_settings")
            .select("key, value")
            .in("key", [
              "ai_processing_enabled",
              "question_ai_enabled",
            ]);

        if (configuracoesError) {
          console.log(
            "ERRO AO CARREGAR CONFIGURAÇÕES:",
            configuracoesError
          );

          setProcessamentoIA(false);
          setQuestoesIA(false);
          setConfiguracoesCarregadas(
            false
          );

          setErroConexao(true);

          return;
        }

        const processamento =
          configuracoes?.find(
            (item) =>
              item.key ===
              "ai_processing_enabled"
          );

        const questoes =
          configuracoes?.find(
            (item) =>
              item.key ===
              "question_ai_enabled"
          );

        setProcessamentoIA(
          processamento?.value ===
            "true"
        );

        setQuestoesIA(
          questoes?.value === "true"
        );

        setConfiguracoesCarregadas(
          true
        );

        setErroConexao(false);
      } catch (error) {
        console.log(
          "ERRO AO CARREGAR AJUSTES:",
          error
        );

        setEmail(
          "E-mail não disponível"
        );

        setProcessamentoIA(false);
        setQuestoesIA(false);
        setConfiguracoesCarregadas(
          false
        );

        setErroConexao(true);
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);

      carregarDados();
    }, [carregarDados])
  );

  const atualizar =
    useCallback(() => {
      setAtualizando(true);

      carregarDados();
    }, [carregarDados]);

  const sair = async () => {
    if (Platform.OS === "web") {
      const confirmou = window.confirm(
        "Deseja realmente sair do EstudaIA?"
      );

      if (confirmou) {
        await confirmarSaida();
      }

      return;
    }

    Alert.alert(
      "Sair da conta",
      "Deseja realmente sair do EstudaIA?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Sair",
          style: "destructive",
          onPress:
            confirmarSaida,
        },
      ]
    );
  };

  const confirmarSaida =
    async () => {
      try {
        setSaindo(true);

        const { error } =
          await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        router.replace(
          "/login"
        );
      } catch (error: any) {
        console.log(
          "ERRO AO SAIR:",
          error
        );

        const mensagem =
          error?.message ||
          "Não foi possível sair da conta.";

        if (Platform.OS === "web") {
          window.alert(mensagem);
        } else {
          Alert.alert("Erro", mensagem);
        }
      } finally {
        setSaindo(false);
      }
    };

  /*
    Exclusão da conta.

    São usadas duas confirmações para
    reduzir o risco de exclusão acidental.
  */
  const excluirConta = () => {
    if (Platform.OS === "web") {
      const confirmouPrimeiraEtapa = window.confirm(
        "Excluir minha conta?\n\nEsta ação excluirá permanentemente sua conta e os dados associados ao EstudaIA. Esta ação não poderá ser desfeita."
      );

      if (!confirmouPrimeiraEtapa) {
        return;
      }

      const confirmouEtapaFinal = window.confirm(
        "Confirmar exclusão\n\nTem certeza de que deseja excluir permanentemente sua conta?"
      );

      if (confirmouEtapaFinal) {
        void executarExclusaoConta();
      }

      return;
    }

    Alert.alert(
      "Excluir minha conta",
      "Esta ação excluirá permanentemente sua conta e os dados associados ao EstudaIA. Esta ação não poderá ser desfeita.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Continuar",
          style: "destructive",
          onPress:
            confirmarExclusaoConta,
        },
      ]
    );
  };

  const confirmarExclusaoConta =
    () => {
      Alert.alert(
        "Confirmar exclusão",
        "Tem certeza de que deseja excluir permanentemente sua conta?",
        [
          {
            text: "Não",
            style: "cancel",
          },
          {
            text:
              "Excluir definitivamente",
            style: "destructive",
            onPress:
              executarExclusaoConta,
          },
        ]
      );
    };

  const executarExclusaoConta =
    async () => {
      try {
        setExcluindoConta(true);

        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            "delete-account"
          );

        if (error) {
          throw error;
        }

        if (!data?.ok) {
          throw new Error(
            data?.error ||
              "Não foi possível excluir a conta."
          );
        }

        /*
          A conta já foi excluída no
          backend.

          Limpamos qualquer sessão local
          que ainda permaneça no aparelho.
        */
        try {
          await supabase.auth.signOut();
        } catch {
          // A conta já foi excluída.
        }

        const mensagemSucesso =
          "Sua conta e seus dados foram excluídos do EstudaIA.";

        if (Platform.OS === "web") {
          window.alert(mensagemSucesso);
          router.replace("/login");
        } else {
          Alert.alert(
            "Conta excluída",
            mensagemSucesso,
            [
              {
                text: "OK",
                onPress: () =>
                  router.replace("/login"),
              },
            ]
          );
        }
      } catch (error: any) {
        console.log(
          "ERRO AO EXCLUIR CONTA:",
          error
        );

        const mensagem =
          error?.message || "Tente novamente.";

        if (Platform.OS === "web") {
          window.alert(`Não foi possível excluir a conta.\n\n${mensagem}`);
        } else {
          Alert.alert("Não foi possível excluir a conta", mensagem);
        }
      } finally {
        setExcluindoConta(false);
      }
    };

  const algumRecursoAtivo =
    processamentoIA ||
    questoesIA;

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
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizar}
          />
        }
      >
        <Text style={s.etiqueta}>
          ESTUDAIA · CONTA
        </Text>

        <Text style={s.titulo}>
          Ajustes
        </Text>

        <Text style={s.subtitulo}>
          Gerencie sua conta e consulte
          informações do EstudaIA.
        </Text>

        <ConnectionStatus
          visible={erroConexao}
          message="Não foi possível atualizar todas as informações do EstudaIA. Verifique sua conexão com a internet e puxe a tela para baixo para tentar novamente."
        />

        <View style={s.cardConta}>
          <View style={s.contaIcone}>
            <Text
              style={
                s.contaIconeTexto
              }
            >
              👤
            </Text>
          </View>

          <View
            style={
              s.contaConteudo
            }
          >
            <Text
              style={
                s.contaTitulo
              }
            >
              Sua conta
            </Text>

            {carregando ? (
              <ActivityIndicator
                style={s.carregando}
                color="#1769D2"
              />
            ) : (
              <Text
                style={s.email}
                numberOfLines={1}
              >
                {email}
              </Text>
            )}
          </View>
        </View>

        <Text style={s.secaoTitulo}>
          Plano e benefícios
        </Text>

        <Pressable
          style={({ pressed }) => [
            s.cardAcao,
            s.cardPlus,
            pressed &&
              s.cardPressionado,
          ]}
          onPress={() =>
            router.push("/plus")
          }
        >
          <View style={s.iconePlus}>
            <Text
              style={
                s.iconePlusTexto
              }
            >
              ✨
            </Text>
          </View>

          <View
            style={
              s.acaoConteudo
            }
          >
            <Text
              style={
                s.plusTitulo
              }
            >
              EstudaIA Plus
            </Text>

            <Text
              style={
                s.acaoDescricao
              }
            >
              Conheça o plano e seus benefícios.
            </Text>
          </View>

          <Text style={s.seta}>
            ›
          </Text>
        </Pressable>

        <Text style={s.secaoTitulo}>
          Notificações e novidades
        </Text>

        <PromotionalNotificationsSettings />

        <Text style={s.secaoTitulo}>
          Sistema
        </Text>

      <View style={s.card}>
        <View
          style={
            s.cardCabecalho
          }
        >
          <View
            style={
              s.iconeContainer
            }
          >
            <Text style={s.icone}>
              🤖
            </Text>
          </View>

          <View
            style={
              s.cardCabecalhoTexto
            }
          >
            <Text
              style={
                s.cardTitulo
              }
            >
              Inteligência artificial
            </Text>

            <View
              style={
                s.statusContainer
              }
            >
              <View
                style={[
                  s.statusBolinha,
                  !configuracoesCarregadas
                    ? s.statusBolinhaIndisponivel
                    : algumRecursoAtivo
                      ? s.statusBolinhaAtiva
                      : s.statusBolinhaInativa,
                ]}
              />

              <Text
                style={[
                  s.statusTexto,
                  !configuracoesCarregadas
                    ? s.statusTextoIndisponivel
                    : algumRecursoAtivo
                      ? s.statusTextoAtivo
                      : s.statusTextoInativo,
                ]}
              >
                {!configuracoesCarregadas
                  ? "Status temporariamente indisponível"
                  : algumRecursoAtivo
                    ? "Recursos de IA disponíveis"
                    : "Recursos de IA indisponíveis"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={s.descricao}>
          Os recursos de inteligência
          artificial disponíveis no
          EstudaIA são gerenciados de
          forma segura e podem variar
          conforme a funcionalidade.
        </Text>

        <View
          style={s.separador}
        />

        {carregando ? (
          <View
            style={
              s.statusCarregando
            }
          >
            <ActivityIndicator
              size="small"
            />

            <Text
              style={
                s.statusCarregandoTexto
              }
            >
              Consultando configurações...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={
                s.linhaRecurso
              }
            >
              <View
                style={
                  s.recursoConteudo
                }
              >
                <Text
                  style={
                    s.recursoTitulo
                  }
                >
                  Preparação das apostilas
                </Text>

                <Text
                  style={
                    s.recursoDescricao
                  }
                >
                  Indexação dos PDFs para
                  estudo pela IA.
                </Text>
              </View>

              <View
                style={[
                  s.badgeStatus,
                  !configuracoesCarregadas
                    ? s.badgeIndisponivel
                    : processamentoIA
                      ? s.badgeAtivo
                      : s.badgeInativo,
                ]}
              >
                <Text
                  style={[
                    s.badgeStatusTexto,
                    !configuracoesCarregadas
                      ? s.badgeIndisponivelTexto
                      : processamentoIA
                        ? s.badgeAtivoTexto
                        : s.badgeInativoTexto,
                  ]}
                >
                  {!configuracoesCarregadas
                    ? "Indisponível"
                    : processamentoIA
                      ? "Ativada"
                      : "Desativada"}
                </Text>
              </View>
            </View>

            <View
              style={s.separador}
            />

            <View
              style={
                s.linhaRecurso
              }
            >
              <View
                style={
                  s.recursoConteudo
                }
              >
                <Text
                  style={
                    s.recursoTitulo
                  }
                >
                  Resolução real de questões
                </Text>

                <Text
                  style={
                    s.recursoDescricao
                  }
                >
                  Análise das imagens com
                  inteligência artificial.
                </Text>
              </View>

              <View
                style={[
                  s.badgeStatus,
                  !configuracoesCarregadas
                    ? s.badgeIndisponivel
                    : questoesIA
                      ? s.badgeAtivo
                      : s.badgeInativo,
                ]}
              >
                <Text
                  style={[
                    s.badgeStatusTexto,
                    !configuracoesCarregadas
                      ? s.badgeIndisponivelTexto
                      : questoesIA
                        ? s.badgeAtivoTexto
                        : s.badgeInativoTexto,
                  ]}
                >
                  {!configuracoesCarregadas
                    ? "Indisponível"
                    : questoesIA
                      ? "Ativada"
                      : "Desativada"}
                </Text>
              </View>
            </View>

            {!configuracoesCarregadas ? (
              <Text
                style={
                  s.avisoConfiguracao
                }
              >
                Não foi possível confirmar
                o estado remoto. Por
                segurança, os recursos
                continuam considerados
                desativados.
              </Text>
            ) : null}
          </>
        )}
      </View>

      <Text style={s.secaoTitulo}>
        Informações do aplicativo
      </Text>

      <View style={s.card}>
        <View
          style={
            s.cardCabecalho
          }
        >
          <View
            style={
              s.iconeContainer
            }
          >
            <Text style={s.icone}>
              📱
            </Text>
          </View>

          <Text
            style={
              s.cardTituloSemMargem
            }
          >
            Aplicativo
          </Text>
        </View>

        <View style={s.separador} />

        <View style={s.linha}>
          <Text style={s.linhaNome}>
            Nome
          </Text>

          <Text style={s.linhaValor}>
            EstudaIA
          </Text>
        </View>

        <View style={s.separador} />

        <View style={s.linha}>
          <Text style={s.linhaNome}>
            Versão
          </Text>

          <Text style={s.linhaValor}>
            {versao}
          </Text>
        </View>

        <View style={s.separador} />

        <View style={s.linha}>
          <Text style={s.linhaNome}>
            Plataforma
          </Text>

          <Text style={s.linhaValor}>
            Android / iOS
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          s.cardAcao,
          pressed &&
            s.cardPressionado,
        ]}
        onPress={() =>
          router.push("/sobre")
        }
      >
        <View
          style={
            s.iconeContainer
          }
        >
          <Text style={s.icone}>
            ℹ️
          </Text>
        </View>

        <View
          style={
            s.acaoConteudo
          }
        >
          <Text
            style={
              s.acaoTitulo
            }
          >
            Sobre o EstudaIA
          </Text>

          <Text
            style={
              s.acaoDescricao
            }
          >
            Objetivo do aplicativo,
            IA e privacidade.
          </Text>
        </View>

        <Text style={s.seta}>
          ›
        </Text>
      </Pressable>

      <View
        style={
          s.cardPrivacidade
        }
      >
        <View
          style={
            s.privacidadeTopo
          }
        >
          <Text
            style={
              s.privacidadeIcone
            }
          >
            🔒
          </Text>

          <Text
            style={
              s.privacidadeTitulo
            }
          >
            Seus materiais
          </Text>
        </View>

        <Text
          style={
            s.privacidadeTexto
          }
        >
          Suas apostilas, fotografias
          e histórico ficam vinculados
          à sua própria conta no
          EstudaIA.
        </Text>
      </View>

      <Text style={s.secaoTitulo}>
        Conta
      </Text>

      <Pressable
        style={({ pressed }) => [
          s.botaoSair,
          pressed &&
            s.cardPressionado,
          saindo &&
            s.botaoDesabilitado,
        ]}
        onPress={sair}
        disabled={
          saindo ||
          excluindoConta
        }
      >
        {saindo ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text
              style={
                s.botaoSairIcone
              }
            >
              ↪
            </Text>

            <Text
              style={
                s.botaoSairTexto
              }
            >
              Sair da conta
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          s.botaoExcluirConta,
          pressed &&
            s.cardPressionado,
          excluindoConta &&
            s.botaoDesabilitado,
        ]}
        onPress={excluirConta}
        disabled={
          excluindoConta ||
          saindo
        }
      >
        {excluindoConta ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text
              style={
                s.botaoExcluirContaIcone
              }
            >
              🗑️
            </Text>

            <View
              style={
                s.botaoExcluirContaConteudo
              }
            >
              <Text
                style={
                  s.botaoExcluirContaTexto
                }
              >
                Excluir minha conta
              </Text>

              <Text
                style={
                  s.botaoExcluirContaDescricao
                }
              >
                Exclui permanentemente sua
                conta e seus dados.
              </Text>
            </View>
          </>
        )}
      </Pressable>

      <Text style={s.rodape}>
        EstudaIA • Versão {versao}
      </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
    flexGrow: 1,
  },

  etiqueta: {
    marginBottom: 7,
    color: "#1769D2",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
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

  cardConta: {
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

  contaIcone: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
  },

  contaIconeTexto: {
    fontSize: 27,
  },

  contaConteudo: {
    flex: 1,
    marginLeft: 15,
  },

  contaTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172B4D",
  },

  email: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },

  carregando: {
    marginTop: 7,
    alignSelf: "flex-start",
  },

  secaoTitulo: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: "#526078",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5EDF7",
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  cardCabecalho: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconeContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
  },

  icone: {
    fontSize: 23,
  },

  cardCabecalhoTexto: {
    flex: 1,
    marginLeft: 13,
  },

  cardTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#172B4D",
  },

  cardTituloSemMargem: {
    marginLeft: 13,
    fontSize: 16,
    fontWeight: "800",
    color: "#172B4D",
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  statusBolinha: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  statusBolinhaAtiva: {
    backgroundColor: "#15803D",
  },

  statusBolinhaInativa: {
    backgroundColor: "#F59E0B",
  },

  statusBolinhaIndisponivel: {
    backgroundColor: "#9CA3AF",
  },

  statusTexto: {
    fontSize: 12,
    fontWeight: "700",
  },

  statusTextoAtivo: {
    color: "#15803D",
  },

  statusTextoInativo: {
    color: "#92400E",
  },

  statusTextoIndisponivel: {
    color: "#64748B",
  },

  descricao: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
  },

  statusCarregando: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusCarregandoTexto: {
    marginLeft: 10,
    fontSize: 13,
    color: "#64748B",
  },

  linhaRecurso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  recursoConteudo: {
    flex: 1,
  },

  recursoTitulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#172B4D",
  },

  recursoDescricao: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },

  badgeStatus: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  badgeAtivo: {
    backgroundColor: "#E8F8F0",
  },

  badgeInativo: {
    backgroundColor: "#FEF3C7",
  },

  badgeIndisponivel: {
    backgroundColor: "#F1F5F9",
  },

  badgeStatusTexto: {
    fontSize: 11,
    fontWeight: "800",
  },

  badgeAtivoTexto: {
    color: "#15803D",
  },

  badgeInativoTexto: {
    color: "#92400E",
  },

  badgeIndisponivelTexto: {
    color: "#64748B",
  },

  avisoConfiguracao: {
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    color: "#B45309",
  },

  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },

  linhaNome: {
    fontSize: 14,
    color: "#64748B",
  },

  linhaValor: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172B4D",
    textAlign: "right",
  },

  separador: {
    height: 1,
    backgroundColor: "#E5EDF7",
    marginVertical: 13,
  },

  cardAcao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5EDF7",
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  cardPlus: {
    marginTop: 0,
    borderColor: "#C8DDF8",
    backgroundColor: "#F8FBFF",
  },

  iconePlus: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
  },

  iconePlusTexto: {
    fontSize: 23,
  },

  plusTitulo: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1456A0",
  },

  cardPressionado: {
    opacity: 0.82,
  },

  acaoConteudo: {
    flex: 1,
    marginLeft: 13,
  },

  acaoTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#172B4D",
  },

  acaoDescricao: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },

  seta: {
    marginLeft: 8,
    fontSize: 29,
    color: "#94A3B8",
  },

  cardPrivacidade: {
    backgroundColor: "#F0F6FF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D8E7FA",
  },

  privacidadeTopo: {
    flexDirection: "row",
    alignItems: "center",
  },

  privacidadeIcone: {
    fontSize: 20,
    marginRight: 8,
  },

  privacidadeTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1456A0",
  },

  privacidadeTexto: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 20,
    color: "#334155",
  },

  botaoSair: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    minHeight: 54,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },

  botaoSairIcone: {
    marginRight: 8,
    fontSize: 18,
    color: "#B91C1C",
  },

  botaoSairTexto: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "800",
  },

  botaoExcluirConta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },

  botaoExcluirContaIcone: {
    marginRight: 11,
    fontSize: 20,
  },

  botaoExcluirContaConteudo: {
    flex: 1,
  },

  botaoExcluirContaTexto: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "800",
  },

  botaoExcluirContaDescricao: {
    marginTop: 3,
    color: "#991B1B",
    fontSize: 11,
    lineHeight: 16,
  },

  botaoDesabilitado: {
    opacity: 0.6,
  },

  rodape: {
    textAlign: "center",
    marginTop: 24,
    color: "#94A3B8",
    fontSize: 12,
  },
});
