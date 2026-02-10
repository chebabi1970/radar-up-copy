import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Mail, Bell, LogOut, Users, FolderOpen, FileText, AlertCircle, Download, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDateBrasilia, formatDateTimeBrasilia } from '@/components/utils/dateFormatter';
import { toast } from 'sonner';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [searchUser, setSearchUser] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', body: '' });
  const [usuariosEmailSelecionados, setUsuariosEmailSelecionados] = useState(new Set());
  const [buscaEmailUsers, setBuscaEmailUsers] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [sortUsuarios, setSortUsuarios] = useState({ field: 'created_date', direction: 'desc' });
  const [usuariosPagina, setUsuariosPagina] = useState(1);
  const usuariosPorPagina = 10;

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

  const { data: historicoEmails = [] } = useQuery({
    queryKey: ['historico-emails'],
    queryFn: () => base44.entities.HistoricoEmail.list('-created_date', 100),
  });

  if (!user || user.role !== 'admin') {
    return <div className="p-6 text-center">Acesso restrito a administradores</div>;
  }

  const casosAtivos = casos.filter(c => c.status !== 'arquivado').length;
  const documentosPendentes = documentos.filter(d => d.status_analise === 'pendente').length;
  const errosPendentes = erros.filter(e => e.status === 'novo' || e.status === 'em_analise').length;

  const handleSendEmails = async () => {
    if (!emailData.subject.trim() || !emailData.body.trim()) {
      toast.error('Preencha o assunto e a mensagem');
      return;
    }
    if (usuariosEmailSelecionados.size === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    setSendingEmail(true);
    const usuariosParaEnviar = users.filter(u => usuariosEmailSelecionados.has(u.id));
    let sent = 0;
    let failed = 0;
    const sentEmails = [];

    for (const u of usuariosParaEnviar) {
      if (!u?.email?.trim()) {
        failed++;
        continue;
      }
      try {
        await base44.integrations.Core.SendEmail({
          to: u.email,
          subject: emailData.subject,
          body: emailData.body + '\n\n---',
          from_name: 'RADAR UP Admin'
        });
        sentEmails.push(u.email);
        sent++;
      } catch (error) {
        console.error(`Erro ao enviar para ${u.email}:`, error);
        failed++;
      }
    }

    if (sent > 0) {
      try {
        console.warn(`[AUDIT] Admin ${user?.email} enviou email a ${sent} usuários em ${new Date().toISOString()}`);
        await base44.entities.HistoricoEmail.create({
          assunto: emailData.subject,
          resumo: emailData.body.substring(0, 200) + (emailData.body.length > 200 ? '...' : ''),
          usuarios_recebidos: sentEmails,
          total_enviados: sent,
          data_envio: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro ao registrar histórico:', error);
      }
    }

    setSendingEmail(false);
    toast.success(`Emails enviados: ${sent}/${usuariosParaEnviar.length}`);
    if (failed > 0) {
      toast.error(`Falharam: ${failed}`);
    }
    setShowEmailDialog(false);
    setEmailData({ subject: '', body: '' });
    setUsuariosEmailSelecionados(new Set());
    setBuscaEmailUsers('');
  };

  const handleDeleteUsuario = async (id, email) => {
    try {
      await base44.entities.User.delete(id);
      toast.success(`Usuário ${email} deletado`);
      setShowDeleteDialog(null);
    } catch (error) {
      console.error('Delete usuario error:', error);
      toast.error('Erro ao deletar usuário');
    }
  };

  const handleExportEmails = () => {
    try {
      const usuariosFiltrados = users.filter(u => u.email.toLowerCase().includes(searchUser.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(searchUser.toLowerCase())));
      const csv = usuariosFiltrados.map(u => `${u.full_name || ''};${u.email}`).join('\n');
      const cabecalho = 'Nome;Email\n';
      const blob = new Blob([cabecalho + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `emails_usuarios_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar emails');
    }
  };

  const ordenarUsuarios = (field) => {
    let direction = 'asc';
    if (sortUsuarios.field === field && sortUsuarios.direction === 'asc') {
      direction = 'desc';
    }
    setSortUsuarios({ field, direction });
    setUsuariosPagina(1);
  };

  const usuariosFiltradosOrdenados = users
    .filter(u => u.email.toLowerCase().includes(searchUser.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(searchUser.toLowerCase())))
    .sort((a, b) => {
      let aVal, bVal;
      
      if (sortUsuarios.field === 'email') {
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
      } else if (sortUsuarios.field === 'full_name') {
        aVal = (a.full_name || '').toLowerCase();
        bVal = (b.full_name || '').toLowerCase();
      } else if (sortUsuarios.field === 'role') {
        aVal = a.role;
        bVal = b.role;
      } else if (sortUsuarios.field === 'created_date') {
        aVal = new Date(a.created_date);
        bVal = new Date(b.created_date);
      } else if (sortUsuarios.field === 'updated_date') {
        aVal = new Date(a.updated_date);
        bVal = new Date(b.updated_date);
      }

      if (aVal < bVal) return sortUsuarios.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortUsuarios.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleLogout = () => {
    base44.auth.logout();
  };



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
              <Button 
                onClick={() => setShowEmailDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Mail className="h-4 w-4" />
                Enviar Email em Massa
              </Button>
              <Button onClick={handleLogout} variant="outline" className="gap-2">
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
            <TabsTrigger value="historico">Histórico de Emails ({historicoEmails.length})</TabsTrigger>
            </TabsList>

          {/* Usuários */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Usuários ({users.length})</CardTitle>
                <Button
                  onClick={handleExportEmails}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar Emails
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Buscar por email ou nome..."
                  value={searchUser}
                  onChange={(e) => {
                    setSearchUser(e.target.value);
                    setUsuariosPagina(1);
                  }}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => ordenarUsuarios('email')}>
                          Email {sortUsuarios.field === 'email' && (sortUsuarios.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => ordenarUsuarios('full_name')}>
                          Nome {sortUsuarios.field === 'full_name' && (sortUsuarios.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => ordenarUsuarios('role')}>
                          Papel {sortUsuarios.field === 'role' && (sortUsuarios.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => ordenarUsuarios('created_date')}>
                          Data Criação {sortUsuarios.field === 'created_date' && (sortUsuarios.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100" onClick={() => ordenarUsuarios('updated_date')}>
                          Último Acesso {sortUsuarios.field === 'updated_date' && (sortUsuarios.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltradosOrdenados
                        .slice((usuariosPagina - 1) * usuariosPorPagina, usuariosPagina * usuariosPorPagina)
                        .map(u => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 font-medium text-slate-900">{u.email}</td>
                          <td className="py-3 px-3 text-slate-700">{u.full_name || '-'}</td>
                          <td className="py-3 px-3">
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{formatDateBrasilia(u.created_date)}</td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{formatDateTimeBrasilia(u.updated_date)}</td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => setShowDeleteDialog({ type: 'usuario', id: u.id, email: u.email })}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    {searchUser && `Encontrados ${usuariosFiltradosOrdenados.length} de ${users.length}`}
                    {!searchUser && `Mostrando ${Math.min((usuariosPagina - 1) * usuariosPorPagina + 1, users.length)} a ${Math.min(usuariosPagina * usuariosPorPagina, users.length)} de ${users.length}`}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsuariosPagina(p => Math.max(1, p - 1))}
                      disabled={usuariosPagina === 1}
                    >
                      Anterior
                    </Button>
                    <span className="px-3 py-2 text-sm font-medium">
                      {usuariosPagina} / {Math.ceil(usuariosFiltradosOrdenados.length / usuariosPorPagina) || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsuariosPagina(p => p + 1)}
                      disabled={usuariosPagina >= Math.ceil(usuariosFiltradosOrdenados.length / usuariosPorPagina)}
                    >
                      Próximo
                    </Button>
                  </div>
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

          {/* Histórico de Emails */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Emails ({historicoEmails.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-slate-600">Assunto</th>
                        <th className="text-left py-3 px-4 text-slate-600">Resumo</th>
                        <th className="text-left py-3 px-4 text-slate-600">Data/Hora</th>
                        <th className="text-left py-3 px-4 text-slate-600">Total Enviados</th>
                        <th className="text-left py-3 px-4 text-slate-600">Destinatários</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicoEmails.map(h => (
                        <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">{h.assunto}</td>
                          <td className="py-3 px-4 text-slate-700 max-w-sm truncate">{h.resumo}</td>
                          <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                            {formatDateTimeBrasilia(h.data_envio)}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-semibold">{h.total_enviados}</td>
                          <td className="py-3 px-4 text-slate-600 text-xs max-w-xs">
                            <span title={h.usuarios_recebidos.join(', ')}>
                              {h.usuarios_recebidos.slice(0, 2).join(', ')}
                              {h.usuarios_recebidos.length > 2 && ` +${h.usuarios_recebidos.length - 2}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {historicoEmails.length === 0 && (
                    <p className="text-center text-slate-600 py-8">Nenhum email enviado</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Dialog */}
        <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                {showDeleteDialog?.type === 'usuario' 
                  ? `Tem certeza que deseja deletar o usuário ${showDeleteDialog.email}? Esta ação não pode ser desfeita.`
                  : 'Tem certeza que deseja deletar? Esta ação não pode ser desfeita.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (showDeleteDialog.type === 'usuario') {
                    handleDeleteUsuario(showDeleteDialog.id, showDeleteDialog.email);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Email Modal */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enviar Email aos Usuários</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Seleção de Usuários */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Selecionar Usuários</label>
                  <button
                    onClick={() => {
                      const usuariosFiltrados = users.filter(u => u.email.toLowerCase().includes(buscaEmailUsers.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(buscaEmailUsers.toLowerCase())));
                      if (usuariosFiltrados.every(u => usuariosEmailSelecionados.has(u.id))) {
                        const newSet = new Set(usuariosEmailSelecionados);
                        usuariosFiltrados.forEach(u => newSet.delete(u.id));
                        setUsuariosEmailSelecionados(newSet);
                      } else {
                        const newSet = new Set(usuariosEmailSelecionados);
                        usuariosFiltrados.forEach(u => newSet.add(u.id));
                        setUsuariosEmailSelecionados(newSet);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    {users.filter(u => u.email.toLowerCase().includes(buscaEmailUsers.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(buscaEmailUsers.toLowerCase()))).every(u => usuariosEmailSelecionados.has(u.id)) ? 'Desselecionar filtrados' : 'Selecionar filtrados'}
                  </button>
                </div>
                <Input
                  placeholder="Buscar por email ou nome..."
                  value={buscaEmailUsers}
                  onChange={(e) => setBuscaEmailUsers(e.target.value)}
                  disabled={sendingEmail}
                  className="mb-3"
                />
                <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50">
                  {users.filter(u => u.email.toLowerCase().includes(buscaEmailUsers.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(buscaEmailUsers.toLowerCase()))).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhum usuário encontrado</p>
                  ) : (
                    users.filter(u => u.email.toLowerCase().includes(buscaEmailUsers.toLowerCase()) || (u.full_name && u.full_name.toLowerCase().includes(buscaEmailUsers.toLowerCase()))).map(u => (
                      <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usuariosEmailSelecionados.has(u.id)}
                          onChange={(e) => {
                            const newSet = new Set(usuariosEmailSelecionados);
                            if (e.target.checked) {
                              newSet.add(u.id);
                            } else {
                              newSet.delete(u.id);
                            }
                            setUsuariosEmailSelecionados(newSet);
                          }}
                          disabled={sendingEmail}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{u.full_name || u.email}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Assunto</label>
                <Input
                  placeholder="Ex: Novas Funcionalidades Disponíveis"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  disabled={sendingEmail}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Mensagem</label>
                <Textarea
                  placeholder="Digite a mensagem do email..."
                  value={emailData.body}
                  onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                  disabled={sendingEmail}
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
                disabled={sendingEmail}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={sendingEmail || usuariosEmailSelecionados.size === 0}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar para {usuariosEmailSelecionados.size}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}