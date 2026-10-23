# Frameline — Storyboard colaborativo com IA

Workspace de pré-produção audiovisual onde produtora e cliente planejam, editam com IA, comparam, aprovam e versionam quadros de storyboard.

O diferencial é a **edição conversacional e incremental**: o usuário seleciona um ou vários quadros, escreve só o que quer mudar (“Adicionar mais uma pessoa à direita, mantendo o restante”) e recebe uma prévia por quadro. A prévia vem com Antes/Depois, aceite individual e registro no histórico de versões, no estilo dos commits do GitHub.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 25 testes (Vitest)
npm run build      # build de produção em dist/
```

> Se o `registry.npmjs.org` estiver bloqueado na sua rede, o `.npmrc` do projeto já aponta para o espelho oficial `registry.yarnpkg.com`.

O app abre com um projeto de demonstração (“Casa Nova — Filme 30””): 9 quadros, roteiro, regras de continuidade, personagens, comentários e aprovações. Para recriar os dados, use **Configurações → Restaurar demo**.

## Roteiro de demonstração (3 minutos)

1. **Edição em lote**: no projeto Casa Nova, clique no quadro 01 e dê Shift+clique no 04. Clique em **Editar com IA**, escreva *“Adicionar Bia à direita, mantendo o restante”* e gere a prévia. Enquanto a IA trabalha, você pode continuar navegando. Depois, compare Antes/Depois e clique em **Aceitar todos**. O quadro 01, que já estava aprovado, passa a mostrar **Revalidar**.
2. **Histórico e diff**: abra a aba Histórico do quadro e clique na versão. O diff mostra o slider Antes/Depois, a diferença do prompt-base, a instrução, o prompt estruturado e o contexto usado. Use **Restaurar** para criar uma nova versão sem apagar nada.
3. **Cliente e conflito com o roteiro**: troque para **Júlia (Cliente)** no avatar. Peça *“Deixar a cena à noite”* no quadro 04. A plataforma avisa que o roteiro descreve a cena como DIA e cita a regra da marca. Confirme a exceção com uma justificativa e clique em **Enviar proposta**.
4. **Decisão da produtora**: volte para **Marina**. O botão “1 proposta do cliente” aparece na barra; aceite ou recuse a proposta. Ao aceitar, nasce uma revisão de autoria da Júlia, com a aprovação da Marina registrada.
5. **Tempo real**: abra o mesmo projeto em outra aba e escolha outro usuário. Comentários, presença (avatar sobre o quadro que a pessoa está vendo) e novas versões aparecem sem recarregar.
6. Também vale mostrar: **Apresentar** (modo cliente e animatic com as durações), **Exportar** (PDF, shot list em CSV e pacote JSON), **Roteiro** (editar o texto sinaliza os quadros afetados) e **Equipe** (matriz de permissões).

## IA: provedores

| Provedor | O que faz | Como ativar |
|---|---|---|
| **Demonstração local** (padrão) | **Não é IA.** Desenha esboços a lápis paramétricos e entende pedidos simples: adicionar ou remover pessoa ou personagem, noite/dia/pôr do sol, chuva, close/plano aberto e objetos. Serve para demonstrar o fluxo completo offline. A interface identifica esse modo em todos os lugares. | Já vem ativo |
| **Google Gemini** | Edição multimodal real: o quadro atual vai como imagem de entrada junto com o prompt estruturado e as referências dos personagens. Também reescreve a descrição, descreve imagens importadas e faz a decupagem do roteiro em quadros (JSON estruturado). | Configurações → Google Gemini → colar a chave do [AI Studio](https://aistudio.google.com/apikey) → Testar. Também dá para usar `VITE_GEMINI_API_KEY` num arquivo `.env.local`. |

Modelos padrão: `gemini-2.5-flash-image` (imagem) e `gemini-2.5-flash` (texto). Os dois podem ser trocados nas configurações.

A interface `AIProvider` (`src/lib/ai/types.ts`) declara as capacidades de cada provedor (`editImage`, `generateImage`, `maskedRegion: native | guided | none`, `progressivePreview`). Como o Gemini não aceita máscara, a edição regional é **guiada**: o app envia uma cópia do quadro com a área contornada e as coordenadas em texto, e avisa isso na tela.

## Arquitetura e decisões

**Stack:** Vite + React 18 + TypeScript, Tailwind CSS v4, Dexie (IndexedDB), Zustand, dnd-kit, lucide, pdf.js e mammoth (carregados sob demanda).

- **Sem backend, por decisão do time**: o estado fica no navegador (IndexedDB). O Dexie propaga as mudanças entre abas da mesma origem, o que dá o “tempo real” entre Produtora e Cliente. A presença usa `BroadcastChannel`. Escolhemos Vite em vez de Next.js porque não existe servidor.
- **Camada de domínio única** (`src/lib/repo.ts`): toda mutação autoriza o ator pelo papel no projeto, grava um evento de auditoria e trata revisões e imagens como *append-only*.
- **Versionamento** (`Revision`): hash curto, autor, mensagem, snapshot imutável do quadro, registro de IA (instrução, prompt-base, prompt estruturado, provedor, latência, trechos de contexto e exceção autorizada). Restaurar cria uma nova revisão.
- **Cópia de trabalho × versão**: editar metadados deixa o quadro “não versionado” até alguém registrar a versão. A aprovação sempre aponta para uma revisão exata e registra antes as alterações pendentes.
- **Candidatos × versões**: o resultado da IA é um `GenerationJob` com imagem candidata e nunca substitui a imagem atual sozinho. Editor ou produtor aceita e vira revisão. Quando o cliente aceita, vira `Proposal`, e a produtora decide.
- **Concorrência**: o aceite faz *compare-and-set* com a revisão-base do job. Se o quadro mudou durante a geração, o app avisa e só aplica com confirmação explícita, sem sobrescrever nada em silêncio.
- **Fila de jobs** (`src/lib/jobs.ts`): assíncrona, 2 jobs em paralelo, status persistido (preparando → gerando prévia → refinando → pronto/erro), cancelamento, refazer e limite de gerações. A latência é medida da solicitação até a prévia e até o resultado final. Jobs abandonados por uma aba fechada são marcados como interrompidos.
- **Motor de contexto** (`src/lib/context.ts`):
  - parser de roteiro (INT./EXT., personagens, falas e período do dia);
  - divisão do roteiro por cena e dos demais documentos por seção, sempre com origem rastreável;
  - busca BM25 com peso maior para o roteiro e para a cena do quadro;
  - detecção de conflitos: período do dia, personagem fora da cena, remoção de personagem do roteiro e regras do tipo “sempre/nunca”;
  - prompt estruturado com hierarquia (preservar → alteração → região → personagens → contexto).
- **Segurança**:
  - documentos importados entram no prompt como **dados delimitados**, sem poder de instrução, e os delimitadores são neutralizados;
  - documentos **confidenciais** não chegam a clientes nem a prompts pedidos por clientes, e o diff esconde trechos e prompts derivados deles;
  - links de convite usam tokens aleatórios, expiram e podem ser revogados.

### Mapa do código

```
src/lib/         domínio: types, db (Dexie), repo (mutações+permissões), context (roteiro/RAG/conflitos),
                 jobs (fila IA), ai/ (gemini, demo), sketch* (renderizador local), session, presence, seed
src/views/       Dashboard, NewProjectModal, JoinView, Workspace
src/views/workspace/  Canvas, FrameCard, Sidebar, RightPanel (IA, Detalhes, Comentários, Contexto, Histórico),
                 AIPanel, DiffModal, Viewer (anotações), Presentation (animatic), Share, Export, Script, Context,
                 Assets, History (versões/atividade/marcos), Team
src/test/        testes de contexto/regras/edição demo e de repo (revisões, aprovação, propostas, concorrência, permissões)
```

## Limitações conhecidas

- **Sem servidor**: autenticação, permissões e “tempo real” valem dentro de **um navegador**, entre abas. Links de convite só funcionam nesse mesmo navegador. As identidades são de demonstração e escolhidas no avatar. Para produção, o caminho é trocar o `db`/`presence` por um backend com auth (por exemplo Supabase: Postgres + RLS, Realtime, Storage com URLs assinadas e pgvector para a busca de contexto), mantendo `repo.ts` como contrato.
- **Chave do Gemini no navegador**: aceitável para a demo, já que fica salva só localmente. Em produção, as chamadas devem passar por um backend.
- **Modo demo**: entende um vocabulário limitado e avisa quando não entende o pedido. Não imita uma IA real.
- **Busca de contexto** é lexical (BM25), sem embeddings.
- **Fora do escopo do MVP**: menções com notificação por e-mail, comentários em regiões retangulares (hoje são pontos) e desfazer/refazer granular para metadados (a restauração formal já existe).
