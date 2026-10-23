# Decupa

App do time para o DevDay Community Hackathon São Paulo (OpenAI, 23/10/2026). Desafio 11, "Planejador de cenas para criadores": transformar uma ideia de vídeo num conjunto organizado de cenas. Cada mudança serve à demo do desafio.

## O desafio

- Entrada: um briefing. Saída: fichas de cena com descrição, diálogo e duração estimada.
- O usuário edita, reordena e exporta as cenas.
- Demo: montar um vídeo curto e revisar o plano depois de mudar o briefing.
- Limite de escopo: até 6 cenas, sem gerar imagem, áudio ou vídeo.
- Nota: funcional, criatividade, apresentação e cumprimento do desafio, 25% cada.

## Decisão em aberto: a IA

Duas versões da OpenAI existem e o time ainda não escolheu:

- `main` (Guilherme): chave no navegador, nas Configurações. Gera e edita imagens com GPT Image.
- Versão local do André: chave só no servidor, em funções da Vercel em `api/`, via AI SDK. Não gera imagens; o desenho vem do renderizador local (`src/lib/sketch.ts`).

Enquanto isso, deixe `src/lib/ai/`, `src/lib/settings.ts` e `src/components/SettingsModal.tsx` como estão. Troque esta seção pela decisão quando ela sair.

## Trabalho em dupla no `main`

Duas pessoas, cada uma com seu agente, fazem push no mesmo `main`.

- Rode `git pull --rebase` antes de começar e antes de cada push.
- Faça commits pequenos, um assunto por commit, e suba logo.
- Antes de reescrever um arquivo, veja quem mexeu nele hoje: `git log --since=midnight -- <arquivo>`. Se foi a outra pessoa, combine antes.
- Antes do push: `bun run test`, `bun run typecheck` e `bun run build` passando.
- Registre aqui cada decisão do time que o código não mostra. Apague a linha quando ela deixar de valer.

## Bun

- O lockfile é `bun.lock`. Instale com `bun install`. Com um segundo lockfile, cada máquina pode instalar versões diferentes.
- `overrides.vite` no `package.json` força uma versão só do Vite. Sem ele, o Bun dá ao Vitest um Vite próprio e o `tsc` rejeita a chave `test` do `vite.config.ts`.

## Publicação

- Vercel: projeto `andre-dezzy/decupa`, no ar em https://decupa-ten.vercel.app. Publique com `vercel deploy --prod`, na conta do André.
- O repositório não está ligado à Vercel: push não publica.
- Chaves moram nas variáveis da Vercel ou no 1Password, sempre fora do git.

## Produto e visual

- Interface em PT-BR.
- Projeto de demo: Payme, Reels de lançamento de 30s em 5 cenas: Gancho (4s), Problema (6s), Virada (6s), Solução (8s), CTA (6s). Mote: "Tenha seu próprio gateway de pagamentos".
- Visual escandinavo, desenhado no Paper (arquivo "Fancy meadow"):
  - Cores: fundo `#F4F1EB`, cartões `#FBFAF7`, linhas `#E4DED3`, texto `#1F1E1B`, cinza `#77736B`, destaque verde-musgo `#3F5A4A`, preenchimento `#F0ECE4`.
  - Fonte DM Sans, títulos com peso 500. Cantos de 14px. Linhas finas no lugar de sombras.
  - Botões carvão com texto claro. Campo de briefing em pílula.
