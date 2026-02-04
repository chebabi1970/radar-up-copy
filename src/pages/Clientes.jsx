import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  Edit,
  FolderOpen,
  Loader2,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const modalidadeColors = {
  limitada: "bg-blue-100 text-blue-800",
  ilimitada: "bg-purple-100 text-purple-800",
  analise_regularizacao: "bg-amber-100 text-amber-800"
};

export default function Clientes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    nome_fantasia: '',
    email: '',
    telefone: '',
    responsavel: '',
    endereco: '',
    modalidade_habilitacao: '',
    limite_atual: '',
    observacoes: ''
  });

  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date')
  });

  const { data: casos = [] } = useQuery({
    queryKey: ['casos'],
    queryFn: () => base44.entities.Caso.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    }
  });

  const resetForm = () => {
    setFormData({
      razao_social: '',
      cnpj: '',
      nome_fantasia: '',
      email: '',
      telefone: '',
      responsavel: '',
      endereco: '',
      modalidade_habilitacao: '',
      limite_atual: '',
      observacoes: ''
    });
    setEditingCliente(null);
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      razao_social: cliente.razao_social || '',
      cnpj: cliente.cnpj || '',
      nome_fantasia: cliente.nome_fantasia || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      responsavel: cliente.responsavel || '',
      endereco: cliente.endereco || '',
      modalidade_habilitacao: cliente.modalidade_habilitacao || '',
      limite_atual: cliente.limite_atual || '',
      observacoes: cliente.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      limite_atual: formData.limite_atual ? parseFloat(formData.limite_atual) : null
    };
    
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCNPJ = (cnpj) => {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const getCasosCount = (clienteId) => {
    return casos.filter(c => c.cliente_id === clienteId).length;
  };

  const filteredClientes = clientes.filter(c => 
    c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) ||
    c.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clientes</h1>
            <p className="text-slate-500 mt-1">Gerencie seus clientes declarantes de mercadorias</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                <Plus className="h-4 w-4 mr-2" /> Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="razao_social">Razão Social *</Label>
                    <Input
                      id="razao_social"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="responsavel">Responsável</Label>
                    <Input
                      id="responsavel"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="modalidade_habilitacao">Modalidade de Habilitação</Label>
                    <Select
                      value={formData.modalidade_habilitacao}
                      onValueChange={(value) => setFormData({...formData, modalidade_habilitacao: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="limitada">Limitada (até USD 150.000,00)</SelectItem>
                        <SelectItem value="ilimitada">Ilimitada</SelectItem>
                        <SelectItem value="analise_regularizacao">Análise de Regularização</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="limite_atual">Limite Atual (USD)</Label>
                    <Input
                      id="limite_atual"
                      type="number"
                      value={formData.limite_atual}
                      onChange={(e) => setFormData({...formData, limite_atual: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingCliente ? 'Salvar' : 'Criar Cliente'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por razão social, CNPJ ou nome fantasia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Casos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{cliente.razao_social}</p>
                            {cliente.nome_fantasia && (
                              <p className="text-sm text-slate-500">{cliente.nome_fantasia}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatCNPJ(cliente.cnpj)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {cliente.email && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Mail className="h-3 w-3" /> {cliente.email}
                              </div>
                            )}
                            {cliente.telefone && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Phone className="h-3 w-3" /> {cliente.telefone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cliente.modalidade_habilitacao && (
                            <Badge className={modalidadeColors[cliente.modalidade_habilitacao]}>
                              {cliente.modalidade_habilitacao === 'analise_regularizacao' 
                                ? 'Análise de Regularização'
                                : cliente.modalidade_habilitacao.charAt(0).toUpperCase() + cliente.modalidade_habilitacao.slice(1)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {getCasosCount(cliente.id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(cliente)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Link to={createPageUrl(`Casos?cliente=${cliente.id}`)}>
                              <Button variant="ghost" size="sm">
                                <FolderOpen className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Deseja realmente excluir o cliente ${cliente.razao_social}?`)) {
                                  deleteMutation.mutate(cliente.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}