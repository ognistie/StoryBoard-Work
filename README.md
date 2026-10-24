# Decupa — do briefing ao storyboard

Planejador de cenas para criadores. O briefing vira até 6 cenas, cada uma com descrição, fala, duração, plano e movimento de câmera, num canvas onde dá para editar, reordenar e exportar. Times trabalham juntos: login por e-mail, convites, chat do projeto com IA e uma pasta de arquivos com versões.

O diferencial é a **edição conversacional e incremental**: escreva só o que quer mudar numa cena, ou edite o briefing, e a IA refaz apenas o que foi afetado. Cada mudança vira uma versão, com antes e depois, no estilo dos commits do GitHub.

**Demo no ar:** https://decupa-hackathon.vercel.app

<p align="center">
  <a href="docs/media/demo.mp4"><img src="docs/media/demo.gif" alt="Vídeo: o Decupa funcionando" width="49%"></a>
  <a href="docs/media/paper.mp4"><img src="docs/media/paper.gif" alt="Vídeo: o design do Decupa no Paper" width="49%"></a>
</p>

À esquerda, o app funcionando. À direita, o design no Paper. Clique num vídeo para abrir o original em alta qualidade.

Se a prévia demorar a carregar, os vídeos também estão no CleanShot: [app funcionando](https://cleanshot.com/share/x0frYWc0) e [design no Paper](https://cleanshot.com/share/SXlsQ7YG).

## Rodando

```bash
bun install
bun run dev        # app + funções de api/ em http://localhost:5173
bun run test       # testes (Vitest). Não use `bun test`: ele ignora o Vitest.
bun run build      # build de produção em dist/
```

O `bun run dev` serve as funções de `api/` pelo próprio Vite (plugin em `vite.config.ts`) e lê as variáveis do `.env.local`, que fica fora do git. Copie `.env.example` para `.env.local` e preencha:

| Variável | Para quê | Sem ela |
|---|---|---|
| `OPENAI_API_KEY` | IA (cenas, revisões, chat com @ia) | a IA avisa que está sem chave |
| `OPENAI_TEXT_MODEL` | troca o modelo de texto | `gpt-6-luna` |
| `KV_REST_API_URL` e `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`) | contas, projetos compartilhados, chat e pasta do time | local: memória (some ao reiniciar); na Vercel: colaboração desligada |
| `RESEND_API_KEY` e `INVITE_FROM_EMAIL` | manda o convite por e-mail | o app mostra o link do convite para copiar |

> Se o `registry.npmjs.org` estiver bloqueado na sua rede, o `.npmrc` do projeto já aponta para o espelho oficial `registry.yarnpkg.com`.

O app abre com três **exemplos para explorar**: **iugu · Energia que vira potência** (Reels de 30s, 5 cenas), **Café Moinho · Tutorial** e **Studio Vila · Anúncio**. Cada navegador tem sua própria cópia dos exemplos, com dicas interativas no canvas; ao compartilhar um exemplo, ele vira um projeto seu. Os desenhos ficam em `public/demo/`. Para recriar os exemplos, use **Configurações → Restaurar exemplos**.

## Roteiro de demonstração

1. **Briefing mudou**: no projeto da iugu, o briefing está na v2. As cenas 2, 3 e 4 têm uma versão “Briefing mudou” com o antes e depois.
2. **Histórico**: a cena 3 (Encaixe) tem quatro versões: a original, dois pedidos por prompt e a mudança de briefing. Use **Restaurar** para criar uma versão nova a partir de uma antiga, sem apagar nada.
3. **Prompt por cena**: selecione uma cena e peça uma mudança na caixa de baixo, ou use os atalhos “Só o desenho”, “Só o diálogo” e “Mais curta”. Arraste uma cena para reordenar, puxe o arco do canto para redimensionar e use **Nota** para colar um lembrete no canvas.
4. **Exportar**: PDF, roteiro em Markdown, decupagem em CSV e pacote JSON. **Salvar roteiro e decupagem na pasta** guarda uma nova versão de cada um na pasta do projeto.
5. **Time**: entre com e-mail e senha, abra um projeto e clique em **Compartilhar**. Convide pelo e-mail, com papel de Produção, Edição, Cliente ou Leitura. Quem entra vê as mesmas cenas, versões, notas, chat e pasta, sincronizados a cada poucos segundos, e quem está online aparece no topo.
6. **Chat com IA**: no chat do projeto, comece com `@ia` (ou ligue o botão de brilho). A IA lê o briefing e as cenas e responde com sugestões que qualquer editor aplica com **Aplicar na cena**.

## IA

A OpenAI transforma o briefing em até 6 cenas, refaz uma cena a partir de um pedido curto, reescreve só as cenas afetadas quando o briefing muda e responde no chat do projeto, sempre com saída estruturada (Zod). O app não gera imagens: o desenho de cada cena sai do renderizador local (`src/lib/sketch.ts`).

**Modelo:** `gpt-6-luna` (`DEFAULT_TEXT_MODEL` em `src/lib/ai/contract.ts`; troque com `OPENAI_TEXT_MODEL`). É o mais barato da geração atual da OpenAI: US$ 0,10 por milhão de tokens de entrada e US$ 0,50 de saída, 20 vezes menos que o `gpt-6.1-sol` (US$ 2 e US$ 10), preços de outubro de 2026. Um planejamento de briefing gasta perto de 1.500 tokens de entrada e 1.500 de saída, cerca de US$ 0,001. Mil chamadas por dia durante 7 dias custam por volta de US$ 7. Com o Upstash configurado, cada rede pode fazer 20 chamadas de IA por minuto, para proteger o orçamento (sem ele, não há limite).

As chamadas passam pelas funções em `api/`, então a chave nunca chega ao navegador. Pedidos de outros sites são recusados. O formato de cada pedido e resposta fica em `src/lib/ai/contract.ts`, usado pelos dois lados.

## Linguagem visual dos quadros

- **Nós de cena** no estilo do Magnific (Paper, `02 — Canvas`): o desenho ocupa o cartão no formato da cena, com a pílula de versão, a fala e as pílulas de plano, câmera e formato embaixo.
- **Renderizador local** (`src/lib/sketch.ts`): desenha cada cena nova a partir da descrição, com traço preto fino, cinza claro, azul só nos objetos-chave e uma seta vermelha para o movimento de câmera. Os projetos de exemplo usam desenhos prontos de `public/demo/`, que a IA nunca substitui.
- Em desenvolvimento, `#/lab` mostra uma galeria do renderizador com todos os enquadramentos.

## Arquitetura e decisões

**Stack:** Vite + React 18 + TypeScript, Tailwind CSS v4, React Flow (`@xyflow/react`), Dexie (IndexedDB), Zustand, AI SDK com a OpenAI nas funções da Vercel, pdf.js e mammoth (anexos do briefing, carregados sob demanda).

- **Local primeiro, servidor para o time**: cada navegador guarda tudo no IndexedDB e funciona sem conexão. Projetos compartilhados também ficam no servidor (Upstash Redis via REST, sem SDK), num log por projeto: cada gravação ganha um número de sequência e cada navegador puxa o que mudou depois do último número que viu. Um envio ainda em andamento deixa um marcador, e ninguém avança o cursor além dele, então nenhuma mudança se perde quando duas pessoas salvam ao mesmo tempo. Nome, membros e data de atualização ficam em chaves separadas, cada membro num campo próprio: renomear e aceitar convite ao mesmo tempo não se atropelam. Os registros são comparados por hash com o último acordo com o servidor, então só sobe o que mudou. Imagens e arquivos sobem antes dos registros que apontam para eles. Conflito na mesma cena: vence a última gravação; versões, imagens e arquivos são só de acréscimo, então o histórico nunca se perde.
- **Contas e sessões** (`src/server/auth.ts`): e-mail e senha com PBKDF2-SHA256 (Web Crypto), sessão em cookie `HttpOnly`, `SameSite=Lax`, guardada só como hash. Limite de tentativas por e-mail e por rede.
- **Permissões no servidor** (`src/server/projects.ts`): só membros leem um projeto (os outros recebem 404); quem é Cliente escreve só no chat e nas notas; Leitura não escreve. Um registro só entra no projeto se o `projectId` dele for o do projeto, e o navegador nunca sobrescreve um registro de outro projeto com o mesmo id.
- **Camada de domínio única** (`src/lib/repo.ts`): toda mutação autoriza o ator pelo papel no projeto e trata revisões e imagens como *append-only*.
- **Versionamento** (`Revision`): hash curto, autor, mensagem, snapshot imutável da cena e, quando veio da IA, o pedido, o modelo, a latência e o resumo do que mudou. Restaurar cria uma nova revisão.
- **Cópia de trabalho × versão**: editar a ficha deixa a cena “sem versão” até alguém salvar a versão.
- **Concorrência**: se a cena ganhou uma versão enquanto a IA trabalhava, `reviseScene` recusa o resultado em vez de sobrescrever.
- **Segurança**: o briefing, os anexos e os pedidos entram no prompt como dados, nunca como instruções.

### Mapa do código

```
src/lib/         domínio: types, db (Dexie), repo (mutações+permissões), context (rótulos de plano e câmera),
                 briefing, scenes e assistant (IA), ai/ (openai, contract, server), collab/ (contrato, login,
                 sincronização, convites), zip, sketch* (renderizador local), session, seed
src/server/      código só do servidor: kv (Upstash ou memória), http (origem, cookies, limite), auth, projects
api/             funções da Vercel: IA (plan-briefing, revise-scene, apply-briefing, assistant), health,
                 auth, projects, invites, sync e blob
src/views/       Home (início: campo de briefing, mural, projetos; peças em home/), Workspace
src/views/workspace/  SceneCanvas (React Flow: briefing, cenas, notas, zoom), nodes/ (BriefingNode, SceneNode, NoteNode),
                 Inspector (Versões e Ficha), ChatPanel, FilesPanel, ShareModal, PromptBox, ExportMenu,
                 exporters (roteiro e decupagem)
src/test/        testes de repo, scenes, renderizador, colaboração (rotas reais em memória) e zip
public/guia/     guia público de storyboard e IA, para busca orgânica (pesquisa em docs/pesquisa-mercado-seo.md)
```

## Limitações conhecidas

- **Tempo real por consulta**: cada navegador pergunta ao servidor a cada 4 segundos com a aba visível (funções da Vercel não seguram WebSocket). Para mais escala, o próximo passo é um canal de eventos (por exemplo Upstash QStash ou um serviço de WebSocket).
- **Arquivos até 3 MB**, guardados no Redis. Para arquivos maiores, o caminho é o Vercel Blob com URLs assinadas.
- **Senha sem recuperação por e-mail**: falta o fluxo de “esqueci a senha”.
- **Fora do escopo do MVP**: desfazer/refazer granular na ficha (a restauração de versões já existe).
