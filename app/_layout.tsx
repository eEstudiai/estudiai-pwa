import {
  Stack,
  router,
  usePathname,
  useSegments,
} from "expo-router";

import {
  useEffect,
  useState,
} from "react";

import {
  View,
  StyleSheet,
} from "react-native";

import { supabase } from "../services/supabase";
import BottomNav from "../components/BottomNav";
import PromotionalNotificationsOnboarding from "../components/PromotionalNotificationsOnboarding";
import AvisoGlobal from "../components/AvisoGlobal";

function AuthGate() {
  const segments = useSegments();
  const pathname = usePathname();

  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const verificarSessao = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const logado = !!session;

      const naTelaLogin = segments[0] === "login";
      const noCallbackAuth = pathname === "/auth/callback";

      if (!logado && !naTelaLogin && !noCallbackAuth) {
        router.replace("/login");
      }

      if (logado && naTelaLogin) {
        router.replace("/");
      }

      setCarregando(false);
    };

    void verificarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const logado = !!session;

        const naTelaLogin = segments[0] === "login";
        const noCallbackAuth = pathname === "/auth/callback";

        if (!logado && !naTelaLogin && !noCallbackAuth) {
          router.replace("/login");
        }

        if (logado && naTelaLogin) {
          router.replace("/");
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [pathname, segments]);

  if (carregando) {
    return null;
  }

  const telasComBarra = [
    "/",
    "/biblioteca",
    "/questao",
    "/historico",
    "/configuracoes",
  ];

  const mostrarBarra = telasComBarra.includes(pathname);

  return (
    <View style={s.container}>
      <View style={s.conteudo}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="login" />
          <Stack.Screen name="index" />
          <Stack.Screen name="biblioteca" />
          <Stack.Screen name="questao" />
          <Stack.Screen name="historico" />
        </Stack>
      </View>

      {mostrarBarra ? <BottomNav /> : null}

      <PromotionalNotificationsOnboarding />

      <AvisoGlobal />
    </View>
  );
}

export default function Layout() {
  return <AuthGate />;
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  conteudo: {
    flex: 1,
  },
});
