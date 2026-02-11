import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedFileUpload from './AdvancedFileUpload';
import QuickFileUpload from './QuickFileUpload';
import FilePreviewModal from './FilePreviewModal';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export default function DemoUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleAdvancedUpload = (uploadData) => {
    setUploadedFiles(prev => [...prev, uploadData]);
  };

  const handleQuickUpload = (uploadData) => {
    setUploadedFiles(prev => [...prev, uploadData]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sistema de Upload Avançado</h1>
          <p className="text-slate-600 mt-2">Demonstração dos componentes de upload com validação e preview</p>
        </div>

        <Tabs defaultValue="advanced" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="advanced">Upload Completo</TabsTrigger>
            <TabsTrigger value="quick">Upload Rápido</TabsTrigger>
          </TabsList>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload com Drag-and-Drop e Preview</CardTitle>
                <CardDescription>
                  Arraste arquivos, visualize previews e acompanhe o progresso do upload
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdvancedFileUpload
                  onUploadComplete={handleAdvancedUpload}
                  maxSizeMB={10}
                  allowedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']}
                  multiple={true}
                  privateStorage={false}
                  label="Documentos"
                  description="Arraste PDFs ou imagens aqui ou clique para selecionar"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Rápido (Botão Simples)</CardTitle>
                <CardDescription>
                  Componente leve para upload simples com validação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuickFileUpload
                  onUploadComplete={handleQuickUpload}
                  maxSizeMB={10}
                  allowedTypes={['application/pdf', 'image/jpeg', 'image/png']}
                  privateStorage={false}
                  buttonText="Selecionar Arquivo"
                  buttonVariant="default"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Arquivos Enviados ({uploadedFiles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uploadedFiles.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.isPrivate ? 'Privado' : 'Público'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPreviewFile(item);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview Modal */}
      <FilePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        file={previewFile?.file}
        fileName={previewFile?.file?.name}
      />
    </div>
  );
}