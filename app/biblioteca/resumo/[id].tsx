import React, {
  useCallback,
  useState,
} from "react";
import { voltar } from "../../../services/navegacao";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../../services/supabase";
import { avisar } from "../../../services/avisos";

type TipoResumo =
  | "short"
  | "medium"
  | "detailed";

type Material = {
  id: string;
  title: string;
  status: string;
};

type Resumo = {
  id: string;
  summary_type: TipoResumo;
  content: string;
  created_at: string;
  updated_at: string;
};

type BlocoResumo =
  | {
      tipo: "titulo";
      texto: string;
    }
  | {
      tipo: "topico";
      texto: string;
    }
  | {
      tipo: "subtopico";
      texto: string;
    }
  | {
      tipo: "texto";
      texto: string;
    }
  | {
      tipo: "lista";
      texto: string;
    }
  | {
      tipo: "formula";
      texto: string;
    };

export default function ResumoMaterialScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [material, setMaterial] =
    useState<Material | null>(null);

  const [tipoResumo, setTipoResumo] =
    useState<TipoResumo>("medium");

  const [resumo, setResumo] =
    useState<Resumo | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [gerando, setGerando] =
    useState(false);

  const [
    iaHabilitada,
    setIaHabilitada,
  ] = useState(false);

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState<string | null>(
    null
  );

  const carregarDados =
    useCallback(async () => {
      try {
        setMensagemErro(null);

        if (!id) {
          setMensagemErro(
            "Apostila não encontrada."
          );
          return;
        }

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError || !user) {
          setMensagemErro(
            "Usuário não autenticado."
          );
          return;
        }

        const {
          data: materialData,
          error: materialError,
        } = await supabase
          .from("materials")
          .select(
            "id, title, status"
          )
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          materialError ||
          !materialData
        ) {
          console.log(
            "ERRO AO CARREGAR MATERIAL:",
            materialError
          );

          setMensagemErro(
            "Não foi possível carregar esta apostila."
          );

          return;
        }

        setMaterial(
          materialData as Material
        );

        const {
          data: configData,
          error: configError,
        } = await supabase
          .from("app_settings")
          .select("value")
          .eq(
            "key",
            "summary_ai_enabled"
          )
          .maybeSingle();

        if (configError) {
          console.log(
            "ERRO CONFIGURAÇÃO RESUMO:",
            configError
          );

          setIaHabilitada(false);
        } else {
          const valor =
            configData?.value;

          setIaHabilitada(
            valor === true ||
              valor === "true"
          );
        }

        const {
          data: resumoData,
          error: resumoError,
        } = await supabase
          .from("material_summaries")
          .select(
            `
            id,
            summary_type,
            content,
            created_at,
            updated_at
          `
          )
          .eq(
            "material_id",
            id
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "summary_type",
            tipoResumo
          )
          .maybeSingle();

        if (resumoError) {
          console.log(
            "ERRO AO CARREGAR RESUMO:",
            resumoError
          );

          setResumo(null);
        } else {
          setResumo(
            resumoData
              ? (resumoData as Resumo)
              : null
          );
        }
      } catch (error) {
        console.log(
          "ERRO INESPERADO NA TELA DE RESUMO:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao carregar o resumo."
        );
      } finally {
        setCarregando(false);
      }
    }, [id, tipoResumo]);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);

      carregarDados();
    }, [carregarDados])
  );

  const atualizar =
    async () => {
      try {
        setAtualizando(true);

        await carregarDados();
      } finally {
        setAtualizando(false);
      }
    };

  const selecionarTipo = (
    tipo: TipoResumo
  ) => {
    setTipoResumo(tipo);
  };

  const gerarResumo =
    async () => {
      if (!material) {
        return;
      }

      if (
        material.status !== "ready"
      ) {
        avisar(
          "Apostila ainda não preparada",
          "Esta apostila ainda precisa ser preparada para que a IA possa gerar o resumo."
        );

        return;
      }

      try {
        setGerando(true);

        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            "generate-summary",
            {
              body: {
                materialId:
                  material.id,

                summaryType:
                  tipoResumo,
              },
            }
          );

        if (error) {
          console.log(
            "ERRO GENERATE-SUMMARY:",
            error
          );

          let respostaErro: any =
            null;

          try {
            const contexto: any =
              (error as any).context;

            if (contexto) {
              const resposta =
                contexto.clone
                  ? contexto.clone()
                  : contexto;

              respostaErro =
                await resposta.json();
            }
          } catch {
            // Mantém o tratamento padrão.
          }

          if (
            respostaErro?.code ===
            "SUMMARY_AI_DISABLED"
          ) {
            setIaHabilitada(false);

            avisar(
              "Resumo com IA desativado",
              respostaErro?.error ||
                "A geração foi bloqueada pelo servidor. Nenhum crédito da API foi utilizado."
            );

            return;
          }

          if (
            respostaErro?.code ===
              "USAGE_LIMIT_REACHED" ||
            respostaErro?.reason ===
              "limit_reached"
          ) {
            avisar(
              "Limite de resumos atingido",
              respostaErro?.error ||
                "Você atingiu o limite de resumos disponível no seu plano atual. O EstudaIA Plus amplia esses limites."
            );

            return;
          }

          avisar(
            "Não foi possível gerar",
            respostaErro?.error ||
              respostaErro?.message ||
              error.message ||
              "Não foi possível gerar o resumo."
          );

          return;
        }

        if (
          data?.code ===
          "SUMMARY_AI_DISABLED"
        ) {
          setIaHabilitada(false);

          avisar(
            "Resumo com IA desativado",
            "A geração foi bloqueada pelo servidor. Nenhum crédito da API foi utilizado."
          );

          return;
        }

        if (
          data?.summary
        ) {
          setResumo(
            data.summary as Resumo
          );

          avisar(
            data.cached
              ? "Resumo carregado"
              : "Resumo gerado",
            data.cached
              ? "O resumo que já estava salvo foi carregado."
              : "O resumo foi gerado e salvo com sucesso."
          );

          return;
        }

        avisar(
          "Não foi possível gerar",
          data?.error ||
            "O servidor não retornou um resumo."
        );
      } catch (error) {
        console.log(
          "ERRO AO GERAR RESUMO:",
          error
        );

        avisar(
          "Erro",
          "Não foi possível comunicar com o servidor."
        );
      } finally {
        setGerando(false);
      }
    };

  const formatarData = (
    data: string
  ) => {
    try {
      return new Date(
        data
      ).toLocaleString(
        "pt-BR"
      );
    } catch {
      return data;
    }
  };

  /*
    Remove apenas os marcadores Markdown
    que não precisam aparecer visualmente.

    O conteúdo original salvo no Supabase
    permanece intacto.
  */
  const limparMarkdown = (
    texto: string
  ) => {
    return texto
      .replace(
        /🧮️?/g,
        ""
      )
      .replace(
        /\*\*(.*?)\*\*/g,
        "$1"
      )
      .replace(
        /__(.*?)__/g,
        "$1"
      )
      .replace(
        /`([^`]+)`/g,
        "$1"
      )
      .trim();
  };

  /*
    Converte o resumo salvo em blocos
    visuais.

    #     = título geral
    ##    = tópico principal
    ###   = subtópico
    - / • = item de lista
  */
  const processarResumo = (
    conteudo: string
  ): BlocoResumo[] => {
    const linhas =
      conteudo.split(/\r?\n/);

    const blocos:
      BlocoResumo[] = [];

    let paragrafo: string[] =
      [];

    const adicionarParagrafo =
      () => {
        if (
          paragrafo.length === 0
        ) {
          return;
        }

        const texto =
          limparMarkdown(
            paragrafo.join(" ")
          );

        if (texto) {
          blocos.push({
            tipo: "texto",
            texto,
          });
        }

        paragrafo = [];
      };

    const ehSeparador = (
      linha: string
    ) => {
      return /^-{3,}$/.test(
        linha
      );
    };

    const ehAbacoIsolado = (
      linha: string
    ) => {
      return (
        linha === "🧮" ||
        linha === "🧮️"
      );
    };

    const ehFormula = (
      linha: string
    ) => {
      const texto =
        limparMarkdown(linha);

      if (!texto.includes("=")) {
        return false;
      }

      const lados =
        texto.split("=");

      if (lados.length !== 2) {
        return false;
      }

      const esquerda =
        lados[0].trim();

      const direita =
        lados[1].trim();

      if (!esquerda || !direita) {
        return false;
      }

      /*
        Aceita variáveis curtas como:
        J, F, P, M, D, ip, ic, PV, FV, PMT.
      */
      if (
        !/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9_]{0,7}$/.test(
          esquerda
        )
      ) {
        return false;
      }

      /*
        Reconhece fórmulas simples e complexas,
        inclusive expoentes Unicode.
      */
      const temEstruturaMatematica =
        /[0-9()[\]{}×÷+\-−^/⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(
          direita
        );

      const quantidadePalavras =
        texto
          .split(/\s+/)
          .filter(Boolean).length;

      return (
        temEstruturaMatematica &&
        quantidadePalavras <= 24
      );
    };

    for (
      const linhaOriginal of linhas
    ) {
      const linha =
        linhaOriginal.trim();

      if (!linha) {
        adicionarParagrafo();
        continue;
      }

      if (
        ehSeparador(linha) ||
        ehAbacoIsolado(linha)
      ) {
        adicionarParagrafo();
        continue;
      }

      if (
        linha.startsWith(
          "#### "
        )
      ) {
        adicionarParagrafo();

        blocos.push({
          tipo: "subtopico",
          texto:
            limparMarkdown(
              linha.replace(
                /^####\s+/,
                ""
              )
            ),
        });

        continue;
      }

      if (
        linha.startsWith(
          "### "
        )
      ) {
        adicionarParagrafo();

        blocos.push({
          tipo: "subtopico",
          texto:
            limparMarkdown(
              linha.replace(
                /^###\s+/,
                ""
              )
            ),
        });

        continue;
      }

      if (
        linha.startsWith(
          "## "
        )
      ) {
        adicionarParagrafo();

        blocos.push({
          tipo: "topico",
          texto:
            limparMarkdown(
              linha.replace(
                /^##\s+/,
                ""
              )
            ),
        });

        continue;
      }

      if (
        linha.startsWith(
          "# "
        )
      ) {
        adicionarParagrafo();

        blocos.push({
          tipo: "titulo",
          texto:
            limparMarkdown(
              linha.replace(
                /^#\s+/,
                ""
              )
            ),
        });

        continue;
      }

      if (
        /^[-•]\s+/.test(
          linha
        )
      ) {
        adicionarParagrafo();

        blocos.push({
          tipo: "lista",
          texto:
            limparMarkdown(
              linha.replace(
                /^[-•]\s+/,
                ""
              )
            ),
        });

        continue;
      }

      if (
        linha.includes("🧮")
      ) {
        adicionarParagrafo();

        const textoSemAbaco =
          limparMarkdown(linha);

        if (textoSemAbaco) {
          blocos.push({
            tipo: "subtopico",
            texto: textoSemAbaco,
          });
        }

        continue;
      }

      if (
        ehFormula(linha)
      ) {
        adicionarParagrafo();

        blocos.push({
          tipo: "formula",
          texto:
            limparMarkdown(
              linha
            ),
        });

        continue;
      }

      paragrafo.push(linha);
    }

    adicionarParagrafo();

    return blocos;
  };

  const renderizarResumo = (
    conteudo: string
  ) => {
    const blocos =
      processarResumo(
        conteudo
      );

    return blocos.map(
      (bloco, index) => {
        if (
          bloco.tipo ===
          "titulo"
        ) {
          return (
            <View
              key={index}
              style={
                styles.tituloResumoBloco
              }
            >
              <Text
                style={
                  styles.tituloResumoTexto
                }
              >
                {bloco.texto}
              </Text>
            </View>
          );
        }

        if (
          bloco.tipo ===
          "topico"
        ) {
          return (
            <View
              key={index}
              style={
                styles.topicoCard
              }
            >
              <View
                style={
                  styles.topicoIndicador
                }
              />

              <Text
                style={
                  styles.topicoTexto
                }
              >
                {bloco.texto}
              </Text>
            </View>
          );
        }

        if (
          bloco.tipo ===
          "subtopico"
        ) {
          return (
            <View
              key={index}
              style={
                styles.subtopicoContainer
              }
            >
              <Text
                style={
                  styles.subtopicoTexto
                }
              >
                {bloco.texto}
              </Text>
            </View>
          );
        }

        if (
          bloco.tipo ===
          "formula"
        ) {
          return (
            <View
              key={index}
              style={
                styles.formulaCard
              }
            >
              <Text
                style={
                  styles.formulaLabel
                }
              >
                📟 FÓRMULA
              </Text>

              <Text
                style={
                  styles.formulaTexto
                }
              >
                {bloco.texto}
              </Text>
            </View>
          );
        }

        if (
          bloco.tipo ===
          "lista"
        ) {
          return (
            <View
              key={index}
              style={
                styles.listaLinha
              }
            >
              <View
                style={
                  styles.listaMarcador
                }
              />

              <Text
                style={
                  styles.listaTexto
                }
              >
                {bloco.texto}
              </Text>
            </View>
          );
        }

        return (
          <Text
            key={index}
            style={
              styles.paragrafoTexto
            }
          >
            {bloco.texto}
          </Text>
        );
      }
    );
  };

  if (carregando) {
    return (
      <SafeAreaView
        style={styles.centro}
        edges={["top"]}
      >
        <ActivityIndicator
          size="large"
          color="#1769D2"
        />

        <Text
          style={
            styles.carregandoTexto
          }
        >
          Carregando resumo...
        </Text>
      </SafeAreaView>
    );
  }

  if (
    mensagemErro ||
    !material
  ) {
    return (
      <SafeAreaView
        style={styles.erroTela}
        edges={["top"]}
      >
        <Text
          style={styles.erroIcone}
        >
          ⚠️
        </Text>

        <Text
          style={styles.erroTitulo}
        >
          Não foi possível abrir
          o resumo
        </Text>

        <Text
          style={styles.erroTexto}
        >
          {mensagemErro ||
            "Apostila não encontrada."}
        </Text>

        <Pressable
          style={styles.botaoVoltar}
          onPress={() =>
            voltar("/biblioteca")
          }
        >
          <Text
            style={
              styles.botaoVoltarTexto
            }
          >
            Voltar
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.tela}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.container
        }
        refreshControl={
          <RefreshControl
            refreshing={
              atualizando
            }
            onRefresh={atualizar}
          />
        }
      >
        <Pressable
          style={styles.voltarTopo}
          onPress={() =>
            voltar("/biblioteca")
          }
        >
          <Text
            style={
              styles.voltarTopoTexto
            }
          >
            ‹
          </Text>

          <Text
            style={
              styles.voltarTopoLabel
            }
          >
            Voltar
          </Text>
        </Pressable>

        <View style={styles.cabecalho}>
          <Text style={styles.etiqueta}>
            ESTUDAIA · RESUMO
          </Text>

          <Text
            style={styles.titulo}
            numberOfLines={2}
          >
            {material.title}
          </Text>

          <Text style={styles.subtitulo}>
            Resumo com IA
          </Text>
        </View>

        <View
          style={
            styles.materialCard
          }
        >
          <Text
            style={
              styles.materialLabel
            }
          >
            STATUS DA APOSTILA
          </Text>

          <Text
            style={
              styles.materialStatus
            }
          >
            {material.status ===
            "ready"
              ? "Preparada"
              : material.status ===
                  "processing"
                ? "Processando"
                : material.status ===
                    "error"
                  ? "Erro"
                  : "Aguardando preparação"}
          </Text>
        </View>

        <Text
          style={
            styles.secaoTitulo
          }
        >
          Tamanho do resumo
        </Text>

        <View
          style={
            styles.opcoesContainer
          }
        >
        <Pressable
          style={[
            styles.opcao,
            tipoResumo ===
              "short" &&
              styles.opcaoAtiva,
          ]}
          onPress={() =>
            selecionarTipo(
              "short"
            )
          }
        >
          <Text
            style={
              styles.opcaoIcone
            }
          >
            ⚡
          </Text>

          <Text
            style={[
              styles.opcaoTitulo,
              tipoResumo ===
                "short" &&
                styles.opcaoTituloAtivo,
            ]}
          >
            Curto
          </Text>

          <Text
            style={
              styles.opcaoDescricao
            }
          >
            Pontos principais
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.opcao,
            tipoResumo ===
              "medium" &&
              styles.opcaoAtiva,
          ]}
          onPress={() =>
            selecionarTipo(
              "medium"
            )
          }
        >
          <Text
            style={
              styles.opcaoIcone
            }
          >
            📄
          </Text>

          <Text
            style={[
              styles.opcaoTitulo,
              tipoResumo ===
                "medium" &&
                styles.opcaoTituloAtivo,
            ]}
          >
            Médio
          </Text>

          <Text
            style={
              styles.opcaoDescricao
            }
          >
            Equilibrado
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.opcao,
            tipoResumo ===
              "detailed" &&
              styles.opcaoAtiva,
          ]}
          onPress={() =>
            selecionarTipo(
              "detailed"
            )
          }
        >
          <Text
            style={
              styles.opcaoIcone
            }
          >
            📚
          </Text>

          <Text
            style={[
              styles.opcaoTitulo,
              tipoResumo ===
                "detailed" &&
                styles.opcaoTituloAtivo,
            ]}
          >
            Detalhado
          </Text>

          <Text
            style={
              styles.opcaoDescricao
            }
          >
            Mais completo
          </Text>
        </Pressable>
        </View>

        {material.status !==
        "ready" ? (
          <View
            style={
              styles.avisoMaterial
            }
          >
          <Text
            style={
              styles.avisoMaterialTitulo
            }
          >
            ⏳ Apostila ainda não
            preparada
          </Text>

          <Text
            style={
              styles.avisoMaterialTexto
            }
          >
            Você já pode visualizar
            esta tela, mas a geração
            pela IA ficará disponível
            somente depois que a
            apostila for preparada.
          </Text>
          </View>
        ) : null}

        {!iaHabilitada ? (
          <View
            style={styles.avisoIA}
          >
          <Text
            style={
              styles.avisoIATitulo
            }
          >
            🔒 Geração pela IA
            desativada
          </Text>

          <Text
            style={
              styles.avisoIATexto
            }
          >
            O recurso está preparado,
            porém nenhuma chamada para
            a API será feita neste
            momento.
          </Text>
          </View>
        ) : (
          <View
            style={
              styles.avisoIAAtiva
            }
          >
          <Text
            style={
              styles.avisoIAAtivaTitulo
            }
          >
            ✅ Resumo com IA
            habilitado
          </Text>
          </View>
        )}

        <Pressable
          style={[
            styles.botaoGerar,
            (gerando ||
              !iaHabilitada ||
              material.status !==
                "ready") &&
              styles.botaoGerarDesativado,
          ]}
          onPress={gerarResumo}
          disabled={
            gerando ||
            !iaHabilitada ||
            material.status !==
              "ready"
          }
        >
        {gerando ? (
          <View
            style={
              styles.botaoGerarLinha
            }
          >
            <ActivityIndicator />

            <Text
              style={
                styles.botaoGerarTexto
              }
            >
              Preparando...
            </Text>
          </View>
        ) : (
          <Text
            style={
              styles.botaoGerarTexto
            }
          >
            ✨ Gerar resumo
          </Text>
        )}
        </Pressable>

        <View
          style={styles.resumoCard}
        >
        <Text
          style={
            styles.resumoTitulo
          }
        >
          {tipoResumo ===
          "short"
            ? "Resumo curto"
            : tipoResumo ===
                "detailed"
              ? "Resumo detalhado"
              : "Resumo médio"}
        </Text>

        {resumo ? (
          <>
            <View
              style={
                styles.resumoConteudoContainer
              }
            >
              {renderizarResumo(
                resumo.content
              )}
            </View>

            <Text
              style={
                styles.resumoData
              }
            >
              Atualizado em{" "}
              {formatarData(
                resumo.updated_at
              )}
            </Text>
          </>
        ) : (
          <View
            style={
              styles.vazioContainer
            }
          >
            <Text
              style={
                styles.vazioIcone
              }
            >
              📝
            </Text>

            <Text
              style={
                styles.vazioTitulo
              }
            >
              Nenhum resumo gerado
            </Text>

            <Text
              style={
                styles.vazioTexto
              }
            >
              Quando a geração pela IA
              estiver disponível, o
              resumo desta apostila
              aparecerá aqui.
            </Text>
          </View>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: "#F3F7FC",
    },

    scroll: {
      flex: 1,
    },

    container: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
    },

    centro: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F3F7FC",
    },

    carregandoTexto: {
      marginTop: 14,
      color: "#64748B",
      fontSize: 15,
    },

    voltarTopo: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      minHeight: 40,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 18,
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#E5EDF7",
    },

    voltarTopoTexto: {
      fontSize: 28,
      lineHeight: 30,
      fontWeight: "500",
      color: "#1769D2",
    },

    voltarTopoLabel: {
      marginLeft: 5,
      fontSize: 14,
      fontWeight: "700",
      color: "#1769D2",
    },

    cabecalho: {
      marginBottom: 18,
    },

    etiqueta: {
      marginBottom: 7,
      color: "#1769D2",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1,
    },

    titulo: {
      fontSize: 25,
      lineHeight: 32,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: "#172B4D",
    },

    subtitulo: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: "#64748B",
    },

    materialCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      padding: 16,
      marginBottom: 22,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    materialLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: "#64748B",
    },

    materialStatus: {
      alignSelf: "flex-start",
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: "#E8F1FF",
      fontSize: 13,
      fontWeight: "700",
      color: "#1769D2",
    },

    secaoTitulo: {
      marginBottom: 10,
      fontSize: 16,
      fontWeight: "800",
      color: "#172B4D",
    },

    opcoesContainer: {
      flexDirection: "row",
      gap: 9,
      marginBottom: 22,
    },

    opcao: {
      flex: 1,
      minWidth: 0,
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 6,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E5EDF7",
    },

    opcaoAtiva: {
      borderColor: "#1769D2",
      backgroundColor: "#E8F1FF",
    },

    opcaoIcone: {
      fontSize: 21,
      marginBottom: 6,
    },

    opcaoTitulo: {
      fontSize: 14,
      fontWeight: "800",
      color: "#526078",
    },

    opcaoTituloAtivo: {
      color: "#1456A0",
    },

    opcaoDescricao: {
      marginTop: 3,
      fontSize: 11,
      textAlign: "center",
      color: "#64748B",
    },

    avisoMaterial: {
      backgroundColor: "#FFF8E7",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#F5D98C",
    },

    avisoMaterialTitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#92400E",
    },

    avisoMaterialTexto: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: "#78350F",
    },

    avisoIA: {
      backgroundColor: "#F1F5F9",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
    },

    avisoIATitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#4B5563",
    },

    avisoIATexto: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: "#64748B",
    },

    avisoIAAtiva: {
      backgroundColor: "#ECFDF5",
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
    },

    avisoIAAtivaTitulo: {
      fontSize: 15,
      fontWeight: "800",
      color: "#166534",
    },

    botaoGerar: {
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: "#1769D2",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 22,
      shadowColor: "#1456A0",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 3,
    },

    botaoGerarDesativado: {
      backgroundColor: "#A9BDD5",
      shadowOpacity: 0,
      elevation: 0,
    },

    botaoGerarLinha: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    botaoGerarTexto: {
      fontSize: 16,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    resumoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#E5EDF7",
      padding: 18,
      shadowColor: "#1E3A5F",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },

    resumoTitulo: {
      fontSize: 18,
      fontWeight: "800",
      color: "#172B4D",
      marginBottom: 18,
    },

    resumoConteudoContainer: {
      width: "100%",
    },

    tituloResumoBloco: {
      backgroundColor: "#1456A0",
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      marginBottom: 20,
    },

    tituloResumoTexto: {
      color: "#FFFFFF",
      fontSize: 20,
      lineHeight: 28,
      fontWeight: "800",
    },

    topicoCard: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: "#E8F1FF",
      borderRadius: 15,
      borderWidth: 1,
      borderColor: "#D8E7FA",
      marginTop: 18,
      marginBottom: 14,
      overflow: "hidden",
    },

    topicoIndicador: {
      width: 4,
      backgroundColor: "#1769D2",
    },

    topicoTexto: {
      flex: 1,
      paddingVertical: 15,
      paddingHorizontal: 14,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: "800",
      color: "#1456A0",
    },

    subtopicoContainer: {
      marginTop: 10,
      marginBottom: 10,
      paddingBottom: 9,
      borderBottomWidth: 1,
      borderBottomColor: "#E5EDF7",
    },

    subtopicoTexto: {
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "800",
      color: "#172B4D",
    },

    formulaCard: {
      backgroundColor: "#F8FBFF",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#C8DDF8",
      paddingVertical: 15,
      paddingHorizontal: 16,
      marginTop: 6,
      marginBottom: 16,
    },

    formulaLabel: {
      fontSize: 12,
      fontWeight: "900",
      color: "#1769D2",
      marginBottom: 8,
    },

    formulaTexto: {
      fontSize: 17,
      lineHeight: 25,
      fontWeight: "800",
      color: "#172B4D",
    },

    paragrafoTexto: {
      fontSize: 15,
      lineHeight: 25,
      color: "#334155",
      marginBottom: 14,
      padding: 12,
      backgroundColor: "#F8FBFF",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#F1F5F9",
    },

    listaLinha: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 10,
      paddingRight: 4,
    },

    listaMarcador: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#1769D2",
      marginTop: 8,
      marginRight: 10,
    },

    listaTexto: {
      flex: 1,
      fontSize: 15,
      lineHeight: 24,
      color: "#334155",
    },

    resumoData: {
      marginTop: 22,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: "#E5EDF7",
      fontSize: 12,
      color: "#64748B",
    },

    vazioContainer: {
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 14,
    },

    vazioIcone: {
      fontSize: 38,
    },

    vazioTitulo: {
      marginTop: 10,
      fontSize: 16,
      fontWeight: "800",
      color: "#172B4D",
    },

    vazioTexto: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: "#64748B",
    },

    erroTela: {
      flex: 1,
      justifyContent:
        "center",
      alignItems: "center",
      padding: 24,
      backgroundColor: "#F3F7FC",
    },

    erroIcone: {
      fontSize: 42,
    },

    erroTitulo: {
      marginTop: 12,
      fontSize: 20,
      fontWeight: "800",
      color: "#172B4D",
      textAlign: "center",
    },

    erroTexto: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: "#64748B",
      textAlign: "center",
    },

    botaoVoltar: {
      marginTop: 20,
      borderRadius: 14,
      paddingHorizontal: 28,
      paddingVertical: 14,
      backgroundColor: "#1769D2",
    },

    botaoVoltarTexto: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
  });