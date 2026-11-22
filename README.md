# APS Simulada

Aplicação de treinamento frontend-only, sem integração com sistemas oficiais. Use apenas informações fictícias; não é destinada ao atendimento real.

## Executar

Com Node.js instalado:

```powershell
npm install
npm run dev
```

Abra o endereço local informado pelo Vite. Para gerar a versão de produção, execute `npm run build`.

Os registros são salvos no `localStorage` do navegador e permanecem disponíveis após fechar ou atualizar a página, no mesmo navegador e origem. Os dados fictícios são criados somente na primeira execução. Em **Configurações**, é possível exportar ou importar um backup JSON, restaurar os exemplos ou limpar os dados. Importar, restaurar e limpar substituem os registros existentes; recomenda-se exportar um backup antes.

Os atendimentos em andamento são salvos automaticamente. Ao finalizar, ficam disponíveis para consulta, sem edição. A agenda inicial é fictícia. As próximas doses são informadas manualmente: os indicadores de pendência consideram as datas registradas, sem cálculo de calendário vacinal; atualize ou remova a data prevista no registro quando ela deixar de ser aplicável.

Os dados ficam apenas no navegador e podem ser perdidos ao limpar seus dados de navegação. Não há autenticação, backend, diagnóstico ou envio de informações a serviços de saúde.
