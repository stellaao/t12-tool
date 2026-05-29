'use client';

import { useState, useRef } from 'react';

export default function Home() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    const newImages = [];
    for (const f of files) {
      if (f.type.startsWith('image/')) {
        newImages.push(f);
      }
    }
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
  };

  const clearImages = () => {
    setImages([]);
    setResultUrl(null);
    setPdfUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitImages = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    images.forEach(f => formData.append('images', f));

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();

      if (!res.ok) {
        try {
          const data = JSON.parse(text);
          throw new Error(data.error || '處理失敗');
        } catch {
          throw new Error(text || '處理失敗 (HTTP ' + res.status + ')');
        }
      }

      const blob = new Blob([text], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const convertToPdf = async () => {
    if (!resultUrl) return;
    setPdfLoading(true);

    try {
      // For Vercel, PDF conversion would need a separate service
      // For now, we'll use a simple approach
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = 'T12_吊船文件.docx';
      link.click();
      alert('DOCX 已下載。如需 PDF，請用 Word 打開 DOCX 然後另存為 PDF');
    } catch (err) {
      setError('PDF 轉換失敗');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 700, margin: '0 auto', padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: 30 }}>T12 圖片更新工具</h1>

      {error && (
        <div style={{ padding: '12px 16px', background: '#f8d7da', color: '#721c24', borderRadius: 8, marginBottom: 16 }}>
          錯誤：{error}
        </div>
      )}

      {/* Image Upload */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize: '1.1em', color: '#555', marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
          🖼️ 上傳圖片（01.jpg ~ 11.jpg）
        </h2>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#007aff'; e.currentTarget.style.background = '#f0f7ff'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.background = 'white'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ccc';
            e.currentTarget.style.background = 'white';
            handleFiles(e.dataTransfer.files);
          }}
          style={{
            border: '2px dashed #ccc', borderRadius: 10, padding: 40,
            textAlign: 'center', cursor: 'pointer', position: 'relative',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <p style={{ color: '#888', fontSize: '0.95em' }}>拖放圖片到這裡，或點擊選擇</p>
          <p style={{ fontSize: '0.8em', color: '#aaa', marginTop: 8 }}>支援 jpg / png / gif / webp</p>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
            style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          />
        </div>

        <ul style={{ marginTop: 12, listStyle: 'none' }}>
          {images.map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9f9f9', borderRadius: 6, marginBottom: 6, fontSize: '0.9em' }}>
              <span style={{ fontWeight: 'bold', color: '#007aff', minWidth: 24 }}>{i + 1}.</span>
              <img src={URL.createObjectURL(f)} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
              <span style={{ flex: 1, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <button onClick={() => removeImage(i)} style={{ padding: '4px 8px', fontSize: '0.8em', background: '#e00', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✕</button>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={submitImages} disabled={loading || images.length === 0} style={{ background: loading ? '#ccc' : '#34c759', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: '1em', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳ 處理中...' : '🔄 產生 DOCX'}
          </button>
          <button onClick={convertToPdf} disabled={!resultUrl || pdfLoading} style={{ background: !resultUrl ? '#ccc' : '#5856d6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: '1em', cursor: !resultUrl ? 'not-allowed' : 'pointer' }}>
            {pdfLoading ? '⏳ 轉換中...' : '📑 下載 DOCX'}
          </button>
          <button onClick={clearImages} style={{ background: 'none', color: '#007aff', padding: '4px 8px', border: 'none', cursor: 'pointer' }}>清除</button>
        </div>

        {resultUrl && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, padding: 16, background: '#e8f5e9', borderRadius: 8, border: '1px solid #c8e6c9' }}>
            <a href={resultUrl} download="T12_吊船文件.docx" style={{ padding: '10px 20px', background: '#007aff', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
              ⬇️ 下載 DOCX
            </a>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.8em', marginTop: 20 }}>
        由 Nana 清潔服務 | T12 BMU 吊船閉合文件工具
      </div>
    </main>
  );
}