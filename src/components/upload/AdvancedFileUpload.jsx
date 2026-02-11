import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { validateFileUpload } from '@/components/security/InputValidator';

export default function AdvancedFileUpload({
  onUploadComplete,
  maxSizeMB = 10,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  multiple = false,
  privateStorage = true,
  label = 'Upload de Arquivo',
  description = 'Arraste arquivos aqui ou clique para selecionar'
}) {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateAndAddFiles = useCallback((newFiles) => {
    const validatedFiles = Array.from(newFiles).map((file) => {
      const validation = validateFileUpload(file, maxSizeMB, allowedTypes);
      
      return {
        file,
        id: Math.random().toString(36).substring(7),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        isPdf: file.type === 'application/pdf',
        valid: validation.valid,
        errors: validation.errors,
        progress: 0,
        uploaded: false,
        uploadedUrl: null
      };
    });

    setFiles(prev => multiple ? [...prev, ...validatedFiles] : validatedFiles);
  }, [maxSizeMB, allowedTypes, multiple]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }, [validateAndAddFiles]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  }, [validateAndAddFiles]);

  const removeFile = useCallback((fileId) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Cleanup preview URLs
      const removed = prev.find(f => f.id === fileId);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  }, []);

  const uploadFile = async (fileObj) => {
    if (!fileObj.valid) return;

    try {
      setFiles(prev => prev.map(f => 
        f.id === fileObj.id ? { ...f, progress: 10 } : f
      ));

      const uploadFn = privateStorage 
        ? base44.integrations.Core.UploadPrivateFile
        : base44.integrations.Core.UploadFile;

      setFiles(prev => prev.map(f => 
        f.id === fileObj.id ? { ...f, progress: 50 } : f
      ));

      const result = await uploadFn({ file: fileObj.file });
      const uploadedUrl = result.file_url || result.file_uri;

      setFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { ...f, progress: 100, uploaded: true, uploadedUrl } 
          : f
      ));

      if (onUploadComplete) {
        onUploadComplete({
          file: fileObj.file,
          url: uploadedUrl,
          isPrivate: privateStorage
        });
      }

      return uploadedUrl;
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { ...f, errors: [...(f.errors || []), 'Erro no upload: ' + error.message] } 
          : f
      ));
    }
  };

  const uploadAll = async () => {
    setUploading(true);
    const validFiles = files.filter(f => f.valid && !f.uploaded);
    
    await Promise.all(validFiles.map(uploadFile));
    
    setUploading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          }
        `}
      >
        <input
          type="file"
          multiple={multiple}
          accept={allowedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className="mx-auto h-10 w-10 text-slate-400 mb-2" />
        <p className="text-sm text-slate-600 mb-1">{description}</p>
        <p className="text-xs text-slate-500">
          Máximo {maxSizeMB}MB • {allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}
        </p>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileObj) => (
            <Card key={fileObj.id} className={fileObj.valid ? 'border-slate-200' : 'border-red-200 bg-red-50'}>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {fileObj.preview ? (
                      <img 
                        src={fileObj.preview} 
                        alt="Preview" 
                        className="h-12 w-12 object-cover rounded border border-slate-200"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {fileObj.file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(fileObj.file.size)} • {fileObj.file.type.split('/')[1].toUpperCase()}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(fileObj.id)}
                        className="h-7 w-7 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Validation Errors */}
                    {!fileObj.valid && fileObj.errors.length > 0 && (
                      <div className="mt-1 flex items-start gap-2 text-red-600">
                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          {fileObj.errors.map((err, idx) => (
                            <div key={idx}>{err}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload Progress */}
                    {fileObj.valid && fileObj.progress > 0 && !fileObj.uploaded && (
                      <div className="mt-1 space-y-1">
                        <Progress value={fileObj.progress} className="h-1.5" />
                        <p className="text-xs text-slate-500">Enviando... {fileObj.progress}%</p>
                      </div>
                    )}

                    {/* Upload Success */}
                    {fileObj.uploaded && (
                      <div className="mt-1 flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <p className="text-xs">Upload concluído</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Upload All Button */}
          {files.some(f => f.valid && !f.uploaded) && (
            <Button
              onClick={uploadAll}
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
            >
              {uploading ? 'Enviando...' : `Enviar ${files.filter(f => f.valid && !f.uploaded).length} arquivo(s)`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}