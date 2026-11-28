import { Linking } from "react-native";

import { avisar } from "./avisos";
import { supabase } from "./supabase";

/*
  Abre o PDF de uma apostila (na pagina indicada, quando o leitor aceitar).
  Mostra um aviso se a apostila nao for encontrada ou o link falhar.
*/
export async function abrirApostilaNaPagina(
  materialId: string,
  pagina?: number | null
) {
  try {
    const { data: material, error } = await supabase
      .from("materials")
      .select("file_path")
      .eq("id", materialId)
      .maybeSingle();

    if (error || !material?.file_path) {
      avisar(
        "Não foi possível abrir o PDF",
        "A apostila desta resposta não foi encontrada. Ela pode ter sido excluída."
      );
      return;
    }

    const { data, error: erroLink } = await supabase.storage
      .from("study-materials")
      .createSignedUrl(material.file_path, 60 * 10);

    if (erroLink || !data?.signedUrl) {
      console.log("ERRO AO GERAR LINK DO PDF:", erroLink);
      avisar("Não foi possível abrir o PDF", "Tente novamente em instantes.");
      return;
    }

    await Linking.openURL(
      pagina && pagina > 0 ? `${data.signedUrl}#page=${pagina}` : data.signedUrl
    );
  } catch (error) {
    console.log("ERRO AO ABRIR PDF:", error);
    avisar("Não foi possível abrir o PDF", "Tente novamente em instantes.");
  }
}
