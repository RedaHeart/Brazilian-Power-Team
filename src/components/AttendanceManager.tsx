import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Calendar, ClipboardList, Plus, Users, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthRange, ensureClassesForRange } from '@/lib/class-schedule';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

const AttendanceManager = ({ students, onBack, getBeltColor }) => {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClass, setNewClass] = useState({ title: '', starts_at: '', ends_at: '', type: '' });

  useEffect(() => { loadClasses(); }, [calYear, calMonth]);

  const loadClasses = async () => {
    const { from, to } = buildMonthRange(calYear, calMonth);
    try {
      await ensureClassesForRange({ from, to });
    } catch (generationError) {
      console.error('Failed to generate monthly classes from templates', generationError);
    }

    const { data, error } = await supabase
      .from('classes').select('*')
      .gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString())
      .order('starts_at', { ascending: true });
    if (error) toast.error('Erro ao carregar aulas.');
    setClasses(data || []);
    setSelectedClass(null);
    setAttendance({});
  };

  const handleSelectClass = async (cls: any) => {
    if (selectedClass?.id === cls.id) return;
    setSelectedClass(cls);
    setLoadingAttendance(true);
    const { data } = await supabase.from('attendance').select('*').eq('class_id', cls.id);
    const map: Record<string, boolean> = {};
    (data || []).forEach((r: any) => { map[r.student_id] = r.present; });
    setAttendance(map);
    setLoadingAttendance(false);
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true);
    await supabase.from('attendance').delete().eq('class_id', selectedClass.id);
    const records = students.map((s: any) => ({
      class_id: selectedClass.id,
      student_id: s.id,
      present: attendance[s.id] || false,
      marked_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('attendance').insert(records);
    if (error) toast.error('Erro ao guardar.');
    else toast.success('Presenças guardadas!');
    setSaving(false);
  };

  const handleCreateClass = async () => {
    if (!newClass.title || !newClass.starts_at) return;
    const { error } = await supabase.from('classes').insert({
      title: newClass.title,
      starts_at: new Date(newClass.starts_at).toISOString(),
      ends_at: newClass.ends_at ? new Date(newClass.ends_at).toISOString() : null,
      type: newClass.type || null,
    });
    if (error) { toast.error('Erro ao criar aula.'); return; }
    toast.success('Aula criada!');
    setNewClass({ title: '', starts_at: '', ends_at: '', type: '' });
    setShowNewForm(false);
    loadClasses();
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // Calendar grid
  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = Array(startOffset).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const classByDay: Record<number, any[]> = {};
  classes.forEach(cls => {
    const d = new Date(cls.starts_at).getDate();
    if (!classByDay[d]) classByDay[d] = [];
    classByDay[d].push(cls);
  });

  const presentCount = students.filter((s: any) => attendance[s.id]).length;
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4 hover:bg-white/50">
              <ArrowLeft className="h-4 w-4 mr-2" />Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Assiduidade</h1>
              <p className="text-slate-600">Registo de presenças nas aulas</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedClass && (
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />{saving ? 'A guardar...' : 'Guardar'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowNewForm(v => !v)}>
              <Plus className="h-4 w-4 mr-2" />Nova Aula
            </Button>
          </div>
        </div>

        {/* Nova Aula form */}
        {showNewForm && (
          <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader><CardTitle className="text-slate-800">Nova Aula</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={newClass.title} onChange={e => setNewClass(p => ({ ...p, title: e.target.value }))} className="bg-white" placeholder="Ex: Treino Noite" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input value={newClass.type} onChange={e => setNewClass(p => ({ ...p, type: e.target.value }))} className="bg-white" placeholder="Ex: Gi, No-Gi..." />
                </div>
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="datetime-local" value={newClass.starts_at} onChange={e => setNewClass(p => ({ ...p, starts_at: e.target.value }))} className="bg-white" />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="datetime-local" value={newClass.ends_at} onChange={e => setNewClass(p => ({ ...p, ends_at: e.target.value }))} className="bg-white" />
                </div>
              </div>
              <Button onClick={handleCreateClass} className="mt-4 bg-green-600 hover:bg-green-700" disabled={!newClass.title || !newClass.starts_at}>
                <Plus className="h-4 w-4 mr-2" />Criar Aula
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Calendário */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="text-center">
                    <p className="font-semibold text-slate-800">{MONTH_NAMES[calMonth]}</p>
                    <p className="text-xs text-slate-500">{calYear}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                {!isCurrentMonth && (
                  <Button variant="ghost" size="sm" className="w-full text-blue-600 text-xs mt-1" onClick={() => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); }}>
                    Voltar ao mês atual
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEK_DAYS.map(d => (
                    <div key={d} className="text-center text-[11px] font-medium text-slate-400 py-1">{d}</div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const isToday = isCurrentMonth && day === now.getDate();
                    const dayCls = classByDay[day] || [];
                    const hasSelected = dayCls.some(c => c.id === selectedClass?.id);
                    return (
                      <div key={i} className={`min-h-[46px] rounded-lg p-0.5 border text-center ${
                        hasSelected ? 'border-blue-400 bg-blue-50' :
                        isToday ? 'border-blue-200 bg-blue-50/50' :
                        dayCls.length > 0 ? 'border-slate-200 bg-white' :
                        'border-transparent'
                      }`}>
                        <p className={`text-xs font-semibold mb-0.5 mt-0.5 ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>{day}</p>
                        {dayCls.map((cls, ci) => {
                          const isSelected = cls.id === selectedClass?.id;
                          return (
                            <button
                              key={ci}
                              onClick={() => handleSelectClass(cls)}
                              title={cls.title}
                              className={`w-full text-[10px] leading-tight rounded px-0.5 py-0.5 mb-0.5 truncate transition-colors ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-blue-500 hover:text-white'
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
                <p className="text-xs text-slate-400 text-center mt-3">{classes.length} aula{classes.length !== 1 ? 's' : ''} neste mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Painel de presenças */}
          <div className="lg:col-span-3">
            {!selectedClass ? (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardContent className="py-16 text-center">
                  <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400">Clica numa aula no calendário para registar presenças.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-slate-800">{selectedClass.title}</CardTitle>
                      <CardDescription>
                        {new Date(selectedClass.starts_at).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
                        {' · '}
                        {new Date(selectedClass.starts_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </CardDescription>
                    </div>
                    {selectedClass.type && <Badge variant="secondary">{selectedClass.type}</Badge>}
                  </div>
                  {/* Summary */}
                  <div className="flex gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                      <CheckCircle className="h-4 w-4" />{presentCount} presentes
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-full">
                      <XCircle className="h-4 w-4" />{students.length - presentCount} ausentes
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                      <Users className="h-4 w-4" />{students.length} total
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingAttendance ? (
                    <p className="text-center text-slate-400 py-6">A carregar...</p>
                  ) : (
                    <div className="space-y-2">
                      {students.map((s: any) => (
                        <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${attendance[s.id] ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            {s.avatarUrl ? (
                              <img src={s.avatarUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-blue-600 font-bold text-xs">{s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                              <Badge className={`${getBeltColor(s.belt)} text-xs mt-0.5`}>{s.belt}</Badge>
                            </div>
                          </div>
                          <Switch checked={attendance[s.id] || false} onCheckedChange={() => setAttendance(prev => ({ ...prev, [s.id]: !prev[s.id] }))} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;
