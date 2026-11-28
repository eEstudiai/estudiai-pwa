import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../services/supabase";

type PlusOffer = {
  success: boolean;
  configured: boolean;
  plan: "free" | "plus";
  monthlyAmount: number | null;
  cardPublicKey: string | null;
  currencyId: string;
  provider: string | null;
  subscriptionStatus: string | null;
  autoRenewing: boolean | null;
  expiresAt: string | null;
  webSubscriptionStatus: string | null;
  webSubscriptionExpiresAt: string | null;
};

type SyncAttempt = "activated" | "pending" | "rate_limited" | "failed";

type Props = {
  isPlus: boolean;
  onPlanUpdated: () => Promise<void>;
};

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if (
    "context" in error &&
    typeof error.context === "object" &&
    error.context !== null &&
    "status" in error.context &&
    typeof error.context.status === "number"
  ) {
    return error.context.status;
  }

  return undefined;
}

function avisar(titulo: string, mensagem: string) {
  if (typeof window !== "undefined") {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }
  Alert.alert(titulo, mensagem);
}

type CardBrickController = { unmount: () => void };

type MercadoPagoGlobal = new (
  publicKey: string,
  options?: { locale?: string },
) => {
  bricks: () => {
    create: (
      name: string,
      containerId: string,
      settings: Record<string, unknown>,
    ) => Promise<CardBrickController>;
  };
};

const CARD_BRICK_CONTAINER_ID = "mp-card-brick";
const MP_SDK_URL = "https://sdk.mercadopago.com/js/v2";

function loadMercadoPagoSdk(): Promise<MercadoPagoGlobal> {
  return new Promise((resolve, reject) => {
    const existing = (window as unknown as { MercadoPago?: MercadoPagoGlobal })
      .MercadoPago;
    if (existing) {
      resolve(existing);
      return;
    }

    const script = document.createElement("script");
    script.src = MP_SDK_URL;
    script.async = true;
    script.onload = () => {
      const loaded = (window as unknown as { MercadoPago?: MercadoPagoGlobal })
        .MercadoPago;
      if (loaded) resolve(loaded);
      else reject(new Error("mercadopago_sdk_missing"));
    };
    script.onerror = () => reject(new Error("mercadopago_sdk_failed"));
    document.head.appendChild(script);
  });
}

function formatarData(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

export default function MercadoPagoPlusCard({
  isPlus,
  onPlanUpdated,
}: Props) {
  const [offer, setOffer] = useState<PlusOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [returnedFromMercadoPago, setReturnedFromMercadoPago] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardFormError, setCardFormError] = useState("");
  const syncInFlight = useRef(false);
  const onPlanUpdatedRef = useRef(onPlanUpdated);
  onPlanUpdatedRef.current = onPlanUpdated;

  const loadOffer = useCallback(async (
    showLoading = true,
  ): Promise<PlusOffer | null> => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "mercadopago-plus",
      { body: { action: "offer" } },
    );
    if (error || !data?.success) {
      if (showLoading) {
        setOffer(null);
        setNotice("Não foi possível consultar a oferta agora.");
        setLoading(false);
      }
      return null;
    }

    const nextOffer = data as PlusOffer;
    setOffer(nextOffer);
    if (showLoading) setLoading(false);
    return nextOffer;
  }, []);

  const syncMercadoPago = useCallback(async (): Promise<SyncAttempt> => {
    if (syncInFlight.current) {
      return "rate_limited";
    }

    syncInFlight.current = true;
    try {
      const { data, error } = await supabase.functions.invoke(
        "mercadopago-plus",
        { body: { action: "sync" } },
      );

      if (error) {
        return getHttpStatus(error) === 429 ? "rate_limited" : "failed";
      }
      if (data?.activated === true) return "activated";
      if (data?.pending === true) return "pending";
      return "failed";
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void loadOffer();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mp") === "return") {
        setReturnedFromMercadoPago(true);
        setNotice("");
      }
    }
  }, [loadOffer]);

  const shouldPoll =
    returnedFromMercadoPago ||
    (
      !isPlus &&
      offer?.plan === "free" &&
      offer.webSubscriptionStatus === "authorized"
    );

  useEffect(() => {
    if (!shouldPoll || isPlus) {
      setConfirmingPayment(false);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stopAt = Date.now() + 3 * 60 * 1000;

    setConfirmingPayment(true);
    setNotice("");

    const poll = async () => {
      const attempt = await syncMercadoPago();
      if (!active) return;

      if (attempt === "activated") {
        await onPlanUpdatedRef.current();
        await loadOffer(false);
        if (active) {
          setConfirmingPayment(false);
          setNotice("");
        }
        return;
      }

      if (attempt !== "rate_limited") {
        const refreshedOffer = await loadOffer(false);
        if (!active) return;

        if (refreshedOffer?.plan === "plus") {
          await onPlanUpdatedRef.current();
          if (active) {
            setConfirmingPayment(false);
            setNotice("");
          }
          return;
        }
      }

      if (Date.now() >= stopAt) {
        setConfirmingPayment(false);
        setNotice(
          "A confirmação ainda está pendente. Você pode tentar Atualizar status.",
        );
        return;
      }

      timer = setTimeout(() => {
        void poll();
      }, 5_000);
    };

    void poll();

    return () => {
      active = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [isPlus, loadOffer, shouldPoll, syncMercadoPago]);

  const cardPublicKey = offer?.cardPublicKey ?? null;
  const cardAmount = offer?.monthlyAmount ?? null;

  useEffect(() => {
    if (!showCardForm || !cardPublicKey || typeof cardAmount !== "number") {
      return;
    }

    let active = true;
    let controller: CardBrickController | null = null;
    setCardFormError("");

    void (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const email = userData.user?.email;
        const MercadoPago = await loadMercadoPagoSdk();
        if (!active) return;

        const mp = new MercadoPago(cardPublicKey, { locale: "pt-BR" });
        controller = await mp.bricks().create(
          "cardPayment",
          CARD_BRICK_CONTAINER_ID,
          {
            initialization: {
              amount: cardAmount,
              ...(email ? { payer: { email } } : {}),
            },
            customization: {
              visual: { hideFormTitle: true },
              paymentMethods: {
                minInstallments: 1,
                maxInstallments: 1,
                types: { excluded: ["debit_card"] },
              },
            },
            callbacks: {
              onReady: () => {},
              onSubmit: async (formData: { token?: string }) => {
                const token = formData?.token;
                if (typeof token !== "string") {
                  throw new Error("card_token_missing");
                }

                const { data, error } = await supabase.functions.invoke(
                  "mercadopago-plus",
                  { body: { action: "checkout_card", cardToken: token } },
                );

                if (error || data?.success !== true) {
                  const status = getHttpStatus(error);
                  setCardFormError(
                    status === 409
                      ? "Já existe um pagamento em confirmação. Toque em Atualizar status."
                      : "O cartão não foi aceito. Confira os dados e tente outro cartão de crédito. Se continuar, toque em Voltar e use Continuar checkout.",
                  );
                  throw new Error("card_checkout_failed");
                }

                setShowCardForm(false);
                setReturnedFromMercadoPago(true);
                await loadOffer(false);
              },
              onError: (brickError: unknown) => {
                console.error("Mercado Pago card form error:", brickError);
              },
            },
          },
        );
      } catch (error) {
        console.error("Mercado Pago card form failed to load:", error);
        if (active) {
          setCardFormError(
            "Não foi possível carregar o formulário de cartão. Tente novamente.",
          );
        }
      }
    })();

    return () => {
      active = false;
      try {
        controller?.unmount();
      } catch {
        // O formulário já pode ter sido removido da página.
      }
    };
  }, [showCardForm, cardPublicKey, cardAmount, loadOffer]);

  const iniciarCheckout = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "mercadopago-plus",
        { body: { action: "checkout" } },
      );
      if (error || typeof data?.checkoutUrl !== "string") {
        throw new Error(data?.error ?? "checkout_creation_failed");
      }
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      console.error("Mercado Pago checkout start failed:", error);
      avisar(
        "Não foi possível iniciar a assinatura",
        "Tente novamente em instantes. Se o problema continuar, avise o suporte.",
      );
      setWorking(false);
    }
  };

  const cancelarAssinatura = async () => {
    const confirmed = window.confirm(
      "Cancelar a renovação do EstudaIA Plus pelo Mercado Pago? Seu acesso continua até o fim do período já pago.",
    );
    if (!confirmed) return;

    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "mercadopago-plus",
        { body: { action: "cancel" } },
      );
      if (error || !data?.success) {
        throw new Error(data?.error ?? "subscription_cancel_failed");
      }
      setNotice(
        `Renovação cancelada. O Plus permanece ativo até ${formatarData(data.expiresAt)}.`,
      );
      await loadOffer();
      await onPlanUpdated();
    } catch (error) {
      console.error("Mercado Pago cancellation failed:", error);
      avisar(
        "Não foi possível cancelar",
        "A renovação não foi cancelada. Tente novamente ou gerencie a assinatura diretamente no Mercado Pago.",
      );
    } finally {
      setWorking(false);
    }
  };

  const atualizarStatus = async () => {
    setWorking(true);
    try {
      const attempt = await syncMercadoPago();
      if (attempt === "rate_limited") {
        setNotice("A consulta está em andamento. Aguarde alguns segundos.");
      } else if (attempt === "failed") {
        setNotice("Não foi possível consultar agora. Tente novamente.");
      }

      const refreshedOffer = await loadOffer(false);
      await onPlanUpdated();
      if (refreshedOffer?.plan === "plus") {
        setNotice("");
      }
    } finally {
      setWorking(false);
    }
  };

  const amount = offer?.monthlyAmount;
  const formattedAmount =
    typeof amount === "number"
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(amount)
      : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Assinatura do EstudaIA Plus</Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#0B3FA8" />
          <Text style={styles.description}>Consultando sua assinatura...</Text>
        </View>
      ) : isPlus ? (
        <>
          <Text style={styles.activeTitle}>EstudaIA Plus ativo</Text>
          <Text style={styles.description}>
            {offer?.provider === "mercadopago"
              ? offer.autoRenewing === false
                ? `Renovação cancelada. Acesso até ${formatarData(offer.expiresAt)}.`
                : `Assinatura recorrente pelo Mercado Pago. Próximo período até ${formatarData(offer.expiresAt)}.`
              : "Seu acesso Plus está ativo nesta conta. Assinaturas Google Play continuam sendo gerenciadas pela loja."}
          </Text>
          {offer?.provider === "mercadopago" && offer.autoRenewing !== false ? (
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={cancelarAssinatura}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                working && styles.disabled,
              ]}
            >
              {working ? (
                <ActivityIndicator color="#0B3FA8" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Cancelar renovação
                </Text>
              )}
            </Pressable>
          ) : null}
        </>
      ) : (
        <>
          {showCardForm ? null : offer?.webSubscriptionStatus === "pending" ||
            offer?.webSubscriptionStatus === "authorized" ? (
            <Text style={styles.description}>
              Checkout iniciado. Continue o pagamento ou aguarde a confirmação
              do Mercado Pago.
            </Text>
          ) : (
            <>
              {formattedAmount ? (
                <Text style={styles.price}>{formattedAmount} / mês</Text>
              ) : null}
              <Text style={styles.description}>
                A cobrança recorrente é processada pelo Mercado Pago. O Plus só
                é liberado após a confirmação do pagamento pelo servidor.
              </Text>
            </>
          )}
          {offer?.configured &&
          cardPublicKey &&
          offer.webSubscriptionStatus !== "authorized" ? (
            showCardForm ? (
              <>
                <Text style={styles.cardFormTitle}>Cartão de crédito</Text>
                <View
                  nativeID={CARD_BRICK_CONTAINER_ID}
                  style={styles.cardBrick}
                />
                {cardFormError ? (
                  <Text style={styles.notice}>{cardFormError}</Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowCardForm(false)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Voltar</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={working || confirmingPayment}
                onPress={() => setShowCardForm(true)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  (working || confirmingPayment) && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Assinar com cartão
                </Text>
              </Pressable>
            )
          ) : null}
          {showCardForm ? null : (
          <Pressable
            accessibilityRole="button"
            disabled={working || confirmingPayment || !offer?.configured}
            onPress={iniciarCheckout}
            style={({ pressed }) => [
              cardPublicKey ? styles.secondaryButton : styles.primaryButton,
              pressed && styles.pressed,
              (working || confirmingPayment || !offer?.configured) &&
                styles.disabled,
            ]}
          >
            {working ? (
              <ActivityIndicator
                color={cardPublicKey ? "#0B3FA8" : "#FFFFFF"}
              />
            ) : (
              <Text
                style={
                  cardPublicKey
                    ? styles.secondaryButtonText
                    : styles.primaryButtonText
                }
              >
                {offer?.webSubscriptionStatus === "pending" ||
                offer?.webSubscriptionStatus === "authorized"
                  ? "Continuar checkout"
                  : cardPublicKey
                    ? "Pagar com conta Mercado Pago"
                    : "Assinar pelo Mercado Pago"}
              </Text>
            )}
          </Pressable>
          )}
          {!offer?.configured ? (
            <Text style={styles.muted}>
              Checkout de teste ainda não configurado no servidor.
            </Text>
          ) : null}
        </>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {notice ? (
        <Pressable
          accessibilityRole="button"
          disabled={working || loading}
          onPress={atualizarStatus}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
            (working || loading) && styles.disabled,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Atualizar status</Text>
        </Pressable>
      ) : null}
      <Text style={styles.muted}>
        O Plus é associado à sua conta EstudaIA e vale para a versão web.
        Você pode cancelar a renovação quando quiser.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5F5",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
    width: "100%",
  },
  title: {
    color: "#0B1B32",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 14,
  },
  activeTitle: {
    color: "#087443",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  price: {
    color: "#0B3FA8",
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 8,
  },
  description: {
    color: "#53657D",
    fontSize: 14,
    lineHeight: 21,
  },
  loading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0B3FA8",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#0B3FA8",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#0B3FA8",
    fontSize: 14,
    fontWeight: "800",
  },
  notice: {
    backgroundColor: "#EEF4FF",
    borderRadius: 10,
    color: "#183D7A",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    padding: 12,
  },
  muted: {
    color: "#738198",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  cardFormTitle: {
    color: "#0B1B32",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 16,
  },
  cardBrick: { marginTop: 8, minHeight: 120, width: "100%" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
