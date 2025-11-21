
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, BarChart3, TrendingUp, Users, Activity, Shield, Award, Zap } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('usuario');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Erro no login",
          description: error.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos' 
            : error.message,
          variant: "destructive"
        });
      } else {
        // Login bem-sucedido - redirecionar para dashboard após um pequeno delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao tentar fazer login",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, name, role);
      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message === 'User already registered' 
            ? 'Este email já está cadastrado' 
            : error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao tentar criar a conta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Dark Blue Background with Visualizations */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgb(0, 51, 153) 0%, rgb(0, 40, 120) 50%, rgb(0, 30, 90) 100%)' }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border border-white/20 rounded-full"></div>
          <div className="absolute top-40 right-20 w-24 h-24 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-32 left-20 w-40 h-40 border border-white/20 rounded-full"></div>
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8">
          <img 
            src="https://portal-parceiros-beta.vercel.app/logo-libra.png" 
            alt="Libra Crédito" 
            className="h-12 w-auto"
          />
        </div>

        {/* Brand Identity Section */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-8 max-w-md">
            {/* Main Brand Message */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white leading-tight">
                Portal de Parceiros
              </h2>
              <p className="text-xl text-blue-100 leading-relaxed">
                Conectando oportunidades, construindo o futuro financeiro
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="flex justify-center space-x-8">
              <div className="text-center text-white/80">
                <Shield className="w-12 h-12 mx-auto mb-2 text-blue-300" />
                <div className="text-sm font-medium">Segurança</div>
                <div className="text-xs text-blue-200">100% Protegido</div>
              </div>
              <div className="text-center text-white/80">
                <Award className="w-12 h-12 mx-auto mb-2 text-blue-300" />
                <div className="text-sm font-medium">Qualidade</div>
                <div className="text-xs text-blue-200">Certificado</div>
              </div>
              <div className="text-center text-white/80">
                <Zap className="w-12 h-12 mx-auto mb-2 text-blue-300" />
                <div className="text-sm font-medium">Agilidade</div>
                <div className="text-xs text-blue-200">Rápido</div>
              </div>
            </div>

            {/* Activity Indicator */}
            <div className="flex items-center justify-center space-x-2 text-white/60">
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Sistema Ativo</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="absolute bottom-8 left-8">
          <p className="text-white/60 text-sm">© Libra Crédito 2025 - Todos os direitos reservados</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header with Logo */}
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <img 
                src="https://portal-parceiros-beta.vercel.app/logo-libra.png" 
                alt="Libra Crédito" 
                className="h-20 w-auto object-contain"
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900">Bem-vindo de volta</h1>
              <p className="text-gray-600">Acesse sua conta no Portal de Parceiros</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">

            <TabsContent value="login" className="space-y-6 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                    Usuário
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Digite seu usuário"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                    Senha
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-white font-medium rounded-lg transition-colors" 
                  style={{ backgroundColor: 'rgb(0, 51, 153)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(0, 40, 120)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(0, 51, 153)'} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* <TabsContent value="signup" className="space-y-6 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-gray-700">
                    Nome completo
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
                    Senha
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-role" className="text-sm font-medium text-gray-700">
                    Tipo de usuário
                  </Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Selecione o tipo de usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario">Usuário Comum</SelectItem>
                      <SelectItem value="coordenador">Coordenador de Grupos</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 text-white font-medium rounded-lg transition-colors" 
                  style={{ backgroundColor: 'rgb(0, 51, 153)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(0, 40, 120)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(0, 51, 153)'} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </form>
            </TabsContent> */}
          </Tabs>

          {/* Footer Brand Message */}
          <div className="text-center space-y-2 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-blue-600">Libra Crédito</span> - 
              Sua parceira de confiança para o futuro financeiro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;