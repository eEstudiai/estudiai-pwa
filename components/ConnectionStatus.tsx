import {
  View,
  Text,
  StyleSheet,
} from "react-native";

type ConnectionStatusProps = {
  visible: boolean;
  message?: string;
};

export default function ConnectionStatus({
  visible,
  message = "Não foi possível conectar ao EstudaIA. Verifique sua internet e tente novamente.",
}: ConnectionStatusProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={s.container}>
      <Text style={s.icone}>
        ⚠️
      </Text>

      <View style={s.textoContainer}>
        <Text style={s.titulo}>
          Problema de conexão
        </Text>

        <Text style={s.mensagem}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },

  icone: {
    fontSize: 20,
    marginRight: 10,
  },

  textoContainer: {
    flex: 1,
  },

  titulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9A3412",
  },

  mensagem: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#9A3412",
  },
});