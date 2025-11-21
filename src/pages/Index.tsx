
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '@/components/Auth/LoginForm';
import Layout from '@/components/Layout/Layout';
import Header from '@/components/Layout/Header';
import TopNavigation from '@/components/Layout/TopNavigation';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Usuarios from './Usuarios';
import Noticias from './Noticias';
import NewsForm from './NewsForm';
import Simulador from './Simulador';
import Formulario from './Formulario';
import MaterialApoio from './MaterialApoio';
import Grupos from './Grupos';
import ClientesCadastrados from './ClientesCadastrados';
import MetricasRelatorios from './MetricasRelatorios';
import CadastrarUsuario from './CadastrarUsuario';
import NewsDetail from '@/components/News/NewsDetail';
import MaterialDetail from '@/components/Materials/MaterialDetail';
import MaterialForm from '@/pages/MaterialForm';
import MaterialView from '@/pages/MaterialView';
import SimuladorConfig from './SimuladorConfig';
import MeusCadastros from './MeusCadastros';

// Componente para proteger rotas baseado na role do usuário
const RoleProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: ('admin' | 'coordenador' | 'usuario')[];
  userRole: string | undefined;
}> = ({ children, allowedRoles, userRole }) => {
  if (!userRole || !allowedRoles.includes(userRole as any)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Acesso Negado</h2>
          <p className="text-red-700">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-red-600 mt-2">
            Role necessário: {allowedRoles.join(' ou ')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Index = () => {
  const { isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirecionar rota raiz para dashboard apenas se o usuário estiver na página inicial
  useEffect(() => {
    if (isAuthenticated && location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Layout para administradores (usando o novo Layout com sidebar)
  if (profile?.role === 'admin') {
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/noticias/criar" element={<NewsForm />} />
          <Route path="/noticias/editar/:id" element={<NewsForm />} />
          <Route path="/noticias/:id" element={<NewsDetail />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/materiais" element={<MaterialApoio />} />
          <Route path="/materiais/novo" element={<MaterialForm />} />
          <Route path="/materiais/editar/:id" element={<MaterialForm />} />
          <Route path="/materiais/:id" element={<MaterialView />} />
          <Route path="/grupos" element={<Grupos />} />
          <Route path="/simulador-config" element={<SimuladorConfig />} />
          {/* Remover redirecionamento automático para dashboard */}
          <Route path="*" element={<div className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Página não encontrada</h2>
            <p className="text-gray-600 mb-4">A página que você está procurando não existe.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar para o Dashboard
            </button>
          </div>} />
        </Routes>
      </Layout>
    );
  }

  // Layout para usuários/coordenadores (navegação superior)
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={() => {}} />
        
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cadastro-de-proposta" element={<Formulario />} />
          <Route path="/meus-cadastros" element={<MeusCadastros />} />
          <Route path="/materiais" element={<MaterialApoio />} />
          <Route path="/materiais/:id" element={<MaterialView />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/noticias/:id" element={<NewsDetail />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/clientes-cadastrados" element={<ClientesCadastrados />} />
          <Route
            path="/metricas-relatorios"
            element={
              <RoleProtectedRoute allowedRoles={["coordenador"]} userRole={profile?.role}>
                <MetricasRelatorios />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/cadastrar-usuario"
            element={
              <RoleProtectedRoute allowedRoles={["coordenador"]} userRole={profile?.role}>
                <CadastrarUsuario />
              </RoleProtectedRoute>
            }
          />
          {/* Remover redirecionamento automático para dashboard */}
          <Route path="*" element={<div className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Página não encontrada</h2>
            <p className="text-gray-600 mb-4">A página que você está procurando não existe.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar para o Dashboard
            </button>
          </div>} />
        </Routes>
      </main>
    </div>
  );
};

export default Index;
