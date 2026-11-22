import { useEffect, useState } from "react";

import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import { supabase } from "../../services/supabase";

export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_code?: string | string[];
    error_description?: string | string[];
  }>();

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    concluirConfirmacao();
  }, []);

  async function concluirConfirmacao() {
    try {
      const code = Array.isArray(params.code)
        ? params.code[0]
        : params.code;

      const erroRecebido =
        Array.isArray(params.error_description)
          ? params.error_description[0]
          : params.error_description;
      const codigoErro =
        Array.isArray(params.error)
          ? params.error[0]
          : params.error;

      if (codigoErro) {
        if (codigoErro === "access_denied") {
          throw new Error(
            "A autenticação com Google foi cancelada. Você pode tentar novamente ou voltar para o login."
          );
        }

        throw new Error(
          "Não foi possível concluir a autenticação. Tente novamente."
        );
      }

      if (erroRecebido) {
        throw new Error(
          decodeURIComponent(
            erroRecebido.replace(/\+/g, " ")
          )
        );
      }

      if (!code) {
        /*
          Em alguns casos a sessão pode já
          ter sido estabelecida antes de
          esta tela ser carregada.
        */
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (session) {
          router.replace("/");
          return;
        }

        throw new Error(
          "O retorno de autenticação está incompleto ou expirou. Tente novamente."
        );
      }

      /*
        Como o cliente Supabase utiliza
        PKCE, trocamos o código recebido
        pela sessão do usuário.
      */
      const {
        data: exchangeData,
        error: exchangeError,
      } =
        await supabase.auth
          .exchangeCodeForSession(code);

      if (exchangeError) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          router.replace("/");
          return;
        }

        throw exchangeError;
      }

      if (!exchangeData.session) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            "Não foi possível concluir sua sessão. Tente novamente."
          );
        }
      }

      router.replace("/");
    } catch (error: any) {
      console.log(
        "ERRO NO CALLBACK DE AUTENTICAÇÃO:",
        error
      );

      setErro(
        error?.message ||
          "Não foi possível concluir sua autenticação."
      );
    }
  }

  if (erro) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>
          EstudaIA
        </Text>

        <Text style={styles.titulo}>
          Não foi possível concluir
        </Text>

        <Text style={styles.mensagem}>
          {erro}
        </Text>

        <Pressable
          style={styles.botao}
          onPress={() =>
            router.replace("/login")
          }
        >
          <Text
            style={styles.botaoTexto}
          >
            Voltar para o login
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        EstudaIA
      </Text>

      <ActivityIndicator
        size="large"
      />

      <Text style={styles.tituloCarregando}>
        Concluindo seu acesso...
      </Text>

      <Text style={styles.mensagem}>
        Aguarde enquanto concluímos a autenticação da sua conta.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    fontSize: 38,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 35,
  },

  titulo: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  tituloCarregando: {
    marginTop: 25,
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  mensagem: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
  },

  botao: {
    width: "100%",
    marginTop: 28,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },

  botaoTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});