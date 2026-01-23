"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileIcon, Image as ImageIcon, FileText, File as FileDefault, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface FileWithPreview extends File {
  preview?: string;
}

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
  existingFiles?: Array<{ name: string; url: string }>;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-8 w-8" />;
  if (fileType.includes("pdf")) return <FileText className="h-8 w-8" />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className="h-8 w-8" />;
  return <FileDefault className="h-8 w-8" />;
};

export function FileUpload({
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedFileTypes = ["image/*", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
  existingFiles = [],
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejected) => {
          const errors = rejected.errors.map((e: any) => e.message).join(", ");
          toast.error(`${rejected.file.name}: ${errors}`);
        });
      }

      // Check if we're exceeding max files
      if (files.length + acceptedFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Process accepted files
      const newFiles = acceptedFiles.map((file) => {
        const fileWithPreview = file as FileWithPreview;
        // Create preview for images
        if (file.type.startsWith("image/")) {
          fileWithPreview.preview = URL.createObjectURL(file);
        }
        return fileWithPreview;
      });

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);

      toast.success(`${acceptedFiles.length} file(s) added`);
    },
    [files, maxFiles, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: maxSizeBytes,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
  });

  const removeFile = (index: number) => {
    const file = files[index];
    // Revoke preview URL to avoid memory leaks
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }

    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);

    toast.info(`${file.name} removed`);
  };

  // Simulate upload progress (in real implementation, this would come from the actual upload)
  const simulateUpload = (fileName: string) => {
    setUploadingFiles((prev) => new Set(prev).add(fileName));
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress((prev) => ({ ...prev, [fileName]: progress }));
      if (progress >= 100) {
        clearInterval(interval);
        setUploadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileName);
          return newSet;
        });
      }
    }, 200);
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-12 w-12 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop the files here...</p>
          ) : (
            <>
              <p className="text-sm font-medium">Drag & drop files here, or click to select</p>
              <p className="text-xs text-muted-foreground">
                Maximum {maxFiles} files, {maxSizeMB}MB each
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: Images, PDF, Word documents, text files
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Existing Attachments</h4>
          <div className="space-y-2">
            {existingFiles.map((file, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.url, "_blank")}
                  >
                    Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Files to Upload ({files.length}/{maxFiles})</h4>
          <div className="space-y-2">
            {files.map((file, index) => {
              const isUploading = uploadingFiles.has(file.name);
              const progress = uploadProgress[file.name] || 0;
              const isComplete = progress === 100;

              return (
                <Card key={index} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      {/* File icon or preview */}
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : (
                          <div className="text-muted-foreground">{getFileIcon(file.type)}</div>
                        )}
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>

                          {/* Status icon */}
                          <div className="flex-shrink-0">
                            {isComplete ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : isUploading ? (
                              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        {isUploading && (
                          <div className="mt-2 space-y-1">
                            <Progress value={progress} className="h-1" />
                            <p className="text-xs text-muted-foreground">{progress}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
