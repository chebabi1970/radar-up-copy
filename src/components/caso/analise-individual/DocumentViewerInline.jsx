import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, RotateCw, Download, Loader2 } from 'lucide-react';

export default function DocumentViewerInline({ documento, documentos = [], onSelectDoc }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const doc = documento || documentos[0];
  const fileUrl = doc?.file_url;
  const fileUri = doc?.file_uri;

  useEffect(() => {
    setLoading(true);
    setSignedUrl(null);
    setZoom(100);
    setRotation(0);

    if (fileUrl) {
      setSignedUrl(fileUrl);
      setLoading(false);
    } else if (fileUri) {
      base44.integrations.Core.CreateFileSignedUrl({
        file_uri: fileUri,
        expires_in: 3600
      }).then(result => {
        setSignedUrl(result.signed_url);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fileUrl, fileUri, doc?.id]);

  if (!doc) return null;

  const isPDF = signedUrl && typeof signedUrl === 'string' && /\.pdf(\?|$)/i.test(String(signedUrl).toLowerCase());
  const isImage = signedUrl && typeof signedUrl === 'string' && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(String(signedUrl).toLowerCase());

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(prev => Math.max(prev - 10, 50))} disabled={zoom <= 50} className="h-7 w-7 p-0 rounded-lg">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium text-slate-600 min-w-[3rem] text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(prev => Math.min(prev + 10, 300))} disabled={zoom >= 300} className="h-7 w-7 p-0 rounded-lg">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-slate-200" />
          <Button variant="outline" size="sm" onClick={() => setRotation(prev => (prev + 90) % 360)} className="h-7 w-7 p-0 rounded-lg">
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Document selector when multiple files */}
        {documentos.length > 1 && (
          <div className="flex items-center gap-1">
            {documentos.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => onSelectDoc && onSelectDoc(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  d.id === doc?.id
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}

        {signedUrl && (
          <a href={signedUrl} download target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
      </div>

      {/* Viewer Content */}
      <div className="overflow-auto bg-slate-100 flex items-center justify-center" style={{ maxHeight: '500px', minHeight: '300px' }}>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando documento...</span>
          </div>
        ) : isPDF ? (
          <iframe
            src={signedUrl}
            className="w-full rounded"
            style={{
              height: '500px',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'top center'
            }}
          />
        ) : isImage ? (
          <img
            src={signedUrl}
            alt={doc.nome_arquivo}
            className="max-w-full rounded"
            style={{
              maxHeight: '480px',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
          />
        ) : signedUrl ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500 mb-2">Visualização não disponível para este formato</p>
            <a href={signedUrl} download target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">
              Baixar arquivo
            </a>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">Nenhum arquivo disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}
