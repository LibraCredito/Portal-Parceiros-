import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Group } from '@/types/auth';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Calculator,
  UserPlus,
  ClipboardList
} from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Função para verificar se a rota atual é uma subpágina do Dashboard
  const isDashboardActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || 
             location.pathname === '/clientes-cadastrados' || 
             location.pathname === '/' || 
             location.pathname === '/metricas-relatorios';
    }

    if (path === '/materiais') {
      return location.pathname.includes('/materiais');
    }

    if (path === '/noticias') {
      return location.pathname.includes('/noticias');
    }

    if (path === '/meus-cadastros') {
      return location.pathname === '/meus-cadastros';
    }
    
    return location.pathname === path;
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'coordenador':
        return 'Coordenador';
      case 'usuario':
        return 'Usuário';
      default:
        return 'Usuário';
    }
  };

  const getMenuItems = () => {
    const baseItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/cadastro-de-proposta', icon: FileText, label: 'Cadastro de Proposta' },
      { path: '/meus-cadastros', icon: ClipboardList, label: 'Meus Cadastros' },
      { path: '/materiais', icon: BookOpen, label: 'Material de Apoio' },
      { path: '/noticias', icon: FileText, label: 'Notícias' },
      { path: '/simulador', icon: Calculator, label: 'Simulador' }
    ];

    if (profile?.role === 'coordenador') {
      return [
        ...baseItems,
        { path: '/cadastrar-usuario', icon: UserPlus, label: 'Cadastrar Usuário' }
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  // Buscando a informação do grupo do usuário;
  const fetchUserGroupData = async () => {
      try {
        
        if (profile?.group_id) {
          const { data: groupData, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', profile.group_id)
            .single();
  
          if (error) {
            console.error('Error fetching user group:', error);
          } else {
            const formattedGroup: Group = {
              id: groupData.id,
              name: groupData.name,
              formUrl: groupData.form_url || undefined,
              createdAt: groupData.created_at
            };
    
            setUserGroup(formattedGroup);
          }
        } else {
          setUserGroup(null);
        }
      } catch (error) {
        console.error('Error fetching user group data:', error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (!profile) return;

    // se não for admin e ainda não temos userGroup
    if (profile.role !== 'admin' && !userGroup) {
      fetchUserGroupData();
    }
  }, [profile, userGroup]);

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const UserHeader = () => {
    if(!userGroup){
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-700 text-lg">Carregando...</p>
          </div>
        </div>
      );
    } else {
      return(
        <>
          {/* Header Desktop */}
          <header className="bg-blue text-black shadow-md hidden lg:block">
            <div className="container mx-auto flex items-center justify-between px-0 py-5 pl-5 pr-5">
              {/* Logo centralizado e proporcional */}
              <div className="flex items-center justify-center flex-shrink-0">
                <img
                  src="https://www.libracredito.com.br/images/logos/logo-header.webp"
                  alt="Logo Libra Crédito"
                  className="h-12 w-auto cursor-pointer object-contain"
                  onClick={() => window.location.href = 'https://portal-parceiros-libra.vercel.app/dashboard'}
                />
              </div>
              
              <nav className="flex-1 flex justify-center">
                <div className="flex space-x-6">
                  {menuItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={() =>
                        `inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                          isDashboardActive(item.path)
                            ? 'border-blue-500 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </nav>

              {/* Informações do usuário e botão de logout */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-base font-semibold leading-tight">
                    {profile?.name || 'Usuário'}
                  </p>
                  <p className="text-sm opacity-80">
                    Grupo - {userGroup?.name || 'Sem Grupo'}
                  </p>
                </div>
                <Button
                  onClick={signOut}
                  className="flex items-center gap-2 rounded-full px-4 py-2 bg-yellow-400 text-blue-800 hover:bg-yellow-500 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </header>

          {/* Header Mobile */}
          <header className="bg-blue text-black shadow-md lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <img
                src="https://www.libracredito.com.br/images/logos/logo-header.webp"
                alt="Logo Libra Crédito"
                className="h-8"
              />
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold leading-tight">
                    {profile?.name || 'Usuário'}
                  </p>
                  <p className="text-xs opacity-80">
                    {userGroup?.name || 'Sem Grupo'}
                  </p>
                </div>
                
                <Button
                  onClick={toggleMobileMenu}
                  variant="ghost"
                  size="sm"
                  className="p-2 text-gray-700 hover:bg-blue-100"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Menu Mobile Overlay */}
            {isMobileMenuOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50"
                  onClick={closeMobileMenu}
                />
                
                {/* Sidebar */}
                <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
                  <div className="flex flex-col h-full">
                    {/* Header do sidebar */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <img
                          src="https://www.libracredito.com.br/images/logos/logo-header.webp"
                          alt="Logo Libra Crédito"
                          className="h-8"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {profile?.name || 'Usuário'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {profile?.role === 'coordenador' ? 'Coordenador' : 'Usuário'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={closeMobileMenu}
                        variant="ghost"
                        size="sm"
                        className="p-1"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Navegação */}
                    <nav className="flex-1 p-4">
                      <div className="space-y-2">
                        {menuItems.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={closeMobileMenu}
                            className={() =>
                              `flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                isDashboardActive(item.path)
                                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500' 
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                              }`
                            }
                          >
                            <item.icon className="h-5 w-5 mr-3" />
                            <span>{item.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    </nav>

                    {/* Footer do sidebar */}
                    <div className="p-4 border-t border-gray-200">
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Grupo Atual</p>
                        <p className="text-sm font-medium text-gray-900">
                          {userGroup?.name || 'Sem Grupo'}
                        </p>
                      </div>
                      
                      <Button
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair da Conta
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </header>
        </>
      )
    }
  }

  const AdminHeader = () => (
    <div className=" ">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-auto items-center justify-center">
              <img
                src="https://www.libracredito.com.br/images/logos/logo-header.webp"
                alt="Logo Libra Crédito"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sistema de Gerenciamento</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{profile?.name || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground">
              {profile?.role ? getRoleDisplay(profile.role) : 'Carregando...'}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {profile?.role === 'admin' ? <AdminHeader /> : <UserHeader />}
    </>
  );
};

export default Header;
