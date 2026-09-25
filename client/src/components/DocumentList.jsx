import React, { useEffect, useState } from 'react';
import { FileText, Table, Trash2, Database, RefreshCw, CheckCircle } from 'lucide-react';
import { getDocuments, deleteDocument } from '../services/api';

/**
 * DocumentList Component
 * Displays all uploaded documents in MongoDB, allows selecting active document for filtering and deletion
 */
export const DocumentList = ({ activeDocId, onSelectDoc, refreshTrigger }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await getDocuments();
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [refreshTrigger]);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}" and its vector chunks?`)) return;

    try {
      await deleteDocument(id);
      if (activeDocId === id && onSelectDoc) {
        onSelectDoc(null);
      }
      fetchDocs();
    } catch (error) {
      alert('Failed to delete document: ' + error.message);
    }
  };

  return (
    <div className="upload-card" style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} color="#818cf8" /> Uploaded Knowledge Base ({documents.length})
        </h4>
        <button
          onClick={fetchDocs}
          title="Refresh List"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {documents.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
          No documents uploaded yet. Upload a PDF or Excel sheet above.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
          {/* All Documents Option */}
          <div
            onClick={() => onSelectDoc(null)}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: activeDocId === null ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${activeDocId === null ? '#6366f1' : 'var(--border-color)'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px'
            }}
          >
            <span style={{ fontWeight: 600, color: activeDocId === null ? '#818cf8' : '#f3f4f6' }}>
              🌐 All Uploaded Documents (Global Search)
            </span>
            {activeDocId === null && <CheckCircle size={15} color="#818cf8" />}
          </div>

          {/* Individual Documents */}
          {documents.map((doc) => {
            const isSelected = activeDocId === doc._id;
            return (
              <div
                key={doc._id}
                onClick={() => onSelectDoc({ id: doc._id, fileName: doc.fileName })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isSelected ? '#6366f1' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  {doc.fileType === 'pdf' ? (
                    <FileText size={18} color="#f87171" style={{ flexShrink: 0 }} />
                  ) : (
                    <Table size={18} color="#34d399" style={{ flexShrink: 0 }} />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {doc.fileName}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {doc.chunkCount} chunks • {(doc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSelected && <CheckCircle size={15} color="#818cf8" />}
                  <button
                    onClick={(e) => handleDelete(e, doc._id, doc.fileName)}
                    title="Delete file"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentList;
