import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../services/supabase";
import { router } from "expo-router";

const CHAVE_EMAIL = "estudiai_login_email";
const CHAVE_SENHA = "estudiai_login_senha";
const CHAVE_LEMBRAR = "estudiai_login_lembrar";
const REDIRECT_URL = "estudiai://auth/callback";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarAcesso, setLembrarAcesso] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoCredenciais, setCarregandoCredenciais] =
    useState(true);

  useEffect(() => {
    if (Platform.OS === "web") {
      setCarregandoCredenciais(false);
      return;
    }

    void carregarCredenciaisSalvas();
  }, []);

  async function carregarCredenciaisSalvas() {
    if (Platform.OS === "web") {
      return;
    }

    try {
      const lembrarSalvo = await SecureStore.getItemAsync(
        CHAVE_LEMBRAR
      );

      if (lembrarSalvo !== "true") {
        return;
      }

      const emailSalvo = await SecureStore.getItemAsync(
        CHAVE_EMAIL
      );

      const senhaSalva = await SecureStore.getItemAsync(
        CHAVE_SENHA
      );

      if (emailSalvo) {
        setEmail(emailSalvo);
      }

      if (senhaSalva) {
        setSenha(senhaSalva);
      }

      setLembrarAcesso(true);
    } catch (error) {
      console.log(
        "ERRO AO CARREGAR CREDENCIAIS SALVAS:",
        error
      );
    } finally {
      setCarregandoCredenciais(false);
    }
  }

  async function salvarCredenciais() {
    if (Platform.OS === "web") {
      return;
    }

    await SecureStore.setItemAsync(
      CHAVE_EMAIL,
      email.trim()
    );

    await SecureStore.setItemAsync(
      CHAVE_SENHA,
      senha
    );

    await SecureStore.setItemAsync(
      CHAVE_LEMBRAR,
      "true"
    );
  }

  async function apagarCredenciais() {
    if (Platform.OS === "web") {
      return;
    }

    await SecureStore.deleteItemAsync(
      CHAVE_EMAIL
    );

    await SecureStore.deleteItemAsync(
      CHAVE_SENHA
    );

    await SecureStore.deleteItemAsync(
      CHAVE_LEMBRAR
    );
  }

  async function entrar() {
    if (!email || !senha) {
      Alert.alert(
        "Atenção",
        "Informe seu e-mail e sua senha."
      );

      return;
    }

    try {
      setCarregando(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

      if (error) {
        Alert.alert(
          "Erro ao entrar",
          error.message
        );

        return;
      }

      try {
        if (lembrarAcesso) {
          await salvarCredenciais();
        } else {
          await apagarCredenciais();
        }
      } catch (error) {
        console.log(
          "ERRO AO SALVAR CREDENCIAIS:",
          error
        );
      }

      router.replace("/");
    } catch (error) {
      console.log(
        "ERRO INESPERADO NO LOGIN:",
        error
      );

      Alert.alert(
        "Erro ao entrar",
        "Não foi possível entrar. Verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function criarConta() {
    if (!email || !senha) {
      Alert.alert(
        "Preencha seus dados",
        "Informe um e-mail e crie uma senha com pelo menos 6 caracteres para criar sua conta."
      );

      return;
    }

    if (senha.length < 6) {
      Alert.alert(
        "Senha inválida",
        "A senha precisa ter pelo menos 6 caracteres."
      );

      return;
    }

    try {
      setCarregando(true);

      const { error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo:
              "estudiai://auth/callback",
          },
        });

      if (error) {
        Alert.alert(
          "Erro ao criar conta",
          error.message
        );

        return;
      }

      Alert.alert(
        "Conta criada!",
        "Enviamos um e-mail de confirmação. Abra o e-mail e toque no link para confirmar sua conta."
      );
    } catch (error) {
      console.log(
        "ERRO INESPERADO AO CRIAR CONTA:",
        error
      );

      Alert.alert(
        "Erro ao criar conta",
        "Não foi possível criar a conta. Verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function entrarComGoogle() {
    try {
      setCarregando(true);

      const { data, error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: REDIRECT_URL,
            skipBrowserRedirect: true,
          },
        });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error(
          "Não foi possível iniciar a autenticação com Google."
        );
      }

      const resultado =
        await WebBrowser.openAuthSessionAsync(
          data.url,
          REDIRECT_URL
        );

      if (
        resultado.type === "cancel" ||
        resultado.type === "dismiss"
      ) {
        Alert.alert(
          "Login cancelado",
          "Você pode tentar novamente ou entrar com e-mail e senha."
        );

        return;
      }

      if (resultado.type !== "success") {
        throw new Error(
          "A autenticação não foi concluída."
        );
      }

      const callbackUrl =
        new URL(resultado.url);
      const params =
        callbackUrl.searchParams;
      const erroOAuth =
        params.get("error_description") ||
        params.get("error");

      if (erroOAuth) {
        if (params.get("error") === "access_denied") {
          Alert.alert(
            "Login cancelado",
            "A autenticação com Google foi cancelada."
          );
          return;
        }

        throw new Error(erroOAuth);
      }

      const code = params.get("code");

      if (!code) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            "O Google retornou sem concluir sua sessão. Tente novamente."
          );
        }

        router.replace("/");
        return;
      }

      const {
        data: sessionData,
        error: exchangeError,
      } = await supabase.auth.exchangeCodeForSession(code);

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

      if (!sessionData.session) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            "O Google retornou sem concluir sua sessão. Tente novamente."
          );
        }
      }

      router.replace("/");
    } catch (error) {
      console.log(
        "ERRO NO LOGIN COM GOOGLE:",
        error
      );

      const mensagem =
        error instanceof Error
          ? error.message
          : "";
      const falhaConexao =
        /network|fetch|connection|timeout/i.test(
          mensagem
        );

      Alert.alert(
        "Não foi possível entrar com Google",
        falhaConexao
          ? "Verifique sua conexão com a internet e tente novamente."
          : mensagem ||
              "Ocorreu um erro durante a autenticação. Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function alterarLembrarAcesso(
    novoValor: boolean
  ) {
    setLembrarAcesso(novoValor);

    if (!novoValor) {
      try {
        await apagarCredenciais();
      } catch (error) {
        console.log(
          "ERRO AO APAGAR CREDENCIAIS:",
          error
        );
      }
    }
  }

  return (
    <SafeAreaView
      style={styles.keyboardContainer}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.cabecalho}>
              <Image
                source={require("../assets/icon.png")}
                style={styles.iconeMarca}
                resizeMode="contain"
              />
              <Text style={styles.logo}>EstudaIA</Text>
              <Text style={styles.subtituloMarca}>
                Estude melhor com seus próprios materiais.
              </Text>
            </View>

            <View style={styles.cartao}>
              <Text style={styles.titulo}>Bem-vindo</Text>
              <Text style={styles.subtitulo}>
                Entre para continuar seus estudos.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={
                  !carregando &&
                  !carregandoCredenciais
                }
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Senha"
                  secureTextEntry={!mostrarSenha}
                  value={senha}
                  onChangeText={setSenha}
                  editable={
                    !carregando &&
                    !carregandoCredenciais
                  }
                />

                <TouchableOpacity
                  style={styles.passwordVisibilityButton}
                  onPress={() => setMostrarSenha(!mostrarSenha)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    mostrarSenha
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  <View style={styles.eyeIcon}>
                    <View style={styles.eyePupil} />
                    {!mostrarSenha && (
                      <View style={styles.eyeSlash} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {Platform.OS === "web" ? (
                <Text style={styles.lembrarDescricao}>
                  Por segurança, o navegador não salva sua senha.
                </Text>
              ) : (
                <View style={styles.lembrarContainer}>
                  <View style={styles.lembrarTextoContainer}>
                    <Text style={styles.lembrarTitulo}>
                      Lembrar meu acesso
                    </Text>

                    <Text style={styles.lembrarDescricao}>
                      Preencher e-mail e senha automaticamente neste aparelho.
                    </Text>
                  </View>

                  <Switch
                    value={lembrarAcesso}
                    onValueChange={alterarLembrarAcesso}
                    disabled={
                      carregando ||
                      carregandoCredenciais
                    }
                    trackColor={{ false: "#D1D9E6", true: "#93C5FD" }}
                    thumbColor={lembrarAcesso ? "#1769D2" : "#FFFFFF"}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.botao,
                  carregandoCredenciais &&
                    styles.botaoDesabilitado,
                ]}
                onPress={entrar}
                disabled={
                  carregando ||
                  carregandoCredenciais
                }
              >
                <Text style={styles.textoBotao}>
                  {carregandoCredenciais
                    ? "Carregando..."
                    : carregando
                      ? "Aguarde..."
                      : "Entrar"}
                </Text>
              </TouchableOpacity>

              <View style={styles.divisorContainer}>
                <View style={styles.divisor} />
                <Text style={styles.divisorTexto}>ou</Text>
                <View style={styles.divisor} />
              </View>

              <TouchableOpacity
                style={[
                  styles.botaoGoogle,
                  (carregando || carregandoCredenciais) &&
                    styles.botaoDesabilitado,
                ]}
                onPress={entrarComGoogle}
                disabled={
                  carregando ||
                  carregandoCredenciais
                }
                accessibilityRole="button"
              >
                <Image
                  source={require("../assets/google-g.png")}
                  style={styles.googleIcon}
                  resizeMode="contain"
                />
                <Text style={styles.textoBotaoGoogle}>
                  {carregando
                    ? "Conectando..."
                    : "Continuar com Google"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoSecundario}
                onPress={criarConta}
                disabled={
                  carregando ||
                  carregandoCredenciais
                }
              >
                <Text style={styles.textoBotaoSecundario}>
                  Criar minha conta
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#F3F7FC",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  container: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  cabecalho: {
    alignItems: "center",
    marginBottom: 26,
  },

  iconeMarca: {
    width: 68,
    height: 68,
    borderRadius: 18,
    marginBottom: 10,
  },

  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1456A0",
    textAlign: "center",
    letterSpacing: -0.6,
  },

  subtituloMarca: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },

  cartao: {
    width: "100%",
    padding: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5EDF7",
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },

  titulo: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 5,
  },

  subtitulo: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 20,
  },

  input: {
    height: 54,
    backgroundColor: "#F8FAFD",
    borderWidth: 1,
    borderColor: "#DCE5F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#172B4D",
    marginBottom: 12,
  },

  passwordContainer: {
    position: "relative",
  },

  passwordInput: {
    paddingRight: 54,
  },

  passwordVisibilityButton: {
    position: "absolute",
    right: 10,
    top: 9,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  eyeIcon: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: "#64748B",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  eyePupil: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#64748B",
  },

  eyeSlash: {
    position: "absolute",
    width: 23,
    height: 1.5,
    backgroundColor: "#64748B",
    transform: [{ rotate: "-35deg" }],
  },

  lembrarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 1,
    marginBottom: 8,
    paddingVertical: 6,
  },

  lembrarTextoContainer: {
    flex: 1,
    paddingRight: 16,
  },

  lembrarTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#243B53",
  },

  lembrarDescricao: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: "#718096",
  },

  botao: {
    minHeight: 54,
    backgroundColor: "#1769D2",
    borderRadius: 15,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
    shadowColor: "#1769D2",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 2,
  },

  botaoDesabilitado: {
    opacity: 0.7,
  },

  textoBotao: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  divisorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 17,
    marginBottom: 4,
  },

  divisor: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  divisorTexto: {
    color: "#8291A5",
    fontSize: 13,
  },

  botaoGoogle: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5F0",
    borderRadius: 14,
    paddingHorizontal: 15,
    marginTop: 8,
  },

  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },

  textoBotaoGoogle: {
    color: "#243B53",
    fontSize: 14,
    fontWeight: "700",
  },

  botaoSecundario: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
  },

  textoBotaoSecundario: {
    color: "#1769D2",
    fontSize: 14,
    fontWeight: "800",
  },
});
