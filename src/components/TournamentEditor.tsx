import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, UserMinus, Trophy, Trash2 } from 'lucide-react';

const TournamentEditor = ({ tournament, students, onBack, onUpdateTournament, onDeleteTournament, onRemoveParticipant, getBeltColor }) => {
  const [editedTournament, setEditedTournament] = useState(tournament);
  const [showRankingForm, setShowRankingForm] = useState(tournament.status === 'Finalizado');
  const [rankings, setRankings] = useState(tournament.ranking || {});

  const participantStudents = students.filter((student) => editedTournament.participants.includes(student.id));

  const persistTournament = (nextTournament) => {
    onUpdateTournament({
      ...nextTournament,
      ranking: rankings,
    });
    onBack();
  };

  const handleSave = () => {
    persistTournament(editedTournament);
  };

  const handleRemoveParticipant = (studentId) => {
    const updatedParticipants = editedTournament.participants.filter((id) => id !== studentId);
    const nextRankings = { ...rankings };
    delete nextRankings[studentId];

    setEditedTournament({ ...editedTournament, participants: updatedParticipants });
    setRankings(nextRankings);
    onRemoveParticipant(tournament.id, studentId);
  };

  const handleFinalizeTournament = () => {
    persistTournament({
      ...editedTournament,
      status: 'Finalizado',
    });
  };

  const updateRanking = (studentId, position) => {
    if (!position) {
      const nextRankings = { ...rankings };
      delete nextRankings[studentId];
      setRankings(nextRankings);
      return;
    }

    setRankings({ ...rankings, [studentId]: parseInt(position, 10) });
  };

  const handleDeleteTournament = async () => {
    const shouldDelete = window.confirm(`Eliminar o torneio "${editedTournament.name}"? Esta ação remove também participantes e classificações.`);
    if (!shouldDelete) return;

    const deleted = await onDeleteTournament(editedTournament.id);
    if (deleted) onBack();
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
              <h1 className="text-3xl font-bold text-slate-800">Editar Torneio</h1>
              <p className="text-slate-600">{tournament.name}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
            <Button onClick={() => setShowRankingForm(!showRankingForm)} className="bg-green-600 hover:bg-green-700">
              <Trophy className="h-4 w-4 mr-2" />
              {editedTournament.status === 'Finalizado' ? 'Editar Classificação' : 'Classificação'}
            </Button>
            {editedTournament.status === 'Programado' && (
              <Button onClick={handleFinalizeTournament} className="bg-emerald-600 hover:bg-emerald-700">
                <Trophy className="h-4 w-4 mr-2" />
                Finalizar Torneio
              </Button>
            )}
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleDeleteTournament}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Detalhes do Torneio</CardTitle>
              <CardDescription>Editar informações básicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Torneio</Label>
                <Input id="name" value={editedTournament.name} onChange={(e) => setEditedTournament({ ...editedTournament, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={editedTournament.date} onChange={(e) => setEditedTournament({ ...editedTournament, date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="location">Local</Label>
                <Input id="location" value={editedTournament.location} onChange={(e) => setEditedTournament({ ...editedTournament, location: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  className="w-full p-2 border rounded-md"
                  value={editedTournament.category}
                  onChange={(e) => setEditedTournament({ ...editedTournament, category: e.target.value })}
                >
                  <option value="Gi">Gi</option>
                  <option value="No-Gi">No-Gi</option>
                  <option value="Misto">Misto</option>
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <Badge className={editedTournament.status === 'Programado' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                  {editedTournament.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Participantes ({participantStudents.length})</CardTitle>
              <CardDescription>Gerir inscrições dos alunos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {participantStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{student.name.split(' ').map((n) => n[0]).join('')}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{student.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={getBeltColor(student.belt)}>{student.belt}</Badge>
                          <span className="text-xs text-slate-600">{student.weight}</span>
                          {rankings[student.id] && <Badge className="bg-yellow-100 text-yellow-800">{rankings[student.id]}º</Badge>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRemoveParticipant(student.id)} className="text-red-600 hover:bg-red-50">
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {showRankingForm && (
          <Card className="mt-8 bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Classificação Final</CardTitle>
              <CardDescription>Atribuir posições aos participantes. A classificação fica guardada e aparece nos perfis dos alunos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {participantStudents.map((student) => (
                  <div key={student.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{student.name.split(' ').map((n) => n[0]).join('')}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{student.name}</h4>
                        <Badge className={getBeltColor(student.belt)}>{student.belt}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`ranking-${student.id}`} className="text-sm">Posição:</Label>
                      <Input
                        id={`ranking-${student.id}`}
                        type="number"
                        min="1"
                        max={participantStudents.length}
                        value={rankings[student.id] || ''}
                        onChange={(e) => updateRanking(student.id, e.target.value)}
                        className="w-16"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex space-x-4 mt-6">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Classificação
                </Button>
                {editedTournament.status === 'Programado' && (
                  <Button onClick={handleFinalizeTournament} className="bg-green-600 hover:bg-green-700">
                    <Trophy className="h-4 w-4 mr-2" />
                    Finalizar com Classificação
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowRankingForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TournamentEditor;
