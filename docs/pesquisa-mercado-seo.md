# Pesquisa: público do audiovisual no Brasil e busca orgânica

Pesquisa feita em 24/10/2026 para orientar o SEO da Decupa (https://story-board-work.vercel.app). O objetivo é aparecer quando profissionais e estudantes do audiovisual brasileiro procuram storyboard, decupagem, roteiro e IA.

## O que a pesquisa encontrou e o que não encontrou

- **Volume de busca:** nenhuma fonte pública trouxe números mensais por termo no Brasil. Para isso é preciso o Planejador de Palavras-chave do Google Ads (filtro Brasil), Semrush, Ubersuggest ou Ahrefs. O Google Trends compara termos entre si, mas não dá volume.
- **O que dá para afirmar:** os termos abaixo são os que ocupam as primeiras páginas, em guias, cursos, bancos de modelos e ferramentas. Vêm do conteúdo que já ranqueia e dos planos de ensino de cursos de audiovisual. É sinal de demanda, não medida.

## Público

| Grupo | Por que busca | Fonte |
|---|---|---|
| Produtoras independentes | 11.342 registradas na Ancine; Sudeste 7.054, Sul 1.548, Nordeste 1.542 | [Sebrae](https://agenciasebrae.com.br/economia-e-politica/indicacao-de-ainda-estou-aqui-ao-oscar-2025-chama-atencao-para-potencial-do-setor-audiovisual-brasileiro) |
| Projetos registrados | 39.441 projetos audiovisuais registrados na Ancine em 2024; SP com 30%, PR 12%, SC 10%, RS 7% | [Señal News](https://senalnews.com/es/data/brasil-ancine-registro-39441-proyectos-audiovisuales-en-2024) |
| Produtoras grandes usando IA | A O2 Filmes usava IA para gerar referências de storyboard, tratamentos e books, e desenvolvia um modelo para ler e decupar roteiros | [Meio & Mensagem](https://www.meioemensagem.com.br/midia/ia-generativa-na-producao-de-filmes-e-series-no-brasil) |
| Estúdios de IA | The Future Studios, produtora brasileira de IA generativa, comprada pela Galeria.Holding em maio de 2026 | [Señal News](https://senalnews.com/es/contenidos/galeriaholding-adquiere-la-productora-de-ia-the-future-studio/amp) |
| Estudantes de cinema e RTV | Decupagem e storyboard fazem parte dos planos de ensino de direção, por exemplo na UFES | [UFES](https://comunicacaosocial.ufes.br/sites/comunicacaosocial.ufes.br/files/field/anexo/plano_de_ensino_direcao_audiovisuais_v_2026-2.pdf) |
| Creators, social media, agências | Roteiro e storyboard para Reels, TikTok e YouTube; modelos prontos (Canva, Adobe Express, VistaCreate) dominam a busca por "modelo" | [Gran Faculdade](https://faculdade.grancursosonline.com.br/blog/storyboard/), [Adobe](https://www.adobe.com/br/express/discover/examples/storyboard), [VistaCreate](https://create.vista.com/create/storyboards/) |

**Público principal da Decupa:** diretores, assistentes de direção, produtores e roteiristas de produtoras pequenas e médias; criativos de agência; creators que fazem vídeo curto para marcas; estudantes de cinema, RTV e publicidade.

## Termos por tema

Usados no `index.html` (título, descrição, dados estruturados) e na página `public/guia/storyboard-com-ia.html`.

1. **Storyboard:** storyboard, o que é storyboard, como fazer storyboard, modelo de storyboard, template de storyboard, storyboard pronto, storyboard PDF, exemplo de storyboard, storyboard para vídeo, storyboard publicitário, storyboard de comercial, storyboard de animação, storyboard online grátis, shooting board, animatic.
2. **Decupagem e roteiro técnico:** decupagem, decupagem de roteiro, decupagem técnica, o que é decupagem, roteiro técnico, análise técnica, lista de planos (shot list), planilha de decupagem, ordem do dia, mapa de filmagem.
3. **Linguagem de câmera:** tipos de plano, plano geral, plano de conjunto, plano médio, plano americano, close, plano detalhe, enquadramento, ângulos de câmera, movimentos de câmera, travelling, panorâmica, push-in, zoom, dolly, grua, câmera na mão, continuidade.
4. **Vídeo para redes:** roteiro para Reels, roteiro para TikTok, roteiro para YouTube, roteiro de vídeo curto, gancho nos primeiros segundos, roteiro de vídeo publicitário, briefing de vídeo, modelo de briefing audiovisual.
5. **Pré-produção:** pré-produção audiovisual, planejamento de filmagem, cronograma de filmagem, moodboard, aprovação de storyboard com cliente, versões de roteiro.
6. **IA no audiovisual:** storyboard com IA, gerador de storyboard com IA, IA para roteiro, IA para vídeo, IA para audiovisual, IA generativa em produtoras, ChatGPT para roteiro, inteligência artificial no cinema, ferramentas de IA para criadores. Referências: [Storyboarder.ai](https://moge.ai/br/product/storyboarderai), estudo de caso espanhol sobre storyboards com IA ([UVaDOC](https://uvadoc.uva.es/handle/10324/72485)), projeto Macunaíma da UFSCar ([Revista Geminis](https://revistageminis.ufscar.br/index.php/geminis/article/download/826/523/3135)).
7. **Trabalho em equipe:** storyboard colaborativo, ferramenta de pré-produção online, compartilhar storyboard com cliente.

## O que foi feito no site

- `index.html`: título e descrição com os termos principais, Open Graph e Twitter Card, `canonical`, dados estruturados (`SoftwareApplication` e `WebSite`) e um resumo em `<noscript>` para buscadores que não rodam JavaScript.
- `public/guia/storyboard-com-ia.html`: guia estático e leve, no visual da Decupa, que responde às dúvidas mais comuns (o que é storyboard, como fazer, decupagem, planos e movimentos, roteiro para Reels, IA). Tem FAQ com dados estruturados (`FAQPage`) e leva para o app.
- `public/robots.txt` e `public/sitemap.xml`, com o domínio da Vercel.
- O app usa rotas com `#` (`/#/p/...`). Buscadores ignoram o que vem depois do `#`, então projetos nunca são indexados: bom para a privacidade.

## Próximos passos (fora do código)

- Cadastrar o domínio no Google Search Console e enviar o `sitemap.xml`.
- Medir volumes reais no Planejador de Palavras-chave e ajustar o guia aos termos com mais busca.
- O build troca `story-board-work.vercel.app` pelo domínio de produção da Vercel no `index.html`, no guia, no `robots.txt` e no `sitemap.xml` (plugin `siteUrl` no `vite.config.ts`). Com domínio próprio, basta adicioná-lo na Vercel e publicar de novo.
