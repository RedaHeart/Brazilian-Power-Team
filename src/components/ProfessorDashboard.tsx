import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Edit,
  Eye,
  FileText,
  Plus,
  Save,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { buildWeekRange, ensureClassesForRange } from '@/lib/class-schedule';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });

const ProfessorDashboard = ({
  students,
  tournaments,
  teachers,
  onBack,
  onViewStudent,
  onEditStudent,
  onManageTournaments,
  onAddStudent,
  onViewReports,
  onManagePayments,
  onManageAttendance,
  getBeltColor,
}) => {
  const activeStudents = students.length;
  const upcomingTournaments = tournaments.filter((t: any) => t.status === 'Programado').length;

  const [search, setSearch] = useState('');
  const [beltFilter, setBeltFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekClasses, setWeekClasses] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loadingClass, setLoadingClass] = useState(false);

  const allPeople = [
    ...students.map((student: any) => ({ ...student, _role: 'student' })),
    ...(teachers || []).map((teacher: any) => ({ ...teacher, _role: 'teacher' })),
  ];

  const filteredStudents = allPeople.filter((person: any) => {
    const matchesSearch = person.name.toLowerCase().includes(search.toLowerCase());
    const matchesBelt = beltFilter === '' || person.belt === beltFilter;
    const matchesRole = roleFilter === '' || person._role === roleFilter;
    return matchesSearch && matchesBelt && matchesRole;
  });

  const selectedStudent = filteredStudents.find((person: any) => person.id === selectedStudentId) || null;

  const { from: monday, to: sunday } = buildWeekRange(weekOffset);
  const todayDayIdx = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    loadWeekClasses();
    setExpandedClassId(null);
    setSelectedDay(null);
  }, [weekOffset]);

  const loadWeekClasses = async () => {
    try {
      await ensureClassesForRange({ from: monday, to: sunday });
    } catch (error) {
      console.error('Failed to generate weekly classes from templates', error);
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .gte('starts_at', monday.toISOString())
      .lte('starts_at', sunday.toISOString())
      .order('starts_at', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar aulas da semana.');
      return;
    }

    const classes = data || [];
    setWeekClasses(classes);

    const currentDay = (new Date().getDay() + 6) % 7;
    const todayHasClasses = classes.some(
      (classItem: any) => (new Date(classItem.starts_at).getDay() + 6) % 7 === currentDay,
    );

    if (weekOffset === 0 && todayHasClasses) {
      setSelectedDay(currentDay);
      return;
    }

    if (classes.length > 0) {
      setSelectedDay((new Date(classes[0].starts_at).getDay() + 6) % 7);
    }
  };

  const handleExpandClass = async (classItem: any) => {
    if (expandedClassId === classItem.id) {
      setExpandedClassId(null);
      return;
    }

    setExpandedClassId(classItem.id);
    setLoadingClass(true);

    const { data: enrollData } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classItem.id);

    const enrolledIds = new Set((enrollData || []).map((item: any) => item.student_id));
    setEnrolledStudents(students.filter((student: any) => enrolledIds.has(student.id)));

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('student_id, present')
      .eq('class_id', classItem.id);

    const attendanceMap: Record<string, boolean> = {};
    (attendanceData || []).forEach((item: any) => {
      attendanceMap[item.student_id] = item.present;
    });

    setAttendance(attendanceMap);
    setLoadingClass(false);
  };

  const handleSaveAttendance = async (classId: string) => {
    setSaving(true);
    await supabase.from('attendance').delete().eq('class_id', classId);

    if (enrolledStudents.length > 0) {
      await supabase.from('attendance').insert(
        enrolledStudents.map((student: any) => ({
          class_id: classId,
          student_id: student.id,
          present: attendance[student.id] || false,
          marked_at: new Date().toISOString(),
        })),
      );
    }

    toast.success('Presencas guardadas.');
    setSaving(false);
  };

  const classesByDay: Record<number, any[]> = {};
  weekClasses.forEach((classItem: any) => {
    const dayIndex = (new Date(classItem.starts_at).getDay() + 6) % 7;
    if (!classesByDay[dayIndex]) classesByDay[dayIndex] = [];
    classesByDay[dayIndex].push(classItem);
  });

  const daysWithClasses = Object.keys(classesByDay).map(Number).sort((left, right) => left - right);
  const weekLabel = `${monday.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} - ${sunday.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const completedTournaments = tournaments.filter((t: any) => t.status === 'Finalizado').length;
  const classesToday = classesByDay[todayDayIdx]?.length || 0;
  const presentCount = enrolledStudents.filter((student: any) => attendance[student.id]).length;

  return (
    <div className="app-shell min-h-screen">
      <AppHeader subtitle="Painel do Professor" onBack={onBack} backLabel="Terminar sessao" isLogout />

      <div className="min-h-[calc(100vh-76px)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <section className="panel-surface overflow-hidden rounded-[32px] p-6 text-white lg:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Centro de comando
                </div>

                <div className="space-y-3">
                  <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-[0.08em] text-balance sm:text-6xl">
                    Gestao com ritmo de treino
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    O painel foi reorganizado para destacar o que interessa no dia a dia: agenda semanal,
                    assiduidade, atletas ativos e proximos torneios. Menos ruido visual, mais leitura
                    instantanea.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Atletas ativos</p>
                    <p className="mt-3 font-display text-5xl leading-none text-amber-300">{activeStudents}</p>
                    <p className="mt-2 text-sm text-slate-300">Base pronta para crescimento sustentado.</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Aulas hoje</p>
                    <p className="mt-3 font-display text-5xl leading-none text-white">{classesToday}</p>
                    <p className="mt-2 text-sm text-slate-300">Visibilidade imediata da carga do dia.</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Torneios no radar</p>
                    <p className="mt-3 font-display text-5xl leading-none text-white">{upcomingTournaments}</p>
                    <p className="mt-2 text-sm text-slate-300">Planeamento competitivo sem trocar de vista.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 self-start">
                <div className="rounded-[28px] border border-amber-400/20 bg-gradient-to-br from-amber-400/18 to-transparent p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Pulso da academia</p>
                      <p className="mt-2 text-2xl font-semibold text-white">Semana em curso</p>
                    </div>
                    <Target className="h-8 w-8 text-amber-300" />
                  </div>
                  <div className="mt-5 grid gap-3 text-sm text-slate-200">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/28 px-4 py-3">
                      <span>Professores</span>
                      <strong>{teachers.length}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/28 px-4 py-3">
                      <span>Torneios concluidos</span>
                      <strong>{completedTournaments}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/28 px-4 py-3">
                      <span>Aulas calendarizadas</span>
                      <strong>{weekClasses.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-950/26 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Acoes imediatas</p>
                  <div className="mt-4 grid gap-3">
                    <Button
                      onClick={onManageTournaments}
                      className="h-12 justify-start rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300"
                    >
                      <Trophy className="h-4 w-4" />
                      Gerir torneios
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onAddStudent}
                      className="h-12 justify-start rounded-2xl border-white/12 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4" />
                      Registar novo aluno
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-8">
              <Card className="panel-card overflow-hidden border-white/10 bg-white/92">
                <CardHeader className="pb-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-3xl text-slate-950">
                        <div className="rounded-2xl bg-blue-100 p-2 text-blue-700">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        Agenda semanal
                      </CardTitle>
                      <CardDescription className="mt-2 text-sm text-slate-500">
                        Seleciona um dia e marca assiduidade diretamente na turma.
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setWeekOffset((value) => value - 1)} className="rounded-full">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                        {weekLabel}
                      </div>
                      <Button variant="outline" size="icon" onClick={() => setWeekOffset((value) => value + 1)} className="rounded-full">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      {weekOffset !== 0 && (
                        <Button variant="ghost" onClick={() => setWeekOffset(0)} className="rounded-full text-blue-700 hover:bg-blue-50">
                          Hoje
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {daysWithClasses.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-4 text-base font-medium text-slate-600">Sem aulas programadas nesta semana.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-3">
                        {daysWithClasses.map((dayIndex) => {
                          const isToday = weekOffset === 0 && dayIndex === todayDayIdx;
                          const isSelected = selectedDay === dayIndex;

                          return (
                            <button
                              key={dayIndex}
                              onClick={() => {
                                setSelectedDay(dayIndex);
                                setExpandedClassId(null);
                              }}
                              className={`min-w-[92px] rounded-[22px] border px-4 py-3 text-left transition-all ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                  : isToday
                                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <p className="font-display text-2xl uppercase tracking-[0.12em]">{DAY_NAMES[dayIndex]}</p>
                              <p className={`text-xs uppercase tracking-[0.18em] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                {classesByDay[dayIndex].length} aula{classesByDay[dayIndex].length !== 1 ? 's' : ''}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {selectedDay !== null && classesByDay[selectedDay] && (
                        <div className="space-y-4">
                          {classesByDay[selectedDay].map((classItem: any) => {
                            const isExpanded = expandedClassId === classItem.id;
                            const startTime = formatTime(classItem.starts_at);
                            const endTime = classItem.ends_at ? formatTime(classItem.ends_at) : null;
                            const classPresentCount = isExpanded ? presentCount : null;

                            return (
                              <div
                                key={classItem.id}
                                className={`overflow-hidden rounded-[28px] border transition-all ${
                                  isExpanded ? 'border-blue-200 bg-blue-50/60' : 'border-slate-200 bg-white'
                                }`}
                              >
                                <button
                                  onClick={() => handleExpandClass(classItem)}
                                  className="flex w-full flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="rounded-[22px] bg-slate-950 px-4 py-3 text-white">
                                      <p className="font-display text-3xl leading-none">{startTime}</p>
                                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                        {endTime ? endTime : 'Sem fim'}
                                      </p>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold text-slate-900">{classItem.title}</h3>
                                        {classItem.type && (
                                          <Badge variant="secondary" className="rounded-full bg-slate-200/70 px-3 py-1 text-slate-700">
                                            {classItem.type}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-500">
                                        Expande a aula para ver inscritos e marcar presencas.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                                      {isExpanded ? enrolledStudents.length : '--'} inscritos
                                    </div>
                                    {classPresentCount !== null && (
                                      <div className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                                        {classPresentCount} presentes
                                      </div>
                                    )}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="border-t border-blue-100 bg-white/92 p-5">
                                    {loadingClass ? (
                                      <div className="rounded-[22px] bg-slate-50 px-6 py-10 text-center text-slate-500">
                                        A carregar turma...
                                      </div>
                                    ) : enrolledStudents.length === 0 ? (
                                      <div className="rounded-[22px] bg-slate-50 px-6 py-10 text-center text-slate-500">
                                        Nenhum aluno inscrito nesta aula.
                                      </div>
                                    ) : (
                                      <div className="space-y-5">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div className="rounded-[22px] border border-green-200 bg-green-50 px-4 py-4 text-green-800">
                                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em]">
                                              <CheckCircle2 className="h-4 w-4" />
                                              Presentes
                                            </div>
                                            <p className="mt-3 font-display text-5xl leading-none">{presentCount}</p>
                                          </div>

                                          <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-red-700">
                                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em]">
                                              <XCircle className="h-4 w-4" />
                                              Ausentes
                                            </div>
                                            <p className="mt-3 font-display text-5xl leading-none">
                                              {enrolledStudents.length - presentCount}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          {enrolledStudents.map((student: any) => {
                                            const isPresent = attendance[student.id] || false;

                                            return (
                                              <div
                                                key={student.id}
                                                className={`flex flex-col gap-4 rounded-[24px] border px-4 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                                                  isPresent
                                                    ? 'border-green-200 bg-green-50'
                                                    : 'border-slate-200 bg-slate-50'
                                                }`}
                                              >
                                                <div className="flex items-center gap-4">
                                                  {student.avatarUrl ? (
                                                    <img
                                                      src={student.avatarUrl}
                                                      alt={student.name}
                                                      className="h-11 w-11 rounded-full object-cover"
                                                    />
                                                  ) : (
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                                                      {initialsFromName(student.name)}
                                                    </div>
                                                  )}

                                                  <div>
                                                    <p className="font-semibold text-slate-900">{student.name}</p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                      <Badge className={`${getBeltColor(student.belt)} rounded-full`}>
                                                        {student.belt}
                                                      </Badge>
                                                      <span className="text-sm text-slate-500">{student.category}</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                  <span className={`text-sm font-medium ${isPresent ? 'text-green-700' : 'text-slate-500'}`}>
                                                    {isPresent ? 'Presente' : 'Ausente'}
                                                  </span>
                                                  <Switch
                                                    checked={isPresent}
                                                    onCheckedChange={() =>
                                                      setAttendance((current) => ({
                                                        ...current,
                                                        [student.id]: !current[student.id],
                                                      }))
                                                    }
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        <div className="flex justify-end">
                                          <Button
                                            onClick={() => handleSaveAttendance(classItem.id)}
                                            disabled={saving}
                                            className="rounded-full bg-blue-700 px-6 hover:bg-blue-800"
                                          >
                                            <Save className="h-4 w-4" />
                                            {saving ? 'A guardar...' : 'Guardar presencas'}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="panel-card border-white/10 bg-white/92">
                <CardHeader className="pb-4">
                  <CardTitle className="text-3xl text-slate-950">Membros</CardTitle>
                  <CardDescription>
                    Filtra por nome, papel ou faixa e centraliza as acoes num unico bloco.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Pesquisar por nome..."
                        value={search}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setSearch(nextValue);
                          setSelectedStudentId('');

                          const results = allPeople.filter((person: any) => {
                            const matchesSearch = person.name.toLowerCase().includes(nextValue.toLowerCase());
                            const matchesBelt = beltFilter === '' || person.belt === beltFilter;
                            const matchesRole = roleFilter === '' || person._role === roleFilter;
                            return matchesSearch && matchesBelt && matchesRole;
                          });

                          if (results.length === 1) setSelectedStudentId(results[0].id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && filteredStudents.length > 0) {
                            setSelectedStudentId(filteredStudents[0].id);
                          }
                        }}
                        className="h-12 rounded-2xl border-slate-200 bg-white pl-11"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(event) => {
                        setRoleFilter(event.target.value);
                        setSelectedStudentId('');
                      }}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">Todos os papeis</option>
                      <option value="student">Alunos</option>
                      <option value="teacher">Professores</option>
                    </select>

                    <select
                      value={beltFilter}
                      onChange={(event) => {
                        setBeltFilter(event.target.value);
                        setSelectedStudentId('');
                      }}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">Todas as faixas</option>
                      <option value="Branca">Branca</option>
                      <option value="Azul">Azul</option>
                      <option value="Roxa">Roxa</option>
                      <option value="Marrom">Marrom</option>
                      <option value="Preta">Preta</option>
                    </select>
                  </div>

                  <select
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Selecionar membro</option>
                    {filteredStudents.map((person: any) => (
                      <option key={person.id} value={person.id}>
                        {person.name} ({person.belt}){person._role === 'teacher' ? ' - Professor' : ''}
                      </option>
                    ))}
                  </select>

                  {!selectedStudent ? (
                    <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <Users className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-4 text-base font-medium text-slate-600">
                        Seleciona um membro para abrir o bloco de gestao.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-5">
                        <div className="flex items-center gap-4">
                          {selectedStudent.avatarUrl ? (
                            <img
                              src={selectedStudent.avatarUrl}
                              alt={selectedStudent.name}
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                              {initialsFromName(selectedStudent.name)}
                            </div>
                          )}

                          <div className="space-y-2">
                            <h3 className="text-2xl font-semibold text-slate-950">{selectedStudent.name}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`${getBeltColor(selectedStudent.belt)} rounded-full`}>
                                {selectedStudent.belt}
                              </Badge>
                              {selectedStudent._role === 'teacher' && (
                                <Badge className="rounded-full border border-violet-200 bg-violet-100 text-violet-700">
                                  Professor
                                </Badge>
                              )}
                              <span className="text-sm text-slate-500">{selectedStudent.category}</span>
                              {selectedStudent.weight && <span className="text-sm text-slate-400">{selectedStudent.weight}</span>}
                            </div>
                            {selectedStudent.email && <p className="text-sm text-slate-500">{selectedStudent.email}</p>}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[22px] bg-slate-900 px-4 py-4 text-white">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Papel</p>
                            <p className="mt-3 text-lg font-semibold">
                              {selectedStudent._role === 'teacher' ? 'Professor' : 'Aluno'}
                            </p>
                          </div>
                          <div className="rounded-[22px] bg-amber-50 px-4 py-4 text-slate-900">
                            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Estado</p>
                            <p className="mt-3 text-lg font-semibold">Ativo no sistema</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Acoes sobre o membro</p>
                        <div className="mt-4 grid gap-3">
                          <Button variant="outline" onClick={() => onViewStudent(selectedStudent)} className="h-12 justify-start rounded-2xl">
                            <Eye className="h-4 w-4" />
                            Ver perfil
                          </Button>
                          <Button variant="outline" onClick={() => onEditStudent(selectedStudent)} className="h-12 justify-start rounded-2xl">
                            <Edit className="h-4 w-4" />
                            Editar dados
                          </Button>
                          {selectedStudent._role !== 'teacher' && (
                            <Button variant="outline" onClick={() => onManagePayments(selectedStudent)} className="h-12 justify-start rounded-2xl">
                              <CreditCard className="h-4 w-4" />
                              Gerir mensalidades
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card className="panel-card border-white/10 bg-white/92">
                <CardHeader className="pb-4">
                  <CardTitle className="text-3xl text-slate-950">Acoes rapidas</CardTitle>
                  <CardDescription>Atalhos claros para os fluxos com maior frequencia de uso.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Button onClick={onManageTournaments} className="h-12 justify-start rounded-2xl bg-slate-950 hover:bg-slate-800">
                    <Trophy className="h-4 w-4" />
                    Gerir torneios
                  </Button>
                  <Button variant="outline" onClick={onManageAttendance} className="h-12 justify-start rounded-2xl">
                    <ClipboardList className="h-4 w-4" />
                    Assiduidade
                  </Button>
                  <Button variant="outline" onClick={onAddStudent} className="h-12 justify-start rounded-2xl">
                    <Plus className="h-4 w-4" />
                    Novo aluno
                  </Button>
                  <Button variant="outline" onClick={onViewReports} className="h-12 justify-start rounded-2xl">
                    <FileText className="h-4 w-4" />
                    Relatorios
                  </Button>
                </CardContent>
              </Card>

              <Card className="panel-card border-white/10 bg-white/92">
                <CardHeader className="pb-4">
                  <CardTitle className="text-3xl text-slate-950">Proximos torneios</CardTitle>
                  <CardDescription>Uma leitura rapida do calendario competitivo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tournaments
                    .filter((tournament: any) => tournament.status === 'Programado')
                    .slice(0, 4)
                    .map((tournament: any) => (
                      <div
                        key={tournament.id}
                        className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">{tournament.name}</h4>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatShortDate(tournament.date)} · {tournament.location}
                            </p>
                          </div>
                          <Badge className="rounded-full bg-amber-100 text-amber-800">
                            {tournament.participants.length} inscritos
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                          <Trophy className="h-3.5 w-3.5" />
                          {tournament.category}
                        </div>
                      </div>
                    ))}

                  {tournaments.filter((tournament: any) => tournament.status === 'Programado').length === 0 && (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                      Sem torneios programados.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="panel-card border-white/10 bg-white/92">
                <CardHeader className="pb-4">
                  <CardTitle className="text-3xl text-slate-950">Resumo operativo</CardTitle>
                  <CardDescription>Indicadores rapidos para leitura de contexto.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Professores no sistema</span>
                    </div>
                    <strong className="font-display text-3xl text-slate-950">{teachers.length}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Aulas nesta semana</span>
                    </div>
                    <strong className="font-display text-3xl text-slate-950">{weekClasses.length}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Torneios finalizados</span>
                    </div>
                    <strong className="font-display text-3xl text-slate-950">{completedTournaments}</strong>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
