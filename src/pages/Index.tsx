import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Shield } from 'lucide-react';
import ProfessorDashboard from '@/components/ProfessorDashboard';
import StudentProfile from '@/components/StudentProfile';
import TournamentManager from '@/components/TournamentManager';
import TournamentEditor from '@/components/TournamentEditor';
import AddStudentForm from '@/components/AddStudentForm';
import EditStudentForm from '@/components/EditStudentForm';
import PaymentReports from '@/components/PaymentReports';
import PaymentManager from '@/components/PaymentManager';
import AttendanceManager from '@/components/AttendanceManager';
import AuthMenu from '@/components/AuthMenu';
import { createIsolatedSupabaseClient, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { normalizeBeltForStorage, toDisplayBelt } from '@/lib/belts';
import { toast } from 'sonner';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const monthLabel = (yyyyMM: string) => {
  const [year, month] = yyyyMM.split('-');
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
};

const transformProfile = (profile: any) => ({
  id: profile.id,
  name: profile.full_name || '',
  belt: toDisplayBelt(profile.belt),
  category: profile.category || profile.age_group || 'Adulto',
  weight: profile.weight || '',
  email: profile.email || '',
  phone: profile.phone || '',
  gender: profile.gender || '',
  joinDate: profile.join_date || profile.created_at?.split('T')[0] || '',
  avatarUrl: profile.avatar_url || null,
  achievements: (profile.achievements || []).map((achievement: any) => achievement.achievement_text),
  monthlyFees: (profile.monthly_fees || [])
    .map((fee: any) => ({ id: fee.month, month: monthLabel(fee.month), paid: fee.paid }))
    .sort((left: any, right: any) => left.id.localeCompare(right.id)),
});

const transformTournament = (tournament: any) => ({
  id: tournament.id,
  name: tournament.name,
  date: tournament.date,
  location: tournament.location,
  category: tournament.category,
  status: tournament.status,
  participants: (tournament.tournament_participants || []).map((participant: any) => participant.student_id),
  ranking: (tournament.tournament_rankings || []).reduce((acc: any, rankingItem: any) => {
    acc[rankingItem.student_id] = rankingItem.position;
    return acc;
  }, {}),
});

const isPasswordRecoveryLink = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);
  const isResetPath = window.location.pathname === '/reset-password';

  return isResetPath || hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
};

const Index = () => {
  const [currentView, setCurrentView] = useState('home');
  const [authMode, setAuthMode] = useState<'default' | 'reset-password'>('default');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, achievements(*), monthly_fees!monthly_fees_student_id_fkey(*)')
      .in('role', ['student', 'admin'])
      .order('full_name');

    if (error) {
      toast.error(`Erro ao carregar alunos: ${error.message}`);
      return;
    }

    setStudents((data || []).map(transformProfile));
  };

  const loadTeachers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'teacher');
    setTeachers((data || []).map((profile: any) => ({ ...transformProfile(profile), password: '' })));
  };

  const loadTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, tournament_participants(*), tournament_rankings(*)')
      .order('date', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar torneios.');
      return;
    }

    setTournaments((data || []).map(transformTournament));
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      try {
        if (!isSupabaseConfigured) {
          return;
        }

        if (isPasswordRecoveryLink()) {
          setAuthMode('reset-password');
          setCurrentView('auth');
        }

        await Promise.all([loadStudents(), loadTeachers(), loadTournaments()]);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && !isPasswordRecoveryLink()) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

          if (profile) {
            const userType = profile.role === 'teacher' || profile.role === 'admin' ? 'teacher' : 'student';
            setCurrentUser({ type: userType, ...transformProfile(profile) });
            setCurrentView(userType === 'teacher' ? 'professor' : 'student');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset-password');
        setCurrentView('auth');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isPasswordRecoveryLink()) return;

    setAuthMode('reset-password');
    setCurrentView('auth');
  }, []);

  const getBeltColor = (belt: string) => {
    const colors: Record<string, string> = {
      Branca: 'bg-gray-100 text-gray-800',
      'Cinza-Branca': 'bg-slate-100 text-slate-800',
      Cinza: 'bg-slate-300 text-slate-900',
      'Cinza-Preta': 'bg-slate-700 text-white',
      'Amarela-Branca': 'bg-yellow-100 text-yellow-900',
      Amarela: 'bg-yellow-300 text-yellow-950',
      'Amarela-Preta': 'bg-yellow-500 text-slate-950',
      'Laranja-Branca': 'bg-orange-100 text-orange-900',
      Laranja: 'bg-orange-400 text-slate-950',
      'Laranja-Preta': 'bg-orange-600 text-white',
      'Verde-Branca': 'bg-emerald-100 text-emerald-900',
      Verde: 'bg-emerald-500 text-white',
      'Verde-Preta': 'bg-emerald-800 text-white',
      Azul: 'bg-blue-500 text-white',
      Roxa: 'bg-purple-500 text-white',
      Marrom: 'bg-amber-700 text-white',
      Preta: 'bg-black text-white',
    };

    return colors[belt] || 'bg-gray-100 text-gray-800';
  };

  const getStudentAchievements = (studentId: string) => {
    const student = students.find((item: any) => item.id === studentId);
    const staticAchievements = student?.achievements || [];
    const tournamentAchievements = tournaments
      .filter((tournament: any) => tournament.status === 'Finalizado' && tournament.ranking && tournament.ranking[studentId])
      .map((tournament: any) => {
        const position = tournament.ranking[studentId];
        const suffix = position === 1 ? '1o lugar' : position === 2 ? '2o lugar' : position === 3 ? '3o lugar' : `${position}o lugar`;
        return `${suffix} - ${tournament.name}`;
      });

    return [...staticAchievements, ...tournamentAchievements];
  };

  const handleCreateTournament = async (newTournamentData: any) => {
    const { error } = await supabase.from('tournaments').insert({
      name: newTournamentData.name,
      date: newTournamentData.date,
      location: newTournamentData.location,
      category: newTournamentData.category,
      status: 'Programado',
    });

    if (error) {
      toast.error('Erro ao criar torneio.');
      return;
    }

    await loadTournaments();
    toast.success('Torneio criado.');
  };

  const handleUpdateTournament = async (updatedTournament: any) => {
    const { error } = await supabase
      .from('tournaments')
      .update({
        name: updatedTournament.name,
        date: updatedTournament.date,
        location: updatedTournament.location,
        category: updatedTournament.category,
        status: updatedTournament.status,
      })
      .eq('id', updatedTournament.id);

    if (error) {
      toast.error('Erro ao atualizar torneio.');
      return;
    }

    await supabase.from('tournament_participants').delete().eq('tournament_id', updatedTournament.id);
    if (updatedTournament.participants.length > 0) {
      await supabase.from('tournament_participants').insert(
        updatedTournament.participants.map((studentId: string) => ({
          tournament_id: updatedTournament.id,
          student_id: studentId,
        })),
      );
    }

    await supabase.from('tournament_rankings').delete().eq('tournament_id', updatedTournament.id);
    if (updatedTournament.ranking) {
      const entries = Object.entries(updatedTournament.ranking);
      if (entries.length > 0) {
        await supabase.from('tournament_rankings').insert(
          entries.map(([studentId, position]) => ({
            tournament_id: updatedTournament.id,
            student_id: studentId,
            position,
          })),
        );
      }
    }

    await loadTournaments();
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);

    if (error) {
      toast.error('Erro ao eliminar torneio.');
      return false;
    }

    await loadTournaments();
    toast.success('Torneio eliminado.');
    return true;
  };

  const handleRegisterForTournament = async (studentId: string, tournamentId: string) => {
    const { error } = await supabase.from('tournament_participants').insert({ tournament_id: tournamentId, student_id: studentId });
    if (error) {
      toast.error('Erro ao inscrever no torneio.');
      return;
    }
    await loadTournaments();
  };

  const handleUnregisterFromTournament = async (studentId: string, tournamentId: string) => {
    const { error } = await supabase.from('tournament_participants').delete().eq('tournament_id', tournamentId).eq('student_id', studentId);
    if (error) {
      toast.error('Erro ao cancelar inscricao.');
      return;
    }
    await loadTournaments();
  };

  const handleAddStudent = async (newStudentData: any) => {
    const isolatedClient = createIsolatedSupabaseClient();

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', newStudentData.email)
      .single();

    const { data: authData, error: authError } = await isolatedClient.auth.signUp({
      email: newStudentData.email,
      password: newStudentData.password,
    });

    if (authError || !authData.user) {
      toast.error(authError?.message || 'Erro ao criar conta auth.');
      return;
    }

    let profileError = null;

    if (existingProfile) {
      const response = await supabase
        .from('profiles')
        .update({
          full_name: newStudentData.name,
          belt: normalizeBeltForStorage(newStudentData.belt || 'Branca'),
          category: newStudentData.category,
          weight: newStudentData.weight,
          email: newStudentData.email,
          phone: newStudentData.phone,
          gender: newStudentData.gender || null,
          role: existingProfile.role || 'student',
          join_date: newStudentData.joinDate || new Date().toISOString().split('T')[0],
          user_id: authData.user.id,
        })
        .eq('id', existingProfile.id);

      profileError = response.error;
    } else {
      const response = await supabase.from('profiles').insert({
        id: authData.user.id,
        user_id: authData.user.id,
        full_name: newStudentData.name,
        belt: normalizeBeltForStorage(newStudentData.belt || 'Branca'),
        category: newStudentData.category,
        weight: newStudentData.weight,
        email: newStudentData.email,
        phone: newStudentData.phone,
        gender: newStudentData.gender || null,
        role: 'student',
        join_date: newStudentData.joinDate || new Date().toISOString().split('T')[0],
      });

      profileError = response.error;
    }

    if (profileError) {
      toast.error(profileError.message.includes('unique') ? 'Ja existe um aluno com este email.' : 'Erro ao adicionar aluno.');
      return;
    }

    await Promise.all([loadStudents(), loadTeachers()]);
    toast.success('Conta e perfil criados com sucesso.');
    setCurrentView('professor');
  };

  const handleUpdateStudent = async (updatedStudent: any) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updatedStudent.name,
        email: updatedStudent.email,
        belt: normalizeBeltForStorage(updatedStudent.belt || 'Branca'),
        category: updatedStudent.category,
        weight: updatedStudent.weight,
        phone: updatedStudent.phone,
        gender: updatedStudent.gender || null,
        join_date: updatedStudent.joinDate || null,
        ...(updatedStudent.avatarUrl !== undefined ? { avatar_url: updatedStudent.avatarUrl } : {}),
      })
      .eq('id', updatedStudent.id);

    if (error) {
      toast.error('Erro ao atualizar aluno.');
      return false;
    }

    await supabase.from('achievements').delete().eq('student_id', updatedStudent.id);
    if (updatedStudent.achievements?.length > 0) {
      await supabase.from('achievements').insert(
        updatedStudent.achievements.map((achievementText: string) => ({
          student_id: updatedStudent.id,
          achievement_text: achievementText,
        })),
      );
    }

    await supabase.from('monthly_fees').delete().eq('student_id', updatedStudent.id);
    if (updatedStudent.monthlyFees.length > 0) {
      await supabase.from('monthly_fees').insert(
        updatedStudent.monthlyFees.map((fee: any) => ({
          student_id: updatedStudent.id,
          month: fee.id,
          paid: fee.paid,
        })),
      );
    }

    await Promise.all([loadStudents(), loadTeachers()]);
    return true;
  };

  const handleLogin = (userType: string, userData: any) => {
    setCurrentUser({ type: userType, ...transformProfile(userData) });
    setCurrentView(userType === 'teacher' ? 'professor' : 'student');
  };

  const handleCreateStudentAccount = async (newStudentData: any) => {
    const { data } = await supabase.from('profiles').select('*, achievements(*), monthly_fees(*)').eq('id', newStudentData.id).single();
    const profile = data ? transformProfile(data) : transformProfile(newStudentData);
    setCurrentUser({ type: 'student', ...profile });
    loadStudents();
    setCurrentView('student');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentView('home');
  };

  const handlePromoteToTeacher = async (studentId: string) => {
    const { error } = await supabase.from('profiles').update({ role: 'teacher' }).eq('id', studentId);
    if (error) {
      toast.error('Erro ao promover aluno.');
      return;
    }
    await Promise.all([loadStudents(), loadTeachers()]);
    toast.success('Aluno promovido a professor.');
  };

  if (loading) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-amber-400" />
          <p className="text-slate-300">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center px-4 text-white">
        <div className="panel-surface max-w-xl rounded-2xl p-8 text-center">
          <img src="/logo.jpg" alt="Brazilian Power Team" className="mx-auto mb-6 h-20 w-20 rounded-full object-cover ring-2 ring-amber-400/60" />
          <h1 className="font-display text-3xl uppercase tracking-[0.08em]">Configuracao em falta</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Cria um ficheiro <span className="font-mono text-amber-300">.env</span> na raiz do projeto com as variaveis do Supabase para arrancar a aplicacao localmente.
          </p>
          <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/50 p-4 text-left font-mono text-xs leading-6 text-slate-200">
            <div>VITE_SUPABASE_URL=https://o-teu-projeto.supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY=a-tua-anon-key</div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'auth') return <AuthMenu initialMode={authMode} onBack={() => { setAuthMode('default'); setCurrentView('home'); window.history.replaceState({}, document.title, '/'); }} onLogin={handleLogin} onCreateStudent={handleCreateStudentAccount} onResetPasswordDone={() => { setAuthMode('default'); setCurrentView('home'); window.history.replaceState({}, document.title, '/'); }} />;
  if (currentView === 'professor') return <ProfessorDashboard students={students} tournaments={tournaments} teachers={teachers} onBack={handleLogout} onViewStudent={(student: any) => { setSelectedStudent(student); setCurrentView('student-detail'); }} onEditStudent={(student: any) => { setSelectedStudent(student); setCurrentView('edit-student'); }} onManageTournaments={() => setCurrentView('tournaments')} onAddStudent={() => setCurrentView('add-student')} onViewReports={() => setCurrentView('reports')} onManagePayments={(student: any) => { setSelectedStudent(student); setCurrentView('payment-manager'); }} onPromoteToTeacher={handlePromoteToTeacher} onManageAttendance={() => setCurrentView('attendance')} getBeltColor={getBeltColor} />;
  if (currentView === 'payment-manager' && selectedStudent) return <PaymentManager student={selectedStudent} onBack={() => setCurrentView('professor')} onUpdateStudent={handleUpdateStudent} getBeltColor={getBeltColor} />;
  if (currentView === 'attendance') return <AttendanceManager students={students} onBack={() => setCurrentView('professor')} getBeltColor={getBeltColor} />;
  if (currentView === 'reports') return <PaymentReports students={students} onBack={() => setCurrentView('professor')} getBeltColor={getBeltColor} />;
  if (currentView === 'add-student') return <AddStudentForm onBack={() => setCurrentView('professor')} onAddStudent={handleAddStudent} />;
  if (currentView === 'edit-student' && selectedStudent) return <EditStudentForm student={selectedStudent} onBack={() => { Promise.all([loadStudents(), loadTeachers()]); setCurrentView('professor'); }} onUpdateStudent={handleUpdateStudent} onPromoteToTeacher={handlePromoteToTeacher} />;

  if (currentView === 'student') {
    const currentStudent = currentUser && currentUser.type === 'student' ? students.find((student: any) => student.id === currentUser.id) || currentUser : students[0];
    if (!currentStudent) return null;
    const studentWithAchievements = { ...currentStudent, achievements: getStudentAchievements(currentStudent.id) };
    return <StudentProfile student={studentWithAchievements} tournaments={tournaments.filter((tournament: any) => tournament.participants.includes(currentStudent.id))} allTournaments={tournaments} onBack={handleLogout} onRegisterForTournament={handleRegisterForTournament} onUnregisterFromTournament={handleUnregisterFromTournament} getBeltColor={getBeltColor} />;
  }

  if (currentView === 'student-detail' && selectedStudent) {
    const studentWithAchievements = { ...selectedStudent, achievements: getStudentAchievements(selectedStudent.id) };
    return <StudentProfile student={studentWithAchievements} tournaments={tournaments.filter((tournament: any) => tournament.participants.includes(selectedStudent.id))} allTournaments={tournaments} onBack={() => setCurrentView('professor')} onRegisterForTournament={handleRegisterForTournament} onUnregisterFromTournament={handleUnregisterFromTournament} getBeltColor={getBeltColor} />;
  }

  if (currentView === 'tournaments') return <TournamentManager tournaments={tournaments} students={students} onBack={() => setCurrentView('professor')} onCreateTournament={handleCreateTournament} onEditTournament={(tournament: any) => { setSelectedTournament(tournament); setCurrentView('tournament-editor'); }} onDeleteTournament={handleDeleteTournament} getBeltColor={getBeltColor} />;
  if (currentView === 'tournament-editor' && selectedTournament) return <TournamentEditor tournament={selectedTournament} students={students} onBack={() => setCurrentView('tournaments')} onUpdateTournament={handleUpdateTournament} onDeleteTournament={handleDeleteTournament} onRemoveParticipant={(tournamentId: string, studentId: string) => handleUnregisterFromTournament(studentId, tournamentId)} getBeltColor={getBeltColor} />;

  return (
    <div className="app-shell min-h-screen overflow-hidden text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-500/35 blur-2xl" />
              <img src="/logo.jpg" alt="Brazilian Power Team" className="relative h-14 w-14 rounded-full object-cover ring-2 ring-amber-400/60" />
            </div>
            <div>
              <p className="font-display text-3xl uppercase tracking-[0.16em] text-white">Brazilian Power Team</p>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Sistema de gestao</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300 md:block">Jiu-Jitsu • Operacoes • Academia</div>
        </header>

        <main className="flex flex-1 items-center justify-center py-10 lg:py-16">
          <section className="w-full max-w-xl">
            <div className="panel-surface rounded-[36px] p-6 lg:p-8">
              <div className="rounded-[30px] border border-white/10 bg-slate-950/30 p-8 text-center">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-amber-400/30 bg-white/5">
                  <img
                    src="/logo.jpg"
                    alt="Brazilian Power Team"
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-amber-400/50"
                  />
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                  <Shield className="h-4 w-4" />
                  Acesso reservado
                </div>

                <h1 className="mt-6 font-display text-5xl uppercase leading-none tracking-[0.08em] text-white sm:text-6xl">
                  Entrar
                </h1>
                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
                  Introduz as tuas credenciais para aceder ao painel da Brazilian Power Team.
                </p>

                <Button
                  onClick={() => setCurrentView('auth')}
                  className="mt-8 h-12 w-full rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300"
                  size="lg"
                >
                  Entrar agora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/10 pt-5 text-center text-xs uppercase tracking-[0.18em] text-slate-500">
          © {new Date().getFullYear()} Brazilian Power Team · Todos os direitos reservados
        </footer>
      </div>
    </div>
  );
};

export default Index;
