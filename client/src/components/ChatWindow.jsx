import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  Bot,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Paperclip,
  Sparkles,
  Database
} from 'lucide-react';
import { sendChatMessage } from '../services/api';

/**
 * Minimal ChatGPT-Style Chat Window
 * Features:
 * - Proper Markdown & Table rendering (react-markdown + remark-gfm)
 * - Clean centered conversation layout
 * - Subtle source citations
 * - Seamless bottom input bar with attachment support
 */
export const ChatWindow = ({
  activeDocument = null,
  onAttachFileClick = null,
  uploading = false
}) => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hi! I am your AI Knowledge Assistant. Upload a PDF or Excel document from the sidebar or ask me any question.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'DIRECT_LLM',
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Auto-resize textarea like ChatGPT
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const toggleSource = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendChatMessage({
        query,
        documentId: activeDocument?.id || null,
        history
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: response.mode,
        sources: response.sources || [],
        retrievedCount: response.retrievedChunksCount || 0
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          '⚠️ Could not connect to the backend server. Please check your backend connection and API keys.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        background: 'var(--bg-main)'
      }}
    >
      {/* Top Header (Minimal) */}
      <div
        style={{
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-main)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            RAG Assistant
          </span>
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)'
            }}
          >
            Groq • gpt-oss-120b
          </span>
        </div>

        {/* Active Knowledge Focus Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          {activeDocument ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#10a37f',
                background: 'rgba(16, 163, 127, 0.1)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              <FileText size={13} />
              {activeDocument.fileName}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Database size={13} /> Searching all documents
            </span>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px 140px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div style={{ width: '100%', maxWidth: '768px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '16px',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                width: msg.role === 'user' ? 'auto' : '100%',
                maxWidth: msg.role === 'user' ? '80%' : '100%'
              }}
            >
              {/* Assistant Icon */}
              {msg.role === 'assistant' && (
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#10a37f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <Bot size={18} color="#fff" />
                </div>
              )}

              {/* Message Body */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {msg.role === 'user' ? (
                  <div
                    style={{
                      background: 'var(--bg-user-msg)',
                      color: '#fff',
                      padding: '10px 16px',
                      borderRadius: '20px',
                      fontSize: '15px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div>
                    {/* Render Markdown using ReactMarkdown + remarkGfm */}
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Sources Badge & Dropdown */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <button
                          onClick={() => toggleSource(msg.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'background 0.2s'
                          }}
                        >
                          <FileText size={13} color="#10a37f" />
                          <span>{msg.sources.length} Sources referenced</span>
                          {expandedSources[msg.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        {expandedSources[msg.id] && (
                          <div
                            style={{
                              marginTop: '8px',
                              padding: '12px',
                              background: '#1b1b1b',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            {msg.sources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  fontSize: '12px',
                                  borderLeft: '2px solid #10a37f',
                                  paddingLeft: '10px'
                                }}
                              >
                                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                                  {src.fileName} (Chunk #{src.chunkIndex})
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>
                                  "{src.text.substring(0, 160)}..."
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: '16px', alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#10a37f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Bot size={18} color="#fff" />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  paddingTop: '4px'
                }}
              >
                <Loader2 size={16} className="animate-spin" color="#10a37f" />
                <span>Searching knowledge base & generating answer...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating ChatGPT-Style Input Box */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, rgba(33, 33, 33, 0) 0%, #212121 40%)',
          padding: '16px 20px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <form
          onSubmit={handleSend}
          style={{
            width: '100%',
            maxWidth: '768px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '24px',
            padding: '8px 12px 8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
          }}
        >
          {/* Direct File Attachment Button */}
          {onAttachFileClick && (
            <button
              type="button"
              onClick={onAttachFileClick}
              title="Upload PDF or Excel file"
              disabled={uploading}
              style={{
                background: 'transparent',
                border: 'none',
                color: uploading ? '#10a37f' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '50%',
                transition: 'color 0.2s'
              }}
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Paperclip size={18} />
              )}
            </button>
          )}

          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              activeDocument
                ? `Ask about ${activeDocument.fileName}...`
                : 'Message RAG Assistant (Ask anything about documents)...'
            }
            disabled={loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '15px',
              lineHeight: '1.5',
              outline: 'none',
              resize: 'none',
              maxHeight: '160px',
              fontFamily: 'inherit'
            }}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: input.trim() && !loading ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
              color: input.trim() && !loading ? '#000000' : 'rgba(255, 255, 255, 0.3)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </form>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          RAG AI may produce inaccurate information about people, places, or facts.
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
