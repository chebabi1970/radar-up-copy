import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckSquare, Eye } from 'lucide-react';
import SmartUpload from '@/components/upload/SmartUpload';
import ChecklistDocumentos from '@/components/caso/ChecklistDocumentos';
import DocumentosTab from '@/components/caso/DocumentosTab';

/**
 * Componente consolidado que une Upload, Checklist e Visualizador de Documentos
 * em uma única interface intuitiva
 */
export default function DocumentosConsolidado({ caso, documentos, onDocumentosChange }) {
  const [visualizadorAberto, setVisualizadorAberto] = useState(false);

  return (
    <div className="space-y-6">
      {/* Seção de Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SmartUpload 
            casoId={caso?.id}
            onUploadComplete={onDocumentosChange}
          />
        </CardContent>
      </Card>

      {/* Seção de Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-green-600" />
            Checklist de Documentos
            <Badge variant="outline" className="ml-auto">
              {documentos?.length || 0} enviados
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistDocumentos 
            hipotese={caso?.hipotese_revisao || 'I'}
            documentos={documentos}
          />
        </CardContent>
      </Card>

      {/* Seção de Visualizador */}
      {documentos && documentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Documentos Enviados
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setVisualizadorAberto(!visualizadorAberto)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {visualizadorAberto ? 'Ocultar' : 'Visualizar'}
              </Button>
            </CardTitle>
          </CardHeader>
          {visualizadorAberto && (
            <CardContent>
              <DocumentosTab 
                caso={caso}
                documentos={documentos}
              />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
