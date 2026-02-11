import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { validateFileUpload } from '@/components/security/InputValidator';

export default function QuickFileUpload({
  onUploadComplete,
  maxSizeMB = 10,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'],
  privateStorage = true,
  buttonText = 'Selecionar Arquivo',
  buttonVariant = 'outline',
  buttonSize = 'default'
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate
    const validation = validateFileUpload(file, maxSizeMB, allowedTypes);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Upload
    setUploading(true);
    try {
      const uploadFn = privateStorage 
        ? base44.integrations.Core.UploadPrivateFile
        : base44.integrations.Core.UploadFile;

      const result = await uploadFn({ file });
      const uploadedUrl = result.file_url || result.file_uri;

      if (onUploadComplete) {
        onUploadComplete({
          file,
          url: uploadedUrl,
          isPrivate: privateStorage
        });
      }
    } catch (err) {
      setError('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}