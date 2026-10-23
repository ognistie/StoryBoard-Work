# Apresentação em tela cheia

O botão de play do canvas abre o storyboard em tela cheia. Cada cena fica na tela pelo tempo da sua duração e passa sozinha para a próxima, com a fala embaixo.

Design no Paper, arquivo "Decupa" (`01M5MMZ6NG5SRKR97J85Q5QTFT`). Leia os valores exatos de lá com `get_computed_styles` / `get_jsx`.

| Tela | Paper |
|---|---|
| Botão de play no cabeçalho | `02 — Canvas` (e as versões Tablet e Mobile), à esquerda de "Publicar" |
| Apresentação, desktop | `03 — Apresentação` (`2D6-0`) |
| Apresentação, celular | `03 — Apresentação · Mobile` (`2F6-0`) |

## Botão de play

- Redondo, 36px (32px no celular), fundo branco, borda #E4E4E7, triângulo #18181B de 14px.
- Fica junto do "Publicar", com 10px entre os dois. O avatar continua 24px depois (10px no celular).
- `aria-label="Apresentar"`.

## Reprodução

- Começa na cena 1 e usa a versão atual de cada cena (`headRevisionId`), nunca uma versão que o usuário esteja navegando no canvas.
- Cada cena dura `frame.duration` segundos. O total é a soma, como no cabeçalho ("30 de 30s").
- Barra de progresso no topo, um segmento por cena, com largura proporcional à duração. Segmentos passados ficam cheios, o atual enche aos poucos e os próximos ficam apagados.
- Troca de cena: fade de 400ms.
- Movimento leve da imagem conforme a câmera da cena: push-in ou zoom-in aumentam a escala de 1 para 1,06; zoom out faz o contrário; pan, travelling e tracking deslizam um pouco para o lado; câmera fixa não mexe. Com `prefers-reduced-motion`, sem movimento e só o fade.
- Cada cena mantém o seu formato. A cena 4 da iugu é 1:1, então o quadro muda de proporção nessa cena.
- No fim, para na última cena com o play de novo. Com o loop ligado, volta para a cena 1.
- Carregue a imagem da próxima cena antes da troca.

## Desktop (`03 — Apresentação`)

- Fundo #09090B. Atrás de tudo, a imagem da cena atual borrada (blur 80px, saturate 140%, opacidade 0,35) e um vinheta radial escura.
- Topo: barra de progresso (3px, 6px entre segmentos) e, abaixo, logo "Decupa" em Instrument Serif, nome do projeto, formato, e a pílula "Esc para sair" com X.
- Centro: o quadro da cena, 600px de altura no 9:16, raio 20px, sombra grande.
- Esquerda: "CENA 3 DE 5", título da cena em Instrument Serif 64px, descrição e as pílulas de plano, câmera (ponto vermelho) e duração.
- Direita: "A seguir", com a miniatura da próxima cena no formato dela, o título, o número, a duração e o formato.
- Abaixo do quadro: "LOCUÇÃO" e a fala, 24/32px, centralizada.
- Embaixo: pílula de vidro escura com anterior, pausar (círculo branco), próxima, tempo "0:13 / 0:30" com números de largura fixa e o botão de loop.
- Sem mexer o mouse por 2,5s, o cursor e os controles somem. Voltam ao mexer.

## Celular (`03 — Apresentação · Mobile`)

- A imagem ocupa a tela toda (cover). Sombra escura no topo e embaixo para o texto ler bem.
- Topo, abaixo da área segura: barra de progresso (4px entre segmentos), nome do projeto, "Cena 3 de 5 · 0:13 / 0:30" e o X de fechar.
- Embaixo: título em Instrument Serif 44px, a fala em 20/27px, as pílulas e o botão de pausar branco de 44px.
- Toque no terço esquerdo volta uma cena, no terço direito avança. Segurar o dedo pausa.

## Teclado e acessibilidade

- Espaço ou K: pausar e continuar. Setas: cena anterior e próxima. L: loop. Esc: sair.
- Use a Fullscreen API no elemento da apresentação. Onde ela não existir (Safari do iPhone), use uma camada fixa com `100dvh`.
- `role="dialog"` com `aria-modal`, foco preso dentro dela e, ao sair, o foco volta ao botão de play.

## Referência

O app antigo (Frameline) tinha um modo "Apresentar" com as durações: `src/views/workspace/Presentation.tsx` no commit `a170662`. Ele foi removido em `d2858db`. Dá para reaproveitar a lógica de tempo, não o visual.
