# Análise e Melhorias - UserModal.tsx

## 🔴 Problemas Críticos

### 1. Blocos catch vazios
**Localização:** Linhas 55-56 e 63-64

**Problema:**
```typescript
if (error) {
  // Vazio - erros são silenciados
} 
catch (error) {
  // Vazio - erros são silenciados
}
```

**Solução:**
```typescript
if (error) {
  console.error('Erro ao buscar grupo:', error);
  toast({
    title: "Aviso",
    description: "Não foi possível carregar informações do grupo.",
    variant: "destructive",
  });
}

catch (error) {
  console.error('Erro ao buscar grupo do coordenador:', error);
  // Opcional: mostrar toast de erro
}
```

### 2. URL da API hardcoded
**Localização:** Linha 261

**Problema:** URL da API está hardcoded no código

**Solução:**
```typescript
// Criar arquivo src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ploomes-api.vercel.app';

// No componente:
const response = await fetch(`${API_BASE_URL}/supabase/`, {
  // ...
});
```

### 3. CSS problemático
**Localização:** Linha 381

**Problema:** `w-[160vw]` pode causar overflow horizontal

**Solução:**
```typescript
<DialogContent className="w-[95vw] max-w-4xl h-[90vh] overflow-y-auto">
```

### 4. Lógica duplicada no handleSave
**Localização:** Linhas 314-344

**Problema:** Código duplicado e fluxo de edição não fecha modal

**Solução:** Refatorar para remover duplicação e garantir que edição feche o modal

### 5. Validação de senha na edição
**Localização:** Linhas 189-199

**Problema:** Valida confirmação mesmo quando senha está vazia

**Solução:**
```typescript
// Só validar confirmação se senha foi fornecida
if (formData.password && formData.password.trim() !== '') {
  if (formData.password.length < 6) {
    newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
  }
  
  // Só validar confirmação se senha foi fornecida
  if (formData.password !== formData.confirmPassword) {
    newErrors.confirmPassword = 'As senhas não coincidem';
  }
} else if (user && formData.confirmPassword) {
  // Se está editando e forneceu confirmação sem senha, erro
  newErrors.confirmPassword = 'Digite a senha primeiro';
}
```

### 6. Dependências do useEffect
**Localização:** Linha 81

**Problema:** `fetchCurrentUserGroup` não está nas dependências

**Solução:**
```typescript
useEffect(() => {
  if (isOpen && profile?.group_id) {
    fetchCurrentUserGroup();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen, profile?.group_id]);
// OU usar useCallback para fetchCurrentUserGroup
```

### 7. Inconsistência de dados UsuarioData
**Problema:** Na edição, converte string para objeto, mas no save volta a string sem preservar Id

**Solução:** Manter consistência ou salvar como JSON string

## 🟡 Melhorias Recomendadas

### 1. Extrair validações para função separada
```typescript
// Criar arquivo src/utils/validation.ts
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePassword = (password: string, minLength: number = 6): boolean => {
  return password.length >= minLength;
};
```

### 2. Usar React Hook Form
O componente já usa React Hook Form no projeto, seria melhor usar aqui também:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  // ...
});
```

### 3. Extrair lógica de API para hook customizado
```typescript
// Criar src/hooks/useUserAPI.ts
export const useUserAPI = () => {
  const createUser = async (userData: CreateUserData) => {
    const response = await fetch(`${API_BASE_URL}/supabase/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    // ...
  };
  
  return { createUser };
};
```

### 4. Melhorar tratamento de erros
```typescript
type APIError = {
  code?: string;
  error?: string;
  message?: string;
};

const handleAPIError = (response: Response, data: APIError) => {
  const errorMap: Record<string, { title: string; description: string }> = {
    email_exists: {
      title: "❌ E-mail já cadastrado",
      description: "Este e-mail já está sendo usado por outro usuário.",
    },
    // ...
  };
  
  const error = errorMap[data.code || ''] || {
    title: "❌ Erro",
    description: data.error || "Ocorreu um erro inesperado.",
  };
  
  return error;
};
```

### 5. Adicionar loading states mais granulares
```typescript
const [loadingStates, setLoadingStates] = useState({
  groups: false,
  ploomesOptions: false,
  currentGroup: false,
  submitting: false,
});
```

### 6. Memoizar valores computados
```typescript
const filteredPloomesOptions = useMemo(() => {
  if (profile?.role === 'admin') return ploomesOptions;
  if (!currentUserGroup) return [];
  return ploomesOptions.filter(option => 
    option.Name.toLowerCase().includes(currentUserGroup.name.toLowerCase())
  );
}, [ploomesOptions, profile?.role, currentUserGroup]);
```

### 7. Separar componentes menores
```typescript
// UserFormFields.tsx
const UserFormFields = ({ formData, errors, onChange, user }) => {
  // Campos do formulário
};

// PloomesField.tsx
const PloomesField = ({ value, onChange, options, loading, error }) => {
  // Campo do Ploomes
};
```

## 📊 Métricas do Componente

- **Linhas de código:** 565
- **Complexidade ciclomática:** ~15 (média-alta)
- **Estados:** 7 estados diferentes
- **useEffects:** 3
- **Funções:** 5 principais

## ✅ Checklist de Refatoração

- [ ] Corrigir blocos catch vazios
- [ ] Mover URL da API para variável de ambiente
- [ ] Corrigir CSS problemático
- [ ] Remover lógica duplicada
- [ ] Melhorar validação de senha na edição
- [ ] Corrigir dependências do useEffect
- [ ] Resolver inconsistência de UsuarioData
- [ ] Extrair validações para função separada
- [ ] Considerar usar React Hook Form
- [ ] Extrair lógica de API para hook
- [ ] Melhorar tratamento de erros
- [ ] Adicionar loading states granulares
- [ ] Memoizar valores computados
- [ ] Separar em componentes menores (opcional)

## 🎯 Prioridades

1. **Alta:** Corrigir blocos catch vazios
2. **Alta:** Mover URL da API para variável de ambiente
3. **Média:** Corrigir CSS problemático
4. **Média:** Remover lógica duplicada
5. **Média:** Melhorar validação de senha
6. **Baixa:** Refatorar para componentes menores
7. **Baixa:** Usar React Hook Form

