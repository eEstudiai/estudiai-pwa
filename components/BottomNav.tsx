import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

import {
  router,
  usePathname,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

type ItemNav = {
  label: string;
  icon: string;
  rota: string;
};

const itens: ItemNav[] = [
  {
    label: "Início",
    icon: "🏠",
    rota: "/",
  },
  {
    label: "Biblioteca",
    icon: "📚",
    rota: "/biblioteca",
  },
  {
    label: "Questão",
    icon: "📷",
    rota: "/questao",
  },
  {
    label: "Histórico",
    icon: "📝",
    rota: "/historico",
  },
  {
    label: "Ajustes",
    icon: "⚙️",
    rota: "/configuracoes",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const estaAtivo = (rota: string) => {
    if (rota === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(rota);
  };

  const navegar = (rota: string) => {
    if (pathname === rota) {
      return;
    }

    router.push(rota as any);
  };

  return (
    <SafeAreaView
      style={s.container}
      edges={["bottom"]}
    >
      {itens.map((item) => {
        const ativo = estaAtivo(
          item.rota
        );

        return (
          <Pressable
            key={item.rota}
            style={s.item}
            onPress={() =>
              navegar(item.rota)
            }
          >
            <Text
              style={[
                s.icone,
                ativo &&
                  s.iconeAtivo,
              ]}
            >
              {item.icon}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                s.label,
                ativo &&
                  s.labelAtivo,
              ]}
            >
              {item.label}
            </Text>

            {ativo ? (
              <View
                style={
                  s.indicador
                }
              />
            ) : null}
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },

  item: {
    flex: 1,
    alignItems: "center",
    justifyContent:
      "center",
    minHeight: 58,
    position: "relative",
  },

  icone: {
    fontSize: 21,
    opacity: 0.6,
  },

  iconeAtivo: {
    opacity: 1,
  },

  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },

  labelAtivo: {
    color: "#0B3FA8",
    fontWeight: "800",
  },

  indicador: {
    position: "absolute",
    bottom: 1,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor:
      "#0B3FA8",
  },
});