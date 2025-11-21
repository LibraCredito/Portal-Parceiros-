# Sistema de Cache do Ploomes

## Visão Geral

O sistema de cache foi implementado para resolver o problema de limite de requisições ao Ploomes (120 requisições por minuto). Agora, as opções dos selects são armazenadas no localStorage por 1 dia, evitando requisições desnecessárias.

## Como Funciona

### 1. **Cache Automático**
- Quando o usuário acessa a página pela primeira vez, as opções são buscadas do Ploomes
- Os dados são salvos no localStorage com timestamp
- Nas próximas visitas (dentro de 24h), os dados são carregados do cache

### 2. **Estrutura do Cache**
```javascript
{
  options: PloomesOption[],
  timestamp: number, // Data/hora de criação
  tableId: number    // ID da tabela do Ploomes
}
```

### 3. **Chaves do Cache**
- Formato: `ploomes_options_{tableId}`
- Exemplo: `ploomes_options_39344` (Estado Civil)

### 4. **Expiração**
- Cache expira automaticamente após 24 horas
- Cache expirado é removido automaticamente ao carregar a página

## Funções Disponíveis

### `usePloomesOptions(tableId)`
Hook principal que gerencia o cache automaticamente.

### `clearExpiredCache()`
Remove todos os caches expirados.

### `clearAllPloomesCache()`
Remove todo o cache do Ploomes (força nova busca).

### `getCacheInfo()`
Retorna informações sobre o cache:
```javascript
{
  total: number,    // Total de itens no cache
  expired: number,  // Itens expirados
  valid: number     // Itens válidos
}
```

## Benefícios

1. **Redução de Requisições**: Evita requisições desnecessárias ao Ploomes
2. **Performance**: Carregamento mais rápido das opções
3. **Economia de Rate Limit**: Respeita o limite de 120 req/min
4. **Experiência do Usuário**: Dados carregam instantaneamente após primeira visita

## Debug

### Botões de Debug
- **Debug**: Mostra informações do cache no console
- **🗑️ Cache**: Limpa todo o cache manualmente

### Informações no Console
```javascript
// Status do cache
[Formulario] Status do cache: { total: 15, expired: 2, valid: 13 }

// Uso do cache
[usePloomesOptions] Usando cache para tableId 39344

// Nova requisição
[usePloomesOptions] Fazendo requisição para tableId 39344
```

## IDs das Opções

### Tomadores
- Estado Civil: 39344, 39353, 39384, 39389
- Tipo Pessoa: 47689, 47690, 47691, 47692
- Qualificação Profissão: 32454, 32455, 32456, 38542
- Comprovação Renda Formal: 31834, 31836, 31838, 38543
- Comprovação Renda Informal: 31835, 31837, 31839, 38544
- Quantidade Sócios: 47704, 47706, 47709, 47711
- Número Admin: 47705, 47707, 47710, 47712

### Empréstimo
- Amortização: 44254
- Carência: 46299
- Motivo: 31247
- Dívida ITR: 46865

### Garantia
- Cidade: 31460
- Rural/Urbano: 46826
- UF: 38986
- Financiada: 32453
- Utilização: 31833
- Tipo: 31459

### Garantidores
- Estado Civil: 39359, 39364, 39392, 39395

## Limpeza Automática

O cache é limpo automaticamente:
1. Ao carregar a página (remove itens expirados)
2. Após 24 horas (expiração automática)
3. Manualmente via botão "🗑️ Cache"

## Troubleshooting

### Cache não está funcionando
1. Verifique se o localStorage está habilitado
2. Use o botão Debug para verificar o status
3. Limpe o cache manualmente se necessário

### Dados desatualizados
1. Use o botão "🗑️ Cache" para forçar nova busca
2. Recarregue a página após limpar o cache

### Erro de localStorage
- O sistema trata erros graciosamente
- Requisições são feitas normalmente se o cache falhar 