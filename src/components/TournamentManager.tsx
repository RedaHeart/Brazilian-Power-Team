
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trophy, Calendar, MapPin, Users, Edit, Trash2 } from 'lucide-react';

const TournamentManager = ({ tournaments, students, onBack, onCreateTournament, onEditTournament, onDeleteTournament, getBeltColor }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournament, setNewTournament] = useState({
    name: '',
    date: '',
    location: '',
    category: 'Gi',
    participants: []
  });

  const handleCreateTournament = () => {
    console.log('Novo torneio criado:', newTournament);
    onCreateTournament(newTournament);
    setShowCreateForm(false);
    setNewTournament({
      name: '',
      date: '',
      location: '',
      category: 'Gi',
      participants: []
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Programado':
        return 'bg-blue-100 text-blue-800';
      case 'Finalizado':
        return 'bg-green-100 text-green-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (tournament) => {
    const shouldDelete = window.confirm(`Eliminar o torneio "${tournament.name}"? Esta ação remove também participantes e classificações.`);
    if (!shouldDelete) return;
    await onDeleteTournament(tournament.id);
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
              <h1 className="text-3xl font-bold text-slate-800">Gestão de Torneios</h1>
              <p className="text-slate-600">Criar e gerir competições</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Torneio
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-slate-800">Criar Novo Torneio</CardTitle>
              <CardDescription>Preencha as informações do torneio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Torneio</Label>
                    <Input
                      id="name"
                      value={newTournament.name}
                      onChange={(e) => setNewTournament({...newTournament, name: e.target.value})}
                      placeholder="Ex: Campeonato Regional 2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newTournament.date}
                      onChange={(e) => setNewTournament({...newTournament, date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="location">Local</Label>
                    <Input
                      id="location"
                      value={newTournament.location}
                      onChange={(e) => setNewTournament({...newTournament, location: e.target.value})}
                      placeholder="Ex: São Paulo, SP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <select 
                      id="category"
                      className="w-full p-2 border rounded-md"
                      value={newTournament.category}
                      onChange={(e) => setNewTournament({...newTournament, category: e.target.value})}
                    >
                      <option value="Gi">Gi</option>
                      <option value="No-Gi">No-Gi</option>
                      <option value="Misto">Misto</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex space-x-4 mt-6">
                <Button onClick={handleCreateTournament} className="bg-green-600 hover:bg-green-700">
                  Criar Torneio
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tournament List */}
        <div className="grid gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Trophy className="h-6 w-6 text-yellow-600" />
                      <h3 className="text-xl font-semibold text-slate-800">{tournament.name}</h3>
                      <Badge className={getStatusColor(tournament.status)}>
                        {tournament.status}
                      </Badge>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-600">{tournament.date}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-600">{tournament.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-600">{tournament.participants.length} participantes</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <Badge variant="secondary" className="mr-2">
                        {tournament.category}
                      </Badge>
                    </div>

                    {/* Participants */}
                    <div>
                      <h4 className="font-medium text-slate-700 mb-2">Participantes:</h4>
                      <div className="flex flex-wrap gap-2">
                        {tournament.participants.map(participantId => {
                          const participant = students.find(s => s.id === participantId);
                          return participant ? (
                            <div key={participant.id} className="flex items-center space-x-2 bg-slate-100 rounded-full px-3 py-1">
                              <span className="text-sm text-slate-700">{participant.name}</span>
                              <Badge className={getBeltColor(participant.belt)}>
                                {participant.belt}
                              </Badge>
                              {tournament.ranking && tournament.ranking[participant.id] && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  {tournament.ranking[participant.id]}º
                                </Badge>
                              )}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="hover:bg-blue-50"
                      onClick={() => onEditTournament(tournament)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" className="hover:bg-green-50" onClick={() => onEditTournament(tournament)}>
                      Resultados
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(tournament)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tournaments.length === 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">Nenhum torneio criado</h3>
              <p className="text-slate-500 mb-6">Comece criando o primeiro torneio da academia</p>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Torneio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TournamentManager;
