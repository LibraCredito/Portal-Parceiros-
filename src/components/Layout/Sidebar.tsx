
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  FileText, 
  BookOpen, 
  Calculator,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar: React.FC = () => {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';

  // Função para verificar se a rota atual é uma subpágina do Dashboard
  const isDashboardActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || 
             location.pathname === '/clientes-cadastrados' || 
             location.pathname === '/metricas-relatorios';
    }
    return location.pathname === path;
  };

  const getMenuItems = () => {
    const baseItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
    ];

    if (profile?.role === 'admin') {
      return [
        ...baseItems,
        { path: '/usuarios', icon: Users, label: 'Usuários' },
        { path: '/grupos', icon: UserPlus, label: 'Grupos' },
        { path: '/noticias', icon: FileText, label: 'Notícias' },
        { path: '/materiais', icon: BookOpen, label: 'Materiais' },
        { path: '/simulador-config', icon: Settings, label: 'Config. Simulador' }
      ];
    }

    if (profile?.role === 'coordenador') {
      return [
        ...baseItems,
        { path: '/cadastro-de-proposta', icon: FileText, label: 'Formulário' },
        { path: '/materiais', icon: BookOpen, label: 'Material de Apoio' },
        { path: '/noticias', icon: FileText, label: 'Notícias' },
        { path: '/simulador', icon: Calculator, label: 'Simulador' },
        { path: '/cadastrar-usuario', icon: UserPlus, label: 'Cadastrar Usuário' }
      ];
    }

    return [
      ...baseItems,
      { path: '/cadastro-de-proposta', icon: FileText, label: 'Formulário' },
      { path: '/materiais', icon: BookOpen, label: 'Material de Apoio' },
      { path: '/noticias', icon: FileText, label: 'Notícias' },
      { path: '/simulador', icon: Calculator, label: 'Simulador' }
    ];
  };

  const menuItems = getMenuItems();

  return (
    <Sidebar 
      collapsible="icon"
      className="h-screen border-r border-border bg-background"
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">SGP Sistema</span>
              <span className="text-xs text-muted-foreground">{profile?.name}</span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {profile?.role === 'admin' ? 'Administrador' : 
               profile?.role === 'coordenador' ? 'Coordenador' : 'Usuário'}
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex-1 p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    tooltip={isCollapsed ? item.label : undefined}
                  >
                    <NavLink
                      to={item.path}
                      className={() =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent ${
                          isDashboardActive(item.path)
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-foreground hover:text-accent-foreground'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={signOut}
              tooltip={isCollapsed ? "Sair" : undefined}
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
