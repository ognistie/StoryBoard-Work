# iugu: brand identity, voice, slogans and key messages

Research date: 2026-10-23. "Observed" means I fetched the page, file or image myself on that date. Site HTML/CSS was downloaded from www.iugu.com. Archived states come from web.archive.org snapshots. Press-kit files come from the iugu press page.

## Visual identity: logo, colors, typography, imagery, mascots, rebrands

### Takeaway
The current identity dates from the April 2022 rebrand ("Novas cores, novo design e um novo posicionamento"). It has five parts:
- a monochrome logo: a black symbol made of two curved strokes around a small square, plus the lowercase wordmark "iugu";
- a single electric blue accent (#5274FF in brand imagery; #3B5DE8 is the site's current `--primary-color`);
- lots of white space;
- a modular "rounded tile" motif;
- Museo Sans type.

The look reads as B2B tech: real professionals cut into rounded-tile mosaics, blue tiles with white line icons, floating dashboard and API cards, and big-number stat chips. I found no mascot.

### Cited Findings
**Logo**
- The header logo is an inline SVG (82×32) with `fill="black"`. Its aria-label is "Iugu - Ir para a Home". It shows a symbol of two hook-like curved strokes around a small rounded square, then the wordmark "iugu" in lowercase, rounded and geometric. Observed in the homepage HTML and rendered. — [iugu.com](https://www.iugu.com/)
- The official press-kit zip "Logotipos iugu (.jpg, .png e .svg)" has 4 PNG and 4 PDF files:
  - Logo.png: black symbol + "iugu", 490×192;
  - Logo-2.png: black horizontal lockup with the tagline "tecnologia que vira potência" set to the right in two lines, 999×192;
  - Logo-1.png and Logo-3.png: the same two lockups, which render blank on a white background (see Inferences).
  The zip contains no SVG, although the press page lists .svg. — [Press kit zip](https://www.iugu.com/hubfs/logo%20iugu.zip), linked from [Assessoria de Imprensa](https://www.iugu.com/assessoria-imprensa)
- The Instagram avatar is the black symbol alone on white. Observed via og:image. — [Instagram @go.iugu](https://www.instagram.com/go.iugu/)
- In product imagery, the symbol also appears in white on a blue rounded tile. Observed in the press-kit "Imagens ilustrativas dos produtos (.png)" zip. — [Press images zip](https://www.iugu.com/hubfs/imagens%20assessoria/imagens%20iugu.zip)
- The brand writes its name in lowercase "iugu", even at the start of a sentence ("iugu Cobrança", "Blog da iugu", "A iugu é..."). A few legal or footer strings use "Iugu" ("Iugu Transparência", "Acompanhe a Iugu nas redes sociais"). — [iugu.com](https://www.iugu.com/)

**Colors**
- Current site CSS variables: `--primary-color:#3b5de8`, `--primary-color-hover:#2f4fd4`, `--primary-color-light:#7590ff`, `--gray-900:#1e2328`, `--gray-700:#484848`, `--gray-500:#616771`, `--white:#fff`, `--black:#000`. In the homepage HTML #3b5de8 appears 158 times, mostly as `fill="#3B5DE8"` on icons. — [template_base.min.css](https://www.iugu.com/hubfs/hub_generated/template_assets/1/100586136333/1792703250650/template_base.min.css)
- Site background gradients and light tints: `linear-gradient(180deg,#fff,#dbe0f8)`, `linear-gradient(180deg,#eef2ff,#f8f9ff)`. The product-ecosystem section uses `#f3f5fb → #bec9f7` (lavender blue). Body surfaces use #f5f5f7. — same CSS; [products-ecosystem CSS](https://www.iugu.com/hubfs/hub_generated/module_assets/1/215248378633/1783442710497/module_products-ecosystem.min.css)
- The brand imagery blue measures #5274FE/#5274FF. I sampled it from the press-kit images and the site og:image. Secondary tile tones are about #ADBAF2/#B9C6FC (light periwinkle) and #6D8AFF. Dark UI cards are charcoal, about #3A434A. Black is #010101 and white is #FAFBFE. Observed with an image color histogram. — [Press images zip](https://www.iugu.com/hubfs/imagens%20assessoria/imagens%20iugu.zip); [og:image](https://www.iugu.com/hubfs/thumb-padrao%20(2).png)
- #5274FF was the dominant site color in the Jan 2023, Jan 2024, Jan 2025 and Jan 2026 homepage snapshots (57–69 occurrences each). In Oct 2026 it appears only 6 times on the live homepage, and #3B5DE8 is the CSS primary. — [Wayback 2023-01-01](https://web.archive.org/web/20230101090427/https://www.iugu.com/); [2024-01-07](https://web.archive.org/web/20240107182904/https://www.iugu.com/); [2025-01-09](https://web.archive.org/web/20250109015944/https://www.iugu.com/); [2026-01-09](https://web.archive.org/web/20260109002419/https://www.iugu.com/)
- The Jan 2023 snapshot also used #00236A (navy), #EF345D (pink-red), #00F7F7 (cyan) and #04C163 (green). None of these remain on the 2024+ homepages. — [Wayback 2023-01-01](https://web.archive.org/web/20230101090427/https://www.iugu.com/)

**Typography**
- The site loads one custom family, "Museo Sans", at weights 100, 300, 500 and 700, with fallback `Museo Sans,sans-serif`. — [template_base.min.css](https://www.iugu.com/hubfs/hub_generated/template_assets/1/100586136333/1792703250650/template_base.min.css)
- The 2019 site referenced Montserrat and Acme. — [Wayback 2019-01-19](https://web.archive.org/web/20190119163200/https://www.iugu.com/)

**Imagery style** (observed in the press-kit product images, the homepage hero and the og:image)
- Photography shows diverse Brazilian-looking professionals (men and women, various ethnicities, 30s–50s) in smart-casual or blazer outfits. They smile, hold laptops or tablets, and stand in bright, blurred modern offices. Each photo is cut into a stepped mosaic of rounded squares on white. — [Press images zip](https://www.iugu.com/hubfs/imagens%20assessoria/imagens%20iugu.zip); [homepage hero image](https://www.iugu.com/hs-fs/hubfs/Frame%201000004395.png?width=600&height=470&name=Frame%201000004395.png)
- Floating rounded tiles sit around the photos. Some are solid #5274FF with white line icons ($ with circular arrows, API, split/branch nodes, QR code, hand-with-coins, link, bank). Others are outlined or frosted. Some are dark navy. — same sources
- Product-UI cards appear in the imagery:
  - dashboards with "Recebimentos / Pagamentos" line charts and "Visão Geral" balances in R$;
  - a dark code card titled "Infraestrutura para altos volumes" with a `curl --request POST` to `api.iugu.com/v1/invoices`;
  - calendar chips "3º dia / 5º dia / 7º dia" for the dunning ("régua") feature;
  - a "BetPay" white-label demo account.
  — [Press images zip](https://www.iugu.com/hubfs/imagens%20assessoria/imagens%20iugu.zip)
- Stat chips in the imagery, observed: "Uptime de 99,9%", "10k/s transações", "QR Code Pix em até 15ms", "API com resposta abaixo de 20ms", "1.5bi transações/ano", "+100mil contas atendidas", "Pix 10x mais rápido", "R$81bi TPV em 2024", "Aderente à LGPD, PCI-DSS e normas do Banco Central", "Licença do bacen com conformidade garantida". — [Press images zip](https://www.iugu.com/hubfs/imagens%20assessoria/imagens%20iugu.zip)
- og:image (1280×721): white background with the black logo and the tagline "tecnologia que vira potência". Decorative blue filled and outlined rounded squares, diagonal hatching stripes and one small black rounded square sit at the edges. — [og:image](https://www.iugu.com/hubfs/thumb-padrao%20(2).png)
- Video thumbnails:
  - 2026-09-16 brand video: "Mais [logo] para sua operação." in black on white, over a faint grid of rounded squares;
  - 2026-02-06 brand video: black rounded tiles with white text, "TOP10 empresas que mais processam PIX", "R$ +81 bi transacionados em 2024", "Instituição de pagamento autorizada pelo Bacen desde 2020", inside a modular tile grid with one blue tile;
  - 2022 rebrand video: "somos potência" in lowercase, with "potência" in blue.
  — [YouTube 2kR4tB4v-UQ](https://www.youtube.com/watch?v=2kR4tB4v-UQ); [YouTube fFQ1U6VEtSc](https://www.youtube.com/watch?v=fFQ1U6VEtSc); [YouTube 6PvaCb8UV04](https://www.youtube.com/watch?v=6PvaCb8UV04)
- Blog imagery is conventional stock photography of office workers, for example "Mulher sorrindo e abraçando os braços, usando suéter azul..." in the alt text. — [iugu.com](https://www.iugu.com/)

**Rebrands and repositionings (dated)**
- **2016**: meta description "Construindo um serviço de assinatura, aplicativo ou marketplace? iugu é tudo que você precisa." — [Wayback 2016-01-09](https://web.archive.org/web/20160109192024/https://www.iugu.com/)
- **2019**: WordPress site with logo files named `logo-iugu-quad` and `logo_IUGU_horizontal` (2017 uploads). — [Wayback 2019-01-19](https://web.archive.org/web/20190119163200/https://www.iugu.com/)
- **Jan 2021, pre-rebrand palette**: dark teal #002B34 (78 occurrences), orange #F49625, cyan #09A9CD, green #189F56. — [Wayback 2021-01-21](https://web.archive.org/web/20210121185230/https://www.iugu.com/)
- **2022-04-07/08, rebrand at the 10th anniversary**:
  - The video "A iugu mudou para melhor!" says: "Depois de 10 anos de história, chegamos no momento em que algumas mudanças são necessárias para que a nossa marca reflita toda a nossa evolução. Novas cores, novo design e um novo posicionamento, que representam quem nós realmente somos. Juntos somos potência! #goiugu #tecnologiaquevirapotência" — [YouTube, 2022-04-08](https://www.youtube.com/watch?v=6PvaCb8UV04)
  - The companion video "Manifesto 10 anos da iugu, tecnologia que vira potência" says: "Somos pessoas, negócios e potência, uma força que sempre esteve aqui. A partir de hoje, esses propósitos formam o novo manifesto e posicionamento da iugu." — [YouTube, 2022-04-07](https://www.youtube.com/watch?v=rOStI10UHmc)
- **March–April 2025, strategic repositioning (not a visual rebrand)**:
  - A press release says the company "decidiu firmar seu posicionamento no mercado para se consolidar como a solução mais completa de tecnologia financeira", moving toward large companies and modular APIs. — [Press release, março de 2025](https://www.iugu.com/hubfs/Abril_%20Press%20release%20dados%20financeiros%20%2B%20novo%20posicionamento_vfinal.pdf)
  - The video "Chegou a nova iugu!" says: "A partir de agora, apresentamos a você uma iugu mais moderna, mais flexível e mais modular, para empresas de alta performance que querem simplificar e escalar suas operações. Todo nosso ecossistema de infraestrutura financeira se adapta ao seu desafio de negócio. Sem limites." — [YouTube, 2025-04-08](https://www.youtube.com/watch?v=X9KG2HC6YRg); repeated in [Novo capítulo na história da iugu, 2025-05-22](https://www.youtube.com/watch?v=E4j3pGXhjkg)
- The About-page timeline lists "2025 | Relançamento do iugu Gateway". It does not mention a visual rebrand. — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)

**Mascot**
- I saw no mascot or character on the homepage, About page, press kit (logos and 48 product images), og:image or YouTube thumbnails. — [iugu.com](https://www.iugu.com/); [Press kit](https://www.iugu.com/assessoria-imprensa)

### Inferences
- **Brand blue for video.** Use #5274FF as the main blue in a Reels ad. It is the blue in every press-kit image, the og:image and the 2022–2026 site snapshots. #3B5DE8 looks like a darker web variant adopted in 2026. My contrast calculation shows white text on #5274FF at about 3.96:1, below WCAG AA for small text, and on #3B5DE8 at about 5.36:1. That points to an accessibility tweak rather than a rebrand. This is an inference; I found no announcement. #3B5DE8 is the safer choice for small text on a blue button.
- **Logo color.** The logo is used in black or white only, never blue. Logo-1.png and Logo-3.png render blank on white, so they are almost certainly the white (reversed) versions for dark or blue backgrounds. I inferred this and did not check the alpha channel.
- **Video system.** A video can be built from the brand's own system:
  - white background;
  - rounded-square tiles that snap together (the visual metaphor for "modular" / "ecossistema");
  - blue tiles with white line icons;
  - big stat chips;
  - people cut into tile-shaped frames.
  Lowercase headlines with one blue keyword ("somos **potência**") are a recurring device.
- **Typography in imagery.** The rounded terminals on stat numbers in the imagery suggest Museo Sans Rounded, or Museo Sans used in a rounded way, but only "Museo Sans" is confirmed in the CSS. The tagline set beside the logo looks like the same family.

### Gaps
- I found no public brand manual or style guide with official color names or hex values. The hex values above come from CSS and image sampling, not from a guideline document.
- I could not retrieve an archived pre-2022 logo image: Wayback image requests timed out. I did not inspect Brandfetch or similar logo databases.
- I found no agency, Behance or Dribbble case study for the 2022 rebrand. Two searches returned nothing relevant.
- The press-kit PDFs may contain vector logos with color specs. I did not open them.

## Taglines and slogans (exact Portuguese, source, date)

### Takeaway
The master tagline since April 2022 is **"tecnologia que vira potência"**. It sits in the official logo lockup and the og:image. "Potência" is the brand's core word: "somos potência", "Juntos somos potência!", "jornada de potência".

The current campaign-level lines are:
- **"Infraestrutura financeira para sua empresa crescer sem limites"** (homepage H1, live since at least Jan 2026);
- **"Sem limites"** (April 2025 relaunch);
- **"o ecossistema mais completo e flexível de infraestrutura financeira"** (bio and boilerplate everywhere);
- **"Mais iugu para sua operação."** (Sept 2026 video thumbnail).

### Cited Findings
**Current lines**
- "tecnologia que vira potência". Set in lowercase beside the logo in the official lockup (Logo-2.png), observed 2026-10-23. — [Press kit zip](https://www.iugu.com/hubfs/logo%20iugu.zip); [og:image](https://www.iugu.com/hubfs/thumb-padrao%20(2).png)
- "Tecnologia que vira potência". A section heading on the About page above the big numbers. — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- "Juntos somos potência!" and the hashtags "#goiugu #tecnologiaquevirapotência" (2022-04-08). — [YouTube](https://www.youtube.com/watch?v=6PvaCb8UV04)
- "somos potência" as on-screen text in the 2022 rebrand video thumbnail. — [YouTube](https://www.youtube.com/watch?v=6PvaCb8UV04)
- "Infraestrutura financeira para sua empresa crescer sem limites". Homepage H1, observed 2026-10-23 and also present on 2026-01-09. — [iugu.com](https://www.iugu.com/); [Wayback 2026-01-09](https://web.archive.org/web/20260109002419/https://www.iugu.com/)
- `<title>`: "Infraestrutura Financeira para Sua Empresa Crescer | iugu" (2026-10-23). — [iugu.com](https://www.iugu.com/)
- "Sem limites." Closing line of "Chegou a nova iugu!" (2025-04-08). — [YouTube](https://www.youtube.com/watch?v=X9KG2HC6YRg)
- "Mais [logo iugu] para sua operação." On-screen text in the thumbnail of "iugu, o ecossistema mais completo e flexível de tecnologia financeira" (2026-09-16). — [YouTube](https://www.youtube.com/watch?v=2kR4tB4v-UQ)
- "Conectamos empresas, pessoas e receitas em um único ecossistema financeiro", then "Esse é o nosso jeito de escalar negócios!" About-page `<title>`: "Sobre a iugu | Conectamos Empresas, Pessoas e Receitas". — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- Social bio and boilerplate:
  - Instagram bio (2026-10-23): "Empresa de tecnologia que oferece o ecossistema mais completo e flexível de infraestrutura financeira." — [Instagram @go.iugu](https://www.instagram.com/go.iugu/)
  - Site footer: "A iugu é uma empresa de tecnologia que oferece o ecossistema mais completo e flexível de infraestrutura financeira." — [iugu.com](https://www.iugu.com/)
  - YouTube channel description: "A iugu é uma empresa de tecnologia que oferece o ecossistema mais completo e flexível de infraestrutura financeira. Muito mais do que meios de pagamento online → iugu.com". — [YouTube @iugu](https://www.youtube.com/@iugu)
- Employer-brand line (2026-06-08): "Na iugu, acreditamos que o futuro não se espera — se constrói." It goes on: "crescer aqui é sobre viver uma jornada de potência — individual e coletiva." — [YouTube](https://www.youtube.com/watch?v=ctGIeRB53B4)
- Culture concept "Soul&Tech":
  - About page: "Soul — Significa alma. Ou seja, é aquilo que nos faz humanos"; "Tech — Diz respeito ao mercado que estamos inseridos"; "A tecnologia com essência humana". — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
  - Video "Manifesto de Cultura | Soul&Tech - a crença de que a conexão humana potencializa a tecnologia" (2022-12-19). — [YouTube](https://www.youtube.com/watch?v=8Q_slFyb5i0)

**Older lines (dated)**
- 2016: "iugu é tudo que você precisa." — [Wayback 2016](https://web.archive.org/web/20160109192024/https://www.iugu.com/)
- 2019: "primeira plataforma de automação de pagamentos online do Brasil"; H1 "Receba pagamentos online por boleto bancário ou cartão de crédito"; guarantee "Desafio iugu: se em até 30 dias você não estiver satisfeito, nós devolvemos 100% do dinheiro de sua mensalidade." — [Wayback 2019](https://web.archive.org/web/20190119163200/https://www.iugu.com/)
- 2021: "Mais que pagamentos, entregamos automação nas operações financeiras com eficiência de ponta a ponta para os negócios digitais!"; "Automatize a gestão financeira do seu negócio"; "O caminho mais rápido para a tranquilidade financeira". — [Wayback 2021](https://web.archive.org/web/20210121185230/https://www.iugu.com/)
- Jan 2023: "Solução completa para seu negócio cobrar e receber pagamentos". — [Wayback 2023](https://web.archive.org/web/20230101090427/https://www.iugu.com/)
- Jan 2024: "Tenha muito mais do que meios de pagamento online"; "Hub de pagamentos online para escalar a operação da sua empresa com eficiência e tranquilidade". — [Wayback 2024](https://web.archive.org/web/20240107182904/https://www.iugu.com/)
- Jan 2025: "Simplifique seus recebimentos e centralize suas finanças com a iugu"; "Nascemos para facilitar a operação financeira das empresas". — [Wayback 2025](https://web.archive.org/web/20250109015944/https://www.iugu.com/)

### Inferences
- **What to say in the ad.** The safest closing super for an on-brand ad is the logo plus "tecnologia que vira potência", the official lockup. "Sem limites" and "Mais iugu para sua operação." are the freshest campaign phrasings and fit a 30-second hook or CTA.
- **Drift in the messaging.** Over time it has moved from "meios de pagamento / receber pagamentos" (2019–2025) to "infraestrutura financeira / ecossistema modular" (2025–2026). Older payment-centric lines like "receba por boleto" now under-sell the positioning.

### Gaps
- I could not view recent Instagram post captions or Meta ads, so campaign taglines used only in ads are unverified. The Instagram API demanded login, and I did not check the Meta Ad Library.
- "Mais iugu para sua operação." shows up only in that one thumbnail. A web search for the exact phrase returned nothing, so I cannot say whether it is a running campaign.

## Tone of voice

### Takeaway
The voice is confident, B2B and benefit-led, close to "consultive tech partner". The register is semi-formal, with simple vocabulary layered over finance and tech terms (split, BaaS, conciliação, endpoints, churn).

It addresses the reader as **"você" / "sua empresa" / "sua operação"**, mostly through imperative verbs ("Escale", "Combine", "Conecte", "Personalize", "Fale com um especialista"). It uses no humor, slang or emoji in core brand copy. Short, punchy parallel phrases carry the rhythm ("Quatro produtos. Um ecossistema."). Older social and YouTube copy is warmer and uses exclamation marks.

### Cited Findings
- **Imperative "você/sua" address**:
  - "Escale sua operação financeira sem refazer arquitetura."
  - "Combine o que precisar"
  - "Conecte ao que já existe"
  - "Personalize regras e fluxos"
  - "Escolha por onde começar."
  - CTA buttons: "Falar com um especialista", "Escale sua operação", "Quero contratar", "Leia a documentação"
  — [iugu.com](https://www.iugu.com/)
- **Contrast and reversal constructions**:
  - "Tecnologia que se molda ao seu negócio, não o contrário."
  - "Sem troca de fornecedor, sem retrabalho."
  - "Quatro produtos. Um ecossistema."
  - "Pronto para escalar sem refazer sua infraestrutura?"
  — [iugu.com](https://www.iugu.com/)
- **Problem framing in finance-ops language**:
  - "reduz gargalos que consomem tempo e dinheiro"
  - "Retrabalho em cobranças e lançamentos manuais"
  - "Dependência excessiva de planilhas e processos manuais"
  - "libera o time para focar em estratégia, não em tarefas operacionais"
  — [iugu.com FAQ](https://www.iugu.com/)
- **"Crescer" as payoff**: "aceleramos processos e liberamos sua equipe para focar no que realmente importa: crescer." — [Assessoria de Imprensa](https://www.iugu.com/assessoria-imprensa)
- **Hook-style LinkedIn openers** (public page, observed 2026-10-23):
  - "Vender mais não garante melhores resultados. O que decide até onde a sua operação financeira pode ir é o que acontece depois da venda: na conciliação, cobrança, recebíveis e no fluxo de caixa."
  - "Uma jornada de compra positiva depende de uma operação financeira eficiente – do pagamento à conciliação de recebíveis." (2026-10-21)
  — [LinkedIn iugu](https://www.linkedin.com/company/iugu)
- **Warmer, exclamatory register in older and video copy**:
  - "Abandone processos manuais e ganhe tempo para você e seu time!" (2024-03-07) — [YouTube](https://www.youtube.com/watch?v=AQyuIv7q3Gs)
  - "Os melhores conteúdos para ajudar a impulsionar suas vendas online, aprimorar sua gestão financeira e automatizar seu processo de cobranças!" (blog block on the homepage) — [iugu.com](https://www.iugu.com/)
  - "Chegou a nova iugu!" (2025) — [YouTube](https://www.youtube.com/watch?v=X9KG2HC6YRg)
- **Humanizing and reassurance voice for end consumers**:
  - "Não se preocupe, sabemos o que pode ter acontecido. A iugu faz a intermediação de pagamentos entre várias empresas e consumidores, como você." (site "Recebi uma cobrança" flow) — [iugu.com](https://www.iugu.com/)
  - Chat greeting "Olá, Por onde podemos começar?" — [iugu.com](https://www.iugu.com/)
- **Values in the brand's own words**: "Colaborar Sempre", "Buscar Resultados", "Agir com Coragem", "Ser Cativante". Mission: "Fortalecer empresas para expandirem seus negócios com soluções tecnológicas escaláveis, seguras e flexíveis." Culture: "valorizamos dados, objetividade e entrega, sem perder o olhar humano". Employees are called "iuguers". — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu); [YouTube iugu4devs](https://www.youtube.com/watch?v=8pSG6MhldZc)
- **Recurring vocabulary** (counted by reading homepage, About and press copy): infraestrutura financeira, ecossistema, modular, completo e flexível, escalar/escale, crescer, sem limites, sem refazer, potência/potencializa/impulsiona, previsibilidade, automação/automatize, centralize, conciliação, retrabalho, inadimplência, segurança/conformidade, "API mais robusta do mercado". — [iugu.com](https://www.iugu.com/); [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)

### Inferences
- **Ad voice.** The script should speak to the owner or finance lead of a growing business ("sua empresa", "sua operação"). Open with a sharp operational pain (manual reconciliation, failed recurring charges, splitting payouts), then turn to the modular-ecosystem payoff, and close on growth or "potência". Keep sentences short and parallel. One exclamation at the reveal fits the brand's video habit. Jokes, slang or "fintech-for-consumers" cuteness do not.
- **Technical claims.** Proof points like "140+ endpoints", "API com resposta abaixo de 20ms" and "Uptime de 99,9%" are on-brand as on-screen chips. The voice-over should stay benefit-level.

### Gaps
- I found no published tone-of-voice guide. These conclusions come from reading site, press, LinkedIn and YouTube copy.
- I did not see Instagram Reels scripts or captions, so the Reels-specific register is unverified.

## Key value propositions and claims (exact headlines)

### Takeaway
The pitch is "one modular financial-infrastructure ecosystem": Cobrança, Recorrência, Split and BaaS in one platform. You start with one module, plug it into existing systems, scale without re-architecting, and lean on regulation and big-number scale as proof.

### Cited Findings
- **Hero**: "Infraestrutura financeira para sua empresa crescer sem limites" / "Cobrança, recorrência, split e BaaS em uma única plataforma. Escale sua operação financeira sem refazer arquitetura." / CTA "Falar com um especialista". — [iugu.com](https://www.iugu.com/)
- **Big numbers on the homepage**: "R$ 81 bi TPV em 2024", "1.5 bi transações por ano", "150 mil contas atendidas", "Top 10 empresas que mais transacionam Pix". — [iugu.com](https://www.iugu.com/)
- **Same metrics on the About page**: "R$ 81 bilhões de transações por ano" (worded as annual rather than "TPV em 2024"), "150 mil contas atendidas", "40 produtos e funcionalidades", "30 parceiros", "Regulada pelo Banco Central do Brasil", "Selo RA1000 - Reclame Aqui". — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- **Account counts disagree across sources**: "+100mil contas atendidas" in the press images; "mais de 130 mil contas ativas" in the March 2025 release; "150 mil" on the 2026 site. — [Press images zip](https://www.iugu.com/hubfs/imagens%20assessoria/imagens%20iugu.zip); [Press release março 2025](https://www.iugu.com/hubfs/Abril_%20Press%20release%20dados%20financeiros%20%2B%20novo%20posicionamento_vfinal.pdf); [iugu.com](https://www.iugu.com/)
- **Ecosystem section**: "O ecossistema modular mais flexível do mercado" / "Tecnologia que se molda ao seu negócio, não o contrário." / "Combine o que precisar", "Conecte ao que já existe", "Personalize regras e fluxos". — [iugu.com](https://www.iugu.com/)
- **Product headlines**: "Quatro produtos. Um ecossistema."
  - iugu Cobrança: "Pagamentos e cobranças integrados em um único fluxo"
  - iugu Recorrência: "Previsibilidade em assinaturas e cobranças recorrentes"
  - iugu Split: "Divisão automática de recebíveis para modelos colaborativos"
  - iugu BaaS: "Serviços financeiros integrados à sua plataforma" ("criando experiências financeiras com a sua marca")
  — [iugu.com](https://www.iugu.com/)
- **Developer block**: "140+ endpoints REST para construir sua infraestrutura"; "SDKs em Node, Ruby, PHP, Python e Java"; "Solução white-label para sua marca"; "Multi-adquirência inteligente que maximiza aprovações"; "Gestão também via painel e aplicativo". — [iugu.com](https://www.iugu.com/)
- **Segments**: Educação e Edtechs, Saúde e Healthtechs, SaaS e negócios recorrentes, Marketplaces e plataformas colaborativas. Case headlines: "Como a Clinicorp aumentou o volume de suas transações financeiras em 45%..."; "Webropay aumentou o TPV do meio de pagamento em 271% com a iugu". — [iugu.com](https://www.iugu.com/)
- **About-page claims**: "Eliminamos a burocracia financeira das empresas"; "Com a API mais robusta do mercado". Origin story: "2012 | Nasce a iugu, em uma garagem em Dourados (MS)". — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- **Client logos on the homepage**: Conta Azul, Eduzz, Sestini, Alice, FitDance, Olist, Contabilizei, Ingresso Prime. — [iugu.com](https://www.iugu.com/)

### Inferences
- **Ad proof points.** The strongest one-glance proof points for a 30-second ad are "R$ 81 bi", "Top 10 em Pix" and "regulada pelo Banco Central". The brand already designs these as stat tiles.
- **Numbers to verify.** Account counts vary (100k / 130k / 150k), and "R$ 81 bi" is framed as "TPV em 2024" on the homepage but "por ano" on the About page. Use the homepage wording and check the figures with the client before using them.

### Gaps
- I did not check individual product pages beyond the homepage blocks. The adjacent file `empresa_produtos.md` likely covers them.

## Social media presence

### Takeaway
Instagram is **@go.iugu**, not @iugu, with about 24K followers and 1,267 posts. LinkedIn (/company/iugu, 73,764 followers) is the most active channel, with B2B thought leadership. YouTube is **@iugu** (legacy /user/iugumkt): 3.94K subscribers, 133 videos, low views. Facebook is /go.iugu. X is @iugu, but I could not read it.

### Cited Findings
- **Instagram @go.iugu**: "24K Followers, 1,449 Following, 1,267 Posts". Display name "iugu". Bio: "Empresa de tecnologia que oferece o ecossistema mais completo e flexível de infraestrutura financeira." Observed via page meta on 2026-10-23. — [Instagram](https://www.instagram.com/go.iugu/)
- **LinkedIn /company/iugu**: "73.764 seguidores", industry "Atividades de serviços financeiros" (2026-10-23). — [LinkedIn](https://www.linkedin.com/company/iugu)
- **LinkedIn recent posts** (public page, 2026-10-23):
  - Pix Automático data and an interview with CFO/CSO Pedro Alvarenga (2026-10-21, 56 likes);
  - "Vender mais não garante melhores resultados..." product-ecosystem post;
  - BaaS as a business opportunity;
  - Gold sponsorship of CFO Insights (22/09, Vibra São Paulo);
  - "Pelo sexto ano consecutivo, a iugu é finalista do Prêmio Reclame AQUI" (2026 category "Soluções Financeiras: Grandes Operações");
  - Dia do Cliente thank-you;
  - InfoMoney article on CEO Renato Fairbanks Ribeiro.
  — [LinkedIn](https://www.linkedin.com/company/iugu)
- **YouTube @iugu**: "3,94 mil inscritos", "133 vídeos" (2026-10-23). — [YouTube](https://www.youtube.com/@iugu/videos)
- **Recent YouTube videos**:
  - "iugu, o ecossistema mais completo e flexível de tecnologia financeira" (2026-09-16, 2:44, 55 views)
  - "PMEs na economia digital | Web Summit Rio 2026" (2026-06-16)
  - "Manifesto de Marca Empregadora da iugu" (2026-06-08)
  - "iugu: ecossistema completa de tecnologia financeira" (2026-02-06, 1:00, 332 views)
  — [YouTube](https://www.youtube.com/@iugu/videos)
- **Most-viewed among the latest 20 videos**: "Recebeu uma cobrança da iugu? Saiba o porquê e como identificar a empresa responsável pela compra." (2024-09-30, 13,138 views), explaining to consumers why "iugu" shows up on their receipts. — [YouTube](https://www.youtube.com/watch?v=H6dL6vwJaZg)
- **Other links from the site footer and header**: Facebook https://www.facebook.com/go.iugu/ and X https://x.com/iugu (also twitter.com/iugu). — [iugu.com](https://www.iugu.com/)
- **Brand hashtag**: "#goiugu" (2022), matching the "go.iugu" handles. — [YouTube](https://www.youtube.com/watch?v=6PvaCb8UV04)

### Inferences
- **Audience.** Many Instagram viewers may know "iugu" only as the unfamiliar name on a boleto or card statement. The top video and the site's dedicated "Recebi uma cobrança da iugu" flow suggest this. A Reels ad for business buyers should make clear in the first seconds that iugu is the infrastructure behind companies' charges.
- **Instagram content.** It likely mirrors LinkedIn themes: events, Pix Automático, big numbers, culture, product explainers. Engagement on video is modest (tens to low thousands of views), so the brand has no strong Reels house style to copy. The press-kit tile system is the best visual reference.

### Gaps
- I could not open Instagram post grids, captions or Reels: the public API returned "require_login". So I cannot describe the current Instagram feed's look or post cadence from direct observation.
- X profile: x.com returned HTTP 402 to WebFetch, so I have no bio, follower count or activity level. I did not retrieve the Facebook follower count.
- I did not check for a TikTok account (none is linked from the site).

## Public brand guidelines, press kit or media kit

### Takeaway
iugu has a public press area with a downloads section: logo zip, product-image zip and press-release PDFs. Press relations are handled by VCRP. I found no public brand-guidelines document.

### Cited Findings
- **Press page**: "Área de downloads | Aqui você pode fazer o download de imagens e logotipo iugu." Files: "Logotipos iugu (.jpg, .png e .svg)" → `logo iugu.zip`; "Imagens ilustrativas dos produtos (.png)" → `imagens iugu.zip`, 52 MB, 48 PNGs in folders split, bets, saúde, gerais, recorrência, baas, cobrança, saas, educação. Contacts: "VCRP - Agência de Comunicação | iugu@vcrp.com.br ou imprensa@iugu.com". — [Assessoria de Imprensa](https://www.iugu.com/assessoria-imprensa); [logo zip](https://www.iugu.com/hubfs/logo%20iugu.zip); [images zip](https://www.iugu.com/hubfs/imagens%20assessoria/imagens%20iugu.zip)
- **Recent releases listed on the press page**:
  - new CFO & CSO Pedro Alvarenga (abr. 2026);
  - Michelle Uema as CRO (fev.);
  - Banco Central rules (mar.);
  - Black Friday card data (dez.);
  - Edtechs (ago.);
  - Pix representing "mais de 50% das transações da iugu" (abr.).
  — [Assessoria de Imprensa](https://www.iugu.com/assessoria-imprensa)
- **March 2025 release boilerplate**: "A iugu é uma empresa brasileira de tecnologia financeira modular que oferece um ecossistema completo e APIs robustas para automação e gestão financeira." The release letterhead uses the black logo. — [Press release março 2025](https://www.iugu.com/hubfs/Abril_%20Press%20release%20dados%20financeiros%20%2B%20novo%20posicionamento_vfinal.pdf)

### Inferences
- **Ad assets.** For a storyboard, the 48 press-kit PNGs are the closest thing to an official art direction reference: people in rounded-tile frames, blue icon tiles, UI cards and stat chips. They can be used directly or recreated in motion. Usage rights for advertising are not stated, so confirm with iugu or VCRP.

### Gaps
- I found no brand book, color spec sheet or typography license note. The logo zip has no SVG despite the label. The PDF logos are untested for vector color data.
