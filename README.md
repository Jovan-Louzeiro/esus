# Simulador e-SUS APS

Aplicação de prática com dados fictícios, sem integração com o e-SUS oficial. Não utilize dados reais de pacientes.

## Executar

Requer Node.js e npm.

```powershell
npm install
npm run dev
```

Abra o endereço exibido no terminal. Para verificar os tipos e gerar a versão de produção, execute `npm run build`.

## Dados e backup

Na primeira abertura são criados exemplos fictícios. Os dados ficam no LocalStorage do navegador e podem ser apagados ao limpar os dados do site. Use **Exportar backup** para salvar um JSON e **Importar** para restaurá-lo; a importação substitui todos os dados atuais após confirmação. Excluir um cidadão também exclui seus registros vinculados.

O fluxo de enfermagem permite agendar consultas, registrar a chegada, acompanhar a fila, realizar a escuta inicial com motivo da procura, classificação de risco e medições opcionais (sinais vitais, antropometria e glicemia), preencher a consulta SOAP e finalizar o atendimento com plano de cuidados. Os dados permanecem locais; dados salvos e backups da versão anterior são compatíveis e convertidos para o formato atual ao salvar ou importar. Medicamentos e relatórios continuam como telas ilustrativas. O simulador não substitui o e-SUS APS nem sistemas ou orientações profissionais de saúde.
