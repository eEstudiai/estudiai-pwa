import {
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  BackHandler,
  Pressable,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useCallback,
  useState,
} from "react";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { supabase } from "../services/supabase";

import ConnectionStatus from "../components/ConnectionStatus";

export default function Home() {
  const [count, setCount] =
    useState(0);

  const [prontas, setProntas] =
    useState(0);

  const [pendentes, setPendentes] =
    useState(0);

  const [
    totalQuestoes,
    setTotalQuestoes,
  ] = useState(0);

  const [
    processamentoIA,
    setProcessamentoIA,
  ] = useState(false);

  const [
    questoesIA,
    setQuestoesIA,
  ] = useState(false);

  const [
    erroConexao,
    setErroConexao,
  ] = useState(false);

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

  const carregarDados =
    useCallback(async () => {
      try {
        /*
          Começamos cada nova consulta
          considerando a conexão normal.

          Se alguma consulta falhar,
          alteramos para true.
        */
        setErroConexao(false);

        const {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        const user =
          session?.user;

        if (sessionError) {
          console.log(
            "ERRO AO CARREGAR SESSÃO NA HOME:",
            sessionError
          );

          setErroConexao(true);
          setCount(0);
          setProntas(0);
          setPendentes(0);
          setTotalQuestoes(0);
          setProcessamentoIA(false);
          setQuestoesIA(false);
          setEmail("");

          return;
        }

        if (!user) {
          console.log(
            "SESSÃO NÃO DISPONÍVEL NA HOME"
          );

          setCount(0);
          setProntas(0);
          setPendentes(0);
          setTotalQuestoes(0);
          setProcessamentoIA(false);
          setQuestoesIA(false);
          setEmail("");

          return;
        }

        setEmail(
          user.email || ""
        );

        const [
          materiaisResultado,
          questoesResultado,
          configuracoesResultado,
        ] = await Promise.all([
          supabase
            .from("materials")
            .select("id, status")
            .eq(
              "user_id",
              user.id
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("questions")
            .select(
              "id",
              {
                count: "exact",
                head: true,
              }
            )
            .eq(
              "user_id",
              user.id
            ),

          supabase
            .from("app_settings")
            .select("key, value")
            .in("key", [
              "ai_processing_enabled",
              "question_ai_enabled",
            ]),
        ]);

        /*
          MATERIAIS
        */
        if (
          materiaisResultado.error
        ) {
          console.log(
            "ERRO AO CARREGAR APOSTILAS NA HOME:",
            materiaisResultado.error
          );

          setErroConexao(true);
          setCount(0);
          setProntas(0);
          setPendentes(0);
        } else {
          const lista =
            materiaisResultado.data ||
            [];

          setCount(
            lista.length
          );

          const totalProntas =
            lista.filter(
              (item) =>
                item.status ===
                "ready"
            ).length;

          const totalPendentes =
            lista.filter(
              (item) =>
                item.status ===
                  "pending" ||
                item.status ===
                  "processing"
            ).length;

          setProntas(
            totalProntas
          );

          setPendentes(
            totalPendentes
          );
        }

        /*
          HISTÓRICO
        */
        if (
          questoesResultado.error
        ) {
          console.log(
            "ERRO AO CONTAR QUESTÕES NA HOME:",
            questoesResultado.error
          );

          setErroConexao(true);
          setTotalQuestoes(0);
        } else {
          setTotalQuestoes(
            questoesResultado.count ||
              0
          );
        }

        /*
          CONFIGURAÇÕES REMOTAS DA IA

          Em caso de erro:
          - mostra aviso de conexão
          - mantém as funções de IA
            desativadas por segurança.
        */
        if (
          configuracoesResultado.error
        ) {
          console.log(
            "ERRO AO CARREGAR CONFIGURAÇÕES NA HOME:",
            configuracoesResultado.error
          );

          setErroConexao(true);
          setProcessamentoIA(false);
          setQuestoesIA(false);
        } else {
          const configuracoes =
            configuracoesResultado.data ||
            [];

          const processamento =
            configuracoes.find(
              (item) =>
                item.key ===
                "ai_processing_enabled"
            );

          const questoes =
            configuracoes.find(
              (item) =>
                item.key ===
                "question_ai_enabled"
            );

          setProcessamentoIA(
            processamento?.value ===
              "true"
          );

          setQuestoesIA(
            questoes?.value ===
              "true"
          );
        }
      } catch (error) {
        console.log(
          "ERRO INESPERADO NA HOME:",
          error
        );

        setErroConexao(true);

        setCount(0);
        setProntas(0);
        setPendentes(0);
        setTotalQuestoes(0);
        setProcessamentoIA(false);
        setQuestoesIA(false);
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);

      carregarDados();

      const backHandler =
        BackHandler.addEventListener(
          "hardwareBackPress",
          () => {
            Alert.alert(
              "Sair do EstudaIA?",
              "Tem certeza de que deseja sair do aplicativo?",
              [
                {
                  text: "Cancelar",
                  style: "cancel",
                },
                {
                  text: "Sair",
                  onPress: () =>
                    BackHandler.exitApp(),
                },
              ]
            );

            return true;
          }
        );

      return () => backHandler.remove();
    }, [carregarDados])
  );

  const atualizar =
    useCallback(async () => {
      setAtualizando(true);

      await carregarDados();
    }, [carregarDados]);

  const resolverQuestao = () => {
    router.push("/questao");
  };

  const abrirBiblioteca = () => {
    router.push("/biblioteca");
  };

  const abrirHistorico = () => {
    router.push("/historico");
  };

  const iaAtiva =
    processamentoIA ||
    questoesIA;

  return (
    <SafeAreaView style={s.tela} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={
          s.container
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
      >
        <View style={s.topo}>
          <Image
            source={require("../assets/icon.png")}
            style={s.iconeMarca}
            resizeMode="contain"
          />
          <View
            style={s.topoTexto}
          >
            <Text style={s.logo}>
              EstudaIA
            </Text>

            {email ? (
              <Text
                style={s.email}
                numberOfLines={1}
              >
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        <ConnectionStatus
          visible={erroConexao}
          message="Não foi possível atualizar todos os dados do EstudaIA. Verifique sua conexão com a internet e puxe a tela para baixo para tentar novamente."
        />

        <View style={s.boasVindas}>
          <Text style={s.boasVindasLabel}>
            SEU ESPAÇO DE ESTUDO
          </Text>

          <Text style={s.titulo}>
            Olá, aluno! 👋
          </Text>

          <Text style={s.descricao}>
            Que tal estudar hoje? Acesse seus materiais e continue avançando.
          </Text>
        </View>

        <Text style={s.secaoTitulo}>
          Acesso rápido
        </Text>

        <View style={s.atalhosLinha}>
          <Pressable
            style={[s.atalhoCard, s.atalhoBiblioteca]}
            onPress={abrirBiblioteca}
          >
            <View style={[s.atalhoIcone, s.atalhoIconeAzul]}>
              <Text style={s.atalhoIconeTexto}>📚</Text>
            </View>
            <Text style={s.atalhoTitulo}>Biblioteca</Text>
            <Text style={s.atalhoDescricao}>
              {carregando
                ? "Carregando..."
                : `${count} ${count === 1 ? "apostila cadastrada" : "apostilas cadastradas"}`}
            </Text>
            <Text style={s.atalhoLink}>Ver materiais ›</Text>
          </Pressable>

          <Pressable
            style={s.atalhoCard}
            onPress={resolverQuestao}
          >
            <View style={[s.atalhoIcone, s.atalhoIconeLaranja]}>
              <Text style={s.atalhoIconeTexto}>📷</Text>
            </View>
            <Text style={s.atalhoTitulo}>Resolver questão</Text>
            <Text style={s.atalhoDescricao}>
              Tire uma foto ou escolha uma imagem.
            </Text>
            <Text style={s.atalhoLink}>Enviar questão ›</Text>
          </Pressable>
        </View>

        <View style={s.atalhosLinha}>
          <Pressable
            style={s.atalhoCard}
            onPress={abrirHistorico}
          >
            <View style={[s.atalhoIcone, s.atalhoIconeRoxo]}>
              <Text style={s.atalhoIconeTexto}>🕘</Text>
            </View>
            <Text style={s.atalhoTitulo}>Histórico</Text>
            <Text style={s.atalhoDescricao}>
              {carregando
                ? "Carregando..."
                : totalQuestoes === 1
                  ? "1 questão registrada"
                  : `${totalQuestoes} questões registradas`}
            </Text>
            <Text style={s.atalhoLink}>Ver atividade ›</Text>
          </Pressable>

          <View style={s.atalhoCard}>
            <View style={[s.atalhoIcone, s.atalhoIconeVerde]}>
              <Text style={s.atalhoIconeTexto}>📖</Text>
            </View>
            <Text style={s.atalhoTitulo}>Seus materiais</Text>
            <View style={s.materiaisResumo}>
              <View style={s.materialIndicador}>
                <Text style={s.statusNumeroPronto}>
                  {carregando ? "..." : prontas}
                </Text>
                <Text style={s.statusTitulo}>Prontas</Text>
                <Text style={s.statusDescricao}>materiais preparados</Text>
              </View>
              <View style={s.materialIndicador}>
                <Text style={s.statusNumeroPendente}>
                  {carregando ? "..." : pendentes}
                </Text>
                <Text style={s.statusTitulo}>Pendentes</Text>
                <Text style={s.statusDescricao}>aguardando preparação</Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            s.avisoCard,
            iaAtiva
              ? s.avisoCardAtivo
              : s.avisoCardInativo,
          ]}
        >
          <Text
            style={[
              s.avisoTitulo,
              iaAtiva
                ? s.avisoTituloAtivo
                : s.avisoTituloInativo,
            ]}
          >
            {iaAtiva
              ? "🤖 Recursos de IA habilitados"
              : "🤖 Recursos de IA indisponíveis"}
          </Text>

          <Text
            style={[
              s.avisoTexto,
              iaAtiva
                ? s.avisoTextoAtivo
                : s.avisoTextoInativo,
            ]}
          >
            {iaAtiva
              ? "Existem recursos de inteligência artificial habilitados remotamente."
              : "Os recursos de inteligência artificial estão temporariamente indisponíveis."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#F3F7FC",
    width: "100%",
  },

  scroll: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },

  topo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconeMarca: {
    width: 50,
    height: 50,
    borderRadius: 15,
  },

  topoTexto: {
    flex: 1,
  },

  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1456A0",
    letterSpacing: -0.5,
  },

  email: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  boasVindas: {
    marginTop: 22,
    padding: 22,
    borderRadius: 22,
    backgroundColor: "#1456A0",
    shadowColor: "#1456A0",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },

  boasVindasLabel: {
    marginBottom: 8,
    color: "#BFDBFE",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  titulo: {
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 31,
    color: "#FFFFFF",
  },

  descricao: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#DBEAFE",
  },

  atalhosLinha: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },

  atalhoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5EDF7",
    minHeight: 178,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  atalhoBiblioteca: {
    borderColor: "#C8DDF8",
    backgroundColor: "#F8FBFF",
  },

  atalhoIcone: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  atalhoIconeAzul: {
    backgroundColor: "#E8F1FF",
  },

  atalhoIconeLaranja: {
    backgroundColor: "#FFF1E6",
  },

  atalhoIconeRoxo: {
    backgroundColor: "#F3E8FF",
  },

  atalhoIconeVerde: {
    backgroundColor: "#E8F8F0",
  },

  atalhoIconeTexto: {
    fontSize: 21,
  },

  atalhoTitulo: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
    color: "#172B4D",
  },

  atalhoDescricao: {
    marginTop: 5,
    minHeight: 34,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },

  atalhoLink: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#1769D2",
  },

  materiaisResumo: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  materialIndicador: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },

  statusNumeroPronto: {
    fontSize: 22,
    fontWeight: "800",
    color: "#15803D",
    textAlign: "center",
  },

  statusNumeroPendente: {
    fontSize: 22,
    fontWeight: "800",
    color: "#D97706",
    textAlign: "center",
  },

  statusTitulo: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: "#526078",
    textAlign: "center",
  },

  statusDescricao: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
    color: "#64748B",
    textAlign: "center",
  },

  secaoTitulo: {
    marginTop: 24,
    marginBottom: 2,
    fontSize: 19,
    fontWeight: "800",
    color: "#172B4D",
  },

  avisoCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
  },

  avisoCardInativo: {
    backgroundColor: "#FFF8E7",
    borderColor: "#F5D98C",
  },

  avisoCardAtivo: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },

  avisoTitulo: {
    fontSize: 14,
    fontWeight: "800",
  },

  avisoTituloInativo: {
    color: "#92400E",
  },

  avisoTituloAtivo: {
    color: "#166534",
  },

  avisoTexto: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },

  avisoTextoInativo: {
    color: "#78350F",
  },

  avisoTextoAtivo: {
    color: "#166534",
  },
});