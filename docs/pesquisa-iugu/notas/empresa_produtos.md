# iugu (iugu.com): company, products, customers and recent news (as of 2026-10-23)

Source key used below. "Primary" means iugu's own site, its investor relations (RI) site, or its audited statements filed under Banco Central rules. "Snippet only" means the claim came from a search-result summary and the page itself was not opened. Treat those as weaker.

- FY2024 statements (primary, KPMG-audited): https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b480046f-236f-5c7c-5375-9da3e0c52577?origin=2
- FY2025 statements, published 2026-05-15 (primary): https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2
- 1H2026 statements, published 2026-08-24 (primary): https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2
- FY2021 statements (primary): https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/8a407c53-4059-73e3-05bc-aecfca1e76cd?origin=1

## 1. What iugu does: products and services

### Takeaway
iugu sells itself today as modular "infraestrutura financeira" for companies. It is one platform for billing (cobrança), subscriptions (recorrência), payment splitting (split) and Banking-as-a-Service (BaaS). It accepts Pix, Pix Automático, boleto, Bolepix, card, carnê and payment links, and exposes all of it through REST APIs. Its own tagline: "Escale sua operação financeira sem refazer arquitetura."

### Cited Findings
- Homepage hero (2026): headline "Infraestrutura financeira para sua empresa crescer sem limites". Subhead: "Cobrança, recorrência, split e BaaS em uma única plataforma. Escale sua operação financeira sem refazer arquitetura." — [iugu home](https://www.iugu.com/)
- Product one-liners on the homepage (verbatim) — [iugu home](https://www.iugu.com/):
  - **iugu Recorrência:** "Assinaturas e cobranças automáticas com gestão de inadimplência."
  - **iugu Split:** "Repasse automático para parceiros e sellers com regras configuráveis."
  - **iugu BaaS:** "Conta e serviços financeiros integrados via APIs."
  - **iugu Cobrança:** the extracted text was "Estabeleça regras de repasse, dívida, valores entre dois ou mais parceiros." That reads like split copy, so it may be a page or extraction mix-up. Check it on the live page before quoting it.
  - **Payment methods:** Pix, boleto, cartão de crédito, link de pagamento, checkout transparente.
  - **Extra features:** Pix Automático, Antecipação de recebíveis, Portal do Cliente, Cobrança direta, Carnê, Bolepix, Checkout Personalizável.
- Claimed technical and differentiating features: "multiadquirência inteligente", "conciliação automática", native compliance, KYC and antifraud in the BaaS, a white-label option, specialist technical support, and management through a web panel and an app. It lists 140+ REST endpoints and SDKs in Node, Ruby, PHP, Python and Java — [iugu home](https://www.iugu.com/). The Recorrência page says "150+ endpoints REST", which conflicts with the homepage — [iugu Recorrência](https://www.iugu.com/iugu-recorrencia)
- Recorrência page: headline "Pagamento Recorrente para Gestão de Assinaturas". Subhead: "A melhor forma de cobrança com total controle do fluxo de caixa em uma só plataforma." Features: email and SMS dunning ("régua de comunicação"), Pix Automático, plan upgrades and downgrades, custom billing cycles, split inside recurring charges, customizable checkout with antifraud, fines, interest and discounts, reconciliation reports, and card, boleto, Pix and carnê — [iugu Recorrência](https://www.iugu.com/iugu-recorrencia)
- Split can be set by fixed value, percentage, installment or payment method. Recurrence supports pro-rata and plan changes (search summary of iugu.com) — [iugu home](https://iugu.com/) (snippet only)
- Self-description in the FY2025 statements: "empresa de tecnologia especializada em infraestrutura financeira... Com APIs altamente escaláveis e um atendimento consultivo" — [FY2025 statements, primary](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
- Product timeline from the official "Sobre" page: 2013 first online payments platform and QR Code app; 2020 Pix launch and new e-commerce integrations; 2022 "antecipação por valor", own boleto, and SMS dunning; 2023 iugu App; 2024 iugu BaaS; 2025 "Relançamento do iugu Gateway" — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- Exame describes BaaS as a way for clients to build their own "fintechzinhas" without regulatory complexity: digital wallets, cashback and card-receivable advances — [Exame, 2025-01-22](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
- CEO framing (Jan 2023): one package replaces the billing, dunning and payment-method tooling. A client can drop "up to five providers" (banks, acquirers, reconciliation firms, VANs). Modules are "pecinhas de Lego" — [Monitor Mercantil, 2023-01-09](https://monitormercantil.com.br/iugu-mercado-perspectivas-e-competicao/)

### Inferences
- The brand story has moved from "cobrança recorrente for small companies" (2012–2020) to "modular financial infrastructure / BaaS for mid and large companies and platforms" (2024–2026). An ad that shows only "emita boleto" undersells the current positioning.
- The concrete, visual product moments are: a Pix Automático charge that pays itself, a split that pays several parties at once, and one dashboard replacing several providers.

### Gaps
- No official page gave a one-line description of the iugu Gateway relaunch (2025) or of Bolepix beyond its name.
- The iugu Cobrança description could not be cleanly confirmed (see the mix-up note above).

## 2. Target customers and the pains iugu says it solves

### Takeaway
iugu now targets four named verticals: Educação, Saúde, Tecnologia/SaaS and e-commerce platforms/marketplaces. It also runs a dedicated, regulated-betting (bets/iGaming) vertical. The pains it names are manual, inefficient finance routines, default (inadimplência) on recurring charges, juggling many financial providers, and the hard job of splitting commissions among parties.

### Cited Findings
- Homepage segments: Educação (escolas, faculdades, cursos, edtechs), Saúde (clínicas, laboratórios, consultórios, healthtechs), Tecnologia e SaaS, ecommerce platforms, and marketplaces/plataformas colaborativas — [iugu home](https://www.iugu.com/)
- The 1H2026 statements list active-account segments: "empresas de software, clubes de assinatura, administradoras de condomínios, instituições de ensino, farmacêuticas, saúde, contábeis, academias, e-commerces, ERPs entre outros" — [1H2026 statements, primary](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
- Logos shown: Conta Azul, Eduzz, Sestini, Alice, Fit Dance, Olist, Contabilizei, Ingresso Prime — [iugu home](https://www.iugu.com/). The Recorrência page adds Catho, Clinicorp, Wpensar and PEBMED — [iugu Recorrência](https://www.iugu.com/iugu-recorrencia). Exame adds Isaac and Pier Seguradora — [Exame, 2025-01-22](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
- Cases with numbers (useful on screen):
  - Clinicorp, a dental-clinic management platform: "+45% no volume de transações" — [iugu home](https://www.iugu.com/). Exame dates this to 2023→2024 and credits iugu's API — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
  - Webropay: "+271% no TPV do meio de pagamento" — [iugu home](https://www.iugu.com/)
  - Vittude: iugu made its commission payouts easier (no number given) — [iugu home](https://www.iugu.com/)
  - Eduzz, an education-content platform and client since 2020: it needed a regulated payment institution to pay creators faster. Its chargeback rate fell from 1.66% to 0.97% in 2022 (−42%) — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
  - PEBMED testimonial: "Com o apoio de uma tecnologia flexível, conseguimos administrar pagamentos e assinaturas de forma otimizada e eficiente." — [iugu Recorrência](https://www.iugu.com/iugu-recorrencia)
- Pains in iugu's own words:
  - With ordinary Pix the payer must approve each charge, which "aumenta o risco de inadimplência por esquecimento". Pix Automático charges "sem nenhuma ação do pagador a cada vencimento" — [iugu Recorrência](https://www.iugu.com/iugu-recorrencia)
  - CEO Renato Fairbanks: "Empresas queriam crescer, mas enfrentavam dificuldades operacionais com processos ineficientes." and "Queremos ser a infraestrutura de todas as empresas que buscam crescer." — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
  - The founder's origin story: Patrick Negri had 700 clients at his digital agency and saw how hard it was to issue and track charges — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
  - Mid and large companies "have manual processes" that can be optimized to cut cost and default. Clients are not forced into a fixed way of working — [Finsiders, 2023-10-02, updated 2025-04-23](https://finsidersbrasil.com.br/reportagem-exclusiva-fintechs/iugu-que-automatiza-transacoes-financeiras-para-empresas-prepara-se-para-novo-aporte-novo-fidc-e-novas-avenidas-de-crescimento/)
  - Split was built because clients had to pay several commissions per transaction. "A Iugu foi numa direção onde o modelo de negócio não importa" — [Monitor Mercantil, 2023](https://monitormercantil.com.br/iugu-mercado-perspectivas-e-competicao/)
- Bets/iGaming vertical:
  - iugu met Brazil's Secretaria de Prêmios e Apostas on 2025-06-18 about responsible gambling — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/), [BNL Data](https://bnldata.com.br/?p=162667)
  - It joined the IBIA Payment Providers Forum in October 2025 — [iugu press release PDF](https://www.iugu.com/hubfs/Outubro_Press%20release%20-%20IBIA%20Payment%20Providers%20Forum_pt.pdf) (snippet only)
  - It was approved as a payment provider on the Cactus iGaming platform in November 2025, quoting a "Head of Bets" — [BNL Data](https://bnldata.com.br/?p=172193), [iugu press release PDF](https://www.iugu.com/hubfs/Novembro_Press%20release_parceria%20Cactus.pdf) (snippet only)
- An item dated June 2026 says iugu has about 5,000 clients across education, SaaS, health and iGaming, and that Natalia Milagre took over the health vertical — [CB Insights](https://www.cbinsights.com/company/iugu) (aggregator)

### Inferences
- The strongest dramatizable pains are (a) the customer who "forgot" to pay the Pix, (b) a finance team reconciling spreadsheets across several providers, and (c) a platform manually paying commissions to many sellers or creators.
- Bets is a real but sensitive vertical. Keep it out of a broad brand ad unless the client asks for it.
- "~5,000 clients" (companies) and "125–150 mil contas" (accounts, probably including subaccounts and sellers) measure different things. Do not use them interchangeably.

### Gaps
- No official page states an ideal customer size or a minimum revenue or volume.
- The Saúde and Educação vertical pages were not opened. They may hold more segment-specific pains and numbers.

## 3. Founding, founders, HQ, size, funding, investors, M&A and ownership

### Takeaway
iugu was founded in 2012 in a garage in Dourados (MS) by Patrick Negri and moved to São Paulo in 2013. It became a Banco Central-authorized payment institution in August 2020 and raised R$120M in a Goldman Sachs-led round in September 2020. In November 2022 it bought Juno's client portfolio from Ebanx, and in 2H2025 it raised a further R$90M. Renato Fairbanks Ribeiro is CEO (Diretor Presidente). Headcount fell from 254 (end-2024) to "mais de 145" (mid-2026).

### Cited Findings
- **Founded:** 2012, "em uma garagem em Dourados (MS)". It reached São Paulo in 2013 — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu). The garage belonged to founder Patrick Negri's mother — [Exame, 2025-01-22](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
- **Legal entity and HQ:** iugu Instituição de Pagamento S/A, CNPJ 15.111.975/0001-64, Av. das Nações Unidas 12495, Cidade Monções, São Paulo/SP — [iugu home footer](https://www.iugu.com/)
- **Leadership:**
  - Renato Fairbanks (Ribeiro) was iugu's first angel investor in 2014 and became CEO in early 2020, replacing Negri, who became the technology head — [Finsiders](https://finsidersbrasil.com.br/reportagem-exclusiva-fintechs/iugu-que-automatiza-transacoes-financeiras-para-empresas-prepara-se-para-novo-aporte-novo-fidc-e-novas-avenidas-de-crescimento/), [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/). He had sat on the boards of Burger King do Brasil and Neoway — [Finsiders](https://finsidersbrasil.com.br/gente-em-fintechs/renato-ribeiro-e-o-novo-ceo-da-iugu-outros-cinco-executivos-entram-no-time/) (snippet only)
  - Renato Fairbanks Ribeiro signs as "Diretor Presidente" on the 1H2026 statements (published 2026-08-24) — [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
  - Pedro Alvarenga joined as CFO & CSO (announced 2026-04-14, with 18+ years of experience) — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/). He signs the 1H2026 statements as "Diretor Financeiro" — [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2). The previous CFO was André Gonçalves (quoted in April 2025) — [Brazil Economy, 2025-04-10](https://brazileconomy.com.br/empresas/2025/04/com-lucro-inedito-e-receita-recorde-fintech-iugu-mira-lideranca-em-tecnologia-financeira/)
  - On 2026-02-24 iugu hired two women executives, a CRO and a head of education (names not captured) — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/)
  - Júlio Macedo is Diretor de Riscos e Compliance — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/), [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
  - June 2026: João Victor Scarano (ex-OLX Brasil, Itaú, T-Systems) joined as Chief Technology & Product Officer, and founder Patrick Negri moved from CTO to chair of the board — [CB Insights](https://www.cbinsights.com/company/iugu) (aggregator, not confirmed by a primary source)
- **Funding and capital:**
  - R$120M round led by Goldman Sachs Merchant Banking, September 2020. It was iugu's largest raise and came weeks after the BC license — [Startupi](https://startupi.com.br/fintech-iugu-recebe-aporte-de-r-120-milhoes-liderado-pelo-goldman-sachs/) (snippet only), [iugu RI news, 2020-09-11](https://ri.iugu.com/servicos-aos-investidores/noticias/). The statements call it a "rodada série B" — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
  - 2H2025 "nova rodada de captação no montante de R$ 90 milhões". The capital injection was R$89.693M, with R$3.549M in raising costs. Subscribed capital after BC approval is R$215.9M. Investors are not named — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2). The money goes to "evolução tecnológica, expansão comercial e reforço de capital regulatório" — [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
  - FIDC (receivables fund): R$100M raised in 2022 with Bradesco BBI, structured by H2Capital — [Finsiders](https://finsidersbrasil.com.br/reportagem-exclusiva-fintechs/iugu-que-automatiza-transacoes-financeiras-para-empresas-prepara-se-para-novo-aporte-novo-fidc-e-novas-avenidas-de-crescimento/). It was refinanced for R$100M for three more years — [Brazil Economy, 2025-04](https://brazileconomy.com.br/empresas/2025/04/com-lucro-inedito-e-receita-recorde-fintech-iugu-mira-lideranca-em-tecnologia-financeira/). In 2025 iugu sold 59.8% of its FIDC quotas for a R$24.756M capital gain and kept 40.2% — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
  - Aggregator totals conflict: CB Insights says US$58.51M total, with Bradesco BBI, ScaleUp, Indicator Capital, Fabio Povoa, Goldman Sachs "and 8 others" — [CB Insights](https://www.cbinsights.com/company/iugu). Tracxn says about US$37.2M over two rounds — [Tracxn](https://tracxn.com/d/companies/iugu/__BMmL1WoovofE78EQK06NGCtZXgEA4aWdips4bnqSG-c) (snippet only)
- **Acquisition:** On 2022-11-11 Ebanx sold the Juno fintech's client portfolio to iugu. iugu said the deal raised its revenue by 50% — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/), [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- **Regulatory status:** BC license as an Instituição de Pagamento, published in the Diário Oficial in August 2020 (RI item dated 2020-08-28) — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/). The site says "Regulada pelo Banco Central do Brasil" — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu). A company press release calls it the "25ª licenciada pelo Banco Central como Instituição de Pagamento" — [iugu press release PDF](https://www.iugu.com/hubfs/Outubro_Press%20release%20-%20IBIA%20Payment%20Providers%20Forum_pt.pdf) (snippet only). The statements are filed under Resolução BCB nº 2 — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
- **Headcount:** 254 at end-2024 — [FY2024 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b480046f-236f-5c7c-5375-9da3e0c52577?origin=2). "Mais de 180" in the FY2025 report (dated 2026-05-11) — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2). "Mais de 145" in 1H2026, with an explicit "adequação do quadro de colaboradores ao porte e estágio operacional" — [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
- **Certifications:** B Corp in March 2025 — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2), with a B Impact score of 84.8 — [B Lab directory](https://www.bcorporation.net/en-us/find-a-b-corp/company/iugu/) (snippet only). The site shows the Reclame Aqui "RA1000" and "Verificada" seals and a Glassdoor certificate — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- **Award:** 8th in Exame's "Negócios em Expansão 2024", R$150–300M revenue band — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
- iugu is privately held. It keeps an RI site (ri.iugu.com) and publishes half-yearly KPMG-audited statements because Banco Central rules require it — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/), [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)

### Inferences
- From 254 to ~145 is a ~43% headcount reduction in about 18 months (inferred from the two "mais de" figures, so the true drop may be smaller). No press coverage of layoffs was found. The company frames it only as "adequação do quadro".
- The 2025 raise looks like a recapitalization after the fraud losses: it was explicitly also for "reforço de capital regulatório", and the Basel ratio is now 16% against a 12% minimum.

### Gaps
- No co-founders besides Patrick Negri were identified.
- The 2H2025 R$90M investors and the current cap table were not found. One search summary said Negri "remains the controlling shareholder", but its source page could not be identified, so this is unverified.
- The CRO and head-of-education names (Feb 2026) were not captured.
- The Scarano and Negri changes rest on CB Insights alone.

## 4. Key published numbers, with dates

### Takeaway
The headline marketing numbers are R$81 bi TPV in 2024, 1.5 bi transactions/year, 150 mil contas and 99.9% availability. They come from 2024, iugu's peak year (record R$327.3M revenue and a first-ever R$18.3M profit). 2025 then turned into a R$97.2M loss after client fraud and a tax-asset write-off, with a qualified KPMG opinion. 1H2026 shows a much smaller loss (R$9.3M) but falling revenue.

### Cited Findings
- **Marketing numbers on the site (2026):** "R$ 81 bi de TPV em 2024", "1,5 bi de transações por ano", "150 mil contas atendidas", "Top 10 empresas que mais transacionam Pix" (a label with no metric) — [iugu home](https://www.iugu.com/). "Disponibilidade: 99,9%" and "mais de 14 anos" of market presence (FAQ) — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- **FY2024 (audited):** net revenue R$327.3M "incluindo a receita de antecipação e receita de float", +41% YoY and 8.5x the 2019 level. TPV "passou os R$81 bilhões", +131% vs 2023. More than 1.5 bi payment transactions. First-ever net profit, R$18.3M. 254 employees. More than 130 mil active accounts. The revenue chart reads R$143.6M → R$232.7M → R$327.2M for 2022–2024 — [FY2024 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b480046f-236f-5c7c-5375-9da3e0c52577?origin=2). The press adds a 56% gross margin and calls the 1.5 bi transactions "Pix" operations — [Brazil Economy, 2025-04-10](https://brazileconomy.com.br/empresas/2025/04/com-lucro-inedito-e-receita-recorde-fintech-iugu-mira-lideranca-em-tecnologia-financeira/)
- **FY2025 (audited, published 2026-05-15):**
  - Net revenue R$221.966M (services R$157.9M + financial/float R$64.1M). Gross profit R$100.7M. **Net loss R$97.192M.** Accumulated loss R$156.7M.
  - Management attributes the loss mainly to "operações fraudulentas cursadas por alguns clientes da plataforma, que foram devidamente identificados e descredenciados". Police were involved and recovery is being pursued. Fraud losses in payment products were R$45.305M for the year, and the company also wrote off R$43M of deferred tax assets.
  - KPMG issued an **"Opinião com ressalva"** (qualified opinion). R$18.051M of the fraud loss belonged to prior years, so 2024 equity was overstated by that amount.
  - Possible civil contingencies are R$43.842M, mostly cardholder claims over undelivered products or services by merchants that process with iugu. iugu provisions 100% of chargebacks where the merchant has no balance.
  - Basel ratio 18% at 2025-12-31.
  — all from [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
- **1H2026 (published 2026-08-24):**
  - Net revenue R$102.0M vs R$115.7M in 1H2025 (−11.9%). Net loss R$9.3M vs R$29.7M in 1H2025.
  - Cost cuts: personnel R$35.0M → R$28.2M, data processing R$9.8M → R$7.3M, administrative R$26.6M → R$23.7M. AI is being applied to operational routines.
  - Basel ratio 16% (minimum 12%). "Mais de 125 mil contas ativas". "Mais de 145 colaboradores". The qualified opinion carries over for the 2025 comparatives.
  — all from [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
- **Historic:**
  - 2021: net revenue R$61M (+30%) and TPV R$6.3 bi (+17%) — [FY2021 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/8a407c53-4059-73e3-05bc-aecfca1e76cd?origin=1)
  - 1H2023: net revenue R$74.2M (+79%), gross margin ~60%. The CEO claimed ~100% average annual growth since 2014 — [Finsiders](https://finsidersbrasil.com.br/reportagem-exclusiva-fintechs/iugu-que-automatiza-transacoes-financeiras-para-empresas-prepara-se-para-novo-aporte-novo-fidc-e-novas-avenidas-de-crescimento/)
  - Exame gives 2023 revenue as R$161M (from R$93M, +73%) — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/). This conflicts with the R$232.7M in iugu's FY2024 chart, probably because the chart includes float and advance revenue and Exame's figure does not.

### Inferences
- **TPV growth:** R$6.3 bi (2021) to R$81 bi (2024) is roughly 13x in three years. +131% in 2024 implies about R$35 bi in 2023 (derived, not published).
- **2025 vs 2024 revenue** (R$222M vs R$327M) is probably not like-for-like. Resolução BCB nº 352 waived comparative columns in the 2025 statements, and 2024 revenue explicitly included advance and float income, while advance income may have moved with the FIDC quota sale. The clean same-basis comparison is 1H2026 vs 1H2025 (−11.9%).
- **Ad-claim risk:** the site still shows "150 mil contas" while the audited 1H2026 figure is "mais de 125 mil contas ativas". "R$81 bi em 2024" is accurate but two years old. An ad should date any number it uses ("em 2024") or use the current audited figure. Avoid "lucro" or record-growth claims.
- Security and antifraud are claimed product features, and 2025 losses came from client fraud. A "segurança" hero message is defensible as a lesson learned but is exposed to "gotcha" reactions. The brand team should decide that consciously.

### Gaps
- No 2025 TPV or 2025 transaction count was published in the statements or press found.
- No uptime figure beyond the FAQ "99,9%" was found, and there is no public status-page history.
- I did not check how the 1.5 bi transactions split between Pix and other methods.

## 5. Competitors and how iugu differentiates

### Takeaway
iugu competes for recurring billing, split and BaaS against Brazilian players such as Asaas, Vindi, Pagar.me (Stone), Mercado Pago, PagSeguro, Zoop and Tuna, plus newer BaaS and "payment institution" entrants. Its claimed edge is modularity and flexibility ("tecnologia que se molda ao seu negócio"), one platform instead of several providers, split built into recurring charges, and consultative service for mid and large accounts. It does not compete on being cheapest.

### Cited Findings
- Differentiation claims: "O ecossistema modular mais flexível do mercado", "Tecnologia que se molda ao seu negócio, não o contrário.", multiadquirência, automatic reconciliation, native KYC and antifraud, white-label — [iugu home](https://www.iugu.com/)
- The CEO (2023) says payments are commoditized ("A parte de pagamento já está muito comoditizada"), so iugu competes on adjacent products (dunning, recurrence, split) and on "produto e serviço" at a fair price. He also said: "Eu não acredito quando se dá tudo de graça". No competitor was named — [Monitor Mercantil, 2023-01-09](https://monitormercantil.com.br/iugu-mercado-perspectivas-e-competicao/)
- The CEO says iugu charges for any cost it incurs and does not offer free services. It puts sustainability ahead of growth — [Finsiders](https://finsidersbrasil.com.br/reportagem-exclusiva-fintechs/iugu-que-automatiza-transacoes-financeiras-para-empresas-prepara-se-para-novo-aporte-novo-fidc-e-novas-avenidas-de-crescimento/)
- Management cites "aumento da concorrência com o constante surgimento de novas fintechs e instituições de pagamento" and a strategy "direcionado para nichos onde possuímos diferenciais estratégicos pela capacidade de flexibilização e escalabilidade" — [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
- Asaas vs iugu on published rates, checked 2026-10-16 — [QUASA, 2026-10-18](https://quasa.io/pt/media/asaas-ou-iugu-tarifa-publicada-vence-ate-o-volume-pedir-proposta):
  - Asaas: R$1.99 per Pix or boleto; card R$0.49 + 2.99%; no monthly fee; 3-month promo for new clients.
  - On a R$100 charge, iugu is cheaper on Pix (R$0.99 vs R$1.99) and dearer on boleto (R$2.59 vs R$1.99) and card (R$3.74 vs R$3.48). iugu's monthly fee is not public.
- Comparison sites put Asaas at SMBs (billing plus digital account) and Vindi at recurring billing with split and WhatsApp/email/SMS dunning. Pagar.me (Stone) also offers subscriptions with configurable split — [B2B Stack iugu vs Vindi](https://www.b2bstack.com.br/compare/iugu-vs-vindi), [Stone](https://conteudo.stone.com.br/split-de-pagamento-com-recorrencia/) (snippet only)
- Aggregator competitor lists are inconsistent. CB Insights names Hash, CloudWalk and others — [CB Insights](https://www.cbinsights.com/company/iugu)
- The market is crowded: there are more than a thousand regulated payment institutions in Brazil, per BC data cited by Exame — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)

### Inferences
- For an ad, the most defensible differentiators are "uma plataforma no lugar de vários fornecedores", "split + recorrência juntos" and "regulada pelo Banco Central desde 2020". Avoid price-led claims: Asaas undercuts on boleto and card for small tickets.
- Moving the pitch to mid and large companies and consultative service ("Fale com um especialista", "Motor iugu") suggests the ad's protagonist should be a growing company's finance or ops lead, not a solo MEI.

### Gaps
- No official iugu comparison page against named competitors was found.
- No market-share data for recurring billing or split in Brazil was found.
- Stripe, Mercado Pago and PagSeguro were not compared directly in any source found.

## 6. News and events 2024–2026

### Takeaway
2024 was the high point: record revenue, first profit, BaaS launch and R$81 bi TPV. 2025 brought B Corp certification, a Gateway relaunch, Pix Automático support and a bets-integrity push, but also client fraud that produced a R$97M loss and a qualified audit. It was followed by a R$90M capital raise. In 2026 the company is restructuring: smaller team, a new CFO/CSO, CRO and CTPO, and the founder moving to board chair, under tighter Banco Central rules for payment institutions.

### Cited Findings
- **2024:**
  - iugu BaaS launched — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
  - Record results (above) — [FY2024 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b480046f-236f-5c7c-5375-9da3e0c52577?origin=2)
  - Exame Negócios em Expansão 2024, 8th place — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
- **2025-01-22:** Exame profile, "plataforma de criar 'fintechzinhas'" — [Exame](https://exame.com/negocios/iugu-fintech-startup-mato-grosso-dourados/)
- **2025-03:** B Corp certification — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
- **2025-04-15:** FY2024 results announced: "receita líquida recorde de R$ 327 milhões e alcança 1º lucro líquido da história" — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/)
- **2025-06:** Pix Automático launched by the BC (2025-06-05), with iugu commentary. iugu offers it in Recorrência — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/), [iugu Recorrência](https://www.iugu.com/iugu-recorrencia)
- **2025-06-18:** meeting with the Secretaria de Prêmios e Apostas — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/)
- **2025:** "Relançamento do iugu Gateway" — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
- **2025-10 / 2025-11:** IBIA Payment Providers Forum, then the Cactus iGaming integration — [BNL Data](https://bnldata.com.br/?p=172193) (snippet only)
- **2025-12-10:** iugu data release saying credit-card use grew on Black Friday — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/)
- **2H2025:**
  - Client fraud: R$45.3M of losses in the year, fraudulent clients "descredenciados", a police report filed.
  - R$43M deferred-tax write-off.
  - R$90M capital raise and partial sale of the FIDC.
  - Cost-cutting started: supplier renegotiation, opex cuts, headcount "adequação".
  — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2), [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
- **2026-02-24:** CRO and head of education hired. **2026-03-05 / 03-09:** iugu commentary on new BC rules (Resolução Conjunta nº 14), which set requirements proportional to each payment company's size; Júlio Macedo expects e-commerce to move to "instituições mais robustas". **2026-04-14:** Pedro Alvarenga named CFO & CSO — [iugu RI news](https://ri.iugu.com/servicos-aos-investidores/noticias/)
- **2026-05-11 / 05-15:** FY2025 statements published with the R$97.2M loss and the qualified KPMG opinion — [FY2025 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/b21a3d79-7cd0-1ca4-bcc3-3eb6aa58b5b5?origin=2)
- **2026-06 (about 06-09/10):** João Victor Scarano named CTPO, Natalia Milagre to the health vertical, Patrick Negri from CTO to board chair — [CB Insights](https://www.cbinsights.com/company/iugu) (aggregator only)
- **2026-08-24:** 1H2026 statements: revenue R$102.0M, loss R$9.3M, Basel 16%, ~145 staff — [1H2026 statements](https://api.mziq.com/mzfilemanager/v2/d/132a50cc-707c-42a5-826e-6edd3ac0fb8a/799bf67c-851b-4264-1069-6801d46293d7?origin=2)
- **Customer sentiment (Reclame Aqui, individual complaints, undated in results):**
  - Complaints cover funds held after account cancellation, pending refunds and chargebacks, account invasion, and scam merchants (e.g., a cloned G1 page) that charged through iugu. iugu's standard reply is that it is "apenas uma instituição de pagamento". KYC reviews take up to 5 business days — [Reclame Aqui: valores retidos](https://www.reclameaqui.com.br/iugu/iugu-retem-valores-apos-cancelamento-de-conta-e-se-recusa-a-estornar-pagamentos_s3RG2G2bS5h2UG78/), [Reclame Aqui: invasão de conta](https://www.reclameaqui.com.br/iugu/invasao-de-conta-falta-de-seguranca-iugu_MoZYDmDwUQqLYMGo/), [Reclame Aqui: G1 falso](https://www.reclameaqui.com.br/iugu/liquidacao-carrefour-g1-falso_fXDlx0gGbepsoZL6/) (snippets only)
  - A third-party site gives 8.5/10 "Ótima" on Reclame Aqui (undated) — [Site Confiável](https://www.siteconfiavel.com.br/site/iugu-com)
  - iugu displays the RA1000 seal — [Sobre a iugu](https://www.iugu.com/sobre-a-iugu)
  - 2023 headline: "Contas digitais: Iugu é suspeito de sumir com dinheiro e deixa clientes no prejuízo" (not opened) — [Perfil News, 2023-04-27](https://www.perfilnews.com.br/2023/04/27/contas-digitais-iugu-e-suspeito-de-sumir-com-dinheiro-e-deixa-clientes-no-prejuizo/)

### Inferences
- The 2025 fraud, the loss and the restructuring appear only in iugu's own mandatory filings. No press coverage was found. A brand campaign now probably aims to restart growth after a cost reset (−11.9% revenue in 1H2026, with management saying improvement showed in April–June 2026).
- Many public complaints come from end-payers of iugu's merchants, not from iugu's B2B clients. That is a reputational exposure for a consumer-facing channel like Instagram (comment-section risk).

### Gaps
- No independent press coverage (Valor, NeoFeed, Startups, Finsiders) of the 2025 loss, the fraud or the layoffs was found.
- No 2024–2026 product-launch press release for BaaS or Gateway with metrics was found.
- iugu's current Reclame Aqui score could not be read: the page returned 403.
- The LinkedIn page was not checked.

## 7. Pricing model

### Takeaway
iugu does not publish a full price table. It sells three plans (Essencial, Essencial + Split, Motor iugu) with a monthly subscription, variable per-transaction fees and a possible setup fee, and negotiates rates for high volume. A third party read iugu's commercial page on 2026-10-16: Essencial at 0.99% per Pix, R$2.19 per boleto, 3.34% per card, plus R$0.40 processing per boleto or card, with the monthly fee "consulte".

### Cited Findings
- Plans: **Essencial iugu** (no split), **Essencial + Split**, and **Motor iugu** (all advanced tools, "negociação de taxas para alto volume", specialized financial-management consulting). Billing is a monthly subscription plus "tarifas variáveis". "Taxas de configuração inicial" are possible. Cancellation needs 30 days' notice. No prices are on the page — [iugu Planos](https://www.iugu.com/planos)
- Essencial rates seen on iugu.com/saiba-mais on 2026-10-16: Pix 0.99%, boleto R$2.19, card 3.34%, processing R$0.40 per boleto or card, monthly fee "consulte". Setup, split and advance fees are quoted on request — [QUASA, 2026-10-18](https://quasa.io/pt/media/asaas-ou-iugu-tarifa-publicada-vence-ate-o-volume-pedir-proposta) (secondary; it cites iugu pages)
- The homepage's main calls to action are "Quero contratar" and "Falar com um especialista" — [iugu home](https://www.iugu.com/)
- Leadership philosophy: no free tiers; "Eu não acredito quando se dá tudo de graça" — [Monitor Mercantil, 2023](https://monitormercantil.com.br/iugu-mercado-perspectivas-e-competicao/)

### Inferences
- Price is not a usable hero claim. Pix at 0.99% beats flat-fee rivals only on small tickets (below about R$200 against Asaas's R$1.99). The monthly fee is undisclosed. The ad should push value (automation, less default, fewer providers) and a "fale com um especialista" CTA.

### Gaps
- I did not open iugu.com/saiba-mais directly to confirm the QUASA figures.
- No public data on monthly-fee ranges, antecipação rates, split fees or BaaS pricing was found.
