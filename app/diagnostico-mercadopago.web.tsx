import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../services/supabase";

const DIAGNOSTIC_KEYS = [
  "accessTokenPresent",
  "accessTokenHasAppUsrPrefix",
  "webhookSecretPresent",
  "backUrlValid",
  "expirySecretPresent",
  "expiryJobConfigured",
  "monthlyPriceValid",
] as const;

type DiagnosticKey = (typeof DIAGNOSTIC_KEYS)[number];
type DiagnosticResult = Record<DiagnosticKey, boolean>;

const DIAGNOSTIC_LABELS: Record<DiagnosticKey, string> = {
  accessTokenPresent: "Token presente",
  accessTokenHasAppUsrPrefix: "Prefixo APP_USR",
  webhookSecretPresent: "Webhook secret presente",
  backUrlValid: "URL de retorno válida",
  expirySecretPresent: "Secret de expiração presente",
  expiryJobConfigured: "Job de expiração configurado",
  monthlyPriceValid: "Preço mensal válido",
};

function isDiagnosticResult(value: unknown): value is DiagnosticResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === DIAGNOSTIC_KEYS.length &&
    DIAGNOSTIC_KEYS.every((key) => typeof record[key] === "boolean")
  );
}

export default function MercadoPagoDiagnosticScreen() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    setFailed(false);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke<unknown>(
        "mercadopago-plus-config-diagnostic",
        { body: {} },
      );

      if (error || !isDiagnosticResult(data)) {
        setFailed(true);
        return;
      }

      setResult(data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Diagnóstico temporário do Mercado Pago</Text>
      <Text style={styles.description}>
        Esta tela consulta somente a configuração do checkout. Não inicia
        compras nem assinaturas.
      </Text>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => void runDiagnostic()}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Executar diagnóstico</Text>
        )}
      </Pressable>

      {failed ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          Não foi possível obter o diagnóstico.
        </Text>
      ) : null}

      {result ? (
        <View accessibilityLiveRegion="polite" style={styles.results}>
          {DIAGNOSTIC_KEYS.map((key) => (
            <View key={key} style={styles.resultRow}>
              <Text style={styles.resultLabel}>{DIAGNOSTIC_LABELS[key]}</Text>
              <Text style={styles.resultValue}>
                {result[key] ? "true" : "false"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F7FC" },
  container: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    color: "#0B1B32",
    fontSize: 24,
    fontWeight: "900",
  },
  description: {
    color: "#53657D",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#0B3FA8",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  results: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5F5",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  resultRow: {
    alignItems: "center",
    borderBottomColor: "#E5EAF1",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
  },
  resultLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  resultValue: {
    color: "#0B3FA8",
    fontFamily: "monospace",
    fontWeight: "800",
  },
  error: {
    color: "#B42318",
    marginTop: 16,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
});
