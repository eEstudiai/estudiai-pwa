# EstudaIA — MVP 0.1

App mobile Android/iPhone para cadastrar apostilas PDF e fotografar questões. O código já possui navegação, banco SQLite local, seleção de PDF e câmera. A camada de IA está isolada em `services/ai.ts` para receber o backend RAG.

## Rodar
1. Instale Node.js LTS.
2. `npm install`
3. `npx expo start`
4. Abra no Expo Go ou use `npm run android` / `npm run ios`.

## Próximo backend
- Supabase Auth + Postgres + Storage.
- Worker/API para receber PDF, indexar e manter `material_id`, página e status.
- OpenAI Responses API + File Search/Vector Stores para consultar as apostilas.
- OCR multimodal da foto da questão.
- Regra de segurança: se a fonte não sustentar uma resposta, retornar "não foi possível confirmar nas apostilas".
- Nunca colocar `OPENAI_API_KEY` dentro do aplicativo.

## Regra de Matemática Financeira + HP-12C

O arquivo `services/ai.ts` contém a instrução `STUDY_INSTRUCTION`, que deverá ser enviada pelo backend ao modelo junto com a busca nas apostilas.

Quando a questão for de Matemática Financeira, o EstudaIA deve:

- consultar prioritariamente `Apostila_Matematica_Financeira_Versao_2026.pdf`;
- seguir a metodologia e as convenções da apostila;
- priorizar a HP-12C nos cálculos em que ela é aplicável;
- conferir a unidade de taxa e período;
- respeitar sinais e `CHS`;
- apresentar a sequência de teclas da HP-12C;
- conferir o resultado e as alternativas;
- usar fórmula quando a própria apostila orientar que a HP-12C resolve apenas parcialmente o cálculo (como nos cálculos de juros `J`).

A apostila orienta que a HP-12C é utilizada como ferramenta de auxílio aos cálculos e destaca sua utilidade especialmente em juros compostos e séries de pagamentos. Também orienta conferir a questão após a resolução. Essas regras devem permanecer no prompt do backend, não apenas na interface do aplicativo.
