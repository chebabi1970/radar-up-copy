import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function VisualizadorPDF({ url }) {
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        const pdf = await pdfjsLib.getDocument(url).promise;
        setPdf(pdf);
        setPageCount(pdf.numPages);
        setPageNumber(1);
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
        setError('Erro ao carregar PDF. Tente abrir em nova aba.');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [url]);

  if (error) {
    return (
      <div className="w-full h-[600px] border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-[600px] border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
        {pdf && (
          <PDFPage pdf={pdf} pageNumber={pageNumber} scale={scale} />
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600">
            Página {pageNumber} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber(Math.min(pageCount, pageNumber + 1))}
            disabled={pageNumber >= pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="px-2 py-1 text-sm border border-slate-300 rounded"
          >
            <option value={1}>100%</option>
            <option value={1.5}>150%</option>
            <option value={2}>200%</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function PDFPage({ pdf, pageNumber, scale }) {
  const [canvas, setCanvas] = useState(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvasRef = document.createElement('canvas');
        const context = canvasRef.getContext('2d');
        canvasRef.width = viewport.width;
        canvasRef.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        setCanvas(canvasRef.toDataURL());
      } catch (err) {
        console.error('Erro ao renderizar página:', err);
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [pdf, pageNumber, scale]);

  if (rendering) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex justify-center py-4">
      {canvas && (
        <img
          src={canvas}
          alt="PDF page"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      )}
    </div>
  );
}