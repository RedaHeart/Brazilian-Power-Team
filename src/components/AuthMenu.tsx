import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, KeyRound, Loader2, User, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getBeltOptionsForCategory, normalizeBeltForStorage } from '@/lib/belts';

const AuthMenu = ({ initialMode = 'default', onBack, onLogin, onCreateStudent, onResetPasswordDone }) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(initialMode === 'reset-password');
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    belt: 'Branca',
    category: 'Adulto',
    weight: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isResetMode = initialMode === 'reset-password';
    setShowResetPassword(isResetMode);
    if (isResetMode) {
      setShowForgotPassword(false);
    }
  }, [initialMode]);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });

      if (error) {
        toast.error('Credenciais inválidas. Verifica o email e a password.');
        return;
      }

      // Buscar perfil pelo id (= auth user id)
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Fallback: procurar por email (perfil criado pelo professor sem conta auth)
      if (!profile) {
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', data.user.email)
          .single();

        if (profileByEmail) {
          profile = profileByEmail;
        }
      }

      if (!profile) {
        toast.error('Perfil não encontrado. Contacta o professor.');
        await supabase.auth.signOut();
        return;
      }

      const userType = (profile.role === 'teacher' || profile.role === 'admin') ? 'teacher' : 'student';
      onLogin(userType, { ...profile, joinDate: profile.join_date });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async () => {
    if (!studentForm.name || !studentForm.email || !studentForm.password) return;
    setLoading(true);
    try {
      // Verificar se já existe perfil com este email (adicionado pelo professor)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', studentForm.email)
        .single();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: studentForm.email,
        password: studentForm.password
      });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar conta. Tenta novamente.');
        return;
      }

      let profile;

      if (existingProfile) {
        // Ligar conta auth ao perfil existente do professor
        await supabase
          .from('profiles')
          .update({ user_id: authData.user.id })
          .eq('id', existingProfile.id);
        profile = { ...existingProfile, user_id: authData.user.id };
      } else {
        // Criar novo perfil
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            user_id: authData.user.id,
            full_name: studentForm.name,
            email: studentForm.email,
            phone: studentForm.phone,
            belt: normalizeBeltForStorage(studentForm.belt),
            category: studentForm.category,
            weight: studentForm.weight,
            role: 'student',
            join_date: new Date().toISOString().split('T')[0]
          }, { onConflict: 'id' })
          .select()
          .single();

        if (profileError) {
          toast.error(`Erro ao criar perfil: ${profileError.message}`);
          return;
        }
        profile = newProfile;
      }

      toast.success('Conta criada com sucesso!');
      onCreateStudent({ ...profile, joinDate: profile.join_date, achievements: [], monthlyFees: [] });

      setStudentForm({ name: '', email: '', password: '', phone: '', belt: 'Branca', category: 'Adulto', weight: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Enviamos um email para redefinir a password.');
      setShowForgotPassword(false);
      setForgotEmail('');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetForm.password || !resetForm.confirmPassword) return;
    if (resetForm.password !== resetForm.confirmPassword) {
      toast.error('As passwords nao coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: resetForm.password });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Password atualizada com sucesso.');
      setResetForm({ password: '', confirmPassword: '' });
      setShowResetPassword(false);
      onResetPasswordDone?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4 hover:bg-white/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Autenticação</h1>
              <p className="text-slate-600">Entrar ou criar novo perfil</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6 mt-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-slate-800">
                    {showResetPassword ? 'Definir Nova Password' : showForgotPassword ? 'Recuperar Password' : 'Entrar na Plataforma'}
                  </CardTitle>
                  <CardDescription>
                    {showResetPassword
                      ? 'Escolhe uma nova password para a tua conta'
                      : showForgotPassword
                        ? 'Recebe um email com o link de recuperacao'
                        : 'Aceda com as suas credenciais'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {showResetPassword ? (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-password">Nova password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={resetForm.password}
                            onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirmar password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={resetForm.confirmPassword}
                            onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleResetPassword}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={!resetForm.password || !resetForm.confirmPassword || loading}
                      >
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        Atualizar password
                      </Button>
                    </>
                  ) : showForgotPassword ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email</Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="bg-white"
                          onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                        />
                      </div>
                      <Button
                        onClick={handleForgotPassword}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={!forgotEmail || loading}
                      >
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        Enviar link de recuperacao
                      </Button>
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                        Voltar ao login
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                            className="bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleLogin}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={!loginForm.email || !loginForm.password || loading}
                      >
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <User className="h-4 w-4 mr-2" />}
                        Entrar
                      </Button>
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(true)}>
                        Esqueci-me da password
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register" className="space-y-6 mt-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-slate-800">Criar Nova Conta</CardTitle>
                  <CardDescription>Registe-se como novo aluno da academia</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="student-name">Nome</Label>
                      <Input
                        id="student-name"
                        value={studentForm.name}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-email">Email</Label>
                      <Input
                        id="student-email"
                        type="email"
                        value={studentForm.email}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-password">Password</Label>
                      <Input
                        id="student-password"
                        type="password"
                        value={studentForm.password}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-phone">Telefone</Label>
                      <Input
                        id="student-phone"
                        value={studentForm.phone}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-belt">Faixa</Label>
                      <select
                        id="student-belt"
                        value={studentForm.belt}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, belt: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {getBeltOptionsForCategory(studentForm.category).map((belt) => (
                          <option key={belt.value} value={belt.value}>{belt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-category">Categoria</Label>
                      <select
                        id="student-category"
                        value={studentForm.category}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, category: e.target.value, belt: 'Branca' }))}
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="Kids">Kids</option>
                        <option value="Juvenil">Juvenil</option>
                        <option value="Adulto">Adulto</option>
                        <option value="Master">Master</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-weight">Peso</Label>
                      <select
                        id="student-weight"
                        value={studentForm.weight}
                        onChange={(e) => setStudentForm(prev => ({ ...prev, weight: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Selecionar peso</option>
                        <option value="Galo">Galo</option>
                        <option value="Pluma">Pluma</option>
                        <option value="Pena">Pena</option>
                        <option value="Leve">Leve</option>
                        <option value="Médio">Médio</option>
                        <option value="Meio-pesado">Meio-pesado</option>
                        <option value="Pesado">Pesado</option>
                        <option value="Super-pesado">Super-pesado</option>
                        <option value="Pesadíssimo">Pesadíssimo</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateStudent}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={!studentForm.name || !studentForm.email || !studentForm.password || loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Criar Conta
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AuthMenu;
