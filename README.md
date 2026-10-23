# Decupa — do briefing ao storyboard

Planejador de cenas para criadores. O briefing vira até 6 cenas, cada uma com descrição, fala, duração, plano e movimento de câmera, num canvas onde dá para editar, reordenar e exportar.

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
vercel dev         # app + funções de IA em api/ (precisa de OPENAI_API_KEY)
bun run dev        # só o app, em http://localhost:5173 (a IA fica fora do ar)
bun run test       # testes (Vitest). Não use `bun test`: ele ignora o Vitest.
bun run build      # build de produção em dist/
```

> Se o `registry.npmjs.org` estiver bloqueado na sua rede, o `.npmrc` do projeto já aponta para o espelho oficial `registry.yarnpkg.com`.

O app abre com três projetos de demonstração: **iugu · Energia que vira potência** (Reels de 30s, 5 cenas), **Café Moinho · Tutorial** e **Studio Vila · Anúncio**. Os desenhos ficam em `public/demo/`. Na primeira abertura depois de uma mudança no seed, os dados locais antigos são apagados e a demonstração é recriada. Para recriar à mão, use **Configurações → Restaurar demo**.

## Roteiro de demonstração

1. **Briefing mudou**: no projeto da iugu, o briefing está na v2. As cenas 2, 3 e 4 têm uma versão “Briefing mudou” com o antes e depois.
2. **Histórico**: a cena 3 (Encaixe) tem quatro versões: a original, dois pedidos por prompt e a mudança de briefing. Use **Restaurar** para criar uma versão nova a partir de uma antiga, sem apagar nada.
3. **Prompt por cena**: selecione uma cena e peça uma mudança na caixa de baixo, ou use os atalhos “Só o desenho”, “Só o diálogo” e “Mais curta”. Arraste uma cena para reordenar, puxe o arco do canto para redimensionar e use **Nota** para colar um lembrete no canvas.
4. **Exportar**: PDF, roteiro em Markdown, shot list em CSV e pacote JSON.

## IA

A OpenAI transforma o briefing em até 6 cenas, refaz uma cena a partir de um pedido curto e reescreve só as cenas afetadas quando o briefing muda, sempre com saída estruturada (Zod). O app não gera imagens: o desenho de cada cena sai do renderizador local (`src/lib/sketch.ts`). Para rodar a IA localmente, defina `OPENAI_API_KEY` e use `vercel dev`, que serve o `api/` junto com o Vite.

Modelo: `gpt-6.1-sol`, definido em `src/lib/ai/server.ts`. As chamadas passam pelas funções em `api/`, então a chave nunca chega ao navegador. O formato de cada pedido e resposta fica em `src/lib/ai/contract.ts`, usado pelos dois lados.

## Linguagem visual dos quadros

- **Nós de cena** no estilo do Magnific (Paper, `02 — Canvas`): o desenho ocupa o cartão no formato da cena, com a pílula de versão, a fala e as pílulas de plano, câmera e formato embaixo.
- **Renderizador local** (`src/lib/sketch.ts`): desenha cada cena nova a partir da descrição, com traço preto fino, cinza claro, azul só nos objetos-chave e uma seta vermelha para o movimento de câmera. Os projetos de exemplo usam desenhos prontos de `public/demo/`, que a IA nunca substitui.
- Em desenvolvimento, `#/lab` mostra uma galeria do renderizador com todos os enquadramentos.

## Arquitetura e decisões

**Stack:** Vite + React 18 + TypeScript, Tailwind CSS v4, React Flow (`@xyflow/react`), Dexie (IndexedDB), Zustand, AI SDK com a OpenAI nas funções da Vercel, pdf.js e mammoth (anexos do briefing, carregados sob demanda).

- **Sem banco no servidor, por decisão do time**: o estado fica no navegador (IndexedDB). O único código de servidor são as funções de IA em `api/`. O Dexie propaga as mudanças entre abas da mesma origem. Escolhemos Vite em vez de Next.js porque não há páginas renderizadas no servidor.
- **Camada de domínio única** (`src/lib/repo.ts`): toda mutação autoriza o ator pelo papel no projeto e trata revisões e imagens como *append-only*.
- **Versionamento** (`Revision`): hash curto, autor, mensagem, snapshot imutável da cena e, quando veio da IA, o pedido, o modelo, a latência e o resumo do que mudou. Restaurar cria uma nova revisão.
- **Cópia de trabalho × versão**: editar a ficha deixa a cena “sem versão” até alguém salvar a versão.
- **Concorrência**: se a cena ganhou uma versão enquanto a IA trabalhava, `reviseScene` recusa o resultado em vez de sobrescrever.
- **Segurança**: o briefing, os anexos e os pedidos entram no prompt como dados, nunca como instruções.

### Mapa do código

```
src/lib/         domínio: types, db (Dexie), repo (mutações+permissões), context (rótulos de plano e câmera),
                 briefing e scenes (IA), ai/ (openai, contract, server), sketch* (renderizador local), session, seed
api/             funções da Vercel que chamam a OpenAI (plan-briefing, revise-scene, apply-briefing)
src/views/       Home (início: campo de briefing, mural, projetos; peças em home/), Workspace
src/views/workspace/  SceneCanvas (React Flow: briefing, cenas, notas, zoom), nodes/ (BriefingNode, SceneNode, NoteNode),
                 Inspector (Versões e Ficha), PromptBox, ExportMenu, scene (rótulos e formatos)
src/test/        testes de repo (revisões, permissões), scenes (IA por cena e briefing) e do renderizador local
```

## Limitações conhecidas

- **Sem banco no servidor**: autenticação, permissões e “tempo real” valem dentro de **um navegador**, entre abas. As identidades são de demonstração. Para produção, o caminho é trocar o `db` por um backend com auth (por exemplo Supabase: Postgres + RLS, Realtime e Storage com URLs assinadas), mantendo `repo.ts` como contrato.
- **Fora do escopo do MVP**: desfazer/refazer granular na ficha (a restauração de versões já existe).
