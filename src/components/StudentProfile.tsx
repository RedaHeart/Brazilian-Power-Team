
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Calendar, Phone, Mail, User, UserPlus, UserMinus, ClipboardList, X, Clock, Camera, Loader2 } from 'lucide-react';
import { buildCurrentMonthRange, ensureClassesForRange } from '@/lib/class-schedule';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const BELT_ORDER = ['BRANCA','AZUL','ROXA','MARROM','PRETA'];

const isEligible = (student: any, cls: any) => {
  if (cls.min_belt) {
    const studentBeltIdx = BELT_ORDER.indexOf(student.belt.toUpperCase());
    const minBeltIdx = BELT_ORDER.indexOf(cls.min_belt);
    if (studentBeltIdx < minBeltIdx) return false;
  }
  if (cls.allowed_groups && cls.allowed_groups.length > 0) {
    const studentGroup = (student.category || '').toUpperCase();
    if (!cls.allowed_groups.includes(studentGroup)) return false;
  }
  return true;
};

const StudentProfile = ({ student, tournaments, allTournaments, onBack, onRegisterForTournament, onUnregisterFromTournament, getBeltColor }) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(student.avatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadClasses = async () => {
      const { from, to } = buildCurrentMonthRange();
      await ensureClassesForRange({ from, to });

      const [{ data: classData }, { data: enrollmentData }] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .gte('starts_at', from.toISOString())
          .lte('starts_at', to.toISOString())
          .order('starts_at', { ascending: true }),
        supabase
          .from('enrollments')
          .select('class_id')
          .eq('student_id', student.id),
      ]);

      setClasses((classData || []).filter((cls) => isEligible(student, cls)));
      setEnrolledIds(new Set((enrollmentData || []).map((entry: any) => entry.class_id)));
    };

    loadClasses();
  }, []);

  const handleEnroll = async (cls: any) => {
    setEnrolling(true);
    const { error } = await supabase.from('enrollments').insert({ class_id: cls.id, student_id: student.id });
    if (error) { toast.error('Erro ao inscrever.'); }
    else {
      setEnrolledIds(prev => new Set([...prev, cls.id]));
      toast.success('Inscrição confirmada!');
    }
    setEnrolling(false);
  };

  const handleUnenroll = async (cls: any) => {
    setEnrolling(true);
    const { error } = await supabase.from('enrollments').delete().eq('class_id', cls.id).eq('student_id', student.id);
    if (error) { toast.error('Erro ao cancelar inscrição.'); }
    else {
      setEnrolledIds(prev => { const s = new Set(prev); s.delete(cls.id); return s; });
      toast.success('Inscrição cancelada.');
    }
    setEnrolling(false);
  };
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(student.id, file, { upsert: true, contentType: file.type });
    if (uploadError) { toast.error('Erro ao carregar foto.'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(student.id);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', student.id);
    setAvatarUrl(publicUrl + '?t=' + Date.now());
    toast.success('Foto atualizada!');
    setUploading(false);
  };

  // Torneios disponíveis para inscrição (programados e que o aluno ainda não está inscrito)
  const availableTournaments = allTournaments.filter(tournament => 
    tournament.status === 'Programado' && 
    !tournament.participants.includes(student.id)
  );

  const handleRegister = (tournamentId) => {
    onRegisterForTournament(student.id, tournamentId);
  };

  const handleUnregister = (tournamentId) => {
    onUnregisterFromTournament(student.id, tournamentId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mr-4 hover:bg-white/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Perfil do Aluno</h1>
            <p className="text-slate-600">Informações pessoais e progresso</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Personal Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="relative group w-16 h-16 shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xl">
                          {student.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-slate-800">{student.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getBeltColor(student.belt)}>
                        Faixa {student.belt}
                      </Badge>
                      <Badge variant="secondary">
                        {student.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-600">Email</p>
                        <p className="font-medium text-slate-800">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-600">Telefone</p>
                        <p className="font-medium text-slate-800">{student.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-600">Categoria</p>
                        <p className="font-medium text-slate-800">{student.weight}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm text-slate-600">Data de Ingresso</p>
                        <p className="font-medium text-slate-800">
                          {new Date(student.joinDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Aulas do mês — calendário */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center">
                  <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
                  Aulas este mês
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })} · clica numa aula para te inscreveres
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = now.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const startOffset = (firstDay.getDay() + 6) % 7;
                  const weekDays = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

                  const classByDay: Record<number, any[]> = {};
                  classes.forEach(cls => {
                    const d = new Date(cls.starts_at).getDate();
                    if (!classByDay[d]) classByDay[d] = [];
                    classByDay[d].push(cls);
                  });

                  const cells = Array(startOffset).fill(null).concat(
                    Array.from({ length: daysInMonth }, (_, i) => i + 1)
                  );
                  while (cells.length % 7 !== 0) cells.push(null);

                  return (
                    <div>
                      <div className="grid grid-cols-7 mb-1">
                        {weekDays.map(d => (
                          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((day, i) => {
                          if (!day) return <div key={i} />;
                          const isToday = day === now.getDate();
                          const isPast = new Date(year, month, day) < new Date(year, month, now.getDate());
                          const dayCls = classByDay[day] || [];
                          return (
                            <div
                              key={i}
                              className={`min-h-[52px] rounded-lg p-1 border text-center ${
                                isToday ? 'border-blue-400 bg-blue-50' :
                                dayCls.length > 0 ? (isPast ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50/40') :
                                'border-transparent'
                              }`}
                            >
                              <p className={`text-xs font-semibold mb-0.5 ${isToday ? 'text-blue-600' : isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                                {day}
                              </p>
                              {dayCls.map((cls, ci) => {
                                const enrolled = enrolledIds.has(cls.id);
                                return (
                                  <button
                                    key={ci}
                                    onClick={() => !isPast && setSelectedClass(cls)}
                                    disabled={isPast}
                                    title={cls.title}
                                    className={`w-full text-[10px] leading-tight rounded px-0.5 py-0.5 mb-0.5 truncate transition-opacity ${
                                      isPast ? 'bg-slate-200 text-slate-500 cursor-default' :
                                      enrolled ? 'bg-green-600 text-white hover:bg-green-700' :
                                      'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {new Date(cls.starts_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Disponível</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> Inscrito</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Passada</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Modal de inscrição */}
            {selectedClass && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedClass(null)}>
                <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{selectedClass.title}</h3>
                      {selectedClass.type && <Badge variant="secondary" className="mt-1">{selectedClass.type}</Badge>}
                    </div>
                    <button onClick={() => setSelectedClass(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-2 mb-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {new Date(selectedClass.starts_at).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {new Date(selectedClass.starts_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      {selectedClass.ends_at && ` → ${new Date(selectedClass.ends_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                  {enrolledIds.has(selectedClass.id) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3 text-sm">
                        <UserPlus className="h-4 w-4" /> Estás inscrito nesta aula
                      </div>
                      <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" disabled={enrolling} onClick={() => handleUnenroll(selectedClass).then(() => setSelectedClass(null))}>
                        <UserMinus className="h-4 w-4 mr-2" /> Cancelar inscrição
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={enrolling} onClick={() => handleEnroll(selectedClass).then(() => setSelectedClass(null))}>
                      <UserPlus className="h-4 w-4 mr-2" /> {enrolling ? 'A inscrever...' : 'Inscrever-me'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Achievements */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                  Conquistas e Medalhas
                </CardTitle>
                <CardDescription>Histórico de vitórias e reconhecimentos</CardDescription>
              </CardHeader>
              <CardContent>
                {student.achievements.length > 0 ? (
                  <div className="space-y-3">
                    {student.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <Trophy className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-slate-800">{achievement}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Ainda não há conquistas registadas.</p>
                    <p className="text-sm text-slate-400 mt-1">Continue treinando para alcançar seus objetivos!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Tournaments for Registration */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center">
                  <UserPlus className="h-5 w-5 mr-2 text-green-600" />
                  Torneios Disponíveis
                </CardTitle>
                <CardDescription>Inscreva-se em torneios programados</CardDescription>
              </CardHeader>
              <CardContent>
                {availableTournaments.length === 0 ? (
                  <div className="text-center py-6">
                    <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Não há torneios disponíveis de momento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableTournaments.map((tournament) => (
                      <div key={tournament.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800 mb-2">{tournament.name}</h4>
                            <div className="space-y-1 text-sm text-slate-600">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{tournament.date}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Trophy className="h-4 w-4" />
                                <span>{tournament.location}</span>
                              </div>
                              <Badge variant="secondary" className="mt-2">
                                {tournament.category}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRegister(tournament.id)}
                            className="bg-green-600 hover:bg-green-700 text-white ml-4"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Inscrever-se
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Tournament History */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800">Meus Torneios</CardTitle>
                <CardDescription>Participações em competições</CardDescription>
              </CardHeader>
              <CardContent>
                {tournaments.length > 0 ? (
                  <div className="space-y-3">
                    {tournaments.map((tournament) => (
                      <div key={tournament.id} className="p-3 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold text-slate-800 text-sm">{tournament.name}</h4>
                        <p className="text-xs text-slate-600 mt-1">{tournament.location}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">{tournament.date}</span>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={tournament.status === 'Programado' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {tournament.status}
                            </Badge>
                            {tournament.status === 'Programado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnregister(tournament.id)}
                                className="text-xs h-6 px-2 text-red-600 hover:bg-red-50"
                              >
                                <UserMinus className="h-3 w-3 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                        {tournament.ranking && tournament.ranking[student.id] && (
                          <div className="mt-2">
                            <Badge className="text-xs bg-yellow-100 text-yellow-800">
                              {tournament.ranking[student.id]}º lugar
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Nenhum torneio registado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Stats */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Torneios Participados</span>
                  <span className="font-semibold text-slate-800">{tournaments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Medalhas Conquistadas</span>
                  <span className="font-semibold text-slate-800">{student.achievements.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tempo na Academia</span>
                  <span className="font-semibold text-slate-800">
                    {Math.floor((Date.now() - new Date(student.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
