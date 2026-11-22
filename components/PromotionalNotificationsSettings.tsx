import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";

import {
  disablePromotionalNotifications,
  enablePromotionalNotifications,
  getPromotionalPreference,
} from "../services/pushNotifications";

export default function PromotionalNotificationsSettings() {
  const [ativado, setAtivado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erroPreferencia, setErroPreferencia] = useState(false);
  const [tentativaConsulta, setTentativaConsulta] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregarPreferencia() {
      setCarregando(true);
      setErroPreferencia(false);
      try {
        const preferencia = await getPromotionalPreference();
        if (ativo) setAtivado(preferencia);
      } catch (error) {
        if (ativo) setErroPreferencia(true);
        console.warn("Não foi possível carregar a preferência de notificações.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarPreferencia();

    return () => {
      ativo = false;
    };
  }, [tentativaConsulta]);

  async function alterarPreferencia(novoValor: boolean) {
    setProcessando(true);

    try {
      if (novoValor) {
        await enablePromotionalNotifications();
      } else {
        await disablePromotionalNotifications();
      }

      setAtivado(novoValor);

      Alert.alert(
        novoValor ? "Preferência ativada" : "Preferência desativada",
        novoValor
          ? "Você aceitou receber novidades e ofertas do EstudaIA."
          : "Você não receberá mais notificações promocionais do EstudaIA."
      );
    } catch (error) {
      Alert.alert(
        "Não foi possível atualizar",
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao atualizar sua preferência. Tente novamente."
      );
    } finally {
      setProcessando(false);
    }
  }

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5EAF1",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#1F2937",
            }}
          >
            Receber novidades e ofertas
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: "#64748B",
              marginTop: 5,
              lineHeight: 19,
            }}
          >
            Receba avisos sobre novidades, recursos e ofertas promocionais do
            EstudaIA.
          </Text>
        </View>

        {carregando || processando ? (
          <ActivityIndicator color="#0B3FA8" />
        ) : erroPreferencia ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setTentativaConsulta((tentativa) => tentativa + 1)}
          >
            <Text style={{ color: "#0B3FA8", fontWeight: "700" }}>
              Tentar novamente
            </Text>
          </Pressable>
        ) : (
          <Switch
            value={ativado}
            onValueChange={alterarPreferencia}
            disabled={Platform.OS !== "android" || processando}
            trackColor={{ false: "#CBD5E1", true: "#93B4F5" }}
            thumbColor={ativado ? "#0B3FA8" : "#F8FAFC"}
          />
        )}
      </View>

      <Text
        style={{
          fontSize: 12,
          color: "#64748B",
          marginTop: 12,
          lineHeight: 18,
        }}
      >
        A adesão é opcional e começa desativada. Você pode cancelar o
        recebimento a qualquer momento. Disponível inicialmente para Android.
      </Text>
      {erroPreferencia && (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: 12, color: "#B42318", marginTop: 8 }}
        >
          Não foi possível confirmar sua preferência. O controle está bloqueado
          até a consulta ser concluída.
        </Text>
      )}
    </View>
  );
}
