# Decupa

App do time para o DevDay Community Hackathon São Paulo (OpenAI, 23/10/2026). Desafio 11, "Planejador de cenas para criadores": transformar uma ideia de vídeo num conjunto organizado de cenas. Cada mudança serve à demo do desafio.

Produto, design (arquivo no Paper) e o projeto de exemplo da iugu: `CONTEXT.md`.

## O desafio

- Entrada: um briefing. Saída: fichas de cena com descrição, diálogo e duração estimada.
- O usuário edita, reordena e exporta as cenas.
- Demo: montar um vídeo curto e revisar o plano depois de mudar o briefing.
- Limite de escopo: até 6 cenas, sem gerar imagem, áudio ou vídeo.
- Nota: funcional, criatividade, apresentação e cumprimento do desafio, 25% cada.

## IA

- A OpenAI só é chamada pelas funções da Vercel em `api/`, via AI SDK. A chave mora no servidor (`OPENAI_API_KEY`), então o site publicado funciona sem ninguém colar chave.
- O formato de cada pedido e resposta fica em `src/lib/ai/contract.ts` (Zod), usado pelo navegador e pelo servidor. Uma tarefa nova de IA é um arquivo novo em `api/` mais o seu schema no contrato.
- O app não gera imagens. O desenho de cada quadro vem do renderizador local (`src/lib/sketch.ts`).
- Modelo de texto: `gpt-6-luna`, o mais barato da OpenAI (decisão de 24/10/2026, para o uso aberto de 7 dias). Troque com `OPENAI_TEXT_MODEL` na Vercel, sem mudar código.
- As funções recusam pedidos de outros sites (cabeçalho `Origin`). Com o Upstash configurado, a IA fica limitada a 20 chamadas por minuto por rede.
- Imports relativos no caminho do servidor (`api/` → `src/lib/ai/contract.ts`, `server.ts` → `src/lib/types.ts`) levam `.js`: a Vercel roda `api/` como ESM no Node.
- Rodar local: `bun run dev` serve o Vite e as funções de `api/` (plugin em `vite.config.ts`), com as variáveis do `.env.local`. Modelo das variáveis em `.env.example`.

## Colaboração

- Login por e-mail e senha ou Google (quando configurado), convites por e-mail ou link, projetos compartilhados, chat do projeto e pasta de arquivos. Código do servidor em `src/server/`, contrato em `src/lib/collab/contract.ts`, sincronização em `src/lib/collab/sync.ts`.
- Armazenamento: Upstash Redis pela integração da Vercel (`KV_REST_API_URL` e `KV_REST_API_TOKEN`, com ou sem prefixo, como `STORAGE_KV_REST_API_URL`). Sem essas variáveis, o `bun run dev` guarda tudo em memória e a Vercel desliga a colaboração; o app continua funcionando só no navegador.
- Convite por e-mail precisa de `RESEND_API_KEY` (e `INVITE_FROM_EMAIL`). Sem ela, o app mostra o link para copiar.
- Os projetos de exemplo são de cada navegador (`example: true`); ao compartilhar, viram projeto da conta.
- Convite é do e-mail destinatário. Não expor tokens em listagens para e-mails não verificados: contas com senha usam o link entregue; Google verificado pode listar convites. Papel Cliente só altera notas/mensagens próprias.
- Na Vercel Hobby cabem 12 funções. Hoje são 11 em `api/`, incluindo `google.ts`.

- Google: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no servidor. Callback autorizado: `https://decupaai.vercel.app/api/google`; `GOOGLE_REDIRECT_URI` fixa o endereço. Authorization code + PKCE, estado vinculado ao navegador e uso único; não vincular automaticamente contas com senha por e-mail.
- Decisão de 26/10/2026: prancha 16:9 em preto e branco com imagem e ficha técnica separadas; formato de distribuição do projeto é metadado independente. Desenhos novos continuam locais/esquemáticos. Direção compartilhada em `src/lib/ai/storyboard.ts`. Revisão de briefing e cenas deve ser atômica, com recusa de edições concorrentes.

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

- Vercel: projeto ligado a este repositório no GitHub, no ar em https://decupaai.vercel.app. Cada push no `main` publica sozinho.
- Variáveis que o site precisa na Vercel: `OPENAI_API_KEY` para a IA e o Upstash (aba Storage) para a colaboração. Depois de mudar uma variável, faça um Redeploy.
- SEO: `index.html` (metadados e dados estruturados), `public/guia/storyboard-com-ia.html`, `public/robots.txt` e `public/sitemap.xml` usam o domínio acima. No build da Vercel, o plugin `siteUrl` do `vite.config.ts` troca esse domínio pelo de produção do projeto (`VERCEL_PROJECT_PRODUCTION_URL`); `SITE_URL` força outro.
- Chaves moram nas variáveis da Vercel ou no 1Password, sempre fora do git.

## Produto e visual

- Interface em PT-BR.
- O design final está no Paper, arquivo "Decupa" (telas `01 — Início` e `02 — Canvas`). Leia valores exatos de lá, nunca de prints.
- As cores e fontes do app moram em `src/index.css`: cinzas Zinc, azul da Apple `#0071E3` em botões e destaques, `#0066CC` em links, DM Sans na interface e Instrument Serif no logo.
- Vidro (utilitário `glass`) só no campo de briefing, na caixa de prompt e em pílulas sobre imagem. Nós e cartões de conteúdo são sólidos.
- Projeto de demo: iugu, Reels "Energia que vira potência", 30s em 5 cenas. Fora do roteiro: números, lucro, segurança, preço e apostas.
