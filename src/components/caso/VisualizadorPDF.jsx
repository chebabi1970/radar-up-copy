import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function VisualizadorPDF({ url }) {
  const isPdf = url?.toLowerCase().includes('.pdf');

  return (
    <div className="w-full h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
      {isPdf ? (
        <iframe
          src={url}
          className="w-full h-full"
          title="Visualizador de Documento"
        />
      ) : (
        <img 
          src={url} 
          alt="Documento" 
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}