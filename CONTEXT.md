# Decupa — contexto do produto e do design

Este arquivo guarda o evento, o produto, o design e o projeto de exemplo. Código, IA e regras do time ficam no `AGENTS.md` e no `README.md`.

## O evento

- **DevDay Community Hackathon São Paulo**, da OpenAI. 23/10/2026, das 8h às 18h, na Universidade Anhembi Morumbi (Mooca).
- **Entrega:** vídeo de até 3 minutos, projeto num repositório e projeto publicado na web (prazo oficial: 16h).
- Times de até 4 pessoas. Escolher 1 ou mais desafios.
- **Critérios, 25% cada:** Funcional, Criatividade, Apresentação, Cumpre o objetivo do desafio.
- Lista de desafios: https://docs.google.com/document/d/1ST4scZYa_JyocXzdOMpy5yfxvdpADDOJ-_On4IPvb_0/edit

## O desafio escolhido: 11, "Planejador de cenas para criadores"

- Receber um briefing, produzir fichas com descrição, diálogo e duração estimada, e permitir editar, reordenar e exportar.
- Demo: montar um vídeo curto e revisar o planejamento depois de uma mudança no briefing.
- O "limite de escopo" (até 6 cenas, sem gerar imagens) não está nas regras do evento. Mesmo assim, o app não gera imagens (ver `AGENTS.md`). Os desenhos da demonstração (`public/demo/`) são imagens prontas, feitas fora do app.

## O produto: Decupa

**Tela 1, início**
- Cabeçalho mínimo: logo "Decupa" em **Instrument Serif** (sem ícone) à esquerda e avatar à direita, alinhados com a largura do campo.
- Título "O que vamos criar hoje?" e subtítulo "Cole o briefing. O roteiro e o storyboard aparecem cena por cena."
- Campo de texto em pílula, em vidro (glassmorphism), com +, formato (Reels · 9:16), duração (30s) e botão azul de enviar.
- "Seus projetos. Continue de onde parou." com 3 cartões em mosaico (quadro grande + 2 pequenos): iugu, Café Moinho, Studio Vila.
- Fundo: imagem clara gerada (dourado à esquerda, vermelho à direita, granulado).
- Mural: 4 quadros de storyboard flutuando nas bordas, inclinados; os 2 de baixo com 60% de opacidade. No app, vêm dos projetos mais recentes e abrem o projeto ao clicar.

**Tela 2, canvas** (layout "painel dentro de painel", como o Magnific Spaces)
- Moldura cinza com cabeçalho: voltar, "Projetos › nome do projeto", "5 cenas · 30 de 30s", botões redondos de Chat e Arquivos, play (abre a apresentação), botão azul em pílula **Compartilhar** (no Paper ainda se chama "Publicar") e avatar com o menu da conta.
- Canvas num painel arredondado com grade de pontos, zoom 80%.
- Nó do briefing no topo, ligado às cenas.
- **Nós de cena no estilo do Magnific:** a imagem ocupa o cartão inteiro; o cartão segue o formato da cena (9:16 por padrão, cada cena pode ter o seu, ex.: 1:1). Em cima à direita, pílula de versão "‹ 3/3 ›" (azul quando a cena foi refeita). Embaixo, sobre sombra escura: quem fala, a fala, a descrição, e pílulas de plano, câmera (ponto vermelho) e formato. Acima do cartão: nome, "Cena N" e duração.
- Redimensionar: arco cinza no canto inferior esquerdo, aparece no hover e na seleção.
- Painel lateral de versões da cena selecionada (sem bolinhas): cada versão mostra o prompt que a gerou; "Briefing mudou" mostra o antes e depois; "Restaurar".
- Caixa de texto em vidro, fixa embaixo e centralizada na tela, com etiqueta "Cena 3 · Encaixe" e atalhos "Só o desenho", "Só o diálogo", "Mais curta".
- **Notas (post-its):** botão de nota ao lado do zoom, só com o ícone de post-it. A nota fica solta no canvas, como no FigJam, e não é presa a uma cena. Parece um post-it de papel: quadrada, amarela, levemente torta, com textura de papel, faixa de cola no topo e uma sombra leve de ponta levantada. Texto em letra de mão (**Caveat**); autor e hora em DM Sans pequeno.

**Tela 3, apresentação em tela cheia**
- O play do canvas mostra o storyboard em tela cheia. Cada cena fica na tela pelo tempo da sua duração e passa sozinha para a próxima, com fade e um movimento leve conforme a câmera da cena.
- Barra no topo com um segmento por cena, do tamanho da duração dela. A fala aparece embaixo do desenho.
- No computador: fundo escuro com a imagem borrada atrás, título da cena em Instrument Serif, "A seguir" com a próxima cena e controles (voltar, pausar, avançar, tempo e loop). No celular, o desenho ocupa a tela toda, como um Reels.
- Especificação: `docs/apresentacao.md`.

## Design

Arquivo no Paper: **"Decupa"** (id `01M5MMZ6NG5SRKR97J85Q5QTFT`), com as telas `01 — Início`, `02 — Canvas` e `03 — Apresentação`, cada uma também nas versões Tablet e Mobile (a apresentação tem desktop e Mobile).

- **Paleta:** cinzas Tailwind **Zinc** (fundo zinc-50, linhas zinc-200, textos zinc-500 a 900) e azul da Apple **#0071E3** nos botões e destaques, **#0066CC** nos links.
- **Fonte:** DM Sans na interface, Instrument Serif no logo, Caveat nas notas.
- **Vidro:** só no campo de texto, na caixa de prompt e em pílulas sobre imagem. Os nós de conteúdo não são de vidro.

**Gostos do André:** sem gradiente de fundo na UI (o fundo é imagem); campo 100% redondo; cabeçalho sem fundo; nada de creme; paletas famosas; desenhos simples e limpos; "3/3" em vez de "v3"; cantos arredondados normais (testou `corner-shape: superellipse` e não gostou); não falar de horário nem pressionar com prazo.

## Projeto de exemplo: iugu

- **Pesquisa completa:** `docs/pesquisa-iugu/relatorio.md` (notas das fontes em `docs/pesquisa-iugu/notas/`).
- **Resumo:** a iugu (https://www.iugu.com/) é instituição de pagamento (Bacen desde 2020), fundada em 2012 numa garagem em Dourados (MS). Vende infraestrutura financeira modular: Cobrança, Recorrência, Split, BaaS. Marca: logo preto, um azul (#5274FF), Museo Sans, assinatura **"tecnologia que vira potência"** (manifesto dos 10 anos, 2022). Nunca usou agência, TV ou celebridade. Em 2025 teve prejuízo de R$ 97,2 mi, com perdas por fraude de clientes.
- **Riscos para o anúncio:** evitar números (R$ 81 bi, 150 mil contas: as fontes divergem), lucro/crescimento, segurança/antifraude, preço, apostas.
- **Reels "Energia que vira potência" (30s, 5 cenas):**
  1. A fórmula (4s, detalhe, push-in): mão escreve P = E/t; "Potência é energia a cada unidade de tempo."
  2. Energia escoa (7s, médio, time-lapse): gestora entre planilhas do dia até a noite; três pílulas com os problemas; "Processos repetitivos consomem sua energia devagar."
  3. Encaixe (6s, motion, zoom out): as três pílulas viram blocos e, com um quarto, formam o mosaico azul dos produtos; na tela, "Quatro produtos. Um ecossistema."; locução "Conciliação e cobrança no automático."
  4. Energia volta (7s, conjunto, travelling, formato 1:1): de manhã ela leva o time para a estratégia; "Isso é transformar energia em potência."
  5. Assinatura (6s, geral, fixa): blocos formam o símbolo; "iugu. Tecnologia que vira potência."

## Imagens

Feitas no Magnific (Google Nano Banana 2, 1K). Os originais ficam em `design/`. O app usa as versões otimizadas de `public/`.

- `design/storyboard/iugu/`: os 5 quadros da iugu, estilo simples (traço fino, azul só nos blocos, vermelho só na seta de câmera).
- `design/storyboard/cafe/` e `design/storyboard/studio/`: quadros dos outros 2 projetos.
- `design/storyboard/` (raiz), `9x16/` e `simples/`: versões antigas, do projeto Payme.
- `design/backgrounds/`: fundos da tela inicial (o atual é `bg-6-claro.png`).
- `design/textures/paper-grain.png`: textura de papel das notas.

As cenas novas, criadas no app, não usam IA de imagem. O desenho sai do desenhador local (`src/lib/sketch.ts`), com o estilo dos quadros da iugu: papel quase branco (#F8F8F8), traço fino, cinzas neutros, azul suave (#86A2F7) só nos objetos-chave, vermelho (#C84848) só na seta de câmera, sombras leves e muito espaço em branco. O André escolheu manter o app sem IA de imagem.

## Responsivo

Tablet e celular estão no Paper, ao lado das telas de desktop. O que muda em cada tamanho: `docs/responsivo.md`.

## Como o André gosta de conversar

- Português, respostas curtas, frases simples.
- Uma pergunta por mensagem, com opções A/B e uma recomendada.
- Nunca mencionar horário ou prazo.
