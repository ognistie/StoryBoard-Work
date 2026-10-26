# Validação de uso — 26/10/2026

## Ambiente e evidências

- Base atualizada de `main` (`9dd7762`), sem substituir as alterações de apresentação do time.
- Duas origens locais (`127.0.0.1:5173` e `localhost:5173`), com cookies e IndexedDB separados, usando o mesmo servidor em memória. Contas fictícias `ana.qa@example.test` e `bia.qa@example.test`; nenhum convite real enviado.
- Navegador: cadastro das duas pessoas, compartilhamento de exemplo, convite por link, entrada da convidada, presença, recebimento das cinco cenas, mensagens nos dois sentidos, duas versões de roteiro/CSV na pasta, download e restauração de versão anterior.
- Produção: `/api/health` respondeu IA e colaboração ativas; `/api/plan-briefing` retornou um plano válido de três segundos em uma chamada real, sem criar projeto na conta do usuário.
- Testes automatizados cobrem permissões, isolamento por projeto, sincronização, arquivos versionados, concorrência, Google OAuth, contratos de storyboard e exportações.

- Verificação final: 88 testes passaram, checagem de tipos e build com Bun 1.4.4 concluídos. Nenhum código de troca OAuth ou segredo do servidor apareceu no bundle do navegador.

## Correções

- Imagem sem textos sobrepostos; prancha 16:9 em preto e branco, com plano numerado, descrição, ação, fala, enquadramento, câmera e duração em ficha separada. Exportação PDF em duas colunas e roteiro com ação explícita.
- Direção cinematográfica compartilhada entre planejamento e revisões; referências de imagem enviadas como imagem para a OpenAI; durações positivas e soma exata do tempo pedido.
- Login Google com authorization code, PKCE, estado de dez minutos vinculado ao navegador e uso único. Identidade validada no endpoint autenticado do Google, e-mail verificado obrigatório, sessão HttpOnly. Não vincula automaticamente uma conta com senha que tenha o mesmo e-mail.
- Saída da conta não é simulada quando o servidor falha. Cadastro bloqueia envios duplicados e os campos têm nomes acessíveis.
- IA, sincronização e verificação de saúde têm prazo de espera. Funções de IA configuradas para até 60 segundos na Vercel.
- Resultado de IA verifica também alterações manuais ainda não versionadas. Revisão de briefing e cenas é uma transação: um conflito cancela o conjunto.
- Pacote JSON inclui arquivos, bytes das versões, histórico de documentos, referências e chat; exportação recusa um pacote incompleto enquanto imagens/arquivos não chegaram.
- CSV neutraliza fórmulas inseridas em campos de usuário. Impressão avisa quando imagens não carregaram.
- Convites exigem o e-mail destinatário e emissor ainda autorizado; uso por outra conta e acesso após remoção têm testes de regressão. Clientes não podem forjar autoria ou alterar/apagar comentários de outras pessoas; controles de edição respeitam o papel na interface.
- Uma conta com senha, sem prova de posse do e-mail, não recebe os tokens de convites na listagem: deve abrir o link secreto entregue pelo responsável ou por e-mail. Isso impede cadastrar o e-mail de terceiros para obter seus convites. Contas Google verificadas podem listar os convites pendentes.

## Configuração e limites que continuam explícitos

- Google real depende de `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` de um cliente OAuth **Web** no Google Cloud, com URI autorizado `https://decupaai.vercel.app/api/google`. `GOOGLE_REDIRECT_URI` permite fixar esse endereço. Só depois de configurar e republicar o botão aparece. Os oito testes do fluxo usam respostas controladas do Google; não equivalem a consentimento real de uma conta Google.
- A chave da OpenAI fica no servidor. Desenhos novos continuam sendo **prévias esquemáticas do renderizador local**, não ilustrações geradas por um modelo de imagem. A orientação cinematográfica melhora a decupagem e os dados, sem prometer anatomia ou continuidade visual que esse renderizador não assegura.
- Convites por e-mail precisam de Resend; por link funcionam sem ele. Sincronização por consulta a cada quatro segundos; conflitos remotos no mesmo registro continuam com última gravação prevalecendo.
- Arquivos até 3 MB; sem recuperação de senha por e-mail neste MVP. Não foi realizado teste de carga nem auditoria de segurança independente.

## Referências da integração

- [Google: fluxo OpenID Connect e endpoints autenticados](https://developers.google.com/identity/openid-connect/openid-connect).
- [OpenAI: saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs).
