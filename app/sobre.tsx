import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { voltar } from "../services/navegacao";

import { router } from "expo-router";
import Constants from "expo-constants";

export default function SobreScreen() {
  const versao =
    Constants.expoConfig?.version ||
    "0.1.0";

  return (
    <ScrollView
      style={s.tela}
      contentContainerStyle={
        s.container
      }
    >
      <Pressable
        style={s.voltar}
        onPress={() =>
          voltar("/configuracoes")
        }
      >
        <Text
          style={s.voltarTexto}
        >
          ← Ajustes
        </Text>
      </Pressable>

      <Text style={s.titulo}>
        Sobre o EstudaIA
      </Text>

      <Text style={s.subtitulo}>
        Seu material de estudo
        transformado em uma ferramenta
        inteligente de aprendizagem.
      </Text>

      <View style={s.logoCard}>
        <View
          style={
            s.logoIconeContainer
          }
        >
          <Text
            style={s.logoEmoji}
          >
            📘
          </Text>
        </View>

        <Text style={s.logoNome}>
          EstudaIA
        </Text>

        <Text style={s.versao}>
          Versão {versao}
        </Text>

        <Text
          style={
            s.logoDescricao
          }
        >
          Estude com seus próprios
          materiais.
        </Text>
      </View>

      <Text
        style={s.secaoTitulo}
      >
        Conheça o aplicativo
      </Text>

      <View style={s.card}>
        <View
          style={
            s.cardCabecalho
          }
        >
          <View
            style={
              s.cardIcone
            }
          >
            <Text
              style={
                s.cardIconeTexto
              }
            >
              🎯
            </Text>
          </View>

          <Text
            style={
              s.cardTitulo
            }
          >
            Objetivo
          </Text>
        </View>

        <Text style={s.texto}>
          O EstudaIA foi criado para
          ajudar você a estudar usando
          seus próprios materiais.
        </Text>

        <Text style={s.texto}>
          Você poderá cadastrar
          apostilas, fotografar questões
          e receber respostas baseadas
          no conteúdo enviado para sua
          biblioteca.
        </Text>
      </View>

      <View style={s.card}>
        <View
          style={
            s.cardCabecalho
          }
        >
          <View
            style={
              s.cardIcone
            }
          >
            <Text
              style={
                s.cardIconeTexto
              }
            >
              🤖
            </Text>
          </View>

          <Text
            style={
              s.cardTitulo
            }
          >
            Como a IA funciona
          </Text>
        </View>

        <Text style={s.texto}>
          A proposta do EstudaIA é
          utilizar as apostilas
          cadastradas pelo próprio
          usuário como fonte principal
          para responder às questões.
        </Text>

        <Text style={s.texto}>
          Quando o material não oferecer
          suporte suficiente para uma
          resposta, o aplicativo deverá
          informar que não foi possível
          confirmar a resposta, evitando
          apresentar informações como se
          fossem verdadeiras.
        </Text>
      </View>

      <View style={s.card}>
        <View
          style={
            s.cardCabecalho
          }
        >
          <View
            style={
              s.cardIcone
            }
          >
            <Text
              style={
                s.cardIconeTexto
              }
            >
              📷
            </Text>
          </View>

          <Text
            style={
              s.cardTitulo
            }
          >
            Resolução de questões
          </Text>
        </View>

        <Text style={s.texto}>
          O objetivo é permitir que uma
          questão seja fotografada pelo
          celular e analisada pelo
          EstudaIA.
        </Text>

        <Text style={s.texto}>
          A resposta poderá apresentar
          alternativa, explicação,
          confiança da análise, material
          utilizado como fonte e página
          correspondente quando essas
          informações estiverem
          disponíveis.
        </Text>
      </View>

      <View style={s.card}>
        <View
          style={
            s.cardCabecalho
          }
        >
          <View
            style={
              s.cardIcone
            }
          >
            <Text
              style={
                s.cardIconeTexto
              }
            >
              🧮
            </Text>
          </View>

          <Text
            style={
              s.cardTitulo
            }
          >
            Matemática financeira
          </Text>
        </View>

        <Text style={s.texto}>
          Quando a questão envolver
          matemática financeira e o
          material cadastrado oferecer
          suporte, o EstudaIA poderá
          apresentar também os passos
          necessários para realizar o
          cálculo na HP-12C.
        </Text>
      </View>

      <View style={s.card}>
        <View
          style={
            s.cardCabecalho
          }
        >
          <View
            style={
              s.cardIcone
            }
          >
            <Text
              style={
                s.cardIconeTexto
              }
            >
              🔒
            </Text>
          </View>

          <Text
            style={
              s.cardTitulo
            }
          >
            Privacidade
          </Text>
        </View>

        <Text style={s.texto}>
          As apostilas, questões e
          histórico ficam associados à
          conta do usuário.
        </Text>

        <Text style={s.texto}>
          O aplicativo foi estruturado
          para separar os materiais de
          cada usuário e impedir que uma
          conta acesse diretamente os
          dados pertencentes a outra.
        </Text>

        <Pressable
          style={s.linkLegal}
          onPress={() =>
            router.push(
              "/politica-privacidade"
            )
          }
        >
          <View
            style={
              s.linkLegalEsquerda
            }
          >
            <Text
              style={
                s.linkLegalIcone
              }
            >
              🛡️
            </Text>

            <View
              style={
                s.linkLegalConteudo
              }
            >
              <Text
                style={
                  s.linkLegalTitulo
                }
              >
                Política de Privacidade
              </Text>

              <Text
                style={
                  s.linkLegalDescricao
                }
              >
                Saiba como seus dados
                são tratados.
              </Text>
            </View>
          </View>

          <Text
            style={
              s.linkLegalSeta
            }
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={s.linkLegal}
          onPress={() =>
            router.push(
              "/termos-de-uso"
            )
          }
        >
          <View
            style={
              s.linkLegalEsquerda
            }
          >
            <Text
              style={
                s.linkLegalIcone
              }
            >
              📄
            </Text>

            <View
              style={
                s.linkLegalConteudo
              }
            >
              <Text
                style={
                  s.linkLegalTitulo
                }
              >
                Termos de Uso
              </Text>

              <Text
                style={
                  s.linkLegalDescricao
                }
              >
                Consulte as condições de
                utilização do EstudaIA.
              </Text>
            </View>
          </View>

          <Text
            style={
              s.linkLegalSeta
            }
          >
            ›
          </Text>
        </Pressable>
      </View>

      <Text style={s.rodape}>
        EstudaIA • Versão {versao}
      </Text>
    </ScrollView>
  );
}

const s =
  StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor:
        "#F5F7FB",
    },

    container: {
      paddingHorizontal: 22,
      paddingTop: 55,
      paddingBottom: 45,
      flexGrow: 1,
    },

    voltar: {
      alignSelf: "flex-start",
      paddingVertical: 8,
      marginBottom: 5,
    },

    voltarTexto: {
      fontSize: 15,
      fontWeight: "800",
      color: "#0B3FA8",
    },

    titulo: {
      fontSize: 30,
      fontWeight: "800",
      color: "#0B3FA8",
    },

    subtitulo: {
      marginTop: 7,
      marginBottom: 22,
      fontSize: 15,
      lineHeight: 22,
      color: "#6B7280",
    },

    logoCard: {
      backgroundColor:
        "#0B3FA8",
      borderRadius: 22,
      padding: 25,
      alignItems: "center",
    },

    logoIconeContainer: {
      width: 78,
      height: 78,
      borderRadius: 25,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    logoEmoji: {
      fontSize: 40,
    },

    logoNome: {
      marginTop: 13,
      fontSize: 27,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    versao: {
      marginTop: 4,
      fontSize: 13,
      color: "#DBEAFE",
    },

    logoDescricao: {
      marginTop: 10,
      fontSize: 13,
      color: "#DBEAFE",
      textAlign: "center",
    },

    secaoTitulo: {
      marginTop: 27,
      marginBottom: 10,
      fontSize: 17,
      fontWeight: "800",
      color: "#111827",
    },

    card: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        "#E8ECF2",
    },

    cardCabecalho: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },

    cardIcone: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor:
        "#EEF3FF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    cardIconeTexto: {
      fontSize: 21,
    },

    cardTitulo: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      fontWeight: "800",
      color: "#111827",
    },

    texto: {
      fontSize: 14,
      lineHeight: 21,
      color: "#4B5563",
      marginBottom: 9,
    },

    linkLegal: {
      marginTop: 10,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor:
        "#E8ECF2",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    linkLegalEsquerda: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    linkLegalIcone: {
      fontSize: 22,
      marginRight: 11,
    },

    linkLegalConteudo: {
      flex: 1,
    },

    linkLegalTitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#0B3FA8",
    },

    linkLegalDescricao: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: "#6B7280",
    },

    linkLegalSeta: {
      marginLeft: 10,
      fontSize: 28,
      color: "#9CA3AF",
    },

    rodape: {
      textAlign: "center",
      marginTop: 18,
      color: "#9CA3AF",
      fontSize: 12,
    },
  });