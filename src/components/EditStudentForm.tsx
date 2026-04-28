import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, User, Plus, X, ShieldCheck, Calendar, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getBeltOptionsForCategory } from '@/lib/belts';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const generateAllFees = (joinDate: string, existingFees: any[]) => {
  const joinYear = new Date(joinDate).getFullYear();
  const endYear = new Date().getFullYear() + 10;
  const fees: any[] = [];
  for (let year = joinYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const id = `${year}-${String(month).padStart(2, '0')}`;
      const existing = existingFees.find(f => f.id === id);
      fees.push({ id, month: `${MONTH_NAMES[month - 1]} ${year}`, paid: existing?.paid || false });
    }
  }
  return fees;
};

const EditStudentForm = ({ student, onBack, onUpdateStudent, onPromoteToTeacher }) => {
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email,
    phone: student.phone,
    belt: student.belt,
    category: student.category,
    weight: student.weight,
    gender: student.gender || '',
    joinDate: student.joinDate || '',
  });

  const [achievements, setAchievements] = useState<string[]>(student.achievements || []);
  const [newAchievement, setNewAchievement] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(student.avatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [monthlyFees, setMonthlyFees] = useState(() => generateAllFees(student.joinDate, student.monthlyFees || []));
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const joinDate = new Date(student.joinDate);

  const availableYears = useMemo(() => {
    const joinYear = new Date(student.joinDate).getFullYear();
    const years = [];
    for (let y = joinYear; y <= currentYear + 10; y++) years.push(y);
    return years.reverse();
  }, [student.joinDate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value, ...(field === 'category' ? { belt: 'Branca' } : {}) }));
  };

  const handleAddAchievement = () => {
    if (newAchievement.trim()) {
      setAchievements(prev => [...prev, newAchievement.trim()]);
      setNewAchievement('');
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setAchievements(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleFee = (feeId: string) => {
    setMonthlyFees(prev =>
      prev.map(fee => fee.id === feeId ? { ...fee, paid: !fee.paid } : fee)
    );
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

  const handleSave = async () => {
    const updatedStudent = {
      ...student,
      ...formData,
      achievements,
      monthlyFees,
      avatarUrl,
    };
    const saved = await onUpdateStudent(updatedStudent);
    if (saved !== false) {
      onBack();
    }
  };

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
              <h1 className="text-3xl font-bold text-slate-800">Editar Aluno</h1>
              <p className="text-slate-600">Gestão completa do perfil (Admin)</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onPromoteToTeacher && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Promover a Professor
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Promover a Professor?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tens a certeza que queres promover <strong>{student.name}</strong> a professor? Esta acção não pode ser desfeita facilmente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { onPromoteToTeacher(student.id); onBack(); }}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Dados Pessoais */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>Informações pessoais e de contacto</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Foto */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="relative group w-20 h-20 shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={formData.name} className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-2xl">
                        {formData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Fotografia</p>
                  <p className="text-xs text-slate-500 mt-0.5">Clica na imagem para alterar</p>
                  <Button type="button" variant="outline" size="sm" className="mt-2 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Camera className="h-3 w-3 mr-1" />}
                    {uploading ? 'A carregar...' : 'Carregar foto'}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joinDate">Data de Inscrição</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => handleInputChange('joinDate', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados de Jiu-Jitsu */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Dados de Jiu-Jitsu</CardTitle>
              <CardDescription>Graduação, categoria e peso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="belt">Graduação</Label>
                  <select 
                    id="belt"
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.belt}
                    onChange={(e) => handleInputChange('belt', e.target.value)}
                  >
                    {getBeltOptionsForCategory(formData.category).map((belt) => (
                      <option key={belt.value} value={belt.value}>{belt.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <select 
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    <option value="Kids">Kids</option>
                    <option value="Juvenil">Juvenil</option>
                    <option value="Adulto">Adulto</option>
                    <option value="Master">Master</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso</Label>
                  <select 
                    id="weight"
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                  >
                    <option value="Galo">Galo</option>
                    <option value="Pena">Pena</option>
                    <option value="Pluma">Pluma</option>
                    <option value="Leve">Leve</option>
                    <option value="Médio">Médio</option>
                    <option value="Meio-pesado">Meio-pesado</option>
                    <option value="Pesado">Pesado</option>
                    <option value="Super-pesado">Super-pesado</option>
                    <option value="Pesadíssimo">Pesadíssimo</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo</Label>
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="">Nao definido</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conquistas */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Conquistas</CardTitle>
              <CardDescription>Adicionar ou remover conquistas do aluno</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newAchievement}
                    onChange={(e) => setNewAchievement(e.target.value)}
                    placeholder="Ex: Campeão Regional 2024"
                    className="bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAchievement()}
                  />
                  <Button onClick={handleAddAchievement} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {achievements.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {achievements.map((achievement, index) => (
                      <Badge key={index} variant="secondary" className="py-1.5 px-3 text-sm flex items-center gap-1">
                        {achievement}
                        <button onClick={() => handleRemoveAchievement(index)} className="ml-1 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Nenhuma conquista registada</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mensalidades */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-800">Mensalidades</CardTitle>
                  <CardDescription>Gerir estado de pagamento</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>
                        {year}{year === currentYear ? ' (atual)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {monthlyFees
                  .filter(fee => fee.id.startsWith(`${selectedYear}-`))
                  .map((fee) => {
                    const joinYYYYMM = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`;
                    const isBeforeJoin = fee.id < joinYYYYMM;
                    if (isBeforeJoin) {
                      return (
                        <div key={fee.id} className="p-3 rounded-lg text-left border border-dashed border-slate-200 bg-slate-50 opacity-40 cursor-not-allowed">
                          <p className="font-medium text-sm text-slate-400">{fee.month}</p>
                          <Badge variant="outline" className="mt-1 text-xs text-slate-400">Antes da inscrição</Badge>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={fee.id}
                        onClick={() => handleToggleFee(fee.id)}
                        className={`p-3 rounded-lg text-left transition-colors border ${
                          fee.paid
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : 'bg-red-50 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <p className="font-medium text-sm">{fee.month}</p>
                        <Badge variant={fee.paid ? 'default' : 'destructive'} className="mt-1 text-xs">
                          {fee.paid ? 'Pago' : 'Pendente'}
                        </Badge>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditStudentForm;
