import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../services/supabase";

import {
  enablePromotionalNotifications,
  markPromotionalInvitationHandled,
  shouldShowPromotionalInvitation,
} from "../services/pushNotifications";

export default function PromotionalNotificationsOnboarding() {
  const [userId, setUserId] = useState<string | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let ativo = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function carregarSessao() {
      const { data, error } = await supabase.auth.getSession();

      if (!ativo) return;

      if (error) {
        console.warn(
          "Não foi possível verificar a sessão para o convite de notificações.",
        );
        return;
      }

      setUserId(data.session?.user.id ?? null);
    }

    void carregarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
          if (ativo) {
            setUserId(session?.user.id ?? null);
          }
        }, 0);
      },
    );

    return () => {
      ativo = false;
      if (timeout) clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function verificarConvite() {
      setVisivel(false);

      if (!userId || Platform.OS !== "android") return;

      try {
        const deveExibir =
          await shouldShowPromotionalInvitation(userId);

        if (ativo) setVisivel(deveExibir);
      } catch {
        console.warn(
          "Não foi possível consultar a preferência do convite promocional.",
        );
      }
    }

    void verificarConvite();

    return () => {
      ativo = false;
    };
  }, [userId]);

  async function responder(aceitou: boolean) {
    if (processando) return;

    setProcessando(true);

    try {
      await markPromotionalInvitationHandled();
      setVisivel(false);

      if (aceitou) {
        try {
          await enablePromotionalNotifications();

          Alert.alert(
            "Preferência ativada",
            "Você aceitou receber novidades e ofertas do EstudaIA. Você pode alterar essa preferência em Configurações.",
          );
        } catch (error) {
          Alert.alert(
            "Não foi possível ativar",
            error instanceof Error
              ? `${error.message}\n\nVocê poderá tentar novamente em Configurações.`
              : "Não foi possível ativar as notificações. Tente novamente em Configurações.",
          );
        }
      }
    } catch {
      Alert.alert(
        "Não foi possível salvar sua resposta",
        "Verifique sua conexão e tente novamente. O convite continuará disponível.",
      );
    } finally {
      setProcessando(false);
    }
  }

  if (Platform.OS !== "android") return null;

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!processando) void responder(false);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icone}>🔔</Text>

          <Text style={styles.titulo}>
            Fique por dentro do EstudaIA!
          </Text>

          <Text style={styles.descricao}>
            Quer receber notificações sobre novos recursos,
            novidades e ofertas especiais do EstudaIA?
          </Text>

          <Text style={styles.observacao}>
            A adesão é opcional. Você pode cancelar quando quiser
            nas Configurações do aplicativo.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={processando}
            onPress={() => void responder(true)}
            style={({ pressed }) => [
              styles.botaoPrincipal,
              pressed && styles.pressionado,
              processando && styles.desabilitado,
            ]}
          >
            {processando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoPrincipal}>
                Quero receber novidades
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={processando}
            onPress={() => void responder(false)}
            style={styles.botaoSecundario}
          >
            <Text style={styles.textoSecundario}>
              Agora não
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.60)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  icone: {
    fontSize: 38,
    marginBottom: 14,
  },
  titulo: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
  },
  descricao: {
    fontSize: 15,
    lineHeight: 23,
    color: "#475569",
    textAlign: "center",
    marginTop: 14,
  },
  observacao: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 22,
  },
  botaoPrincipal: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#0B3FA8",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  textoPrincipal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  botaoSecundario: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  textoSecundario: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  pressionado: {
    opacity: 0.85,
  },
  desabilitado: {
    opacity: 0.7,
  },
});
