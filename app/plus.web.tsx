import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { supabase } from "../services/supabase";
import MercadoPagoPlusCard from "../components/MercadoPagoPlusCard";

type ResourceUsage = { used: number; limit: number; remaining: number };
type UsageStatus = {
  success: boolean;
  plan?: "free" | "plus";
  questions?: ResourceUsage;
  summaries?: ResourceUsage;
  quizzes?: ResourceUsage;
  mindmaps?: ResourceUsage;
  materials?: { limit: number };
};

export default function PlusWebScreen() {
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [materialsUsed, setMaterialsUsed] = useState<number | null>(null);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_my_usage_status");
      if (rpcError || !(data as UsageStatus | null)?.success) {
        throw rpcError ?? new Error("Não foi possível consultar seu plano.");
      }
      setUsage(data as UsageStatus);
      const { data: materialUsage, error: materialsError } = await supabase.rpc(
        "get_my_material_usage",
      );
      if (materialsError || !materialUsage?.success) {
        console.warn(
          "Could not load study materials usage:",
          materialsError?.message ?? materialUsage?.reason,
        );
        setMaterialsUsed(null);
      } else {
        setMaterialsUsed(materialUsage.used ?? 0);
      }
    } catch (cause) {
      console.error("Could not load EstudaIA Plus status:", cause);
      setUsage(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadUsage(); }, [loadUsage]));

  const isPlus = usage?.plan === "plus";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.back}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.sparkle}>✨</Text>
        <Text style={styles.title}>EstudaIA Plus</Text>
        <Text style={styles.subtitle}>Mais recursos para estudar com seus próprios materiais.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Seu plano</Text>
        {loading ? (
          <ActivityIndicator color="#0B3FA8" />
        ) : error ? (
          <View>
            <Text style={styles.error}>Não foi possível consultar seu plano.</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadUsage()}>
              <Text style={styles.link}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.planName}>{isPlus ? "EstudaIA Plus ativo" : "Plano gratuito"}</Text>
            <UsageRow title="Questões" usage={usage?.questions} />
            <UsageRow title="Resumos" usage={usage?.summaries} />
            <UsageRow title="Simulados" usage={usage?.quizzes} />
            <UsageRow title="Mapas mentais" usage={usage?.mindmaps} />
            <View style={styles.usageRow}>
              <Text style={styles.usageTitle}>Apostilas</Text>
              <Text style={styles.usageValue}>
                {materialsUsed === null
                  ? `limite de ${usage?.materials?.limit ?? 0}`
                  : `${materialsUsed} usadas · ${Math.max((usage?.materials?.limit ?? 0) - materialsUsed, 0)} restantes`}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>O que está incluído no Plus</Text>
        <Text style={styles.benefit}>• Até 10 materiais preparados</Text>
        <Text style={styles.benefit}>• 50 questões por mês</Text>
        <Text style={styles.benefit}>• 10 resumos e simulados por mês</Text>
        <Text style={styles.benefit}>• 5 mapas mentais por mês</Text>
      </View>

      <MercadoPagoPlusCard isPlus={isPlus} onPlanUpdated={loadUsage} />
    </ScrollView>
  );
}

function UsageRow({ title, usage }: { title: string; usage?: ResourceUsage }) {
  if (!usage) return null;
  return (
    <View style={styles.usageRow}>
      <Text style={styles.usageTitle}>{title}</Text>
      <Text style={styles.usageValue}>{usage.used} usados · {usage.remaining} restantes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F7FC" },
  container: { width: "100%", maxWidth: 920, alignSelf: "center", padding: 24, paddingBottom: 48 },
  back: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#FFFFFF", borderRadius: 12 },
  backText: { color: "#0B3FA8", fontWeight: "700", fontSize: 15 },
  hero: { alignItems: "center", paddingVertical: 28 },
  sparkle: { fontSize: 40 },
  title: { color: "#0B1B32", fontSize: 30, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#64748B", fontSize: 15, textAlign: "center", marginTop: 8 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#DCE5F5", borderWidth: 1, borderRadius: 18, padding: 20, marginTop: 16 },
  sectionTitle: { color: "#0B1B32", fontSize: 19, fontWeight: "800", marginBottom: 14 },
  planName: { color: "#087443", fontSize: 17, fontWeight: "800", marginBottom: 10 },
  usageRow: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#E5EAF1", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  usageTitle: { color: "#334155", fontWeight: "600" },
  usageValue: { color: "#64748B", textAlign: "right" },
  benefit: { color: "#53657D", fontSize: 15, lineHeight: 25 },
  error: { color: "#B42318", marginBottom: 10 },
  link: { color: "#0B3FA8", fontWeight: "700" },
});
