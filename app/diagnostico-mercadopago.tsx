import { StyleSheet, Text, View } from "react-native";

export default function MercadoPagoDiagnosticUnavailableScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        O diagnóstico do Mercado Pago está disponível somente na versão Web.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#F3F7FC",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  message: {
    color: "#334155",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
});
