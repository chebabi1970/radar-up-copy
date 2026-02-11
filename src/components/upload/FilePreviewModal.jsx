import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function FilePreviewModal({ open, onClose, file, fileName }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const isPdf = file?.type === 'application/pdf' || fileName?.endsWith('.pdf');
  const isImage = file?.type?.startsWith('image/');

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{fileName || file?.name || 'Visualização'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* PDF Preview */}
          {isPdf && (
            <>
              <div className="flex items-center justify-between gap-4 p-2 bg-slate-50 rounded">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                    disabled={scale <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-600 min-w-[60px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setScale(s => Math.min(2, s + 0.1))}
                    disabled={scale >= 2}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                {numPages && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-600 min-w-[80px] text-center">
                      {pageNumber} / {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                      disabled={pageNumber >= numPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-center bg-slate-100 p-4 rounded overflow-auto">
                <Document
                  file={file}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<div className="text-slate-500">Carregando PDF...</div>}
                  error={<div className="text-red-500">Erro ao carregar PDF</div>}
                >
                  <Page 
                    pageNumber={pageNumber} 
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              </div>
            </>
          )}

          {/* Image Preview */}
          {isImage && (
            <div className="flex justify-center bg-slate-100 p-4 rounded">
              <img
                src={typeof file === 'string' ? file : URL.createObjectURL(file)}
                alt="Preview"
                className="max-w-full h-auto rounded"
                style={{ maxHeight: '70vh' }}
              />
            </div>
          )}

          {/* Unsupported File Type */}
          {!isPdf && !isImage && (
            <div className="text-center text-slate-500 py-8">
              Pré-visualização não disponível para este tipo de arquivo
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}