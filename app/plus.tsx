import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAvailablePurchases,
  useIAP,
} from "expo-iap";

import { supabase } from "../services/supabase";

import {
  ESTUDIAI_PLUS_PRODUCT_ID,
  verifyGooglePlaySubscription,
} from "../services/subscriptions";
import MercadoPagoPlusCard from "../components/MercadoPagoPlusCard";

type UsoRecurso = {
  used: number;
  limit: number;
  remaining: number;
};

type UsoStatus = {
  success: boolean;
  reason?: string;

  plan?: "free" | "plus";
  subscription_status?: string;

  period_start?: string | null;
  period_end?: string | null;

  questions?: UsoRecurso;
  summaries?: UsoRecurso;
  quizzes?: UsoRecurso;
  mindmaps?: UsoRecurso;

  materials?: {
    limit: number;
  };
};

export default function PlusScreen() {
  const [
    carregandoCompra,
    setCarregandoCompra,
  ] = useState(false);

  const [
    restaurandoAssinatura,
    setRestaurandoAssinatura,
  ] = useState(false);

  const [
    produtoCarregado,
    setProdutoCarregado,
  ] = useState(false);

  const [
    carregandoUso,
    setCarregandoUso,
  ] = useState(true);

  const [
    uso,
    setUso,
  ] = useState<UsoStatus | null>(
    null,
  );

  const [
    erroUso,
    setErroUso,
  ] = useState(false);

  const carregarUso =
    useCallback(async () => {
      try {
        setErroUso(false);

        const {
          data,
          error,
        } = await supabase.rpc(
          "get_my_usage_status",
        );

        if (error) {
          throw error;
        }

        const resultado =
          data as UsoStatus | null;

        if (!resultado?.success) {
          console.log(
            "STATUS DE USO INDISPONÍVEL:",
            resultado,
          );

          setUso(null);
          setErroUso(true);

          return;
        }

        setUso(resultado);
      } catch (error) {
        console.log(
          "ERRO AO CONSULTAR PLANO E USO:",
          error,
        );

        setUso(null);
        setErroUso(true);
      } finally {
        setCarregandoUso(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      setCarregandoUso(true);
      carregarUso();
    }, [carregarUso]),
  );

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (
      purchase,
    ) => {
      try {
        setCarregandoCompra(true);

        const purchaseToken =
          purchase.purchaseToken?.trim();

        if (!purchaseToken) {
          throw new Error(
            "purchase_token_missing",
          );
        }

        /*
          A compra não libera o Plus
          diretamente no aplicativo.

          Primeiro enviamos o token ao
          backend do EstudaIA, que consulta
          o Google Play e somente então
          ativa a assinatura.
        */
        const verification =
          await verifyGooglePlaySubscription(
            purchaseToken,
          );

        if (!verification.success) {
          throw new Error(
            verification.error ||
              "subscription_verification_failed",
          );
        }

        /*
          Somente depois da validação
          bem-sucedida no servidor
          finalizamos a transação local.
        */
        await finishTransaction({
          purchase,
          isConsumable: false,
        });

        /*
          A assinatura já foi confirmada
          pelo backend.

          Atualizamos a tela para mostrar
          imediatamente o novo plano e
          sua nova franquia.
        */
        await carregarUso();

        Alert.alert(
          "EstudaIA Plus ativado",
          "Sua assinatura foi confirmada com sucesso.",
        );
      } catch (error) {
        console.log(
          "ERRO AO CONFIRMAR ASSINATURA:",
          error,
        );

        Alert.alert(
          "Não foi possível confirmar a assinatura",
          "A compra não foi liberada pelo EstudaIA. Tente novamente em alguns instantes.",
        );
      } finally {
        setCarregandoCompra(false);
      }
    },

    onPurchaseError: (error) => {
      console.log(
        "ERRO NA COMPRA:",
        error,
      );

      setCarregandoCompra(false);
    },
  });

  const assinatura =
    subscriptions.find(
      (item) =>
        item.id ===
        ESTUDIAI_PLUS_PRODUCT_ID,
    );

  /*
    Consulta o produto somente depois
    que a conexão com a loja estiver
    disponível.

    Antes de cadastrarmos estudiai_plus
    no Play Console, a lista simplesmente
    permanecerá vazia.
  */
  useEffect(() => {
    if (!connected) {
      return;
    }

    let ativo = true;

    const carregarProduto =
      async () => {
        try {
          setProdutoCarregado(false);

          await fetchProducts({
            skus: [
              ESTUDIAI_PLUS_PRODUCT_ID,
            ],
            type: "subs",
          });
        } catch (error) {
          console.log(
            "ERRO AO CONSULTAR ESTUDAIA PLUS:",
            error,
          );
        } finally {
          if (ativo) {
            setProdutoCarregado(true);
          }
        }
      };

    carregarProduto();

    return () => {
      ativo = false;
    };
  }, [
    connected,
    fetchProducts,
  ]);

  const assinar =
    useCallback(async () => {
      if (
        Platform.OS !== "android"
      ) {
        Alert.alert(
          "Assinatura indisponível",
          "A assinatura ainda não está disponível nesta plataforma.",
        );

        return;
      }

      if (!assinatura) {
        Alert.alert(
          "Assinatura ainda não disponível",
          "O EstudaIA Plus ainda está sendo preparado para compra.",
        );

        return;
      }

      /*
        No Android a assinatura é vendida
        por uma oferta do Google Play.

        O token utilizado é sempre o
        retornado pela própria loja.
      */
      const offers =
        assinatura.subscriptionOffers ??
        [];

      const offer =
        offers.find((item) =>
          Boolean(
            item.offerTokenAndroid,
          ),
        );

      if (
        !offer?.offerTokenAndroid
      ) {
        Alert.alert(
          "Oferta indisponível",
          "O Google Play ainda não disponibilizou uma oferta para esta assinatura.",
        );

        return;
      }

      try {
        setCarregandoCompra(true);

        await requestPurchase({
          request: {
            google: {
              skus: [
                ESTUDIAI_PLUS_PRODUCT_ID,
              ],
              subscriptionOffers: [
                {
                  sku:
                    ESTUDIAI_PLUS_PRODUCT_ID,
                  offerToken:
                    offer.offerTokenAndroid,
                },
              ],
            },
          },
          type: "subs",
        });
      } catch (error) {
        console.log(
          "ERRO AO INICIAR ASSINATURA:",
          error,
        );

        setCarregandoCompra(false);

        Alert.alert(
          "Não foi possível iniciar a compra",
          "Verifique sua conexão com o Google Play e tente novamente.",
        );
      }
    }, [
      assinatura,
      requestPurchase,
    ]);

  /*
    Recupera uma assinatura já existente
    na conta Google Play do usuário.

    O aplicativo não concede acesso Plus
    diretamente.

    O purchaseToken encontrado na loja é
    enviado ao mesmo backend utilizado na
    compra normal. O servidor consulta o
    Google Play e decide se a assinatura
    realmente possui direito ao Plus.
  */
  const restaurarAssinatura =
    useCallback(async () => {
      if (
        Platform.OS !== "android"
      ) {
        Alert.alert(
          "Restauração indisponível",
          "A restauração ainda não está disponível nesta plataforma.",
        );

        return;
      }

      if (!connected) {
        Alert.alert(
          "Google Play indisponível",
          "Não foi possível conectar ao Google Play. Tente novamente em alguns instantes.",
        );

        return;
      }

      try {
        setRestaurandoAssinatura(
          true,
        );

        const compras =
          await getAvailablePurchases();

        const compraPlus =
          compras.find(
            (purchase) =>
              purchase.productId ===
              ESTUDIAI_PLUS_PRODUCT_ID,
          );

        if (!compraPlus) {
          Alert.alert(
            "Assinatura não encontrada",
            "Não encontramos uma assinatura ativa do EstudaIA Plus nesta conta do Google Play.",
          );

          return;
        }

        const purchaseToken =
          compraPlus.purchaseToken?.trim();

        if (!purchaseToken) {
          throw new Error(
            "purchase_token_missing",
          );
        }

        const verification =
          await verifyGooglePlaySubscription(
            purchaseToken,
          );

        if (!verification.success) {
          throw new Error(
            verification.error ||
              "subscription_verification_failed",
          );
        }

        /*
          O backend já confirmou a situação
          real da assinatura no Google Play.

          Agora apenas atualizamos os dados
          exibidos pelo aplicativo.
        */
        setCarregandoUso(true);

        await carregarUso();

        Alert.alert(
          "Assinatura restaurada",
          "Sua assinatura do EstudaIA Plus foi confirmada com sucesso.",
        );
      } catch (error) {
        console.log(
          "ERRO AO RESTAURAR ASSINATURA:",
          error,
        );

        Alert.alert(
          "Não foi possível restaurar",
          "Não foi possível confirmar sua assinatura no Google Play. Tente novamente em alguns instantes.",
        );
      } finally {
        setRestaurandoAssinatura(
          false,
        );
      }
    }, [
      connected,
      carregarUso,
    ]);

  /*
    O preço nunca é definido manualmente
    no aplicativo. Ele vem do produto
    cadastrado no Google Play.
  */
  const preco =
    assinatura?.displayPrice ??
    null;

  const lojaCarregando =
    connected &&
    !produtoCarregado;

  const planoPlus =
    uso?.plan === "plus";

  const operacaoEmAndamento =
    carregandoCompra ||
    restaurandoAssinatura;

  return (
    <ScrollView
      style={s.tela}
      contentContainerStyle={
        s.container
      }
    >
      <Pressable
        style={s.voltar}
        onPress={() =>
          router.back()
        }
      >
        <Text style={s.voltarTexto}>
          ‹ Voltar
        </Text>
      </Pressable>

      <View style={s.hero}>
        <Text style={s.heroIcone}>
          ✨
        </Text>

        <Text style={s.titulo}>
          EstudaIA Plus
        </Text>

        <Text style={s.subtitulo}>
          Mais recursos para estudar
          com seus próprios materiais.
        </Text>
      </View>

      <View style={s.cardStatus}>
        <Text style={s.statusTitulo}>
          Seu plano
        </Text>

        {carregandoUso ? (
          <View
            style={
              s.carregandoStatus
            }
          >
            <ActivityIndicator />

            <Text
              style={
                s.carregandoStatusTexto
              }
            >
              Consultando seu plano...
            </Text>
          </View>
        ) : erroUso || !uso ? (
          <>
            <Text
              style={
                s.statusIndisponivel
              }
            >
              Status temporariamente
              indisponível
            </Text>

            <Pressable
              style={
                s.botaoAtualizar
              }
              onPress={() => {
                setCarregandoUso(
                  true,
                );

                carregarUso();
              }}
            >
              <Text
                style={
                  s.botaoAtualizarTexto
                }
              >
                Tentar novamente
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View
              style={
                s.planoLinha
              }
            >
              <View
                style={[
                  s.badgePlano,
                  planoPlus
                    ? s.badgePlus
                    : s.badgeFree,
                ]}
              >
                <Text
                  style={[
                    s.badgePlanoTexto,
                    planoPlus
                      ? s.badgePlusTexto
                      : s.badgeFreeTexto,
                  ]}
                >
                  {planoPlus
                    ? "PLUS"
                    : "GRATUITO"}
                </Text>
              </View>

              <Text
                style={
                  s.planoAtualTexto
                }
              >
                {planoPlus
                  ? "EstudaIA Plus"
                  : "Plano gratuito"}
              </Text>
            </View>

            <View
              style={
                s.separador
              }
            />

            <Text
              style={
                s.usoTitulo
              }
            >
              Uso do período
            </Text>

            <UsoLinha
              titulo="Questões"
              recurso={
                uso.questions
              }
            />

            <UsoLinha
              titulo="Resumos"
              recurso={
                uso.summaries
              }
            />

            <UsoLinha
              titulo="Simulados"
              recurso={
                uso.quizzes
              }
            />

            <UsoLinha
              titulo="Mapas mentais"
              recurso={
                uso.mindmaps
              }
            />

            <View
              style={
                s.usoLinha
              }
            >
              <Text
                style={
                  s.usoNome
                }
              >
                Materiais
              </Text>

              <Text
                style={
                  s.usoValor
                }
              >
                até{" "}
                {uso.materials
                  ?.limit ?? 0}
              </Text>
            </View>

            <Text
              style={
                s.usoObservacao
              }
            >
              {planoPlus
                ? "Os limites são renovados a cada período da assinatura."
                : "A franquia gratuita é disponibilizada uma vez por conta."}
            </Text>
          </>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitulo}>
          O que está incluído no Plus
        </Text>

        <Beneficio
          titulo="Até 10 materiais"
          descricao="Mantenha mais apostilas preparadas para seus estudos."
        />

        <Beneficio
          titulo="50 questões por mês"
          descricao="Envie questões por foto e consulte seus materiais com IA."
        />

        <Beneficio
          titulo="10 resumos por mês"
          descricao="Crie resumos para revisar os principais conteúdos."
        />

        <Beneficio
          titulo="10 simulados por mês"
          descricao="Monte simulados com até 30 questões cada."
        />

        <Beneficio
          titulo="5 mapas mentais por mês"
          descricao="Organize visualmente os principais tópicos das suas apostilas."
        />
      </View>

      {Platform.OS === "web" ? (
        <MercadoPagoPlusCard
          isPlus={planoPlus}
          onPlanUpdated={carregarUso}
        />
      ) : !planoPlus ? (
        <View style={s.cardPlano}>
          <Text style={s.planoNome}>
            Plano mensal
          </Text>

          {lojaCarregando ? (
            <View
              style={
                s.carregandoLoja
              }
            >
              <ActivityIndicator />

              <Text
                style={
                  s.carregandoLojaTexto
                }
              >
                Consultando Google Play...
              </Text>
            </View>
          ) : preco ? (
            <>
              <Text
                style={s.preco}
              >
                {preco}
              </Text>

              <Text
                style={s.periodo}
              >
                por mês
              </Text>
            </>
          ) : (
            <>
              <Text
                style={
                  s.indisponivelTitulo
                }
              >
                Em preparação
              </Text>

              <Text
                style={
                  s.indisponivelTexto
                }
              >
                A assinatura será
                disponibilizada pelo
                Google Play.
              </Text>
            </>
          )}

          <Pressable
            style={({
              pressed,
            }) => [
              s.botaoAssinar,
              pressed &&
                s.botaoPressionado,
              (!assinatura ||
                operacaoEmAndamento) &&
                s.botaoDesabilitado,
            ]}
            onPress={assinar}
            disabled={
              !assinatura ||
              operacaoEmAndamento
            }
          >
            {carregandoCompra ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  s.botaoAssinarTexto
                }
              >
                Assinar EstudaIA Plus
              </Text>
            )}
          </Pressable>

          <Pressable
            style={({
              pressed,
            }) => [
              s.botaoRestaurar,
              pressed &&
                s.botaoRestaurarPressionado,
              operacaoEmAndamento &&
                s.botaoRestaurarDesabilitado,
            ]}
            onPress={
              restaurarAssinatura
            }
            disabled={
              operacaoEmAndamento
            }
          >
            {restaurandoAssinatura ? (
              <ActivityIndicator
                color="#0B3FA8"
              />
            ) : (
              <Text
                style={
                  s.botaoRestaurarTexto
                }
              >
                Restaurar assinatura
              </Text>
            )}
          </Pressable>

          <Text
            style={
              s.restaurarObservacao
            }
          >
            Já assinou anteriormente?
            Restaure usando a mesma conta
            do Google Play.
          </Text>

          {!assinatura ? (
            <Text
              style={s.aviso}
            >
              A compra ficará disponível
              quando o EstudaIA Plus estiver
              publicado no Google Play.
            </Text>
          ) : null}
        </View>
      ) : (
        <View
          style={
            s.cardPlusAtivo
          }
        >
          <Text
            style={
              s.plusAtivoIcone
            }
          >
            ✓
          </Text>

          <View
            style={
              s.plusAtivoConteudo
            }
          >
            <Text
              style={
                s.plusAtivoTitulo
              }
            >
              EstudaIA Plus ativo
            </Text>

            <Text
              style={
                s.plusAtivoTexto
              }
            >
              Sua conta já possui acesso
              aos benefícios do plano Plus.
            </Text>
          </View>
        </View>
      )}

      <Text style={s.observacao}>
        A assinatura é renovada conforme
        as condições apresentadas pelo
        Google Play no momento da compra.
        Os limites de uso são renovados
        a cada período da assinatura.
      </Text>
    </ScrollView>
  );
}

function UsoLinha({
  titulo,
  recurso,
}: {
  titulo: string;
  recurso?: UsoRecurso;
}) {
  const usado =
    recurso?.used ?? 0;

  const limite =
    recurso?.limit ?? 0;

  const percentual =
    limite > 0
      ? Math.min(
          usado / limite,
          1,
        )
      : 0;

  return (
    <View
      style={s.usoBloco}
    >
      <View
        style={s.usoLinha}
      >
        <Text
          style={s.usoNome}
        >
          {titulo}
        </Text>

        <Text
          style={s.usoValor}
        >
          {usado} de {limite}
        </Text>
      </View>

      <View
        style={s.barraFundo}
      >
        <View
          style={[
            s.barraPreenchida,
            {
              width:
                `${percentual * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function Beneficio({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <View style={s.beneficio}>
      <View
        style={
          s.beneficioMarcador
        }
      >
        <Text
          style={
            s.beneficioMarcadorTexto
          }
        >
          ✓
        </Text>
      </View>

      <View
        style={
          s.beneficioConteudo
        }
      >
        <Text
          style={
            s.beneficioTitulo
          }
        >
          {titulo}
        </Text>

        <Text
          style={
            s.beneficioDescricao
          }
        >
          {descricao}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  container: {
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 40,
  },

  voltar: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingRight: 14,
  },

  voltarTexto: {
    color: "#0B3FA8",
    fontSize: 16,
    fontWeight: "700",
  },

  hero: {
    marginTop: 18,
    alignItems: "center",
  },

  heroIcone: {
    fontSize: 40,
  },

  titulo: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: "900",
    color: "#0B3FA8",
  },

  subtitulo: {
    marginTop: 8,
    maxWidth: 310,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
  },

  cardStatus: {
    marginTop: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D7E2FA",
    padding: 19,
  },

  statusTitulo: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  carregandoStatus: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  carregandoStatusTexto: {
    marginLeft: 9,
    fontSize: 13,
    color: "#6B7280",
  },

  statusIndisponivel: {
    marginTop: 12,
    fontSize: 13,
    color: "#6B7280",
  },

  botaoAtualizar: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: "#EEF3FF",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  botaoAtualizarTexto: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0B3FA8",
  },

  planoLinha: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  badgePlano: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  badgeFree: {
    backgroundColor: "#F3F4F6",
  },

  badgePlus: {
    backgroundColor: "#DBEAFE",
  },

  badgePlanoTexto: {
    fontSize: 11,
    fontWeight: "900",
  },

  badgeFreeTexto: {
    color: "#4B5563",
  },

  badgePlusTexto: {
    color: "#0B3FA8",
  },

  planoAtualTexto: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  separador: {
    height: 1,
    backgroundColor: "#EEF0F3",
    marginVertical: 16,
  },

  usoTitulo: {
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  usoBloco: {
    marginTop: 13,
  },

  usoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  usoNome: {
    fontSize: 13,
    color: "#4B5563",
  },

  usoValor: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  barraFundo: {
    height: 7,
    marginTop: 7,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },

  barraPreenchida: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#0B3FA8",
  },

  usoObservacao: {
    marginTop: 17,
    fontSize: 11,
    lineHeight: 17,
    color: "#6B7280",
  },

  card: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    padding: 19,
  },

  cardTitulo: {
    marginBottom: 4,
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  beneficio: {
    flexDirection: "row",
    marginTop: 17,
  },

  beneficioMarcador: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },

  beneficioMarcadorTexto: {
    color: "#15803D",
    fontSize: 15,
    fontWeight: "900",
  },

  beneficioConteudo: {
    flex: 1,
    marginLeft: 11,
  },

  beneficioTitulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  beneficioDescricao: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },

  cardPlano: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D7E2FA",
    padding: 20,
    alignItems: "center",
  },

  planoNome: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0B3FA8",
  },

  preco: {
    marginTop: 9,
    fontSize: 31,
    fontWeight: "900",
    color: "#111827",
  },

  periodo: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },

  carregandoLoja: {
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  carregandoLojaTexto: {
    marginLeft: 9,
    fontSize: 13,
    color: "#6B7280",
  },

  indisponivelTitulo: {
    marginTop: 13,
    fontSize: 20,
    fontWeight: "900",
    color: "#374151",
  },

  indisponivelTexto: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },

  botaoAssinar: {
    marginTop: 20,
    width: "100%",
    minHeight: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B3FA8",
    paddingHorizontal: 16,
  },

  botaoAssinarTexto: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  botaoPressionado: {
    opacity: 0.82,
  },

  botaoDesabilitado: {
    opacity: 0.45,
  },

  botaoRestaurar: {
    marginTop: 12,
    width: "100%",
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#0B3FA8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },

  botaoRestaurarTexto: {
    color: "#0B3FA8",
    fontSize: 14,
    fontWeight: "900",
  },

  botaoRestaurarPressionado: {
    backgroundColor: "#EEF3FF",
  },

  botaoRestaurarDesabilitado: {
    opacity: 0.45,
  },

  restaurarObservacao: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    color: "#6B7280",
  },

  aviso: {
    marginTop: 11,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    color: "#6B7280",
  },

  cardPlusAtivo: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 18,
  },

  plusAtivoIcone: {
    width: 38,
    height: 38,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: 18,
    fontWeight: "900",
  },

  plusAtivoConteudo: {
    flex: 1,
    marginLeft: 12,
  },

  plusAtivoTitulo: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0B3FA8",
  },

  plusAtivoTexto: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#1E40AF",
  },

  observacao: {
    marginTop: 18,
    paddingHorizontal: 5,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    color: "#9CA3AF",
  },
});
