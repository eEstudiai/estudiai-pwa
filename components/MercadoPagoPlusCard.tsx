import { useCallback, useEffect, useState } from "react";
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
  monthlyAmount: number | null;
  currencyId: string;
  provider: string | null;
  subscriptionStatus: string | null;
  autoRenewing: boolean | null;
  expiresAt: string | null;
  webSubscriptionStatus: string | null;
  webSubscriptionExpiresAt: string | null;
};

type Props = {
  isPlus: boolean;
  onPlanUpdated: () => Promise<void>;
};

function avisar(titulo: string, mensagem: string) {
  if (typeof window !== "undefined") {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }
  Alert.alert(titulo, mensagem);
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

  const loadOffer = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "mercadopago-plus",
      { body: { action: "offer" } },
    );
    if (error || !data?.success) {
      setOffer(null);
      setNotice("Não foi possível consultar a oferta agora.");
      setLoading(false);
      return;
    }
    setOffer(data as PlusOffer);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOffer();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mp") === "return") {
        setNotice(
          "Retorno do Mercado Pago recebido. Estamos aguardando a confirmação segura do pagamento.",
        );
      }
    }
  }, [loadOffer]);

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
      await loadOffer();
      await onPlanUpdated();
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
          {offer?.webSubscriptionStatus === "pending" ||
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
          <Pressable
            accessibilityRole="button"
            disabled={working || !offer?.configured}
            onPress={iniciarCheckout}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              (working || !offer?.configured) && styles.disabled,
            ]}
          >
            {working ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {offer?.webSubscriptionStatus === "pending" ||
                offer?.webSubscriptionStatus === "authorized"
                  ? "Continuar checkout"
                  : "Assinar pelo Mercado Pago"}
              </Text>
            )}
          </Pressable>
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
        O Plus é associado à sua conta EstudaIA e pode ser usado também no app
        Android. Gerencie a assinatura pela plataforma em que ela foi criada.
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
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
