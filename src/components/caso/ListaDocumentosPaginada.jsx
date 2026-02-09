import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { FileText, Eye, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const ITEMS_PER_PAGE = 5;

export default function ListaDocumentosPaginada({ documentos = [], onSelectDoc, onViewDoc }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Tipos únicos de documentos
  const tiposUnicos = useMemo(() => {
    return ['todos', ...new Set(documentos.map(d => d.tipo_documento))].filter(Boolean);
  }, [documentos]);

  // Filtrar documentos
  const documentosFiltrados = useMemo(() => {
    return documentos.filter(doc => {
      const matchSearch = doc.nome_arquivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.tipo_documento?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'todos' || doc.tipo_documento === filterType;
      return matchSearch && matchType;
    });
  }, [documentos, searchTerm, filterType]);

  // Paginação
  const totalPages = Math.ceil(documentosFiltrados.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const documentosPagina = documentosFiltrados.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const statusLabel = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    reprovado: 'Reprovado',
    com_ressalvas: 'Com Ressalvas'
  };

  const statusColor = {
    pendente: 'bg-yellow-50 border-yellow-200',
    aprovado: 'bg-green-50 border-green-200',
    reprovado: 'bg-red-50 border-red-200',
    com_ressalvas: 'bg-blue-50 border-blue-200'
  };

  const statusBadgeColor = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aprovado: 'bg-green-100 text-green-800',
    reprovado: 'bg-red-100 text-red-800',
    com_ressalvas: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou tipo..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => {
          setFilterType(v);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar tipo" />
          </SelectTrigger>
          <SelectContent>
            {tiposUnicos.map(tipo => (
              <SelectItem key={tipo} value={tipo}>
                {tipo === 'todos' ? 'Todos os Tipos' : tipo.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Info de resultados */}
      <p className="text-xs text-slate-500">
        Mostrando {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PAGE, documentosFiltrados.length)} de {documentosFiltrados.length} documentos
      </p>

      {/* Lista de documentos */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {documentosPagina.length > 0 ? (
          documentosPagina.map(doc => (
            <Card
              key={doc.id}
              className={`p-3 border-2 cursor-pointer transition-all ${statusColor[doc.status_analise] || 'bg-slate-50'}`}
              onClick={() => onSelectDoc(doc)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {doc.nome_arquivo}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {doc.tipo_documento?.replace(/_/g, ' ')}
                    </p>
                    {doc.data_documento && (
                      <p className="text-xs text-slate-500">
                        Data: {new Date(doc.data_documento).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${statusBadgeColor[doc.status_analise] || 'bg-slate-100 text-slate-800'}`}>
                    {statusLabel[doc.status_analise] || 'Desconhecido'}
                  </span>
                  {doc.file_url || doc.file_uri && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDoc(doc);
                      }}
                      title="Visualizar documento"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="p-6 text-center">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum documento encontrado</p>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-slate-600">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}