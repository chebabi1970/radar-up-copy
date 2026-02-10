import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Mail, Bell, LogOut, Users, FolderOpen, FileText, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [searchUser, setSearchUser] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role !== 'admin') {
        window.location.href = '/';
      }
    }).catch(() => window.location.href = '/');
  }, []);

  // Fetch data
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
  });

  const { data: casos = [] } = useQuery({
    queryKey: ['casos'],
    queryFn: () => base44.entities.Caso.list(),
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['documentos'],
    queryFn: () => base44.entities.Documento.list(),
  });

  const { data: erros = [] } = useQuery({
    queryKey: ['erros'],
    queryFn: () => base44.entities.ReportErro.list(),
  });

  if (!user || user.role !== 'admin') {
    return <div className="p-6 text-center">Acesso restrito a administradores</div>;
  }

  const casosAtivos = casos.filter(c => c.status !== 'arquivado').length;
  const documentosPendentes = documentos.filter(d => d.status_analise === 'pendente').length;
  const errosPendentes = erros.filter(e => e.status === 'novo' || e.status === 'em_analise').length;

  const handleSendEmail = async () => {
    if (!emailData.to || !emailData.subject || !emailData.body) return;
    try {
      await base44.integrations.Core.SendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        from_name: 'RADAR UP Admin'
      });
      setShowEmailDialog(false);
      setEmailData({ to: '', subject: '', body: '' });
      alert('Email enviado com sucesso');
    } catch (e) {
      alert('Erro ao enviar email: ' + e.message);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Painel de Administração</h1>
              <p className="text-slate-600 mt-1">Bem-vindo, {user?.full_name}</p>
            </div>
            <div className="flex gap-3">
              <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar Email
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enviar Email</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Para</label>
                      <Input 
                        value={emailData.to} 
                        onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assunto</label>
                      <Input 
                        value={emailData.subject} 
                        onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mensagem</label>
                      <Textarea 
                        value={emailData.body} 
                        onChange={(e) => setEmailData({...emailData, body: e.target.value})}
                        rows={5}
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancelar</Button>
                      <Button onClick={handleSendEmail} className="bg-blue-600">Enviar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={handleLogout} variant="outline" gap="2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{users.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-slate-400" />
                  Total de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{clientes.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Casos Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{casosAtivos}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  Pendências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{documentosPendentes + errosPendentes}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList>
            <TabsTrigger value="usuarios">Usuários ({users.length})</TabsTrigger>
            <TabsTrigger value="clientes">Clientes ({clientes.length})</TabsTrigger>
            <TabsTrigger value="casos">Casos ({casos.length})</TabsTrigger>
            <TabsTrigger value="erros">Erros Reportados ({errosPendentes})</TabsTrigger>
          </TabsList>

          {/* Usuários */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Buscar por email ou nome..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Email</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Nome</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Papel</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Data Criação</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Último Acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-600">{u.email}</td>
                          <td className="py-3 px-3 text-slate-900">{u.full_name}</td>
                          <td className="py-3 px-3">
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{new Date(u.created_date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{u.updated_date ? new Date(u.updated_date).toLocaleDateString('pt-BR') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clientes */}
          <TabsContent value="clientes">
            <Card>
              <CardHeader>
                <CardTitle>Clientes ({clientes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Razão Social</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">CNPJ</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Modalidade</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Data Criação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map(c => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-900">{c.razao_social}</td>
                          <td className="py-3 px-3 text-slate-600">{c.cnpj}</td>
                          <td className="py-3 px-3">
                            <Badge>{c.modalidade_habilitacao}</Badge>
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{new Date(c.created_date).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Casos */}
          <TabsContent value="casos">
            <Card>
              <CardHeader>
                <CardTitle>Casos ({casos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Número</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Hipótese</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Status</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Data Criação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {casos.map(caso => (
                        <tr key={caso.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-900">{caso.numero_caso || caso.id.slice(0, 8)}</td>
                          <td className="py-3 px-3 text-slate-600">{caso.hipotese_revisao}</td>
                          <td className="py-3 px-3">
                            <Badge variant={caso.status === 'documentacao_completa' ? 'default' : 'secondary'}>
                              {caso.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{new Date(caso.created_date).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Erros */}
          <TabsContent value="erros">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios de Erro ({erros.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {erros.map(erro => (
                    <div key={erro.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{erro.titulo}</h3>
                          <p className="text-sm text-slate-600 mt-1">{erro.descricao}</p>
                          <div className="flex gap-2 mt-2 text-xs text-slate-500">
                            <span>Por: {erro.usuario_email}</span>
                            <span>•</span>
                            <span>{new Date(erro.created_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <Badge variant={erro.prioridade === 'critica' ? 'destructive' : 'secondary'}>
                          {erro.prioridade}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {erros.length === 0 && (
                    <p className="text-center text-slate-600 py-8">Nenhum erro reportado</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}