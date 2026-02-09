import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ZoomIn, ZoomOut, RotateCw, Download, X } from 'lucide-react';

export default function VisualizadorDocumentoAvancado({ fileUrl, fileUri, fileName, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [signedUrl, setSignedUrl] = useState(fileUrl);
  const [loading, setLoading] = useState(!!fileUri && !fileUrl);

  // Carregar signed URL se for file_uri
  React.useEffect(() => {
    if (fileUri && !fileUrl) {
      import('@/api/base44Client').then(({ base44 }) => {
        base44.integrations.Core.CreateFileSignedUrl({
          file_uri: fileUri,
          expires_in: 3600
        }).then(result => {
          setSignedUrl(result.signed_url);
          setLoading(false);
        });
      });
    }
  }, [fileUri, fileUrl]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const isPDF = signedUrl && typeof signedUrl === 'string' && signedUrl.toLowerCase?.().endsWith('.pdf');
  const isImage = signedUrl && typeof signedUrl === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(String(signedUrl).toLowerCase());

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
      <Card className="w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900">{fileName}</h3>
            <p className="text-xs text-slate-500 mt-1">Zoom: {zoom}% | Rotação: {rotation}°</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-12 text-center">{zoom}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 300}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-slate-200" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {fileUrl && (
            <a
              href={fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>

        {/* Viewer Content */}
         <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
           {loading ? (
             <p className="text-slate-500">Carregando documento...</p>
           ) : isPDF ? (
             <iframe
               src={signedUrl}
               className="h-full w-full rounded"
               style={{
                 transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                 transformOrigin: 'top center'
               }}
             />
           ) : isImage ? (
             <img
               src={signedUrl}
               alt={fileName}
               className="max-h-full max-w-full rounded"
               style={{
                 transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                 transformOrigin: 'center'
               }}
             />
           ) : (
             <div className="text-center text-slate-500">
               <p className="text-sm mb-2">Tipo de arquivo não suportado</p>
               {signedUrl && (
                 <a
                   href={signedUrl}
                   download
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-blue-600 hover:underline text-sm"
                 >
                   Baixar arquivo
                 </a>
               )}
             </div>
           )}
         </div>
      </Card>
    </div>
  );
}