import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, AlertCircle, CheckCircle, CreditCard, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { buildCurrentMonthRange, buildCurrentWeekRange, buildCurrentYearRange, ensureClassesForRange } from '@/lib/class-schedule';
import { supabase } from '@/lib/supabase';

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const BELT_ORDER = ['BRANCA','AZUL','ROXA','MARROM','PRETA'];

const isEligible = (student: any, cls: any) => {
  if (cls.min_belt) {
    const studentIdx = BELT_ORDER.indexOf(student.belt.toUpperCase());
    const minIdx = BELT_ORDER.indexOf(cls.min_belt);
    if (studentIdx < minIdx) return false;
  }
  if (cls.allowed_groups && cls.allowed_groups.length > 0) {
    const studentGroup = (student.category || '').toUpperCase();
    if (!cls.allowed_groups.includes(studentGroup)) return false;
  }
  return true;
};
const MONTH_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const currentYYYYMM = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const PaymentReports = ({ students, onBack, getBeltColor }) => {
  const now = new Date();
  const [section, setSection] = useState<'payments' | 'attendance'>('payments');
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [attPeriod, setAttPeriod] = useState<'weekly' | 'monthly' | 'annual'>('weekly');
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-based

  const availableYears = Array.from({ length: now.getFullYear() - 2026 + 2 }, (_, i) => 2026 + i);

  // Attendance summary data: studentId → { present, total }
  const [attData, setAttData] = useState<Record<string, { present: number; total: number }>>({});
  // Attendance detail data: studentId → class list with present flag
  const [attDetail, setAttDetail] = useState<Record<string, { id: string; title: string; starts_at: string; present: boolean }[]>>({});
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (section === 'attendance') { setExpandedStudentId(null); loadAttendance(); }
  }, [section, attPeriod]);

  const loadAttendance = async () => {
    setLoadingAtt(true);
    const range = attPeriod === 'weekly' ? buildCurrentWeekRange() : attPeriod === 'monthly' ? buildCurrentMonthRange() : buildCurrentYearRange();
    await ensureClassesForRange(range);

    const { data: classData } = await supabase
      .from('classes').select('id, title, starts_at, min_belt, allowed_groups')
      .gte('starts_at', range.from.toISOString())
      .lte('starts_at', range.to.toISOString())
      .order('starts_at', { ascending: true });

    const classes = classData || [];
    const allClassIds = classes.map((c: any) => c.id);

    if (allClassIds.length === 0) {
      setAttData({});
      setAttDetail({});
      setLoadingAtt(false);
      return;
    }

    const { data: attRecords } = await supabase
      .from('attendance').select('student_id, class_id, present')
      .in('class_id', allClassIds);

    // Build per-student maps — only count eligible classes
    const summaryMap: Record<string, { present: number; total: number }> = {};
    const detailMap: Record<string, { id: string; title: string; starts_at: string; present: boolean }[]> = {};

    students.forEach((s: any) => {
      const joinDate = new Date(s.joinDate);
      const now = new Date();
      const eligibleClasses = classes.filter(cls =>
        isEligible(s, cls) && new Date(cls.starts_at) >= joinDate && new Date(cls.starts_at) <= now
      );
      summaryMap[s.id] = { present: 0, total: eligibleClasses.length };
      detailMap[s.id] = eligibleClasses.map((c: any) => ({ id: c.id, title: c.title, starts_at: c.starts_at, present: false }));
    });

    (attRecords || []).forEach((r: any) => {
      if (summaryMap[r.student_id] && r.present) {
        // Only count if the class is eligible for this student
        const eligible = detailMap[r.student_id]?.find(c => c.id === r.class_id);
        if (eligible) summaryMap[r.student_id].present += 1;
      }
      if (detailMap[r.student_id]) {
        const cls = detailMap[r.student_id].find(c => c.id === r.class_id);
        if (cls) cls.present = r.present;
      }
    });

    setAttData(summaryMap);
    setAttDetail(detailMap);
    setLoadingAtt(false);
  };

  // ── Payment helpers ──────────────────────────────────────────────────────

  const selectedYYYYMM = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`;
  const annualMonths = Array.from({ length: 12 }, (_, i) =>
    `${selYear}-${String(i + 1).padStart(2, '0')}`
  );

  // Students enrolled by the selected month
  const enrolledByMonth = students.filter((s: any) => {
    if (!s.joinDate) return false;
    const joinYYYYMM = s.joinDate.slice(0, 7); // 'YYYY-MM'
    return joinYYYYMM <= selectedYYYYMM;
  });

  // Students enrolled at any point during the selected year
  const enrolledByYear = students.filter((s: any) => {
    if (!s.joinDate) return false;
    return new Date(s.joinDate).getFullYear() <= selYear;
  });

  const monthlyStats = (() => {
    let paid = 0, unpaid = 0, noRecord = 0;
    enrolledByMonth.forEach((s: any) => {
      const fee = (s.monthlyFees || []).find((f: any) => f.id === selectedYYYYMM);
      if (!fee) noRecord++;
      else if (fee.paid) paid++;
      else unpaid++;
    });
    return { paid, unpaid, noRecord };
  })();

  const ATT_PERIODS: { key: 'weekly' | 'monthly' | 'annual'; label: string }[] = [
    { key: 'weekly', label: 'Semanal' },
    { key: 'monthly', label: 'Mensal' },
    { key: 'annual', label: 'Anual' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4 hover:bg-white/50">
            <ArrowLeft className="h-4 w-4 mr-2" />Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Relatórios</h1>
            <p className="text-slate-600">Mensalidades e assiduidade da academia</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setSection('payments')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${section === 'payments' ? 'bg-blue-600 text-white shadow' : 'bg-white/80 text-slate-600 hover:bg-white shadow-sm'}`}
          >
            <CreditCard className="h-4 w-4" />Mensalidades
          </button>
          <button
            onClick={() => setSection('attendance')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${section === 'attendance' ? 'bg-blue-600 text-white shadow' : 'bg-white/80 text-slate-600 hover:bg-white shadow-sm'}`}
          >
            <ClipboardList className="h-4 w-4" />Assiduidade
          </button>
        </div>

        {/* ── MENSALIDADES ── */}
        {section === 'payments' && (
          <>
            {/* Period tabs — only Mensal and Anual */}
            <div className="flex gap-2 mb-6">
              {(['monthly', 'annual'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${period === p ? 'bg-slate-800 text-white' : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'}`}>
                  {p === 'monthly' ? 'Mensal' : 'Anual'}
                </button>
              ))}
            </div>

            {period === 'monthly' && (
              <>
                {/* Year / Month selector */}
                <div className="flex gap-2 mb-6">
                  <select
                    value={selYear}
                    onChange={e => setSelYear(Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    value={selMonth}
                    onChange={e => setSelMonth(Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {MONTH_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-green-50 border-green-200 border shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{monthlyStats.paid}</p>
                      <p className="text-sm text-green-700">Pagos</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 border-red-200 border shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{monthlyStats.unpaid}</p>
                      <p className="text-sm text-red-700">Em atraso</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50 border-slate-200 border shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-slate-600">{monthlyStats.noRecord}</p>
                      <p className="text-sm text-slate-500">Sem registo</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      {MONTH_FULL[selMonth]} {selYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {enrolledByMonth.map((s: any) => {
                        const fee = (s.monthlyFees || []).find((f: any) => f.id === selectedYYYYMM);
                        return (
                          <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${fee?.paid ? 'bg-green-50 border-green-200' : fee ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-xs">{s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                                <Badge className={`${getBeltColor(s.belt)} text-xs`}>{s.belt}</Badge>
                              </div>
                            </div>
                            {fee?.paid
                              ? <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>
                              : fee
                                ? <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Em atraso</Badge>
                                : <Badge variant="secondary">Sem registo</Badge>
                            }
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {period === 'annual' && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      Mensalidades {selYear}
                    </CardTitle>
                    <select
                      value={selYear}
                      onChange={e => setSelYear(Number(e.target.value))}
                      className="h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left py-2 pr-4 font-medium text-slate-600 min-w-[140px]">Aluno</th>
                          {MONTH_NAMES.map((m, i) => (
                            <th key={i} className={`text-center py-2 px-1 font-medium text-xs w-9 ${selYear === now.getFullYear() && i === now.getMonth() ? 'text-blue-600' : 'text-slate-500'}`}>{m}</th>
                          ))}
                          <th className="text-center py-2 px-2 font-medium text-slate-600 text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledByYear.map((s: any) => {
                          const joinYYYYMM = s.joinDate?.slice(0, 7);
                          const yearFees = annualMonths.map(ym => {
                            if (joinYYYYMM && ym < joinYYYYMM) return undefined; // before join
                            return (s.monthlyFees || []).find((f: any) => f.id === ym);
                          });
                          const paidCount = yearFees.filter(f => f?.paid).length;
                          return (
                            <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 pr-4">
                                <p className="font-medium text-slate-800">{s.name}</p>
                                <Badge className={`${getBeltColor(s.belt)} text-xs`}>{s.belt}</Badge>
                              </td>
                              {yearFees.map((fee, i) => (
                                <td key={i} className="text-center py-2 px-1">
                                  {fee?.paid
                                    ? <span className="inline-block w-5 h-5 rounded-full bg-green-500" title="Pago" />
                                    : fee
                                      ? <span className="inline-block w-5 h-5 rounded-full bg-red-400" title="Pendente" />
                                      : <span className="text-slate-200 text-xs">–</span>
                                  }
                                </td>
                              ))}
                              <td className="text-center py-2 px-2 font-semibold text-slate-700">{paidCount}/12</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── ASSIDUIDADE ── */}
        {section === 'attendance' && (
          <>
            <div className="flex gap-2 mb-6">
              {ATT_PERIODS.map(p => (
                <button key={p.key} onClick={() => setAttPeriod(p.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${attPeriod === p.key ? 'bg-slate-800 text-white' : 'bg-white/80 text-slate-600 hover:bg-white border border-slate-200'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  Assiduidade — {attPeriod === 'weekly' ? 'Esta Semana' : attPeriod === 'monthly' ? `${MONTH_FULL[now.getMonth()]} ${now.getFullYear()}` : `Ano ${now.getFullYear()}`}
                </CardTitle>
                {attPeriod === 'weekly' && (
                  <CardDescription>
                    {buildCurrentWeekRange().from.toLocaleDateString('pt-PT')} – {buildCurrentWeekRange().to.toLocaleDateString('pt-PT')}
                    {' · '}clica num aluno para ver o detalhe das aulas
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {loadingAtt ? (
                  <p className="text-center text-slate-400 py-8">A carregar...</p>
                ) : (
                  <div className="space-y-2">
                    {students
                      .map((s: any) => ({ ...s, att: attData[s.id] || { present: 0, total: 0 } }))
                      .sort((a: any, b: any) => b.att.present - a.att.present)
                      .map((s: any) => {
                        const pct = s.att.total > 0 ? Math.round((s.att.present / s.att.total) * 100) : 0;
                        const barColor = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
                        const isExpanded = expandedStudentId === s.id;
                        const detail = attDetail[s.id] || [];
                        const isClickable = attPeriod === 'weekly';

                        return (
                          <div key={s.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            {/* Student row */}
                            <div
                              className={`p-3 ${isClickable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                              onClick={() => isClickable && setExpandedStudentId(isExpanded ? null : s.id)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-bold text-xs">{s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                                    <Badge className={`${getBeltColor(s.belt)} text-xs`}>{s.belt}</Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <p className="font-bold text-slate-800">{s.att.present}<span className="text-slate-400 font-normal text-xs">/{s.att.total}</span></p>
                                    <p className="text-xs text-slate-500">{pct}%</p>
                                  </div>
                                  {isClickable && (
                                    isExpanded
                                      ? <ChevronUp className="h-4 w-4 text-slate-400" />
                                      : <ChevronDown className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>
                              </div>
                              {s.att.total > 0 && (
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                                </div>
                              )}
                            </div>

                            {/* Detail — weekly only */}
                            {isClickable && isExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50 px-3 pb-3 pt-2">
                                {detail.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-2 text-center">Sem aulas neste período.</p>
                                ) : (
                                  <div className="space-y-1.5 mt-1">
                                    {detail.map(cls => (
                                      <div key={cls.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${cls.present ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div>
                                          <p className="font-medium text-slate-800">{cls.title}</p>
                                          <p className="text-xs text-slate-500">
                                            {new Date(cls.starts_at).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                            {' · '}
                                            {new Date(cls.starts_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                        {cls.present
                                          ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Presente</Badge>
                                          : <Badge className="bg-red-100 text-red-700 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Falta</Badge>
                                        }
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentReports;
