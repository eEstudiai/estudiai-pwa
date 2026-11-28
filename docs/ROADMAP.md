# EstudaIA - Roadmap e controle de portabilidade (Web -> Play Store)

Ultima atualizacao: 2026-11-28

Objetivo: tudo que for feito na versao web (PWA) deve ser levado tambem ao app
Android (Play Store). Este arquivo lista o roadmap, o que ja foi feito e o que
precisa ser revisado/portado para o app nativo.

## Como as mudancas chegam ao Android

- Mudancas de servidor (Edge Functions, migrations, RLS, limites): valem para
  web e Android imediatamente apos deploy/aplicacao no Supabase.
- Mudancas de tela (arquivos em app/ e components/): so chegam ao Android com
  uma NOVA VERSAO do app na Play Store (nao ha expo-updates no package.json).
  Agrupar as melhorias e gerar um novo build.
- Pagamento: na web o Plus e vendido via Mercado Pago. No app da Play Store,
  assinatura digital deve usar Google Play Billing (ja existem
  verify-google-play-subscription e google-play-rtdn). NAO oferecer Mercado
  Pago dentro do app Android.

## Roadmap oficial (proximas atualizacoes)

Fase 1 - Refinamentos
- [x] Avisos/erros visiveis na web (avisar() + AvisoGlobal) em biblioteca,
      mapa, resumo, simulado e resultado do simulado
- [ ] Mensagens de carregamento/erro mais claras; feedback de falha de
      upload/conexao
- [ ] Melhorar apresentacao do Historico
- [ ] Revisao de textos e pequenos ajustes visuais
- [ ] Comunicacao/branding do e-mail de confirmacao (painel Supabase)

Fase 2 - Desempenho e erros
- [x] (1a versao no Historico: simulados) Painel de desempenho e progresso (acertos, erros, aproveitamento,
      evolucao, desempenho por assunto, atividades recentes)
- [x] (1a versao: pratica sem salvar resultado) Revisar meus erros (refazer questoes erradas; exercicios focados)
- [ ] Painel de recomendacoes ("Sua maior dificuldade e X -> Estudar agora")

Fase 3 - Simulado
- [ ] Simulado 2.0 (quantidade, dificuldade, assuntos, cronometro, foco nas
      dificuldades)
- [x] (servidor: generate-quiz passa as ultimas 80 perguntas da apostila e pede questoes novas; PRECISA DE DEPLOY) Simulados sem repeticao excessiva (evitar perguntas ja usadas; ampliar
      cobertura dos assuntos da apostila)

Fase 4 - Mapa Mental
- [x] Indice/navegacao rapida pelos topicos principais (manter modelo
      expansivel aprovado)
- [x] (1a versao: pontos do topico, abrir PDF na pagina, atalhos para resumo e simulado; falta gerar questoes/explicacao so do topico com IA) "Estudar este topico" (resumo, explicacao ou questoes do assunto)

Fase 5 - Fonte e confianca
- [x] Camera no celular (web/iOS): usa a camera nativa do aparelho (foco, zoom, flash, alta resolucao); desktop segue com camera do navegador. Android app ja usa camera nativa
- [x] Resultado da questao: explicacao recolhida ("Ver explicacao completa"), etapas durante a analise, imagem sem faixa cinza, nome da apostila legivel
- [x] Foto ilegivel: aviso com dica, botao "Tirar outra foto" e uso devolvido (answer-question usa refund_feature_usage)
- [ ] Miniatura da foto no resultado (toque abre em tela cheia)
- [x] Fonte da resposta (apostila, pagina e botao "Abrir PDF na pagina N" em questao e historico; trecho exato fica para depois)
- [ ] Questao digitada: alem de fotografar, permitir que o usuario ESCREVA uma
      pergunta (na tela de Questao) e a IA responda com base nas apostilas dele.
      Observacoes: reaproveitar answer-question e o historico; contar no mesmo
      limite de questoes do plano; avaliar escolher qual apostila usar (ou todas).

Fase 6 - Novos recursos
- [ ] Flashcards inteligentes com repeticao espacada (Nao sei / Dificil /
      Sei / Facil)
- [ ] Plano de estudos personalizado (data da prova, tempo, dificuldades)

Futuro
- [ ] Resumo em audio, novos formatos de material, gamificacao/conquistas
- [ ] Cache/reutilizacao de conteudo gerado para reduzir custo da API OpenAI

## Ja feito na web (revisar no Android)

Servidor (ja vale para Android):
- Limite de apostilas conta CRIACOES (tabela material_creations); excluir nao
  devolve o limite. Free: total; Plus: por periodo de assinatura.
- Endurecimento de seguranca: sem escrita direta em materials; bucket
  study-materials com limite de tamanho e tipos permitidos; grants revisados.
- Limites: Free 1 apostila/5 questoes/1 resumo/1 simulado/1 mapa;
  Plus 10/50/10/10/5.

Telas (precisam de novo build do Android):
- avisar(): no Android usa Alert nativo (ok). Telas que ainda usam
  Alert.alert direto: app/index.tsx (botao voltar) e componentes de
  notificacao - so relevantes no celular.
- Biblioteca: envio de PDF agora aceita File do navegador e chama
  process-material apos criar a apostila (commit 26b51ad). CONFERIR no Android
  que o envio por URI continua funcionando e que o processamento ocorre.
- Aviso de limite de apostilas na biblioteca (banner).
- Pagina de callback de e-mail (PKCE): mensagem "Quase la!" - fluxo web.

Somente web (nao portar):
- Formulario de cartao Mercado Pago (Card Payment Brick) e plus.web.tsx.
- Ajustes de iOS/PWA em public/index.html.

## Pendencias externas

- Pagamento com cartao na web: aguardando relatos (erro CC_VAL_433 visto com
  cartao do proprio vendedor). Logs: Supabase > Edge Functions >
  mercadopago-plus > Logs.
- Primeira renovacao real do Plus: ~2026-12-27.
- Backup privado: migrations em estudiai-backend-backup (branch
  mercadopago-sandbox).
