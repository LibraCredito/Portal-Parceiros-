
export type UserRole = 'admin' | 'coordenador' | 'usuario';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  groupId: string | null;
  UsuarioData?: string;
}

export interface Group {
  id: string;
  name: string;
  powerBiUrl?: string;
  formUrl?: string;
  createdAt: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
}

export interface Material {
  id: string;
  title: string;
  type: 'link' | 'file';
  url: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface SimulationVariable {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  description?: string;
}
