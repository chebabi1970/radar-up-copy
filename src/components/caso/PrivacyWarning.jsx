import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyWarning() {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">
              Informação Confidencial
            </p>
            <p className="text-sm text-amber-800">
              Este caso e seus documentos são privados e visíveis apenas para você. 
              Os documentos contêm informações confidenciais sobre situação financeira e patrimonial. 
              Acesso não autorizado é proibido.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}