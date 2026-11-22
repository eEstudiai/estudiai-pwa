import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { supabase } from "../../../services/supabase";

type Material = {
  id: string;
  title: string;
  status: string;
};

type TipoNo =
  | "topic"
  | "concept"
  | "rule"
  | "formula"
  | "deadline"
  | "exception"
  | "comparison"
  | "process"
  | "warning"
  | "data"
  | string;

type Importancia =
  | "high"
  | "medium"
  | "low"
  | string;

type NoMapa = {
  id: string;
  title: string;
  summary?: string;
  type?: TipoNo;
  importance?: Importancia;
  source_pages?: number[];
  children?: NoMapa[];
};

type ConteudoMapa = {
  version?: number;
  title: string;
  description?: string;
  nodes: NoMapa[];
};

type MapaMental = {
  id: string;
  title: string | null;
  content: unknown;
  created_at: string;
  updated_at: string;
};

export default function MapaMentalScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const [material, setMaterial] =
    useState<Material | null>(null);

  const [mapa, setMapa] =
    useState<MapaMental | null>(null);

  const [iaHabilitada, setIaHabilitada] =
    useState(false);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [gerando, setGerando] =
    useState(false);

  const [mensagemErro, setMensagemErro] =
    useState<string | null>(null);

  const [expandidos, setExpandidos] =
    useState<Set<string>>(new Set());

  const normalizarNo = (
    valor: unknown,
    indice: number
  ): NoMapa | null => {
    if (
      !valor ||
      typeof valor !== "object" ||
      Array.isArray(valor)
    ) {
      return null;
    }

    const objeto =
      valor as Record<string, unknown>;

    const titulo =
      typeof objeto.title === "string"
        ? objeto.title.trim()
        : "";

    if (!titulo) {
      return null;
    }

    const identificador =
      typeof objeto.id === "string" &&
      objeto.id.trim()
        ? objeto.id
        : `no-${indice}`;

    const resumo =
      typeof objeto.summary === "string"
        ? objeto.summary
        : "";

    const tipo =
      typeof objeto.type === "string"
        ? objeto.type
        : "concept";

    const importancia =
      typeof objeto.importance === "string"
        ? objeto.importance
        : "medium";

    const paginas =
      Array.isArray(objeto.source_pages)
        ? objeto.source_pages.filter(
            (
              pagina
            ): pagina is number =>
              typeof pagina === "number" &&
              Number.isFinite(pagina)
          )
        : [];

    const filhosOriginais =
      Array.isArray(objeto.children)
        ? objeto.children
        : [];

    const filhos =
      filhosOriginais
        .map((filho, i) =>
          normalizarNo(filho, i)
        )
        .filter(
          (
            filho
          ): filho is NoMapa =>
            filho !== null
        );

    return {
      id: identificador,
      title: titulo,
      summary: resumo,
      type: tipo,
      importance: importancia,
      source_pages: paginas,
      children: filhos,
    };
  };

  const normalizarConteudo = (
    valor: unknown
  ): ConteudoMapa | null => {
    if (
      !valor ||
      typeof valor !== "object" ||
      Array.isArray(valor)
    ) {
      return null;
    }

    const objeto =
      valor as Record<string, unknown>;

    const titulo =
      typeof objeto.title === "string"
        ? objeto.title.trim()
        : "";

    const descricao =
      typeof objeto.description === "string"
        ? objeto.description
        : "";

    if (
      !titulo ||
      !Array.isArray(objeto.nodes)
    ) {
      return null;
    }

    const nos =
      objeto.nodes
        .map((no, index) =>
          normalizarNo(no, index)
        )
        .filter(
          (
            no
          ): no is NoMapa =>
            no !== null
        );

    return {
      version:
        typeof objeto.version === "number"
          ? objeto.version
          : 1,
      title: titulo,
      description: descricao,
      nodes: nos,
    };
  };

  const carregarDados =
    useCallback(async () => {
      try {
        setMensagemErro(null);

        if (!id) {
          setMensagemErro(
            "Material não encontrado."
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
          .select(`
            id,
            title,
            status
          `)
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
          data: configuracaoData,
          error: configuracaoError,
        } = await supabase
          .from("app_settings")
          .select("value")
          .eq(
            "key",
            "mindmap_ai_enabled"
          )
          .maybeSingle();

        if (configuracaoError) {
          console.log(
            "ERRO CONFIGURAÇÃO MAPA:",
            configuracaoError
          );

          setIaHabilitada(false);
        } else {
          setIaHabilitada(
            configuracaoData?.value ===
              "true"
          );
        }

        const {
          data: mapaData,
          error: mapaError,
        } = await supabase
          .from("material_mindmaps")
          .select(`
            id,
            title,
            content,
            created_at,
            updated_at
          `)
          .eq("material_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (mapaError) {
          console.log(
            "ERRO AO CARREGAR MAPA:",
            mapaError
          );

          setMensagemErro(
            "Não foi possível carregar o mapa mental."
          );
          return;
        }

        setMapa(
          mapaData as MapaMental | null
        );
      } catch (error) {
        console.log(
          "ERRO INESPERADO NO MAPA:",
          error
        );

        setMensagemErro(
          "Ocorreu um erro ao carregar o mapa mental."
        );
      } finally {
        setCarregando(false);
      }
    }, [id]);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      carregarDados();
    }, [carregarDados])
  );

  const atualizar = async () => {
    try {
      setAtualizando(true);
      await carregarDados();
    } finally {
      setAtualizando(false);
    }
  };

  const gerarMapaMental = async () => {
    if (!id || !material) {
      return;
    }

    if (!iaHabilitada) {
      Alert.alert(
        "IA desativada",
        "A geração de mapa mental por IA está temporariamente desativada."
      );
      return;
    }

    if (material.status !== "ready") {
      Alert.alert(
        "Apostila não preparada",
        "Prepare esta apostila para estudo antes de gerar o mapa mental."
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
          "generate-mindmap",
          {
            body: {
              materialId: id,
            },
          }
        );

      if (error) {
        console.log(
          "ERRO GENERATE-MINDMAP:",
          error
        );

        let mensagem =
          "Não foi possível gerar o mapa mental.";

        try {
          const contexto =
            (error as any)
              ?.context;

          if (
            contexto &&
            typeof contexto.json ===
              "function"
          ) {
            const corpo =
              await contexto.json();

            if (
              corpo?.error &&
              typeof corpo.error ===
                "string"
            ) {
              mensagem =
                corpo.error;
            }
          }
        } catch (
          erroLeitura
        ) {
          console.log(
            "ERRO AO LER RESPOSTA:",
            erroLeitura
          );
        }

        Alert.alert(
          "Erro ao gerar mapa",
          mensagem
        );

        return;
      }

      if (
        data &&
        data.ok === false
      ) {
        Alert.alert(
          "Erro ao gerar mapa",
          data.error ||
            "Não foi possível gerar o mapa mental."
        );

        return;
      }

      setExpandidos(
        new Set()
      );

      await carregarDados();

      Alert.alert(
        "Mapa mental criado",
        "O mapa mental foi gerado e salvo com sucesso."
      );
    } catch (error) {
      console.log(
        "ERRO INESPERADO AO GERAR MAPA:",
        error
      );

      Alert.alert(
        "Erro",
        "Ocorreu um erro inesperado ao gerar o mapa mental."
      );
    } finally {
      setGerando(false);
    }
  };

  const conteudo =
    useMemo(
      () =>
        mapa
          ? normalizarConteudo(
              mapa.content
            )
          : null,
      [mapa]
    );

  const alternarNo = (
    idNo: string
  ) => {
    setExpandidos(
      (anteriores) => {
        const novos =
          new Set(anteriores);

        if (novos.has(idNo)) {
          novos.delete(idNo);
        } else {
          novos.add(idNo);
        }

        return novos;
      }
    );
  };

  const expandirTudo = () => {
    if (!conteudo) {
      return;
    }

    const ids =
      new Set<string>();

    const percorrer = (
      nos: NoMapa[]
    ) => {
      nos.forEach((no) => {
        if (
          no.children &&
          no.children.length > 0
        ) {
          ids.add(no.id);
          percorrer(
            no.children
          );
        }
      });
    };

    percorrer(
      conteudo.nodes
    );

    setExpandidos(ids);
  };

  const recolherTudo = () => {
    setExpandidos(
      new Set()
    );
  };

  const obterTipo = (
    tipo?: TipoNo
  ) => {
    switch (tipo) {
      case "topic":
        return {
          icone: "📚",
          texto: "Tópico",
        };

      case "concept":
        return {
          icone: "💡",
          texto: "Conceito",
        };

      case "rule":
        return {
          icone: "📌",
          texto: "Regra",
        };

      case "formula":
        return {
          icone: "🧮",
          texto: "Fórmula",
        };

      case "deadline":
        return {
          icone: "⏱️",
          texto: "Prazo",
        };

      case "exception":
        return {
          icone: "↪️",
          texto: "Exceção",
        };

      case "comparison":
        return {
          icone: "⚖️",
          texto: "Comparação",
        };

      case "process":
        return {
          icone: "➡️",
          texto: "Processo",
        };

      case "warning":
        return {
          icone: "⚠️",
          texto: "Atenção",
        };

      case "data":
        return {
          icone: "📊",
          texto: "Dado",
        };

      default:
        return {
          icone: "•",
          texto: "Informação",
        };
    }
  };

  const obterImportancia = (
    importancia?: Importancia
  ) => {
    switch (importancia) {
      case "high":
        return "⭐ Importante";

      case "medium":
        return "Relevante";

      case "low":
        return "Complementar";

      default:
        return null;
    }
  };

  const formatarPaginas = (
    paginas?: number[]
  ) => {
    if (
      !paginas ||
      paginas.length === 0
    ) {
      return null;
    }

    if (paginas.length === 1) {
      return `Página ${paginas[0]}`;
    }

    return `Páginas ${paginas.join(
      ", "
    )}`;
  };

  const legendaDinamica =
    useMemo(() => {
      if (!conteudo) {
        return {
          tipos: [] as TipoNo[],
          temAltaImportancia: false,
        };
      }

      const tipos =
        new Set<TipoNo>();

      let temAltaImportancia =
        false;

      const percorrer = (
        nos: NoMapa[]
      ) => {
        nos.forEach((no) => {
          if (
            no.type &&
            no.type !== "topic" &&
            no.type !== "concept"
          ) {
            tipos.add(no.type);
          }

          if (
            no.importance === "high"
          ) {
            temAltaImportancia =
              true;
          }

          if (
            no.children &&
            no.children.length > 0
          ) {
            percorrer(
              no.children
            );
          }
        });
      };

      percorrer(
        conteudo.nodes
      );

      return {
        tipos:
          Array.from(tipos),
        temAltaImportancia,
      };
    }, [conteudo]);

  const ordemLegenda: TipoNo[] = [
    "rule",
    "formula",
    "warning",
    "comparison",
    "process",
    "deadline",
    "exception",
    "data",
  ];

  const itensLegenda =
    ordemLegenda
      .filter((tipo) =>
        legendaDinamica.tipos.includes(
          tipo
        )
      )
      .map((tipo) => {
        const info =
          obterTipo(tipo);

        return `${info.icone} ${info.texto}`;
      });

  const renderizarNo = (
    no: NoMapa,
    nivel: number,
    caminho: string
  ): React.ReactNode => {
    const filhos =
      no.children || [];

    const possuiFilhos =
      filhos.length > 0;

    const chaveNo =
      `${caminho}-${no.id}`;

    const aberto =
      expandidos.has(no.id);

    const tipo =
      obterTipo(no.type);

    const importancia =
      obterImportancia(
        no.importance
      );

    const paginas =
      formatarPaginas(
        no.source_pages
      );

    return (
      <View
        key={chaveNo}
        style={[
          styles.noWrapper,
          nivel > 0 && {
            marginLeft:
              Math.min(
                nivel * 12,
                36
              ),
          },
        ]}
      >
        <Pressable
          style={[
            styles.noCard,
            nivel === 0
              ? styles.noPrincipal
              : styles.noSecundario,
            no.type ===
              "formula" &&
              styles.noFormula,
            no.type ===
              "warning" &&
              styles.noAlerta,
          ]}
          onPress={() => {
            if (possuiFilhos) {
              alternarNo(no.id);
            }
          }}
        >
          <View
            style={styles.noTopo}
          >
            <View
              style={
                styles.noTituloArea
              }
            >
              <Text
                style={
                  styles.tipoIcone
                }
              >
                {tipo.icone}
              </Text>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={[
                    styles.noTitulo,
                    nivel === 0 &&
                      styles.noTituloPrincipal,
                  ]}
                >
                  {no.title}
                </Text>

                <Text
                  style={
                    styles.tipoTexto
                  }
                >
                  {tipo.texto}
                </Text>
              </View>
            </View>

            {possuiFilhos ? (
              <View
                style={
                  styles.expandirBotao
                }
              >
                <Text
                  style={
                    styles.expandirTexto
                  }
                >
                  {aberto
                    ? "−"
                    : "+"}
                </Text>
              </View>
            ) : null}
          </View>

          {no.summary ? (
            <Text
              style={
                styles.resumoNo
              }
            >
              {no.summary}
            </Text>
          ) : null}

          {(importancia ||
            paginas) && (
            <View
              style={
                styles.metadados
              }
            >
              {importancia ? (
                <View
                  style={
                    styles.badgeImportancia
                  }
                >
                  <Text
                    style={
                      styles.badgeImportanciaTexto
                    }
                  >
                    {importancia}
                  </Text>
                </View>
              ) : null}

              {paginas ? (
                <View
                  style={
                    styles.badgePagina
                  }
                >
                  <Text
                    style={
                      styles.badgePaginaTexto
                    }
                  >
                    📖 {paginas}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </Pressable>

        {possuiFilhos &&
        aberto ? (
          <View
            style={
              styles.filhosArea
            }
          >
            {filhos.map(
              (
                filho,
                index
              ) =>
                renderizarNo(
                  filho,
                  nivel + 1,
                  `${chaveNo}-${index}`
                )
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderizarRamoVisual = (
    no: NoMapa,
    index: number
  ): React.ReactNode => {
    const filhos = no.children || [];
    const possuiFilhos = filhos.length > 0;
    const aberto = expandidos.has(no.id);
    const tipo = obterTipo(no.type);
    const importancia = obterImportancia(no.importance);
    const paginas = formatarPaginas(no.source_pages);

    return (
      <View key={`ramo-${index}-${no.id}`} style={styles.ramoVisual}>
        <View style={styles.linhaCentralVertical} />
        <Pressable style={styles.ramoPrincipalCard} onPress={() => { if (possuiFilhos) alternarNo(no.id); }}>
          <View style={styles.ramoPrincipalTopo}>
            <Text style={styles.ramoPrincipalIcone}>{tipo.icone}</Text>
            <View style={styles.ramoPrincipalTextoArea}>
              <Text style={styles.ramoPrincipalTitulo}>{no.title}</Text>
              <Text style={styles.ramoPrincipalTipo}>{tipo.texto}</Text>
            </View>
            {possuiFilhos ? <View style={styles.ramoExpandirBotao}><Text style={styles.ramoExpandirTexto}>{aberto ? "−" : "+"}</Text></View> : null}
          </View>
          {no.summary ? <Text style={styles.ramoPrincipalResumo}>{no.summary}</Text> : null}
          {(importancia || paginas) ? <View style={styles.metadados}>
            {importancia ? <View style={styles.badgeImportancia}><Text style={styles.badgeImportanciaTexto}>{importancia}</Text></View> : null}
            {paginas ? <View style={styles.badgePagina}><Text style={styles.badgePaginaTexto}>📖 {paginas}</Text></View> : null}
          </View> : null}
        </Pressable>
        {possuiFilhos && aberto ? <View style={styles.subRamosArea}>
          <View style={styles.conectorVertical} />
          {filhos.map((filho, filhoIndex) => (
            <View
              key={`subramo-${no.id}-${filho.id}-${filhoIndex}`}
              style={styles.subRamoVertical}
            >
              <View style={styles.subRamoLinhaVertical} />
              <View style={styles.subRamoLinhaHorizontal} />
              <View style={styles.subRamoConteudo}>
                {renderizarNo(
                  filho,
                  1,
                  `visual-${index}-${filhoIndex}`
                )}
              </View>
            </View>
          ))}
        </View> : null}
      </View>
    );
  };

  if (carregando) {
    return (
      <View
        style={styles.centro}
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.carregandoTexto
          }
        >
          Carregando mapa mental...
        </Text>
      </View>
    );
  }

  if (
    mensagemErro ||
    !material
  ) {
    return (
      <View
        style={styles.erroTela}
      >
        <Text
          style={
            styles.erroIcone
          }
        >
          ⚠️
        </Text>

        <Text
          style={
            styles.erroTitulo
          }
        >
          Não foi possível abrir
          o mapa mental
        </Text>

        <Text
          style={
            styles.erroTexto
          }
        >
          {mensagemErro ||
            "Material não encontrado."}
        </Text>

        <Pressable
          style={
            styles.botaoVoltar
          }
          onPress={() =>
            router.back()
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
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={
        styles.container
      }
      refreshControl={
        <RefreshControl
          refreshing={
            atualizando
          }
          onRefresh={
            atualizar
          }
        />
      }
    >
      <Pressable
        style={
          styles.voltarTopo
        }
        onPress={() =>
          router.back()
        }
      >
        <Text
          style={
            styles.voltarTopoTexto
          }
        >
          ← Voltar
        </Text>
      </Pressable>

      <Text
        style={styles.titulo}
      >
        🧠 Mapa Mental
      </Text>

      <Text
        style={styles.subtitulo}
      >
        Explore os conceitos
        principais e suas
        relações.
      </Text>

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
          MATERIAL
        </Text>

        <Text
          style={
            styles.materialTitulo
          }
        >
          {material.title}
        </Text>
      </View>

      {mapa && conteudo ? (
        <>
          <View
            style={
              styles.cabecalhoMapa
            }
          >
            <View
              style={
                styles.temaCentralIcone
              }
            >
              <Text
                style={
                  styles.temaCentralEmoji
                }
              >
                🧠
              </Text>
            </View>

            <Text
              style={
                styles.temaCentralTitulo
              }
            >
              {conteudo.title}
            </Text>

            {conteudo.description ? (
              <Text
                style={
                  styles.temaCentralDescricao
                }
              >
                {conteudo.description}
              </Text>
            ) : null}

            <View
              style={
                styles.salvoBadge
              }
            >
              <Text
                style={
                  styles.salvoTexto
                }
              >
                ✓ Mapa salvo
              </Text>
            </View>
          </View>

          <View
            style={
              styles.controles
            }
          >
            <Pressable
              style={
                styles.controleBotao
              }
              onPress={
                expandirTudo
              }
            >
              <Text
                style={
                  styles.controleTexto
                }
              >
                ＋ Expandir tudo
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.controleBotao
              }
              onPress={
                recolherTudo
              }
            >
              <Text
                style={
                  styles.controleTexto
                }
              >
                − Recolher tudo
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitulo}>
              💡 Como usar
            </Text>
            <Text style={styles.infoTexto}>
              Toque no + de um tópico para abrir seus conceitos e subtópicos. Use Expandir tudo para visualizar o mapa completo.
            </Text>
          </View>

          {(itensLegenda.length > 0 ||
            legendaDinamica.temAltaImportancia) ? (
            <View style={styles.legendaCard}>
              <Text style={styles.legendaTitulo}>
                Legenda
              </Text>

              {itensLegenda.length > 0 ? (
                <View style={styles.legendaItens}>
                  {itensLegenda.map((item) => (
                    <View
                      key={item}
                      style={styles.legendaItem}
                    >
                      <Text style={styles.legendaTexto}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {legendaDinamica.temAltaImportancia ? (
                <Text style={styles.legendaImportancia}>
                  ⭐ Alta importância para estudo
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.secaoTitulo}>Mapa visual</Text>
          <Text style={styles.mapaInstrucao}>Toque em um ramo para visualizar seus conceitos.</Text>
          <View style={styles.mapaVisualArea}>
            <View style={styles.temaCentralMini}>
              <Text style={styles.temaCentralMiniIcone}>🧠</Text>
              <Text style={styles.temaCentralMiniTitulo}>{conteudo.title}</Text>
              <Text style={styles.temaCentralMiniLegenda}>TEMA CENTRAL</Text>
            </View>
            <View style={styles.troncoCentral} />
            {conteudo.nodes.map((no, index) => renderizarRamoVisual(no, index))}
          </View>




        </>
      ) : (
        <>
          <View
            style={
              styles.vazioCard
            }
          >
            <Text
              style={
                styles.vazioIcone
              }
            >
              🧠
            </Text>

            <Text
              style={
                styles.vazioTitulo
              }
            >
              Nenhum mapa mental
              disponível
            </Text>

            <Text
              style={
                styles.vazioTexto
              }
            >
              O mapa mental desta
              apostila ainda não foi
              gerado.
            </Text>
          </View>

          {iaHabilitada ? (
            <>
              <View
                style={
                  styles.iaHabilitada
                }
              >
                <Text
                  style={
                    styles.iaHabilitadaTexto
                  }
                >
                  ✅ Mapa mental com IA habilitado
                </Text>
              </View>

              <Pressable
                style={[
                  styles.botaoGerar,
                  gerando &&
                    styles.botaoGerarDesabilitado,
                ]}
                disabled={gerando}
                onPress={
                  gerarMapaMental
                }
              >
                {gerando ? (
                  <>
                    <ActivityIndicator
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.botaoGerarTexto
                      }
                    >
                      Gerando mapa mental...
                    </Text>
                  </>
                ) : (
                  <Text
                    style={
                      styles.botaoGerarTexto
                    }
                  >
                    🧠 Gerar mapa mental
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <View
              style={
                styles.iaDesativada
              }
            >
              <Text
                style={
                  styles.iaDesativadaTexto
                }
              >
                Geração por IA
                temporariamente
                desativada.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor:
        "#F7F8FA",
    },

    container: {
      padding: 24,
      paddingTop: 55,
      paddingBottom: 110,
    },

    centro: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F7F8FA",
    },

    carregandoTexto: {
      marginTop: 14,
      fontSize: 15,
      color: "#6B7280",
    },

    voltarTopo: {
      alignSelf:
        "flex-start",
      paddingVertical: 8,
      marginBottom: 10,
    },

    voltarTopoTexto: {
      fontSize: 16,
      fontWeight: "700",
      color: "#374151",
    },

    titulo: {
      fontSize: 28,
      fontWeight: "900",
      color: "#111827",
    },

    subtitulo: {
      marginTop: 6,
      marginBottom: 20,
      fontSize: 15,
      lineHeight: 22,
      color: "#6B7280",
    },

    materialCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
    },

    materialLabel: {
      fontSize: 11,
      fontWeight: "900",
      color: "#9CA3AF",
    },

    materialTitulo: {
      marginTop: 6,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "800",
      color: "#111827",
    },

    cabecalhoMapa: {
      backgroundColor:
        "#2563EB",
      borderRadius: 22,
      padding: 22,
      alignItems: "center",
      marginBottom: 12,
    },

    temaCentralIcone: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor:
        "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 10,
    },

    temaCentralEmoji: {
      fontSize: 28,
    },

    temaCentralTitulo: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "900",
      color: "#FFFFFF",
      textAlign: "center",
    },

    temaCentralDescricao: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color: "#DBEAFE",
      textAlign: "center",
    },

    salvoBadge: {
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    salvoTexto: {
      fontSize: 11,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    controles: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 22,
    },

    controleBotao: {
      flex: 1,
      minHeight: 44,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 13,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 8,
    },

    controleTexto: {
      fontSize: 12,
      fontWeight: "800",
      color: "#2563EB",
      textAlign: "center",
    },

    secaoTitulo: {
      fontSize: 19,
      fontWeight: "900",
      color: "#111827",
      marginBottom: 12,
    },

    mapaArea: {
      marginBottom: 16,
    },

    mapaInstrucao: { marginTop: -4, marginBottom: 14, fontSize: 12, lineHeight: 18, color: "#6B7280" },
    mapaVisualArea: { backgroundColor: "#FFFFFF", borderRadius: 22, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 20, marginBottom: 16, overflow: "hidden" },
    temaCentralMini: { alignSelf: "center", width: "88%", backgroundColor: "#1D4ED8", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15, alignItems: "center" },
    temaCentralMiniIcone: { fontSize: 24, marginBottom: 5 },
    temaCentralMiniTitulo: { fontSize: 17, lineHeight: 22, fontWeight: "900", color: "#FFFFFF", textAlign: "center" },
    temaCentralMiniLegenda: { marginTop: 5, fontSize: 9, fontWeight: "900", color: "#BFDBFE", letterSpacing: 1 },
    troncoCentral: { alignSelf: "center", width: 3, height: 18, backgroundColor: "#93C5FD" },
    ramoVisual: { position: "relative", paddingTop: 8, marginBottom: 16 },
    linhaCentralVertical: { position: "absolute", top: 0, left: "50%", width: 3, height: 10, marginLeft: -1.5, backgroundColor: "#93C5FD" },
    ramoPrincipalCard: { width: "92%", alignSelf: "center", backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 17, padding: 15 },
    ramoPrincipalTopo: { flexDirection: "row", alignItems: "center" },
    ramoPrincipalIcone: { fontSize: 22, marginRight: 10 },
    ramoPrincipalTextoArea: { flex: 1 },
    ramoPrincipalTitulo: { fontSize: 16, lineHeight: 21, fontWeight: "900", color: "#1D4ED8" },
    ramoPrincipalTipo: { marginTop: 2, fontSize: 9, fontWeight: "900", color: "#60A5FA", textTransform: "uppercase", letterSpacing: 0.7 },
    ramoPrincipalResumo: { marginTop: 10, fontSize: 12, lineHeight: 18, color: "#4B5563" },
    ramoExpandirBotao: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginLeft: 10 },
    ramoExpandirTexto: { fontSize: 23, lineHeight: 25, fontWeight: "800", color: "#2563EB" },
    subRamosArea: { position: "relative", paddingTop: 20, paddingLeft: 10, paddingRight: 2 },
    conectorVertical: { position: "absolute", top: 0, left: 25, width: 2, height: 22, backgroundColor: "#BFDBFE" },
    subRamoVertical: { position: "relative", paddingLeft: 28, marginBottom: 8 },
    subRamoLinhaVertical: { position: "absolute", top: -8, bottom: 0, left: 14, width: 2, backgroundColor: "#BFDBFE" },
    subRamoLinhaHorizontal: { position: "absolute", top: 24, left: 14, width: 15, height: 2, backgroundColor: "#BFDBFE" },
    subRamoConteudo: { flex: 1, minWidth: 0 },

    noWrapper: {
      marginBottom: 10,
    },

    noCard: {
      borderRadius: 17,
      padding: 16,
      borderWidth: 1,
    },

    noPrincipal: {
      backgroundColor:
        "#FFFFFF",
      borderColor:
        "#DBEAFE",
    },

    noSecundario: {
      backgroundColor:
        "#FFFFFF",
      borderColor:
        "#E5E7EB",
    },

    noFormula: {
      backgroundColor:
        "#F0FDF4",
      borderColor:
        "#BBF7D0",
    },

    noAlerta: {
      backgroundColor:
        "#FFF7ED",
      borderColor:
        "#FED7AA",
    },

    noTopo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    noTituloArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    tipoIcone: {
      fontSize: 22,
      marginRight: 10,
    },

    noTitulo: {
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      color: "#111827",
    },

    noTituloPrincipal: {
      fontSize: 17,
      color: "#1D4ED8",
    },

    tipoTexto: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: "800",
      color: "#9CA3AF",
      textTransform:
        "uppercase",
    },

    expandirBotao: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        "#EFF6FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 10,
    },

    expandirTexto: {
      fontSize: 23,
      lineHeight: 25,
      fontWeight: "700",
      color: "#2563EB",
    },

    resumoNo: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 20,
      color: "#4B5563",
    },

    metadados: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 12,
    },

    badgeImportancia: {
      backgroundColor:
        "#FEF3C7",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 9,
    },

    badgeImportanciaTexto: {
      fontSize: 10,
      fontWeight: "800",
      color: "#92400E",
    },

    badgePagina: {
      backgroundColor:
        "#F3F4F6",
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 9,
    },

    badgePaginaTexto: {
      fontSize: 10,
      fontWeight: "800",
      color: "#4B5563",
    },

    filhosArea: {
      marginTop: 9,
      borderLeftWidth: 2,
      borderLeftColor:
        "#DBEAFE",
      paddingLeft: 3,
    },

    legendaCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17,
      padding: 15,
      marginBottom: 18,
    },

    legendaTitulo: {
      fontSize: 15,
      fontWeight: "900",
      color: "#111827",
      marginBottom: 8,
    },

    legendaTexto: {
      fontSize: 12,
      lineHeight: 21,
      color: "#6B7280",
    },

    legendaItens: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    legendaItem: {
      backgroundColor: "#F9FAFB",
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },

    legendaImportancia: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color: "#6B7280",
    },

    infoCard: {
      backgroundColor:
        "#EFF6FF",
      borderRadius: 17,
      padding: 15,
      marginBottom: 10,
    },

    infoTitulo: {
      fontSize: 15,
      fontWeight: "900",
      color: "#1D4ED8",
    },

    infoTexto: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: "#374151",
    },

    vazioCard: {
      minHeight: 260,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      justifyContent:
        "center",
    },

    vazioIcone: {
      fontSize: 45,
    },

    vazioTitulo: {
      marginTop: 12,
      fontSize: 18,
      fontWeight: "800",
      color: "#374151",
      textAlign: "center",
    },

    vazioTexto: {
      marginTop: 7,
      fontSize: 14,
      lineHeight: 21,
      color: "#9CA3AF",
      textAlign: "center",
    },

    iaHabilitada: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor:
        "#DCFCE7",
      borderRadius: 14,
      alignItems: "center",
    },

    iaHabilitadaTexto: {
      fontSize: 14,
      fontWeight: "800",
      color: "#15803D",
      textAlign: "center",
    },

    botaoGerar: {
      minHeight: 58,
      marginTop: 14,
      borderRadius: 15,
      backgroundColor:
        "#2563EB",
      alignItems: "center",
      justifyContent:
        "center",
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 18,
    },

    botaoGerarDesabilitado: {
      opacity: 0.65,
    },

    botaoGerarTexto: {
      fontSize: 17,
      fontWeight: "900",
      color: "#FFFFFF",
      textAlign: "center",
    },

    iaDesativada: {
      marginTop: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor:
        "#F3F4F6",
      borderRadius: 12,
    },

    iaDesativadaTexto: {
      fontSize: 12,
      fontWeight: "700",
      color: "#6B7280",
      textAlign: "center",
    },

    erroTela: {
      flex: 1,
      justifyContent:
        "center",
      alignItems: "center",
      padding: 30,
      backgroundColor:
        "#F7F8FA",
    },

    erroIcone: {
      fontSize: 42,
    },

    erroTitulo: {
      marginTop: 12,
      fontSize: 20,
      fontWeight: "800",
      color: "#111827",
      textAlign: "center",
    },

    erroTexto: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: "#6B7280",
      textAlign: "center",
    },

    botaoVoltar: {
      marginTop: 20,
      backgroundColor:
        "#111827",
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 12,
    },

    botaoVoltarTexto: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
    },
  });