import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { carregarErrosAtuais, ErroSimulado } from "../services/erros";
import { voltar } from "../services/navegacao";

export default function RevisarErros() {
  const [erros, setErros] = useState<ErroSimulado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [indice, setIndice] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [acertos, setAcertos] = useState(0);
  const [finalizado, setFinalizado] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);

    try {
      const lista = await carregarErrosAtuais();

      setErros(lista);
      setIndice(0);
      setEscolha(null);
      setAcertos(0);
      setFinalizado(false);
    } catch (error) {
      console.log("ERRO AO CARREGAR ERROS:", error);
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  const atual = erros[indice];
  const respondeu = escolha !== null;

  const escolher = (letra: string) => {
    if (respondeu || !atual) {
      return;
    }

    setEscolha(letra);

    if (letra === atual.correta) {
      setAcertos((valor) => valor + 1);
    }
  };

  const proxima = () => {
    if (indice + 1 >= erros.length) {
      setFinalizado(true);
      return;
    }

    setIndice((valor) => valor + 1);
    setEscolha(null);
  };

  return (
    <SafeAreaView style={s.tela} edges={["top"]}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Pressable
          accessibilityRole="button"
          onPress={() => voltar("/historico")}
          style={s.voltar}
        >
          <Text style={s.voltarTexto}>← Voltar</Text>
        </Pressable>

        <Text style={s.titulo}>Revisar meus erros</Text>

        {carregando ? (
          <View style={s.centro}>
            <ActivityIndicator size="large" color="#1769D2" />
            <Text style={s.texto}>Carregando seus erros...</Text>
          </View>
        ) : falhou ? (
          <View style={s.card}>
            <Text style={s.cardTitulo}>Não foi possível carregar</Text>
            <Text style={s.texto}>
              Verifique sua conexão com a internet e tente novamente.
            </Text>
            <Pressable onPress={() => void carregar()} style={s.botao}>
              <Text style={s.botaoTexto}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : erros.length === 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitulo}>Nenhum erro para revisar</Text>
            <Text style={s.texto}>
              Quando você errar questões em um simulado, elas aparecem aqui
              para você refazer.
            </Text>
          </View>
        ) : finalizado ? (
          <View style={s.card}>
            <Text style={s.cardTitulo}>Revisão concluída</Text>
            <Text style={s.texto}>
              Você acertou {acertos} de {erros.length}{" "}
              {erros.length === 1 ? "questão" : "questões"} que tinha errado.
            </Text>
            <Pressable onPress={() => void carregar()} style={s.botao}>
              <Text style={s.botaoTexto}>Revisar de novo</Text>
            </Pressable>
            <Pressable
              onPress={() => voltar("/historico")}
              style={s.botaoSecundario}
            >
              <Text style={s.botaoSecundarioTexto}>Voltar ao histórico</Text>
            </Pressable>
          </View>
        ) : atual ? (
          <View>
            <Text style={s.progresso}>
              Questão {indice + 1} de {erros.length} · {atual.tituloSimulado}
            </Text>

            <View style={s.card}>
              <Text style={s.enunciado}>{atual.pergunta}</Text>

              {Object.keys(atual.alternativas)
                .sort()
                .map((letra) => {
                  const correta = letra === atual.correta;
                  const marcada = letra === escolha;

                  return (
                    <Pressable
                      key={letra}
                      accessibilityRole="button"
                      onPress={() => escolher(letra)}
                      style={[
                        s.alternativa,
                        respondeu && correta && s.alternativaCorreta,
                        respondeu && marcada && !correta && s.alternativaErrada,
                      ]}
                    >
                      <Text style={s.letra}>{letra}</Text>
                      <Text style={s.alternativaTexto}>
                        {atual.alternativas[letra]}
                      </Text>
                    </Pressable>
                  );
                })}

              {respondeu ? (
                <View style={s.resultado}>
                  <Text style={s.resultadoTitulo}>
                    {escolha === atual.correta
                      ? "Isso! Você acertou desta vez."
                      : `Ainda não. A resposta correta é ${atual.correta}.`}
                  </Text>

                  {atual.explicacao ? (
                    <Text style={s.texto}>{atual.explicacao}</Text>
                  ) : null}

                  {atual.paginaFonte ? (
                    <Text style={s.fonte}>
                      Fonte: página {atual.paginaFonte} da apostila
                    </Text>
                  ) : null}

                  <Pressable onPress={proxima} style={s.botao}>
                    <Text style={s.botaoTexto}>
                      {indice + 1 >= erros.length ? "Concluir" : "Próxima"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <Text style={s.aviso}>
              Esta revisão é para praticar. O resultado não altera seu
              desempenho nos simulados.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F3F7FC" },
  conteudo: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  voltar: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E7FA",
  },
  voltarTexto: { fontSize: 14, fontWeight: "700", color: "#1769D2" },
  titulo: {
    marginTop: 14,
    marginBottom: 12,
    fontSize: 27,
    fontWeight: "800",
    color: "#172B4D",
  },
  centro: { alignItems: "center", paddingVertical: 40 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8E7FA",
    padding: 16,
  },
  cardTitulo: { fontSize: 18, fontWeight: "800", color: "#172B4D", marginBottom: 6 },
  texto: { fontSize: 14, lineHeight: 21, color: "#475569", marginTop: 4 },
  progresso: { fontSize: 13, color: "#64748B", marginBottom: 8 },
  enunciado: { fontSize: 16, lineHeight: 24, fontWeight: "700", color: "#172B4D", marginBottom: 12 },
  alternativa: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8E7FA",
    backgroundColor: "#F8FBFF",
    marginBottom: 8,
  },
  alternativaCorreta: { backgroundColor: "#E8F6EC", borderColor: "#15803D" },
  alternativaErrada: { backgroundColor: "#FDECEC", borderColor: "#DC2626" },
  letra: { fontSize: 14, fontWeight: "800", color: "#1769D2", width: 18 },
  alternativaTexto: { flex: 1, fontSize: 14, lineHeight: 20, color: "#172B4D" },
  resultado: { marginTop: 8 },
  resultadoTitulo: { fontSize: 15, fontWeight: "800", color: "#172B4D" },
  fonte: { marginTop: 8, fontSize: 12, color: "#64748B" },
  botao: {
    marginTop: 14,
    backgroundColor: "#1769D2",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  botaoTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  botaoSecundario: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#EEF4FD",
  },
  botaoSecundarioTexto: { color: "#1769D2", fontSize: 15, fontWeight: "800" },
  aviso: { marginTop: 12, fontSize: 12, lineHeight: 18, color: "#64748B", textAlign: "center" },
});
