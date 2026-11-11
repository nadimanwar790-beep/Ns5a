/**
 * Export and Print Utilities for Mobile & Desktop
 * Supports:
 * - Direct .MHTML (MIME HTML Web Archive) download for offline mobile viewing
 * - Direct .HTML (Standalone Self-Contained Webpage) download
 * - Print / Save as PDF via native browser dialog
 * - Mobile Web Share API (WhatsApp, Drive, Files)
 */

export function generateFullHTMLDocument(
  title: string,
  htmlContent: string,
  extraStyles: string = ''
): string {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      line-height: 1.6;
      padding: 20px;
    }
    
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #cbd5e1;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    
    .header-bar {
      background: #1e1b4b;
      color: #ffffff;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #312e81;
    }
    
    .header-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    
    .header-badge {
      background: #4f46e5;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .content {
      padding: 28px;
    }
    
    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #09090b;
      margin-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
    }
    
    .question-box {
      background: #f1f5f9;
      border-left: 4px solid #4f46e5;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 15px;
      font-style: italic;
    }
    
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 20px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .grid-data {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    
    .data-card {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 10px 14px;
    }
    
    .data-label {
      font-size: 11px;
      color: #3b82f6;
      font-weight: 600;
    }
    
    .data-value {
      font-size: 15px;
      font-weight: 800;
      color: #1e3a8a;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 4px;
    }
    
    .formula-box {
      background: #fef3c7;
      border: 2px solid #fde68a;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .formula-pill {
      background: #ffffff;
      border: 1px solid #f59e0b;
      padding: 6px 12px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 13px;
      color: #78350f;
    }
    
    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .step-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      gap: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #1e293b;
    }
    
    .step-num {
      background: #e2e8f0;
      color: #334155;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    
    .answer-box {
      background: #ecfdf5;
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 18px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .answer-title {
      font-size: 12px;
      font-weight: 700;
      color: #065f46;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .answer-val {
      font-size: 20px;
      font-weight: 800;
      color: #064e3b;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 4px;
    }
    
    .footer-bar {
      border-top: 1px solid #e2e8f0;
      padding: 14px 28px;
      background: #f8fafc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    }
    
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        color: #000000 !important;
      }
      .container {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
    
    ${extraStyles}
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="header-title">📐 3D Geometry & Mensuration Master</div>
      <div class="header-badge">Offline Solved Note</div>
    </div>
    <div class="content">
      ${htmlContent}
    </div>
    <div class="footer-bar">
      <span>Generated by 3D Geometry & Reasoning App • 100% Offline</span>
      <span>${new Date().toLocaleDateString()}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates valid MIME MHTML format (RFC 2557)
 */
export function generateMHTML(
  title: string,
  htmlBody: string,
  extraStyles: string = ''
): string {
  const fullHtml = generateFullHTMLDocument(title, htmlBody, extraStyles);
  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const dateStr = new Date().toUTCString();

  return `From: <3D-Geometry-Offline-Master@app>
Subject: ${title.replace(/[\r\n]/g, ' ')}
Date: ${dateStr}
MIME-Version: 1.0
Content-Type: multipart/related; boundary="${boundary}"; type="text/html"

--${boundary}
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable
Content-Location: index.html

${fullHtml.replace(/=/g, '=3D')}

--${boundary}--
`;
}

/**
 * Triggers direct mobile download of .mhtml file
 */
export function downloadMHTMLFile(
  filename: string,
  title: string,
  htmlBody: string,
  extraStyles?: string
): void {
  const cleanName = (filename || 'geometry_solution').replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_');
  const mhtmlString = generateMHTML(title, htmlBody, extraStyles);
  const blob = new Blob([mhtmlString], { type: 'application/x-mimearchive;charset=utf-8' });
  triggerFileDownload(blob, `${cleanName}.mhtml`);
}

/**
 * Triggers direct mobile download of .html file
 */
export function downloadOfflineHTMLFile(
  filename: string,
  title: string,
  htmlBody: string,
  extraStyles?: string
): void {
  const cleanName = (filename || 'geometry_solution').replace(/[^a-zA-Z0-9_\-\u0900-\u097F]/g, '_');
  const htmlString = generateFullHTMLDocument(title, htmlBody, extraStyles);
  const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
  triggerFileDownload(blob, `${cleanName}.html`);
}

/**
 * Helper to trigger file download on both Mobile & Desktop browsers
 */
function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Trigger native browser Print (Save as PDF on mobile)
 */
export function triggerPrint(): void {
  try {
    window.print();
  } catch {
    // fallback if iframe restricts
  }
}

/**
 * Web Share API (WhatsApp, Telegram, Files, etc. on mobile)
 */
export async function shareContent(
  title: string,
  text: string,
  url?: string
): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: url || window.location.href,
      });
      return true;
    } catch {
      // user cancelled or failed
      return false;
    }
  } else {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${text}`);
      return true;
    } catch {
      return false;
    }
  }
}
