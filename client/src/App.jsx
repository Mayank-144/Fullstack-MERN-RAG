import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Table,
  Plus,
  Trash2,
  Database,
  CheckCircle,
  Loader2,
  PanelLeft,
  X
} from 'lucide-react';
import { ChatWindow } from './components/ChatWindow.jsx';
import { getDocuments, deleteDocument, uploadDocument } from './services/api.js';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileInputRef = useRef(null);

  const fetchDocs = async () => {
    try {
      const res = await getDocuments();
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;

    const allowed = ['.pdf', '.xlsx', '.xls'];
    const valid = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!valid) {
      alert('Please select a PDF (.pdf) or Excel (.xlsx, .xls) file.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await uploadDocument(file, (percent) => {
        setUploadProgress(percent);
      });

      if (result.success) {
        await fetchDocs();
        setActiveDocument({
          id: result.document.id,
          fileName: result.document.fileName
        });
      }
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}" and its vectors?`)) return;

    try {
      await deleteDocument(id);
      if (activeDocument?.id === id) {
        setActiveDocument(null);
      }
      fetchDocs();
    } catch (error) {
      alert('Delete failed: ' + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Hidden File Input for Paperclip/Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
        }}
      />

      {/* Sleek ChatGPT Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? '260px' : '0px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* New Document Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background 0.2s',
              marginBottom: '16px'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" color="#10a37f" />
            ) : (
              <Plus size={16} />
            )}
            <span>{uploading ? `Processing (${uploadProgress}%)...` : 'Upload Knowledge File'}</span>
          </button>

          {/* Files Header */}
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', padding: '0 4px' }}>
            Knowledge Documents ({documents.length})
          </div>

          {/* Documents List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Global Search Option */}
            <div
              onClick={() => setActiveDocument(null)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: activeDocument === null ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeDocument === null ? '#fff' : 'var(--text-secondary)',
                fontSize: '13px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={15} color="#10a37f" /> All Documents
              </span>
              {activeDocument === null && <CheckCircle size={14} color="#10a37f" />}
            </div>

            {/* Uploaded Files */}
            {documents.map((doc) => {
              const isSelected = activeDocument?.id === doc._id;
              return (
                <div
                  key={doc._id}
                  onClick={() => setActiveDocument({ id: doc._id, fileName: doc.fileName })}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    fontSize: '13px',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {doc.fileType === 'pdf' ? (
                      <FileText size={15} color="#f87171" style={{ flexShrink: 0 }} />
                    ) : (
                      <Table size={15} color="#34d399" style={{ flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.fileName}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, doc._id, doc.fileName)}
                    title="Delete document"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10a37f' }} />
              <span>MongoDB Atlas Connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat View Area */}
      <main style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Toggle Sidebar Icon (Floating on top left) */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 20,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <PanelLeft size={18} />
        </button>

        <ChatWindow
          activeDocument={activeDocument}
          onAttachFileClick={() => fileInputRef.current?.click()}
          uploading={uploading}
        />
      </main>
    </div>
  );
}
