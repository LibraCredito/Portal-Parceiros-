# Configuração das Variáveis de Ambiente

## Power BI API

Este projeto utiliza uma API do Power BI para obter dados de clientes. A URL da API deve ser configurada através de variáveis de ambiente.

### Configuração Local

1. **Crie um arquivo `.env.local` na raiz do projeto:**
```bash
# Power BI API URL
VITE_POWER_BI_URL=https://pbi.ploomes.com/powerbi/callback/a2f85c93108d43cc9005606c63e5771d?code=eddTWbLXzRxcfNlhFnE81C0N%2BdDx4kxQ3StLCR7NidXFgwDTqPBh%2BSaA5TuoXGseBH9wCirOVnugC6968pZiSGZ771VYu%2FClIQEacpYM8wTqPN2n7dVQ0ZuWNUI8JzqTCH%2BhsQcNT1PNCUDgLglXJoq9P7E4ALpWPBpFI98J1eSifGBjHX5b%2B87MVSaiUs9JnSQv8AOWszF6Mz3Xvwo9sYSplFDaUU1MM8N2SMm%2FqpCUyY3pBNtYAkXxpaTouMnMjqN5pGOl6%2FzbizAfLjGsvw%3D%3D
```

2. **Reinicie o servidor de desenvolvimento:**
```bash
npm run dev
```

### Configuração de Produção

Para ambientes de produção, configure as variáveis de ambiente no seu provedor de hospedagem:

- **Vercel**: Configure no painel de controle do projeto
- **Netlify**: Configure no painel de controle do projeto
- **Outros**: Configure conforme a documentação do seu provedor

### Estrutura dos Dados

A API retorna dados no seguinte formato:

```json
[
  {
    "Parceiros": "NOME_DO_PARCEIRO",
    "Cliente": "NOME_DO_CLIENTE",
    "Valor": 100000,
    "Estágio": "Análise Financeira",
    "Situação": "Em aberto",
    "Início": "2025-08-25T10:06:10",
    "Responsável (Parceiro)": "Nome do Responsável"
  }
]
```

### Segurança

⚠️ **IMPORTANTE**: 
- O arquivo `.env.local` está no `.gitignore` e não será commitado
- Nunca commite URLs de API ou chaves secretas no repositório
- Use variáveis de ambiente para todas as configurações sensíveis

### Validação

O sistema valida automaticamente se as variáveis obrigatórias estão configuradas ao iniciar. Se alguma variável estiver faltando, um erro será exibido.
