import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { AvisoTela, inscreverAviso } from "../services/avisos";

const TEMPO_EXIBICAO_MS = 7000;

export default function AvisoGlobal() {
  const [aviso, setAviso] = useState<AvisoTela | null>(null);

  useEffect(() => inscreverAviso(setAviso), []);

  useEffect(() => {
    if (!aviso) {
      return;
    }

    const temporizador = setTimeout(() => setAviso(null), TEMPO_EXIBICAO_MS);

    return () => clearTimeout(temporizador);
  }, [aviso]);

  if (Platform.OS !== "web" || !aviso) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="alert"
      onPress={() => setAviso(null)}
      style={s.caixa}
    >
      <Text style={s.titulo}>{aviso.titulo}</Text>
      {aviso.mensagem ? <Text style={s.mensagem}>{aviso.mensagem}</Text> : null}
      <Text style={s.fechar}>Toque para fechar</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  caixa: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 9999,
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: "#0B1F4B",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  titulo: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  mensagem: {
    color: "#DCE6FF",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  fechar: {
    color: "#8FA8E8",
    fontSize: 12,
    marginTop: 8,
  },
});
