# 🚀 Instruções de Configuração

## Passo a Passo para Configurar o Power BI

### 1. Criar Arquivo de Variáveis de Ambiente

Na raiz do projeto, crie um arquivo chamado `.env.local` com o seguinte conteúdo:

```bash
# Power BI API URL
VITE_POWER_BI_URL=https://pbi.ploomes.com/powerbi/callback/a2f85c93108d43cc9005606c63e5771d?code=eddTWbLXzRxcfNlhFnE81GzHC6FWgk9d%2BrLqSwtZfrPlG8KZ9IrkhHN2MFrqqM5H3SpAv8FMHxJUG62XYMBPMgh4xEV7eCq1hwI2xLjtMGAX2Qs5S6bYBsLv6xec1eL8DLtVtzfoBgB%2BieXr6svQEFPlpiOnnqAUqS6rmVGt3l1X2X87qWZZ6sJXXo7PgsFZsYPVzYN97YM8uc1Hez9ZMO8ThryXy5hXkaZ8Fzx4g6rLt6PqON8huT071QNu4xiuJE0l1o7xkT4IkVkCy6qhig%3D%3D
```

### 2. Reiniciar o Servidor

```bash
# Parar o servidor atual (Ctrl+C)
# Depois executar:
npm run dev
```

### 3. Verificar se Funcionou

- Acesse a página de Métricas e Relatórios
- Os dados devem carregar automaticamente
- Não deve aparecer erro de "URL não configurada"

## ✅ O que foi Alterado

1. **Removido dependência** do campo `power_bi_url` do banco de dados
2. **Criada variável de ambiente** `VITE_POWER_BI_URL`
3. **Centralizada configuração** no arquivo `src/config/env.ts`
4. **Atualizadas páginas**:
   - `MetricasRelatorios.tsx`
   - `ClientesCadastrados.tsx`

## 🔒 Segurança

- O arquivo `.env.local` está no `.gitignore`
- Nunca será commitado no repositório
- A URL do Power BI está protegida

## 🐛 Solução de Problemas

Se aparecer erro "VITE_POWER_BI_URL não está configurada":

1. Verifique se o arquivo `.env.local` foi criado na raiz
2. Verifique se não há espaços extras na URL
3. Reinicie o servidor de desenvolvimento
4. Verifique se o arquivo está salvo com extensão `.local`

## 📝 Notas Importantes

- A URL do Power BI agora é fixa para todos os grupos
- Não é mais necessário configurar `power_bi_url` no banco de dados
- O sistema filtra automaticamente os dados pelo grupo do usuário logado
