import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
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
  Edit,
  FolderOpen,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { validarCNPJ, mascararCNPJ, limparCNPJ } from '@/components/utils/cnpjValidator';

const modalidadeColors = {
  limitada: "bg-blue-100 text-blue-800",
  ilimitada: "bg-purple-100 text-purple-800",
  analise_regularizacao: "bg-amber-100 text-amber-800"
};

export default function Clientes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCliente, setEditingCliente] = useState(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjErro, setCnpjErro] = useState('');
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
    observacoes: '',
    procuracao_eletronica: false,
    data_procuracao_eletronica: '',
    data_abertura_empresa: '',
    optante_simples_nacional: false,
    capital_social: '',
    qsa: '',
    cep: ''
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
    mutationFn: async (data) => {
      // Validar CNPJ duplicado
      const cnpjLimpo = data.cnpj.replace(/\D/g, '');
      const existente = clientes.find(c => c.cnpj.replace(/\D/g, '') === cnpjLimpo);
      if (existente) {
        throw new Error('CNPJ já cadastrado no sistema');
      }
      return base44.entities.Cliente.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert('Erro: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Validar CNPJ duplicado (exceto o próprio cliente)
      const cnpjLimpo = data.cnpj.replace(/\D/g, '');
      const existente = clientes.find(c => c.id !== id && c.cnpj.replace(/\D/g, '') === cnpjLimpo);
      if (existente) {
        throw new Error('CNPJ já cadastrado para outro cliente');
      }
      return base44.entities.Cliente.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert('Erro: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Verificar se há casos ativos vinculados ao cliente
      const casosDoCliente = casos.filter(c => c.cliente_id === id);
      const casosAtivos = casosDoCliente.filter(c => 
        !['arquivado', 'deferido', 'indeferido'].includes(c.status)
      );
      
      if (casosAtivos.length > 0) {
        throw new Error(`Cliente possui ${casosAtivos.length} caso(s) ativo(s). Arquive ou conclua os casos antes de excluir.`);
      }
      
      return base44.entities.Cliente.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error) => {
      alert('Erro: ' + error.message);
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
      observacoes: '',
      procuracao_eletronica: false,
      data_procuracao_eletronica: '',
      data_abertura_empresa: '',
      optante_simples_nacional: false,
      capital_social: '',
      qsa: '',
      cep: ''
    });
    setEditingCliente(null);
    setCnpjErro('');
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setCnpjErro('');
    setFormData({
      razao_social: cliente.razao_social || '',
      cnpj: mascararCNPJ(cliente.cnpj || ''),
      nome_fantasia: cliente.nome_fantasia || '',
      email: cliente.email || '',
      telefone: cliente.telefone || '',
      responsavel: cliente.responsavel || '',
      endereco: cliente.endereco || '',
      modalidade_habilitacao: cliente.modalidade_habilitacao || '',
      limite_atual: cliente.limite_atual || '',
      observacoes: cliente.observacoes || '',
      procuracao_eletronica: cliente.procuracao_eletronica || false,
      data_procuracao_eletronica: cliente.data_procuracao_eletronica || '',
      data_abertura_empresa: cliente.data_abertura_empresa || '',
      optante_simples_nacional: cliente.optante_simples_nacional || false,
      capital_social: cliente.capital_social || '',
      qsa: cliente.qsa || '',
      cep: cliente.cep || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar CNPJ antes de enviar
    const resultadoCNPJ = validarCNPJ(formData.cnpj);
    if (!resultadoCNPJ.valido) {
      setCnpjErro(resultadoCNPJ.erro);
      return;
    }

    const data = {
      ...formData,
      cnpj: limparCNPJ(formData.cnpj),
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

  const handleCepChange = async (cepValue) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          const endereco = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}`;
          setFormData(prev => ({...prev, endereco}));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm) ||
    c.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Clientes</h1>
            </div>
            <p className="text-sm text-slate-600 ml-10">Administre sua carteira de clientes</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Novo Cliente</span><span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
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
                      onChange={(e) => {
                        const mascarado = mascararCNPJ(e.target.value);
                        setFormData({...formData, cnpj: mascarado});
                        const limpo = limparCNPJ(mascarado);
                        if (limpo.length === 14) {
                          const resultado = validarCNPJ(limpo);
                          setCnpjErro(resultado.valido ? '' : resultado.erro);
                        } else if (limpo.length > 0) {
                          setCnpjErro('');
                        }
                      }}
                      placeholder="00.000.000/0000-00"
                      required
                      className={cnpjErro ? 'border-red-300 focus:ring-red-200' : limparCNPJ(formData.cnpj).length === 14 && !cnpjErro ? 'border-emerald-300 focus:ring-emerald-200' : ''}
                    />
                    {cnpjErro && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> {cnpjErro}
                      </p>
                    )}
                    {!cnpjErro && limparCNPJ(formData.cnpj).length === 14 && (
                      <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> CNPJ válido
                      </p>
                    )}
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
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      required
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
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const cleanCep = value.replace(/\D/g, '').slice(0, 8);
                        const formattedCep = cleanCep.length > 5 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : cleanCep;
                        setFormData({...formData, cep: formattedCep});
                        handleCepChange(cleanCep);
                      }}
                      placeholder="00000-000"
                    />
                    {cepLoading && (
                      <p className="text-xs text-slate-500 mt-1">Buscando endereço...</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="endereco">Endereço *</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                      placeholder="Rua, número, complemento, cidade, estado"
                      required
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

                  <div className="md:col-span-2 space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-900 font-medium mb-1">⚠️ Procuração Eletrônica e-CAC</p>
                      <p className="text-xs text-amber-800">
                        Obrigatória para protocolar documentos junto à RFB pelo e-CAC. 
                        Sem procuração eletrônica, não é possível realizar o protocolo oficial do requerimento.
                      </p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={formData.procuracao_eletronica || false}
                        onChange={(e) => setFormData({...formData, procuracao_eletronica: e.target.checked})}
                        className="mt-1 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-900 block">
                          Cliente concedeu procuração eletrônica para acesso ao e-CAC RFB
                        </span>
                        <span className="text-xs text-slate-500">
                          Necessário para protocolar junto à Receita Federal
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                     <input
                       type="checkbox"
                       checked={formData.optante_simples_nacional || false}
                       onChange={(e) => setFormData({...formData, optante_simples_nacional: e.target.checked})}
                       className="mt-1 rounded"
                     />
                     <div>
                       <span className="text-sm font-medium text-slate-900 block">
                         Optante do Simples Nacional
                       </span>
                       <span className="text-xs text-slate-500">
                         A empresa é optante do Simples Nacional
                       </span>
                     </div>
                    </label>
                    </div>

                    <div>
                    <Label htmlFor="data_abertura_empresa">Data de Abertura da Empresa</Label>
                    <Input
                     id="data_abertura_empresa"
                     type="date"
                     value={formData.data_abertura_empresa}
                     onChange={(e) => setFormData({...formData, data_abertura_empresa: e.target.value})}
                    />
                    {formData.data_abertura_empresa && (
                      <p className="text-xs text-slate-500 mt-1">
                        {(() => {
                          const dataAbertura = new Date(formData.data_abertura_empresa);
                          const hoje = new Date();
                          const meses = Math.floor((hoje.getFullYear() - dataAbertura.getFullYear()) * 12 + (hoje.getMonth() - dataAbertura.getMonth()));
                          return `${meses} mês${meses !== 1 ? 'es' : ''} completo${meses !== 1 ? 's' : ''}`;
                        })()}
                      </p>
                    )}
                    </div>

                    <div>
                    <Label htmlFor="capital_social">Capital Social (R$)</Label>
                    <Input
                      id="capital_social"
                      type="number"
                      value={formData.capital_social}
                      onChange={(e) => setFormData({...formData, capital_social: e.target.value})}
                      placeholder="0.00"
                    />
                    </div>

                    <div className="md:col-span-2">
                    <Label htmlFor="qsa">QSA - Quadro de Sócios e Administradores</Label>
                    <Textarea
                      id="qsa"
                      value={formData.qsa}
                      onChange={(e) => setFormData({...formData, qsa: e.target.value})}
                      placeholder="Nomes e dados dos sócios e administradores"
                      rows={4}
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
        <Card className="border border-slate-100 shadow-md mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente por razão social, CNPJ ou fantasia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border border-slate-100 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 sm:p-8 text-center">
                <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin mx-auto text-blue-600" />
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-slate-500">
                <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-slate-300" />
                <p className="text-sm sm:text-base">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                   <TableHeader>
                     <TableRow className="bg-gradient-to-r from-slate-50 to-green-50/30 border-b-2 border-slate-200">
                       <TableHead className="text-sm font-semibold text-slate-700">Cliente</TableHead>
                       <TableHead className="text-sm font-semibold text-slate-700 hidden sm:table-cell">CNPJ</TableHead>
                       <TableHead className="text-sm font-semibold text-slate-700 hidden md:table-cell">Contato</TableHead>
                       <TableHead className="text-sm font-semibold text-slate-700">Modalidade</TableHead>
                       <TableHead className="text-sm font-semibold text-slate-700 hidden lg:table-cell">Procuração</TableHead>
                       <TableHead className="text-sm font-semibold text-slate-700">Casos</TableHead>
                       <TableHead className="text-right text-sm font-semibold text-slate-700">Ações</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredClientes.map((cliente) => (
                       <TableRow key={cliente.id} className="hover:bg-green-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="text-sm py-4">
                          <div className="group">
                            <p className="font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">{cliente.razao_social}</p>
                            {cliente.nome_fantasia && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{cliente.nome_fantasia}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm hidden sm:table-cell">
                          {formatCNPJ(cliente.cnpj)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                          <div className="space-y-1">
                            {cliente.email && (
                              <div className="flex items-center gap-1 text-xs text-slate-600 truncate">
                                <Mail className="h-3 w-3 flex-shrink-0" /> {cliente.email}
                              </div>
                            )}
                            {cliente.telefone && (
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <Phone className="h-3 w-3 flex-shrink-0" /> {cliente.telefone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {cliente.modalidade_habilitacao && (
                            <Badge className={`${modalidadeColors[cliente.modalidade_habilitacao]} text-xs`}>
                              {cliente.modalidade_habilitacao === 'analise_regularizacao' 
                                ? 'Regulariz.'
                                : cliente.modalidade_habilitacao.charAt(0).toUpperCase() + cliente.modalidade_habilitacao.slice(1)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {cliente.procuracao_eletronica ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">✓ Ativa</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">✗ Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {getCasosCount(cliente.id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(cliente)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Link to={createPageUrl(`DetalheCliente?clienteId=${cliente.id}`)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Ver detalhes">
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
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Deletar"
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