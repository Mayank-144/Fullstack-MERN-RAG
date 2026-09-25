import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Table,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { uploadDocument } from '../services/api';

/**
 * FileUpload Component
 * Supports PDF & Excel with Drag-and-Drop and Progress Bar
 */
export const FileUpload = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const fileInputRef = useRef(null);

  const allowedExtensions = ['.pdf', '.xlsx', '.xls'];

  const validateFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    const isValidExt = allowedExtensions.some((ext) => name.endsWith(ext));

    if (!isValidExt) {
      setStatus('error');
      setErrorMessage('Invalid format! Please upload only PDF (.pdf) or Excel (.xlsx, .xls) files.');
      return false;
    }

    if (file.size > 25 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds 25MB limit.');
      return false;
    }

    return true;
  };

  const handleFile = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
      setSuccessInfo(null);
    }
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStatus('uploading');
      setProgress(0);
      setErrorMessage('');

      // Upload with progress tracking
      const result = await uploadDocument(selectedFile, (percent) => {
        setProgress(percent);
        if (percent === 100) {
          setStatus('processing'); // Parsing, chunking & Cohere embedding
        }
      });

      setStatus('success');
      setSuccessInfo(result.document);
      setSelectedFile(null);
      setProgress(100);

      if (onUploadSuccess) {
        onUploadSuccess(result.document);
      }
    } catch (error) {
      console.error('Upload Error:', error);
      setStatus('error');
      setErrorMessage(
        error.response?.data?.message || error.message || 'Failed to upload document.'
      );
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setStatus('idle');
    setErrorMessage('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-card">
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UploadCloud size={20} color="#818cf8" /> Upload Knowledge Source
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Upload PDF or Excel files to parse, chunk, embed, and store in Vector DB.
        </p>
      </div>

      {/* Dropzone */}
      <div
        className={`dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UploadCloud size={24} color="#818cf8" />
          </div>

          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6' }}>
              Click to browse or drag and drop file here
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Supported: PDF (.pdf), Excel (.xlsx, .xls) • Max: 25MB
            </p>
          </div>
        </div>
      </div>

      {/* Selected File Preview */}
      {selectedFile && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            {selectedFile.name.endsWith('.pdf') ? (
              <FileText size={22} color="#f87171" />
            ) : (
              <Table size={22} color="#34d399" />
            )}
            <div style={{ overflow: 'hidden' }}>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}
              >
                {selectedFile.name}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          {status !== 'uploading' && status !== 'processing' && (
            <button
              onClick={clearSelection}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Upload & Progress Bar */}
      {(status === 'uploading' || status === 'processing') && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={14} className="animate-spin" />
              {status === 'uploading' ? `Uploading... ${progress}%` : 'Parsing & Generating Embeddings...'}
            </span>
            <span>{progress}%</span>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {status === 'success' && successInfo && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#34d399',
            fontSize: '13px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>
            <strong>{successInfo.fileName}</strong> processed into {successInfo.chunkCount} vector chunks!
          </span>
        </div>
      )}

      {/* Error Notification */}
      {status === 'error' && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#f87171',
            fontSize: '13px'
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Action Button */}
      {selectedFile && status !== 'uploading' && status !== 'processing' && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleUpload}>
            <UploadCloud size={16} /> Process & Embed File
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
