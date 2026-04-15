import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, CreditCard, Calendar } from 'lucide-react';

const PaymentManager = ({ student, onBack, onUpdateStudent, getBeltColor }) => {
  // Gerar mensalidades desde Janeiro do ano de inscrição até Dezembro daqui a 10 anos
  const generateMonthlyFees = (joinDate) => {
    const joinYear = new Date(joinDate).getFullYear();
    const startDate = new Date(joinYear, 0, 1); // Janeiro do ano de inscrição
    const endDate = new Date(new Date().getFullYear() + 10, 11, 31); // Dezembro daqui a 10 anos
    
    const fees = [];
    const currentDate = new Date(startDate);
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    while (currentDate <= endDate) {
      const monthName = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear();
      const feeId = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Verificar se já existe pagamento registrado
      const existingFee = student.monthlyFees?.find(fee => fee.id === feeId);
      
      fees.push({
        id: feeId,
        month: `${monthName} ${year}`,
        paid: existingFee?.paid || false,
        date: new Date(currentDate)
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return fees;
  };

  const [monthlyFees, setMonthlyFees] = useState(() => generateMonthlyFees(student.joinDate));

  const handleSave = () => {
    const updatedStudent = {
      ...student,
      monthlyFees: monthlyFees.map(fee => ({
        id: fee.id,
        month: fee.month,
        paid: fee.paid
      }))
    };
    onUpdateStudent(updatedStudent);
    onBack();
  };

  const togglePayment = (index) => {
    setMonthlyFees(prev => 
      prev.map((fee, i) => 
        i === index ? { ...fee, paid: !fee.paid } : fee
      )
    );
  };

  // Agrupar por ano
  const feesByYear = monthlyFees.reduce((acc, fee) => {
    const year = fee.date.getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(fee);
    return acc;
  }, {});

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const availableYears = Object.keys(feesByYear).map(Number).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="mr-4 hover:bg-white/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Gestão de Mensalidades</h1>
              <p className="text-slate-600">{student.name}</p>
            </div>
          </div>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Guardar Alterações
          </Button>
        </div>

        {/* Resumo rápido — apenas meses desde a inscrição */}
        {(() => {
          const joinDate = new Date(student.joinDate);
          const now = new Date();
          // Apenas meses desde inscrição até ao mês actual (inclusive)
          const activeFees = monthlyFees.filter(f => f.date >= joinDate && f.date <= now);
          return (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="bg-green-50 border-green-200 border shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{activeFees.filter(f => f.paid).length}</p>
                  <p className="text-sm text-green-700">Pagas</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200 border shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{activeFees.filter(f => !f.paid && f.date < now).length}</p>
                  <p className="text-sm text-red-700">Em atraso</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200 border shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{activeFees.length}</p>
                  <p className="text-sm text-blue-700">Total</p>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Student Info */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800">{student.name}</h3>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge className={getBeltColor(student.belt)}>
                    Faixa {student.belt}
                  </Badge>
                  <span className="text-slate-600">Data de Inscrição: {new Date(student.joinDate).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selector de ano */}
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-slate-700">Ano:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year} {year === currentYear ? '(atual)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Payment History by Year */}
        <div className="space-y-6">
          {Object.keys(feesByYear)
            .sort((a, b) => Number(b) - Number(a))
            .filter(year => Number(year) === selectedYear)
            .map(year => (
              <Card key={year} className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    {year}
                    {parseInt(year) === currentYear && (
                      <Badge variant="secondary" className="ml-2">Ano Atual</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Mensalidades de {year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {feesByYear[year].map((fee, index) => {
                      const globalIndex = monthlyFees.findIndex(f => f.id === fee.id);
                      const isCurrentMonth = parseInt(year) === currentYear && fee.date.getMonth() === currentMonth;
                      const isPastDue = fee.date < new Date() && !fee.paid;
                      const _jd = new Date(student.joinDate);
                      const joinYYYYMM = `${_jd.getFullYear()}-${String(_jd.getMonth() + 1).padStart(2, '0')}`;
                      const isBeforeJoin = fee.id < joinYYYYMM;

                      if (isBeforeJoin) {
                        return (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 opacity-40 cursor-not-allowed"
                          >
                            <div className="flex items-center space-x-3">
                              <CreditCard className="h-5 w-5 text-slate-300" />
                              <div>
                                <h4 className="font-medium text-slate-400">{fee.month}</h4>
                                <p className="text-sm text-slate-400">Antes da inscrição</p>
                              </div>
                            </div>
                            <Switch checked={false} disabled />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={fee.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                            fee.paid
                              ? 'bg-green-50 border-green-200'
                              : isPastDue
                                ? 'bg-red-50 border-red-200'
                                : isCurrentMonth
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <CreditCard className={`h-5 w-5 ${
                              fee.paid ? 'text-green-600' : isPastDue ? 'text-red-600' : 'text-slate-500'
                            }`} />
                            <div>
                              <h4 className="font-medium text-slate-800">{fee.month}</h4>
                              <p className="text-sm text-slate-600">
                                {fee.paid ? 'Pago' : isPastDue ? 'Em atraso' : isCurrentMonth ? 'Mês atual' : 'Por pagar'}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={fee.paid}
                            onCheckedChange={() => togglePayment(globalIndex)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

      </div>
    </div>
  );
};

export default PaymentManager;