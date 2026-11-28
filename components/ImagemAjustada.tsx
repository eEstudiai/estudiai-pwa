import { useEffect, useState } from "react";
import { Image, View, type ViewStyle } from "react-native";

/*
  Mostra a imagem do tamanho dela (sem faixas cinza em volta).
  Enquanto nao sabe o tamanho, usa uma proporcao padrao.
*/
export default function ImagemAjustada({
  uri,
  alturaMaxima = 420,
  larguraAtual,
  estilo,
}: {
  uri: string;
  alturaMaxima?: number;
  larguraAtual?: number;
  estilo?: ViewStyle;
}) {
  const [proporcao, setProporcao] = useState(0.75);

  useEffect(() => {
    let ativo = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (ativo && w > 0 && h > 0) setProporcao(w / h);
      },
      () => {}
    );
    return () => {
      ativo = false;
    };
  }, [uri]);

  return (
    <View
      style={[
        {
          width: "100%",
          aspectRatio: proporcao,
          maxHeight: alturaMaxima,
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: "#F3F4F6",
        },
        estilo,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
      />
    </View>
  );
}
