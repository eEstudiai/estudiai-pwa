import { Alert, Platform } from "react-native";

export type AvisoTela = {
  id: number;
  titulo: string;
  mensagem?: string;
};

type Ouvinte = (aviso: AvisoTela) => void;

let ouvinte: Ouvinte | null = null;
let sequencia = 0;

export function inscreverAviso(fn: Ouvinte) {
  ouvinte = fn;

  return () => {
    if (ouvinte === fn) {
      ouvinte = null;
    }
  };
}

/*
  No celular usa o alerta nativo.
  No navegador (react-native-web) Alert.alert nao exibe nada,
  entao mostra um aviso na propria pagina (AvisoGlobal).
*/
export function avisar(titulo: string, mensagem?: string) {
  if (Platform.OS === "web") {
    if (ouvinte) {
      sequencia += 1;
      ouvinte({ id: sequencia, titulo, mensagem });
      return;
    }

    if (typeof window !== "undefined") {
      window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    }

    return;
  }

  Alert.alert(titulo, mensagem);
}
