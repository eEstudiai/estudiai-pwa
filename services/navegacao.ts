import { router } from "expo-router";

/*
  Volta para a tela anterior. Se nao houver historico (por exemplo, a pagina
  foi aberta direto pelo link ou recarregada no navegador), vai para a rota
  alternativa em vez de nao fazer nada.
*/
export function voltar(rotaAlternativa: string = "/") {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(rotaAlternativa as any);
}
