import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  PanResponder,
  useWindowDimensions,
  Platform,
} from "react-native";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useFocusEffect,
} from "expo-router";

import { CameraView, useCameraPermissions } from "expo-camera";

import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

import { supabase } from "../services/supabase";
import ConnectionStatus from "../components/ConnectionStatus";
import ImagemAjustada from "../components/ImagemAjustada";
import { avisar } from "../services/avisos";
import { abrirApostilaNaPagina, nomeAmigavelApostila } from "../services/pdf";

type ResultadoQuestao = {
  alternativa: string | null;
  resposta: string;
  explicacao: string | null;
  confianca: number;
  fonte: string | null;
  pagina: number | null;
  materialId: string | null;
  hp12c: string | null;
  confirmadoPeloMaterial: boolean;
  questionId: string | null;
};

function ehErroDeConexao(
  ...mensagens: (string | null | undefined)[]
) {
  const padrao =
    /fetch failed|failed to fetch|network request failed|network error|network connection.*lost|timeout|timed out|internet|connection|failed to send a request to the edge function|send a request to the edge function|edge function|expomodulescore|promise\.swift|unexpectedexception/i;

  return mensagens.some(
    (mensagem) =>
      typeof mensagem === "string" &&
      padrao.test(mensagem)
  );
}

function mostrarAvisoNaPlataforma(
  titulo: string,
  mensagem: string
) {
  if (Platform.OS === "web") {
    window.alert(`${titulo}\n\n${mensagem}`);
    return;
  }

  Alert.alert(titulo, mensagem);
}

async function lerImagemBase64(
  uri: string
): Promise<string> {
  if (Platform.OS !== "web") {
    return FileSystem.readAsStringAsync(
      uri,
      { encoding: FileSystem.EncodingType.Base64 }
    );
  }

  const resposta = await fetch(uri);
  if (!resposta.ok) {
    throw new Error("Não foi possível acessar a imagem selecionada.");
  }

  const imagem = await resposta.blob();

  return await new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onerror = () => {
      reject(leitor.error || new Error("Não foi possível ler a imagem."));
    };

    leitor.onload = () => {
      if (typeof leitor.result !== "string") {
        reject(new Error("Não foi possível converter a imagem."));
        return;
      }

      const separador = leitor.result.indexOf(",");
      if (separador < 0) {
        reject(new Error("Não foi possível converter a imagem."));
        return;
      }

      resolve(leitor.result.slice(separador + 1));
    };

    leitor.readAsDataURL(imagem);
  });
}

function limparTextoIA(texto: string | null | undefined) {
  if (!texto) return "";

  let limpo = texto
    .replace(/\r\n/g, "\n")
    .replace(/```(?:text|txt|latex|math)?/gi, "")
    .replace(/```/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\approx/g, "≈")
    .replace(/\\ldots/g, "…")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\%/g, "%")
    .replace(/\\\$/g, "$")
    .replace(/\\,/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\!/g, "")
    .replace(/\\quad/g, " ")
    .replace(/\\qquad/g, " ")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .replace(/\\mathbf\{([^{}]*)\}/g, "$1");

  // Resolve frações simples repetidamente para também limpar ocorrências
  // que aparecem após a remoção de \left e \right.
  for (let i = 0; i < 4; i++) {
    const anterior = limpo;
    limpo = limpo.replace(
      /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
      "($1)/($2)"
    );
    if (limpo === anterior) break;
  }

  return limpo
    .replace(/\\frac/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\{([^{}\n]+)\}/g, "$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/`/g, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removerMetadadosDaResposta(texto: string) {
  return texto
    .replace(/(?:^|\n)\s*Alternativa correta\s*:\s*[A-E][^\n]*/gi, "")
    .replace(/(?:^|\n)\s*Página de referência\s*:\s*\d+[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textosSaoDuplicados(resposta: string, explicacao: string) {
  const normalizar = (valor: string) =>
    valor.toLowerCase().replace(/\s+/g, " ").trim();

  const a = normalizar(resposta);
  const b = normalizar(explicacao);

  if (!a || !b) return false;

  return a === b || a.includes(b) || b.includes(a);
}


type CropArea = { left: number; top: number; right: number; bottom: number };

function calcularImagemExibida(iw:number, ih:number, cw:number, ch:number) {
  const escala = Math.min(cw / iw, ch / ih);
  const width = iw * escala;
  const height = ih * escala;
  return { width, height, x:(cw-width)/2, y:(ch-height)/2 };
}

function CropEditor({ uri, onCancel, onApply }: {
  uri:string;
  onCancel:()=>void;
  onApply:(uri:string, mimeType:string)=>void;
}) {
  const { width: telaW, height: telaH } = useWindowDimensions();
  const areaW = Math.min(720, Math.max(280, telaW - 32));
  const areaH = Math.max(
    120,
    Math.min(620, areaW * 1.35, telaH - 320)
  );
  const [tam,setTam] = useState<{width:number;height:number}|null>(null);
  const tamRef = useRef<{width:number;height:number}|null>(null);
  const [aplicando,setAplicando] = useState(false);
  const [crop,setCrop] = useState<CropArea>({left:.06,top:.06,right:.94,bottom:.94});
  const cropRef=useRef(crop); const inicioRef=useRef(crop);
  const atualizar=(v:CropArea)=>{cropRef.current=v;setCrop(v)};
  const lim=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
  const criar=(c:"tl"|"tr"|"bl"|"br")=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>{inicioRef.current={...cropRef.current}},
    onPanResponderMove:(_,g)=>{
      const tamanhoAtual = tamRef.current;
      if(!tamanhoAtual)return;
      const r=calcularImagemExibida(tamanhoAtual.width,tamanhoAtual.height,areaW,areaH);
      const dx=g.dx/r.width, dy=g.dy/r.height, i=inicioRef.current, m=.08;
      const n={...i};
      if(c==="tl"){n.left=lim(i.left+dx,0,i.right-m);n.top=lim(i.top+dy,0,i.bottom-m)}
      if(c==="tr"){n.right=lim(i.right+dx,i.left+m,1);n.top=lim(i.top+dy,0,i.bottom-m)}
      if(c==="bl"){n.left=lim(i.left+dx,0,i.right-m);n.bottom=lim(i.bottom+dy,i.top+m,1)}
      if(c==="br"){n.right=lim(i.right+dx,i.left+m,1);n.bottom=lim(i.bottom+dy,i.top+m,1)}
      atualizar(n);
    }
  });
  const tl=useRef(criar("tl")).current, tr=useRef(criar("tr")).current;
  const bl=useRef(criar("bl")).current, br=useRef(criar("br")).current;
  const r=tam?calcularImagemExibida(tam.width,tam.height,areaW,areaH):null;
  const left=r?r.x+crop.left*r.width:0, top=r?r.y+crop.top*r.height:0;
  const cw=r?(crop.right-crop.left)*r.width:0, ch=r?(crop.bottom-crop.top)*r.height:0;
  const aplicar=async()=>{
    if(!tam||aplicando)return;
    try{
      setAplicando(true); const a=cropRef.current;
      const ctx=ImageManipulator.ImageManipulator.manipulate(uri);
      ctx.crop({originX:Math.round(a.left*tam.width),originY:Math.round(a.top*tam.height),width:Math.max(1,Math.round((a.right-a.left)*tam.width)),height:Math.max(1,Math.round((a.bottom-a.top)*tam.height))});
      const render=await ctx.renderAsync();
      const salvo=await render.saveAsync({format:ImageManipulator.SaveFormat.JPEG,compress:.92});
      onApply(salvo.uri,"image/jpeg");
    }catch(e){console.log("ERRO AO RECORTAR IMAGEM:",e);Alert.alert("Erro","Não foi possível aplicar o recorte.")}
    finally{setAplicando(false)}
  };
  return <View style={s.cropTela}>
    <View style={s.cropTopo}>
      <View style={s.cropTopoLinha}>
        <Pressable
          style={s.cropBotaoVoltar}
          onPress={onCancel}
          disabled={aplicando}
          accessibilityRole="button"
          accessibilityLabel="Voltar para revisar a imagem"
        >
          <Text style={s.cropBotaoVoltarTexto}>←</Text>
        </Pressable>
        <Text style={s.cropTitulo}>Recortar imagem</Text>
      </View>
      <Text style={s.cropSubtitulo}>Arraste os quatro cantos para manter somente a questão e as alternativas.</Text>
    </View>
    <View style={[s.cropArea,{width:areaW,height:areaH}]}>
      <Image source={{uri}} style={s.cropImagem} resizeMode="contain" onLoad={()=>Image.getSize(uri,(width,height)=>{const tamanho={width,height};tamRef.current=tamanho;setTam(tamanho)},()=>Alert.alert("Erro","Não foi possível preparar a imagem para recorte."))}/>
      {r?<>
        <View pointerEvents="none" style={[s.cropSelecao,{left,top,width:cw,height:ch}]}/>
        <View style={[s.cropHandle,{left:left-18,top:top-18}]} {...tl.panHandlers}/>
        <View style={[s.cropHandle,{left:left+cw-18,top:top-18}]} {...tr.panHandlers}/>
        <View style={[s.cropHandle,{left:left-18,top:top+ch-18}]} {...bl.panHandlers}/>
        <View style={[s.cropHandle,{left:left+cw-18,top:top+ch-18}]} {...br.panHandlers}/>
      </>:<View style={s.cropCarregando}><ActivityIndicator size="large"/></View>}
    </View>
    <View style={s.cropAcoes}>
      <Pressable style={s.cropBotaoAplicar} onPress={aplicar} disabled={aplicando||!tam}>{aplicando?<ActivityIndicator/>:<Text style={s.cropBotaoAplicarTexto}>✓ Aplicar recorte</Text>}</Pressable>
    </View>
  </View>;
}

export default function QuestaoScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permissaoCamera, solicitarPermissaoCamera] = useCameraPermissions();
  const [cameraAberta,setCameraAberta]=useState(false);
  const [capturandoFoto,setCapturandoFoto]=useState(false);
  const [fotoRevisaoUri,setFotoRevisaoUri]=useState<string|null>(null);
  const [fotoRevisaoMimeType,setFotoRevisaoMimeType]=useState("image/jpeg");
  const [recorteAberto,setRecorteAberto]=useState(false);

  const [imagemUri, setImagemUri] =
    useState<string | null>(null);

  const [imagemMimeType, setImagemMimeType] =
    useState<string>("image/jpeg");

  const [carregando, setCarregando] =
    useState(false);

  const [resultado, setResultado] =
    useState<ResultadoQuestao | null>(null);

  const [abrindoPdf, setAbrindoPdf] =
    useState(false);

  const [explicacaoAberta, setExplicacaoAberta] =
    useState(false);

  const [etapaAnalise, setEtapaAnalise] =
    useState(0);

  const [questionAiEnabled, setQuestionAiEnabled] =
    useState(false);

  const [erroConexao, setErroConexao] =
    useState(false);

  const carregarConfiguracaoIA =
    useCallback(async () => {
      try {
        setErroConexao(false);

        const { data, error } =
          await supabase
            .from("app_settings")
            .select("value")
            .eq(
              "key",
              "question_ai_enabled"
            )
            .maybeSingle();

        if (error) {
          console.log(
            "ERRO AO CARREGAR CONFIGURAÇÃO DE QUESTÕES:",
            error
          );

          setQuestionAiEnabled(false);
          setErroConexao(true);

          return;
        }

        setQuestionAiEnabled(
          data?.value === "true"
        );

        setErroConexao(false);
      } catch (error) {
        console.log(
          "ERRO INESPERADO NA CONFIGURAÇÃO DE QUESTÕES:",
          error
        );

        setQuestionAiEnabled(false);
        setErroConexao(true);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      carregarConfiguracaoIA();
    }, [carregarConfiguracaoIA])
  );

  const descobrirMimeType = (
    uri: string,
    mimeType?: string | null
  ) => {
    if (
      mimeType &&
      mimeType.startsWith("image/")
    ) {
      return mimeType;
    }

    const uriLimpa =
      uri
        .split("?")[0]
        .toLowerCase();

    if (uriLimpa.endsWith(".png")) {
      return "image/png";
    }

    if (uriLimpa.endsWith(".webp")) {
      return "image/webp";
    }

    if (uriLimpa.endsWith(".heic")) {
      return "image/heic";
    }

    if (uriLimpa.endsWith(".heif")) {
      return "image/heif";
    }

    return "image/jpeg";
  };

  const normalizarImagemParaAnalise =
    async (
      uri: string,
      mimeType?: string | null
    ) => {
      const mimeOriginal =
        descobrirMimeType(
          uri,
          mimeType
        );

      /*
        No iPhone, imagens escolhidas
        da Fototeca podem vir em
        HEIC/HEIF ou com representação
        que não é aceita diretamente
        pela API.

        Regravamos a imagem como JPEG
        real antes de gerar o Base64.
      */
      const precisaConverter =
        mimeOriginal === "image/heic" ||
        mimeOriginal === "image/heif";

      if (!precisaConverter) {
        return {
          uri,
          mimeType: mimeOriginal,
        };
      }

      const contexto =
        ImageManipulator.ImageManipulator.manipulate(
          uri
        );

      const imagemRenderizada =
        await contexto.renderAsync();

      const imagemConvertida =
        await imagemRenderizada.saveAsync({
          format:
            ImageManipulator
              .SaveFormat
              .JPEG,
          compress: 0.9,
        });

      return {
        uri: imagemConvertida.uri,
        mimeType: "image/jpeg",
      };
    };

  const registrarImagem = (
    uri: string,
    mimeType?: string | null
  ) => {
    setResultado(null);
    setImagemUri(uri);

    setImagemMimeType(
      descobrirMimeType(
        uri,
        mimeType
      )
    );
  };

  const abrirCameraNativaWeb = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";
    input.onchange = () => {
      const arquivo = input.files?.[0];
      document.body.removeChild(input);
      if (!arquivo) return;
      const leitor = new FileReader();
      leitor.onload = () => {
        setResultado(null);
        setFotoRevisaoUri(String(leitor.result));
        setFotoRevisaoMimeType(arquivo.type || "image/jpeg");
        setCameraAberta(false);
        setRecorteAberto(false);
      };
      leitor.onerror = () =>
        avisar("Erro", "Não foi possível ler a fotografia.");
      leitor.readAsDataURL(arquivo);
    };
    document.body.appendChild(input);
    input.click();
  };

  const tirarFoto = async () => {
    /*
      No celular (navegador/PWA) usamos a camera nativa do aparelho:
      foco automatico, zoom, flash e foto em alta resolucao.
      Precisa rodar direto no toque, antes de qualquer await.
    */
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    ) {
      abrirCameraNativaWeb();
      return;
    }

    try {
      setResultado(null);
      let p=permissaoCamera;
      if(!p?.granted)p=await solicitarPermissaoCamera();
      if(!p?.granted){Alert.alert("Permissão necessária","O EstudaIA precisa de acesso à câmera para fotografar a questão.");return;}
      setFotoRevisaoUri(null); setRecorteAberto(false); setCameraAberta(true);
    } catch(error){console.log("ERRO AO ABRIR CÂMERA:",error);Alert.alert("Erro","Não foi possível abrir a câmera.")}
  };

  const capturarFoto=async()=>{
    if(!cameraRef.current||capturandoFoto)return;
    try{
      setCapturandoFoto(true);
      const foto=await cameraRef.current.takePictureAsync({quality:.9,skipProcessing:false});
      if(!foto?.uri)throw new Error("A câmera não retornou a fotografia.");
      setFotoRevisaoUri(foto.uri);setFotoRevisaoMimeType("image/jpeg");setCameraAberta(false);
    }catch(error){console.log("ERRO AO CAPTURAR FOTO:",error);Alert.alert("Erro","Não foi possível capturar a fotografia.")}
    finally{setCapturandoFoto(false)}
  };
  const cancelarCamera=()=>{if(!capturandoFoto)setCameraAberta(false)};
  const tirarNovamenteNaRevisao=async()=>{setFotoRevisaoUri(null);setRecorteAberto(false);await tirarFoto()};
  const aplicarFotoRecortada=(uri:string,mimeType:string)=>{setFotoRevisaoUri(uri);setFotoRevisaoMimeType(mimeType);setRecorteAberto(false)};
  const voltarParaSelecao = () => {
    setFotoRevisaoUri(null);
    setFotoRevisaoMimeType("image/jpeg");
    setRecorteAberto(false);
    setImagemUri(null);
    setImagemMimeType("image/jpeg");
    setResultado(null);
  };

  const usarFotoRevisada=async()=>{
    if(!fotoRevisaoUri)return;
    try{const n=await normalizarImagemParaAnalise(fotoRevisaoUri,fotoRevisaoMimeType);registrarImagem(n.uri,n.mimeType);setFotoRevisaoUri(null);setRecorteAberto(false)}
    catch(error){console.log("ERRO AO USAR FOTO:",error);Alert.alert("Erro","Não foi possível preparar a fotografia.")}
  };

  const escolherDaGaleria =
    async () => {
      try {
        setResultado(null);

        const permissao =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (!permissao.granted) {
          Alert.alert(
            "Permissão necessária",
            "O EstudaIA precisa de acesso às imagens para selecionar uma questão."
          );

          return;
        }

        const selecao =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.9,
              selectionLimit: 1,
            });

        if (selecao.canceled) {
          return;
        }

        const asset =
          selecao.assets?.[0];

        if (!asset?.uri) {
          Alert.alert(
            "Erro",
            "Não foi possível acessar a imagem selecionada."
          );

          return;
        }

        if (Platform.OS === "web") {
          setFotoRevisaoUri(asset.uri);
          setFotoRevisaoMimeType(
            descobrirMimeType(
              asset.uri,
              asset.mimeType
            )
          );
          setRecorteAberto(false);
          return;
        }

        const imagemNormalizada =
          await normalizarImagemParaAnalise(
            asset.uri,
            asset.mimeType
          );

        console.log(
          "GALERIA MIME ORIGINAL:",
          descobrirMimeType(
            asset.uri,
            asset.mimeType
          )
        );

        console.log(
          "GALERIA MIME PARA ANÁLISE:",
          imagemNormalizada.mimeType
        );

        registrarImagem(
          imagemNormalizada.uri,
          imagemNormalizada.mimeType
        );
      } catch (error) {
        console.log(
          "ERRO AO ABRIR GALERIA:",
          error
        );

        Alert.alert(
          "Erro",
          "Não foi possível abrir a galeria."
        );
      }
    };

  const refazerFoto = async () => {
    setImagemUri(null);
    setImagemMimeType("image/jpeg");
    setResultado(null);

    await tirarFoto();
  };

  const escolherOutraImagem =
    async () => {
      setImagemUri(null);
      setImagemMimeType("image/jpeg");
      setResultado(null);

      await escolherDaGaleria();
    };

  const analisarQuestao =
    async () => {
      if (
        !imagemUri ||
        carregando
      ) {
        return;
      }

      /*
        Segurança adicional.

        Mesmo que o botão esteja visível,
        a análise real só será enviada
        se a função estiver habilitada
        no app_settings.
      */
      if (!questionAiEnabled) {
        mostrarAvisoNaPlataforma(
          "Análise temporariamente desativada",
          "A análise de questões por IA está desativada neste momento."
        );

        return;
      }

      try {
        setCarregando(true);
        setResultado(null);
        setErroConexao(false);

        const base64 = await lerImagemBase64(imagemUri);

        if (!base64) {
          throw new Error(
            "Não foi possível converter a imagem."
          );
        }

        console.log(
          "QUESTION AI ENABLED:",
          questionAiEnabled
        );

        console.log(
          "IMAGE MIME TYPE:",
          imagemMimeType
        );

        console.log(
          "MODO DE ANÁLISE: IA REAL"
        );

        const { data, error } =
          await supabase.functions
            .invoke(
              "answer-question",
              {
                body: {
                  questionText:
                    "Questão enviada por imagem.",

                  imageBase64:
                    base64,

                  imageMimeType:
                    imagemMimeType,

                  /*
                    IA REAL ATIVADA.

                    O backend deverá:
                    1. interpretar a imagem;
                    2. identificar a questão;
                    3. pesquisar os materiais;
                    4. responder somente com
                       base no material;
                    5. fornecer página quando
                       disponível;
                    6. fornecer HP-12C quando
                       aplicável.
                  */
                  developmentMode:
                    false,
                },
              }
            );

        if (error) {
          console.log(
            "ERRO ANSWER-QUESTION:",
            error
          );

          let mensagem =
            error.message ||
            "Não foi possível analisar a questão.";

          try {
            const contexto: any =
              (error as any).context;

            if (contexto) {
              const resposta =
                contexto.clone
                  ? contexto.clone()
                  : contexto;

              const json =
                await resposta.json();

              mensagem =
                json?.error ||
                json?.message ||
                mensagem;
            }
          } catch {
            // Mantém a mensagem original.
          }

          const erroDeConexao =
            ehErroDeConexao(
              error.message,
              mensagem
            );

          mostrarAvisoNaPlataforma(
            erroDeConexao
              ? "Erro de conexão"
              : "Não foi possível analisar",
            erroDeConexao
              ? "Não foi possível analisar a questão. Verifique sua conexão com a internet e tente novamente."
              : mensagem
          );

          return;
        }

        if (!data?.ok) {
          mostrarAvisoNaPlataforma(
            "Não foi possível analisar",
            data?.error ||
              "Não foi possível analisar a questão."
          );

          return;
        }

        setErroConexao(false);

        const novoResultado:
          ResultadoQuestao = {
          alternativa:
            data?.alternative ??
            null,

          resposta:
            data?.answer ||
            "Não foi possível obter uma resposta.",

          explicacao:
            data?.explanation ??
            null,

          confianca:
            Number(
              data?.confidence ??
                0
            ),

          fonte:
            data?.confirmedByMaterial
              ? data?.sourceFilename ||
                "Material de estudo"
              : null,

          pagina:
            data?.sourcePage ??
            null,

          materialId:
            data?.sourceMaterialId ??
            null,

          hp12c:
            data?.hp12cSteps ??
            null,

          confirmadoPeloMaterial:
            data?.confirmedByMaterial ===
            true,

          questionId:
            data?.questionId ??
            null,
        };

        setResultado(
          novoResultado
        );
      } catch (error: any) {
        console.log(
          "ERRO AO ANALISAR QUESTÃO:",
          error
        );

        const mensagemErro =
          typeof error?.message === "string"
            ? error.message
            : "";
        const erroDeConexao =
          ehErroDeConexao(mensagemErro);

        mostrarAvisoNaPlataforma(
          erroDeConexao
            ? "Erro de conexão"
            : "Erro",
          erroDeConexao
            ? "Não foi possível analisar a questão. Verifique sua conexão com a internet e tente novamente."
            : mensagemErro ||
              "Não foi possível analisar a questão."
        );
      } finally {
        setCarregando(false);
      }
    };

  useEffect(() => {
    setExplicacaoAberta(false);
  }, [resultado]);

  useEffect(() => {
    if (!carregando) {
      setEtapaAnalise(0);
      return;
    }
    setEtapaAnalise(0);
    const t1 = setTimeout(() => setEtapaAnalise(1), 3500);
    const t2 = setTimeout(() => setEtapaAnalise(2), 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [carregando]);

  const novaQuestao = () => {
    setImagemUri(null);
    setImagemMimeType("image/jpeg");
    setResultado(null);
  };

  const confiancaPercentual =
    resultado
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              Number(resultado.confianca) <= 1
                ? Number(resultado.confianca) * 100
                : Number(resultado.confianca)
            )
          )
        )
      : 0;

  const respostaLimpa =
    resultado
      ? removerMetadadosDaResposta(
          limparTextoIA(resultado.resposta)
        ).replace(
          /^\s*(?:A\s+)?alternativa\s+correta\s*(?::|é|e)?\s*(?:a\s+)?(?:letra\s+)?\(?[A-Ea-e]\)?[.:\s)-]*/i,
          ""
        )
      : "";

  const leituraFalhou =
    !!resultado &&
    !resultado.alternativa &&
    !resultado.pagina &&
    confiancaPercentual === 0;

  const explicacaoLimpa =
    resultado?.explicacao
      ? removerMetadadosDaResposta(
          limparTextoIA(resultado.explicacao)
        )
      : "";

  const mostrarExplicacao =
    !!explicacaoLimpa &&
    !textosSaoDuplicados(
      respostaLimpa,
      explicacaoLimpa
    );

  const hp12cLimpo =
    resultado?.hp12c
      ? limparTextoIA(resultado.hp12c)
      : "";

  if(recorteAberto&&fotoRevisaoUri){
    const editor = (
      <CropEditor
        uri={fotoRevisaoUri}
        onCancel={() => setRecorteAberto(false)}
        onApply={aplicarFotoRecortada}
      />
    );

    if (Platform.OS === "web") {
      return (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setRecorteAberto(false)}
        >
          {editor}
        </Modal>
      );
    }

    return editor;
  }

  if(cameraAberta){
    return <View style={s.cameraTela}>
      <CameraView ref={cameraRef} style={s.cameraPreview} facing="back"/>
      <View style={s.cameraTopo}><Pressable style={s.cameraCancelar} onPress={cancelarCamera} disabled={capturandoFoto}><Text style={s.cameraCancelarTexto}>Cancelar</Text></Pressable></View>
      <View style={s.cameraMoldura} pointerEvents="none"><View style={s.cameraMolduraInterna}/></View>
      <View style={s.cameraRodape}>
        <Text style={s.cameraInstrucao}>Enquadre toda a questão e suas alternativas</Text>
        <Pressable style={s.cameraCapturar} onPress={capturarFoto} disabled={capturandoFoto}>{capturandoFoto?<ActivityIndicator size="large"/>:<View style={s.cameraCapturarCentro}/>}</Pressable>
        <Text style={s.cameraCapturarTexto}>{capturandoFoto?"Capturando...":"Capturar foto"}</Text>
      </View>
    </View>;
  }

  if(fotoRevisaoUri){
    return <ScrollView style={s.tela} contentContainerStyle={s.revisaoContainer}>
      <View style={s.revisaoTopo}>
        <Pressable
          style={s.revisaoBotaoVoltar}
          onPress={voltarParaSelecao}
          accessibilityRole="button"
          accessibilityLabel="Voltar para escolher uma imagem ou tirar foto"
        >
          <Text style={s.revisaoBotaoVoltarTexto}>←</Text>
        </Pressable>
        <Text style={s.titulo}>Revisar foto</Text>
      </View>
      <Text style={s.subtitulo}>Confira a fotografia antes de usá-la. Você pode recortar a imagem para manter somente a questão e as alternativas.</Text>
      <View style={s.revisaoCard}><ImagemAjustada uri={fotoRevisaoUri} alturaMaxima={520}/></View>
      <Pressable style={s.botaoRecortar} onPress={()=>setRecorteAberto(true)}><Text style={s.botaoRecortarTexto}>✂️ Recortar foto</Text></Pressable>
      <Pressable style={s.botaoRevisaoSecundario} onPress={tirarNovamenteNaRevisao}><Text style={s.botaoRevisaoSecundarioTexto}>📷 Tirar novamente</Text></Pressable>
      <Pressable style={s.botaoUsarFoto} onPress={usarFotoRevisada}><Text style={s.botaoUsarFotoTexto}>✓ Usar foto</Text></Pressable>
    </ScrollView>;
  }

  return (
    <ScrollView
      style={s.tela}
      contentContainerStyle={
        s.container
      }
    >
      <Text style={s.titulo}>
        Resolver questão
      </Text>

      <Text style={s.subtitulo}>
        Fotografe uma questão ou
        escolha uma imagem da galeria.
        O EstudaIA utilizará seus
        materiais de estudo para
        preparar a resposta.
      </Text>

      <ConnectionStatus
        visible={erroConexao}
        message="Não foi possível comunicar com o EstudaIA. Verifique sua conexão com a internet e tente analisar a questão novamente."
      />

      {!imagemUri ? (
        <>
          <View
            style={s.cardCamera}
          >
            <View
              style={
                s.cameraIconeContainer
              }
            >
              <Text
                style={
                  s.cameraIcone
                }
              >
                📷
              </Text>
            </View>

            <Text
              style={
                s.cameraTitulo
              }
            >
              Enviar questão
            </Text>

            <Text
              style={
                s.cameraTexto
              }
            >
              Tire uma foto agora ou
              selecione uma imagem já
              salva no aparelho.
            </Text>

            <Pressable
              style={({ pressed }) => [
                s.botaoCamera,
                pressed &&
                  s.botaoPressionado,
              ]}
              onPress={tirarFoto}
            >
              <Text
                style={
                  s.botaoCameraTexto
                }
              >
                📷 Tirar foto
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                s.botaoGaleria,
                pressed &&
                  s.botaoPressionado,
              ]}
              onPress={
                escolherDaGaleria
              }
            >
              <Text
                style={
                  s.botaoGaleriaTexto
                }
              >
                🖼️ Escolher da galeria
              </Text>
            </Pressable>
          </View>

          <View
            style={s.dicasCard}
          >
            <Text
              style={
                s.dicasTitulo
              }
            >
              💡 Para uma boa leitura
            </Text>

            <View
              style={s.dicaLinha}
            >
              <Text
                style={
                  s.dicaMarcador
                }
              >
                •
              </Text>

              <Text
                style={s.dicaTexto}
              >
                Evite sombras sobre o
                enunciado.
              </Text>
            </View>

            <View
              style={s.dicaLinha}
            >
              <Text
                style={
                  s.dicaMarcador
                }
              >
                •
              </Text>

              <Text
                style={s.dicaTexto}
              >
                Mantenha o texto
                legível e bem
                enquadrado.
              </Text>
            </View>

            <View
              style={s.dicaLinha}
            >
              <Text
                style={
                  s.dicaMarcador
                }
              >
                •
              </Text>

              <Text
                style={s.dicaTexto}
              >
                Inclua todas as
                alternativas da
                questão.
              </Text>
            </View>
          </View>

          <View
            style={s.iaAtivaCard}
          >
            <Text
              style={s.iaAtivaTitulo}
            >
              ✅ Análise com IA habilitada
            </Text>

            <Text
              style={s.iaAtivaTexto}
            >
              O EstudaIA analisará a
              questão e buscará a
              resposta nos materiais
              preparados da sua
              biblioteca.
            </Text>
          </View>
        </>
      ) : null}

      {imagemUri ? (
        <>
          <View
            style={s.cardImagem}
          >
            <View
              style={
                s.imagemCabecalho
              }
            >
              <Text
                style={
                  s.imagemTitulo
                }
              >
                Imagem da questão
              </Text>

              <Text
                style={
                  s.imagemStatus
                }
              >
                ✓ Selecionada
              </Text>
            </View>

            <ImagemAjustada uri={imagemUri} />
          </View>

          {!resultado &&
          !carregando ? (
            <View
              style={s.acoesFoto}
            >
              <Pressable
                style={({ pressed }) => [
                  s.botaoRefazer,
                  pressed &&
                    s.botaoPressionado,
                ]}
                onPress={refazerFoto}
              >
                <Text
                  style={
                    s.botaoRefazerTexto
                  }
                >
                  📷 Tirar outra foto
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  s.botaoOutraImagem,
                  pressed &&
                    s.botaoPressionado,
                ]}
                onPress={
                  escolherOutraImagem
                }
              >
                <Text
                  style={
                    s.botaoOutraImagemTexto
                  }
                >
                  🖼️ Escolher outra imagem
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  s.botaoAnalisar,
                  !questionAiEnabled &&
                    s.botaoDesabilitado,
                  pressed &&
                    questionAiEnabled &&
                    s.botaoPressionado,
                ]}
                onPress={
                  analisarQuestao
                }
              >
                <Text
                  style={
                    s.botaoAnalisarTexto
                  }
                >
                  ✨ Analisar questão
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      {carregando ? (
        <View
          style={s.cardCarregando}
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              s.carregandoTitulo
            }
          >
            Analisando questão...
          </Text>

          <View style={{ gap: 8, marginTop: 6, alignSelf: "stretch", paddingHorizontal: 12 }}>
            {[
              "Lendo a imagem da questão",
              "Buscando nas suas apostilas",
              "Preparando a resposta",
            ].map((texto, i) => (
              <Text
                key={texto}
                style={[
                  s.carregandoTexto,
                  { textAlign: "left" },
                  i === etapaAnalise && { fontWeight: "800", color: "#0B1F4B" },
                  i > etapaAnalise && { opacity: 0.45 },
                ]}
              >
                {i < etapaAnalise ? "✓ " : i === etapaAnalise ? "● " : "○ "}
                {texto}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {resultado ? (
        <>
          {leituraFalhou ? (
            <View style={s.avisoNaoConfirmado}>
              <Text style={s.avisoNaoConfirmadoTitulo}>
                📷 Não consegui ler a foto
              </Text>

              <Text style={s.avisoNaoConfirmadoTexto}>
                Aproxime a câmera da questão, deixe o texto bem iluminado e
                evite reflexos. Fotografar uma tela de computador costuma
                dar listras: prefira papel ou um print.
              </Text>

              <Text style={[s.avisoNaoConfirmadoTexto, { marginTop: 8, fontWeight: "800" }]}>
                Esta tentativa não conta no seu limite.
              </Text>

              {resultado?.explicacao ? (
                <Text style={[s.avisoNaoConfirmadoTexto, { marginTop: 8, fontStyle: "italic" }]}>
                  Trecho com dúvida: “…{resultado.explicacao}…”
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                style={s.abrirPdfBotao}
                onPress={refazerFoto}
              >
                <Text style={s.abrirPdfTexto}>📷 Tirar outra foto</Text>
              </Pressable>
            </View>
          ) : !resultado
            .confirmadoPeloMaterial ? (
            <View
              style={
                s.avisoNaoConfirmado
              }
            >
              <Text
                style={
                  s.avisoNaoConfirmadoTitulo
                }
              >
                ⚠️ Não confirmado pelo material
              </Text>

              <Text
                style={
                  s.avisoNaoConfirmadoTexto
                }
              >
                O EstudaIA não conseguiu
                confirmar esta resposta
                nos materiais cadastrados.
                Não considere a resposta
                como confirmada.
              </Text>
            </View>
          ) : (
            <View
              style={
                s.avisoConfirmado
              }
            >
              <Text
                style={
                  s.avisoConfirmadoTitulo
                }
              >
                ✅ Confirmado pelo material
              </Text>

              <Text
                style={
                  s.avisoConfirmadoTexto
                }
              >
                A resposta foi baseada
                nas apostilas
                cadastradas.
              </Text>
            </View>
          )}

          {!leituraFalhou && resultado
            .alternativa ? (
            <View
              style={
                s.cardAlternativa
              }
            >
              <Text
                style={
                  s.alternativaLabel
                }
              >
                ALTERNATIVA CORRETA
              </Text>

              <Text
                style={
                  s.alternativa
                }
              >
                {
                  resultado
                    .alternativa
                }
              </Text>
            </View>
          ) : null}

          {leituraFalhou ? null : (
          <View style={s.card}>
            <Text style={s.label}>
              RESPOSTA
            </Text>

            <Text
              style={
                s.respostaTexto
              }
              numberOfLines={
                explicacaoAberta ? undefined : 4
              }
            >
              {respostaLimpa}
            </Text>

            {mostrarExplicacao && explicacaoAberta ? (
              <>
                <Text style={[s.label, { marginTop: 16 }]}>
                  EXPLICAÇÃO
                </Text>

                <Text style={s.textoNormal}>
                  {explicacaoLimpa}
                </Text>
              </>
            ) : null}

            {respostaLimpa.length > 200 || mostrarExplicacao ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setExplicacaoAberta((v) => !v)}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: "#1D4ED8", fontWeight: "800", fontSize: 14 }}>
                  {explicacaoAberta
                    ? "Ver menos ▲"
                    : "Ver explicação completa ▼"}
                </Text>
              </Pressable>
            ) : null}
          </View>
          )}

          {leituraFalhou ? null : (
          <View
            style={
              s.informacoesLinha
            }
          >
            <View
              style={
                s.informacaoCard
              }
            >
              <Text style={s.label}>
                CONFIANÇA
              </Text>

              <Text
                style={s.confianca}
              >
                {
                  confiancaPercentual
                }
                %
              </Text>
            </View>

            <View
              style={
                s.informacaoCard
              }
            >
              <Text style={s.label}>
                FONTE
              </Text>

              <Text
                style={s.fonte}
                numberOfLines={2}
              >
                {nomeAmigavelApostila(resultado.fonte) ||
                  "Não confirmada"}
              </Text>
            </View>
          </View>
          )}

          {resultado.pagina ? (
            <View style={s.card}>
              <Text style={s.label}>
                PÁGINA
              </Text>

              <Text
                style={
                  s.paginaDestaque
                }
              >
                Página{" "}
                {
                  resultado
                    .pagina
                }
              </Text>

              {resultado.materialId ? (
                <Pressable
                  accessibilityRole="button"
                  style={s.abrirPdfBotao}
                  disabled={abrindoPdf}
                  onPress={async () => {
                    setAbrindoPdf(true);
                    await abrirApostilaNaPagina(
                      resultado.materialId as string,
                      resultado.pagina
                    );
                    setAbrindoPdf(false);
                  }}
                >
                  <Text style={s.abrirPdfTexto}>
                    {abrindoPdf
                      ? "Abrindo PDF..."
                      : `📖 Abrir PDF na página ${resultado.pagina}`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {hp12cLimpo ? (
            <View
              style={
                s.cardHp12c
              }
            >
              <Text
                style={
                  s.hp12cTitulo
                }
              >
                🧮 HP-12C
              </Text>

              <Text
                style={
                  s.hp12cTexto
                }
              >
                {hp12cLimpo}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              s.botaoNovaQuestao,
              pressed &&
                s.botaoPressionado,
            ]}
            onPress={novaQuestao}
          >
            <Text
              style={
                s.botaoNovaQuestaoTexto
              }
            >
              ➕ Resolver nova questão
            </Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  container: {
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 35,
    flexGrow: 1,
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

  cardCamera: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },

  cameraIconeContainer: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraIcone: {
    fontSize: 40,
  },

  cameraTitulo: {
    marginTop: 18,
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  cameraTexto: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  botaoCamera: {
    marginTop: 22,
    width: "100%",
    backgroundColor: "#0B3FA8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  botaoCameraTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  botaoGaleria: {
    marginTop: 10,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0B3FA8",
  },

  botaoGaleriaTexto: {
    color: "#0B3FA8",
    fontSize: 15,
    fontWeight: "800",
  },

  botaoPressionado: {
    opacity: 0.8,
  },

  botaoDesabilitado: {
    opacity: 0.45,
  },

  dicasCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },

  dicasTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 9,
  },

  dicaLinha: {
    flexDirection: "row",
    marginTop: 5,
  },

  dicaMarcador: {
    width: 18,
    fontSize: 15,
    color: "#0B3FA8",
  },

  dicaTexto: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },

  iaAtivaCard: {
    marginTop: 14,
    backgroundColor: "#DCFCE7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  iaAtivaTitulo: {
    fontSize: 14,
    fontWeight: "800",
    color: "#166534",
  },

  iaAtivaTexto: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#166534",
  },

  cardImagem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },

  imagemCabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  imagemTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  imagemStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },

  imagem: {
    width: "100%",
    height: 340,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },

  acoesFoto: {
    gap: 10,
    marginBottom: 16,
  },

  botaoRefazer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  botaoRefazerTexto: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "800",
  },

  botaoOutraImagem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },

  botaoOutraImagemTexto: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "800",
  },

  botaoAnalisar: {
    backgroundColor: "#0B3FA8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  botaoAnalisarTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  cardCarregando: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },

  carregandoTitulo: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  carregandoTexto: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B7280",
  },

  avisoNaoConfirmado: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F5D98C",
  },

  avisoNaoConfirmadoTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400E",
  },

  avisoNaoConfirmadoTexto: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: "#92400E",
  },

  avisoConfirmado: {
    backgroundColor: "#DCFCE7",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  avisoConfirmadoTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: "#166534",
  },

  avisoConfirmadoTexto: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: "#166534",
  },

  cardAlternativa: {
    backgroundColor: "#DBEAFE",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
  },

  alternativaLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
  },

  alternativa: {
    marginTop: 8,
    fontSize: 46,
    fontWeight: "900",
    color: "#1D4ED8",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },

  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 8,
    letterSpacing: 0.7,
  },

  respostaTexto: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: "#111827",
  },

  textoNormal: {
    fontSize: 15,
    lineHeight: 23,
    color: "#374151",
  },

  informacoesLinha: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  informacaoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E8ECF2",
  },

  confianca: {
    fontSize: 28,
    fontWeight: "900",
    color: "#15803D",
  },

  abrirPdfBotao: {
    marginTop: 12,
    backgroundColor: "#1D4ED8",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },

  abrirPdfTexto: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  fonte: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#111827",
  },

  paginaDestaque: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  cardHp12c: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  hp12cTitulo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065F46",
  },

  hp12cTexto: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 23,
    color: "#065F46",
  },

  botaoNovaQuestao: {
    backgroundColor: "#0B3FA8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  botaoNovaQuestaoTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  cameraTela:{flex:1,backgroundColor:"#000000"},
  cameraPreview:{...StyleSheet.absoluteFill},
  cameraTopo:{position:"absolute",top:0,left:0,right:0,paddingTop:58,paddingHorizontal:20,alignItems:"flex-start"},
  cameraCancelar:{backgroundColor:"rgba(0,0,0,0.55)",borderRadius:22,paddingHorizontal:18,paddingVertical:11},
  cameraCancelarTexto:{color:"#FFFFFF",fontSize:15,fontWeight:"800"},
  cameraMoldura:{...StyleSheet.absoluteFill,alignItems:"center",justifyContent:"center",paddingHorizontal:22,paddingTop:90,paddingBottom:190},
  cameraMolduraInterna:{width:"100%",height:"100%",maxHeight:500,borderRadius:18,borderWidth:2,borderColor:"rgba(255,255,255,0.75)"},
  cameraRodape:{position:"absolute",left:0,right:0,bottom:0,paddingHorizontal:20,paddingTop:20,paddingBottom:42,alignItems:"center",backgroundColor:"rgba(0,0,0,0.48)"},
  cameraInstrucao:{color:"#FFFFFF",fontSize:14,lineHeight:20,fontWeight:"600",textAlign:"center",marginBottom:18},
  cameraCapturar:{width:78,height:78,borderRadius:39,borderWidth:5,borderColor:"#FFFFFF",alignItems:"center",justifyContent:"center"},
  cameraCapturarCentro:{width:60,height:60,borderRadius:30,backgroundColor:"#FFFFFF"},
  cameraCapturarTexto:{marginTop:10,color:"#FFFFFF",fontSize:14,fontWeight:"800"},
  revisaoContainer:{paddingHorizontal:22,paddingTop:58,paddingBottom:40,flexGrow:1},
  revisaoTopo:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:8},
  revisaoBotaoVoltar:{width:44,height:44,borderRadius:22,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#D1D5DB",alignItems:"center",justifyContent:"center"},
  revisaoBotaoVoltarTexto:{fontSize:26,lineHeight:32,color:"#0B3FA8"},
  revisaoCard:{backgroundColor:"#FFFFFF",borderRadius:20,padding:12,borderWidth:1,borderColor:"#E8ECF2",marginBottom:14},
  revisaoImagem:{width:"100%",height:470,borderRadius:14,backgroundColor:"#E5E7EB"},
  botaoRecortar:{backgroundColor:"#FFFFFF",borderRadius:14,paddingVertical:16,alignItems:"center",borderWidth:1.5,borderColor:"#0B3FA8",marginBottom:10},
  botaoRecortarTexto:{color:"#0B3FA8",fontSize:16,fontWeight:"800"},
  botaoRevisaoSecundario:{backgroundColor:"#FFFFFF",borderRadius:14,paddingVertical:16,alignItems:"center",borderWidth:1,borderColor:"#D1D5DB",marginBottom:10},
  botaoRevisaoSecundarioTexto:{color:"#374151",fontSize:15,fontWeight:"800"},
  botaoUsarFoto:{backgroundColor:"#0B3FA8",borderRadius:14,paddingVertical:17,alignItems:"center"},
  botaoUsarFotoTexto:{color:"#FFFFFF",fontSize:16,fontWeight:"800"},
  cropTela:{flex:1,width:"100%",backgroundColor:"#0B0F18",paddingTop:16,paddingBottom:16,alignItems:"center"},
  cropTopo:{width:"100%",paddingHorizontal:20,marginBottom:14},
  cropTopoLinha:{flexDirection:"row",alignItems:"center",gap:12},
  cropBotaoVoltar:{width:44,height:44,borderRadius:22,backgroundColor:"rgba(255,255,255,0.12)",alignItems:"center",justifyContent:"center"},
  cropBotaoVoltarTexto:{fontSize:26,lineHeight:32,color:"#FFFFFF"},
  cropTitulo:{color:"#FFFFFF",fontSize:26,fontWeight:"900"},
  cropSubtitulo:{marginTop:6,color:"#D1D5DB",fontSize:14,lineHeight:20},
  cropArea:{position:"relative",backgroundColor:"#000000",overflow:"hidden"},
  cropImagem:{...StyleSheet.absoluteFill},
  cropSelecao:{position:"absolute",borderWidth:2,borderColor:"#FFFFFF",backgroundColor:"rgba(255,255,255,0.04)"},
  cropHandle:{position:"absolute",width:36,height:36,borderRadius:18,backgroundColor:"#FFFFFF",borderWidth:4,borderColor:"#0B3FA8"},
  cropCarregando:{...StyleSheet.absoluteFill,alignItems:"center",justifyContent:"center"},
  cropAcoes:{width:"100%",paddingHorizontal:20,marginTop:16,flexDirection:"row",gap:10},
  cropBotaoAplicar:{flex:1,backgroundColor:"#0B3FA8",borderRadius:14,paddingVertical:15,alignItems:"center"},
  cropBotaoAplicarTexto:{color:"#FFFFFF",fontSize:15,fontWeight:"800"},
});
