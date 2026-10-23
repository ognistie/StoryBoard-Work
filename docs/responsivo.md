# Decupa — especificação responsiva

Design no Paper: arquivo "Decupa" (`01M5MMZ6NG5SRKR97J85Q5QTFT`), página `p-1-0`. A fonte da verdade é o Paper: leia os valores exatos com `get_computed_styles` / `get_jsx`. Este arquivo resume o que muda em cada tamanho.

| Tela | Desktop (1440) | Tablet (768) | Celular (390) |
|---|---|---|---|
| Início | `91-0` "01 — Início" | `1PC-0` "01 — Início · Tablet" | `1RS-0` "01 — Início · Mobile" |
| Canvas | `9Y-0` "02 — Canvas" | `1U8-0` "02 — Canvas · Tablet" | `22W-0` "02 — Canvas · Mobile" |

Faixas sugeridas (Tailwind): celular abaixo de `md` (768px), tablet de `md` até abaixo de `xl` (1280px), desktop a partir de `xl`. Confirme o corte do canvas: o layout de desktop precisa de largura para o painel lateral.

Não muda em nenhum tamanho: cinzas Zinc, azul #0071E3 e links #0066CC, DM Sans, Instrument Serif no logo, Caveat nos post-its, vidro só no campo de prompt e em pílulas sobre imagem, cantos arredondados normais, textos em português.

## Início · Tablet (768×1024)

- Coluna de conteúdo com 688px (margens de 40px), centralizada.
- Cabeçalho: absoluto, top 28, left 40, largura 688, altura 72. Logo e avatar iguais ao desktop.
- Coluna: padding-top 150px. Espaços de 40px entre título, campo e projetos.
- Título 48/54 (desktop 54/60). Subtítulo 18/26 (desktop 19/28).
- Campo em pílula: largura 688, altura 68, tudo numa linha (+, texto, "Reels · 9:16", "30s", enviar).
- "Seus projetos.": 3 cartões lado a lado, gap 16, cada um com cerca de 219px. Mosaico com 150px de altura.
- Mural: só 2 quadros, embaixo, depois dos projetos. Fluxograma à esquerda (180px de largura, left −36, top 800, −8°) e moedor de café à direita (180px, left 612, top 788, +7°). Ambos com opacidade 1 e saindo pelas bordas.

## Início · Celular (390×844)

- Barra de status do iOS (62px). Cabeçalho no fluxo: 52px, padding 0 20px, logo e avatar nas pontas.
- Coluna: padding 36px no topo, 20px nas laterais, 40px embaixo. Espaço de 28px entre os grupos.
- Título 34/40, numa linha. Subtítulo 16/24, quebra depois de "storyboard". Não use `text-wrap: balance`.
- Campo em pílula: 350×60, padding 0 8px, botões + e enviar com 44px. Placeholder 16/24 com reticências (`min-width: 0`). Com 16px, o iOS não dá zoom ao tocar.
- Chips "Reels · 9:16" e "30s" saem do campo e ficam numa linha logo abaixo: 36px de altura, padding 0 14px, texto 14/18, cada chip com o mesmo vidro do campo.
- "Seus projetos." e "Continue de onde parou." empilhados, 22/28. "Ver todos ›" à direita.
- Projetos em carrossel horizontal: cartões de 300px, gap 12, o próximo aparece na borda. Use `overflow-x: auto`, scroll-snap no início de cada cartão, scroll-padding de 20px e sem barra de rolagem. Mosaico com 186px de altura.
- Mural: escondido no celular.

## Canvas · Tablet (768×1024)

- Cabeçalho igual ao desktop, largura 768, altura 72, padding lateral 28. Se faltar espaço, corte o nome do projeto primeiro.
- Painel do canvas: left 16, top 72, 736×936, raio 20.
- Zoom do canvas: 55% (o rótulo mostra "55%"). As 5 cenas cabem na largura.
- Zoom e botão de nota ficam numa linha logo acima do campo de prompt (zoom: left 32; nota: left 180).
- Caixa de prompt: left 32, largura 704, 16px acima da folha. Conteúdo igual ao desktop.
- O painel de versões vira uma **folha inferior**: left/right 16, bottom 0, altura 340. Fundo branco, cantos de cima com 20px, alça de 36×5 em #D4D4D8. Cabeçalho numa linha: "Cena 3 / Encaixe" à esquerda e Versões | Ficha (240px) à direita. A lista rola; aparecem v4 e v3 sem rolar.
- Não foram desenhados: a folha expandida e a aba Ficha.

## Canvas · Celular (390×844)

- Barra de status do iOS (62px). Cabeçalho com 56px: voltar (36×36), nome do projeto numa linha com reticências (15/18) e "5 cenas · 30 de 30s" embaixo (12/16, #71717B), pílula "Publicar" com 32px de altura e avatar de 32px.
- Sem "Projetos ›": o botão voltar substitui.
- O canvas ocupa a largura toda, a partir de y 118, só com os cantos de cima arredondados (20px).
- Zoom 50%. Grade de pontos com 15px. A cena 4 aparece só na borda, para mostrar que o canvas se move.
- O controle de zoom some (zoom com pinça).
- Dock embaixo (left/right 12, bottom 28):
  - Linha de cima: pílula de vidro "Versões 4/4 ⌃" à esquerda (abre as versões) e botão redondo de vidro com o ícone de nota à direita (40×40).
  - Caixa de prompt de vidro: largura 366, raio 24. Texto 16/22. Os atalhos ficam numa linha que rola para o lado, com fade à direita. Botão de enviar com 40px (área de toque de 44px).
- O painel de versões não aparece no celular. "Versões" abre uma folha inferior com o mesmo conteúdo, com cerca de 70% da altura da tela, cantos de 20px e alça de 36×5.
