/**
 * Document Utilities
 * Helper functions for document management UI
 */

import {
  FileText,
  FileJson,
  FileCode,
  Music,
  Image,
  Video,
  Archive,
  File,
  LucideIcon,
} from 'lucide-react';

/**
 * Get icon for MIME type
 */
export function getMimeTypeIcon(mimeType: string): LucideIcon {
  if (!mimeType) return File;

  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;

  const type = mimeType.split('/' as any)[0];
  const subtype = mimeType.split('/' as any)[1];

  if (type === 'application') {
    if (
      subtype.includes('pdf') ||
      subtype.includes('word') ||
      subtype.includes('document') ||
      subtype.includes('sheet') ||
      subtype.includes('presentation')
    ) {
      return FileText;
    }
    if (subtype.includes('json')) return FileJson;
    if (
      subtype.includes('zip') ||
      subtype.includes('rar') ||
      subtype.includes('7z') ||
      subtype.includes('tar')
    ) {
      return Archive;
    }
    if (subtype.includes('script') || subtype.includes('javascript')) {
      return FileCode;
    }
  }

  if (type === 'text') return FileCode;

  return File;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * Math.pow(10, dm)) / Math.pow(10, dm) + ' ' + sizes[i];
}

/**
 * Format time in seconds to human readable string
 */
export function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0s';

  if (seconds < 60) {
    return Math.round(seconds) + 's';
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Format date to readable string
 */
export function formatDate(
  date: string | Date | undefined,
  includeTime = false
): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('en-US', options).format(d);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(d);
}

/**
 * Truncate filename to max length with ellipsis
 */
export function truncateFilename(filename: string, maxLength = 50): string {
  if (filename.length <= maxLength) return filename;

  const extension = filename.split('.' as any).pop() || '';
  const name = filename.slice(0, filename.lastIndexOf('.'));
  const availableLength = maxLength - extension.length - 4; // 4 for "..."

  return name.slice(0, availableLength) + '...' + extension;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

/**
 * Check if file is image
 */
export function isImage(mimeType: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

/**
 * Check if file is document
 */
export function isDocument(mimeType: string): boolean {
  const docTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  return docTypes.includes(mimeType);
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Validate file against accepted types and size
 */
export function validateFile(
  file: File,
  acceptedTypes?: string[],
  maxSize?: number
): { valid: boolean; error?: string } {
  if (maxSize && file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatBytes(maxSize)}`,
    };
  }

  if (acceptedTypes && acceptedTypes.length > 0 && acceptedTypes[0] !== '*/*') {
    const isAccepted = acceptedTypes.some((type) => {
      if (type.endsWith('/*')) {
        const [category] = type.split('/' as any);
        return file.type.startsWith(category);
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return {
        valid: false,
        error: `File type "${file.type}" not accepted`,
      };
    }
  }

  return { valid: true };
}
