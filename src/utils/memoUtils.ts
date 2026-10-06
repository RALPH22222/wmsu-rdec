export interface MemoDetails {
  name: string;
  size?: number;
  type?: string;
  dataUrl?: string;
}

/**
 * Format bytes into human-readable string (e.g. 1.2 MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Safely parse a raw memo value which might be a JSON string, a URL, a dataUrl, or a plain filename
 */
export function parseMemoDetails(raw?: string | null): MemoDetails | null {
  if (!raw) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.name) {
        return {
          name: String(parsed.name),
          size: typeof parsed.size === 'number' ? parsed.size : undefined,
          type: typeof parsed.type === 'string' ? parsed.type : undefined,
          dataUrl: typeof parsed.dataUrl === 'string' ? parsed.dataUrl : undefined,
        };
      }
    } catch {
      // Fall through to plain text parsing
    }
  }

  if (trimmed.startsWith('data:')) {
    const mimeMatch = trimmed.match(/^data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : '';
    let ext = 'pdf';
    if (mime.includes('word') || mime.includes('officedocument')) ext = 'docx';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';

    return {
      name: `attached-memo.${ext}`,
      type: mime,
      dataUrl: trimmed,
    };
  }

  const name = trimmed.includes('/') ? trimmed.split('/').pop() || trimmed : trimmed;
  return {
    name,
    dataUrl: trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : undefined,
  };
}

/**
 * Open the memo file directly in a new browser tab without auto-downloading.
 * For PDFs, renders an inline full-page viewer in the new tab.
 * For images, displays them centered.
 * For Word docs, displays file details with an explicit download action.
 */
export function openMemoInNewTab(memo: MemoDetails) {
  if (!memo.dataUrl) {
    alert(`Attached memo: ${memo.name}\n(Direct file content is not available to preview).`);
    return;
  }

  const name = memo.name || 'Attached Memo';
  const nameLower = name.toLowerCase();
  const isPdf =
    nameLower.endsWith('.pdf') ||
    memo.type?.includes('pdf') ||
    memo.dataUrl.startsWith('data:application/pdf');
  const isImage =
    ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].some(ext => nameLower.endsWith(ext)) ||
    memo.type?.startsWith('image/') ||
    memo.dataUrl.startsWith('data:image/');

  let previewUrl = memo.dataUrl;

  if (memo.dataUrl.startsWith('data:')) {
    try {
      const arr = memo.dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : (isPdf ? 'application/pdf' : (isImage ? 'image/png' : 'application/octet-stream'));
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      previewUrl = URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error creating blob for memo preview:', err);
      previewUrl = memo.dataUrl;
    }
  }

  // Open the tab synchronously to prevent popup blockers
  const newWin = window.open('', '_blank');
  if (!newWin) {
    window.open(previewUrl, '_blank');
    return;
  }

  // Set tab document title
  newWin.document.title = `${name} - Memo`;

  if (isPdf) {
    newWin.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { width: 100%; height: 100%; overflow: hidden; background-color: #525659; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${previewUrl}#view=FitH" title="${name}"></iframe>
        </body>
      </html>
    `);
    newWin.document.close();
    return;
  }

  if (isImage) {
    newWin.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #0f172a; }
            img { max-width: 95vw; max-height: 95vh; object-fit: contain; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 4px; }
          </style>
        </head>
        <body>
          <img src="${previewUrl}" alt="${name}" />
        </body>
      </html>
    `);
    newWin.document.close();
    return;
  }

  // For Word docs (.docx) or other formats: render real document content using docx-preview
  newWin.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${name}</title>
        <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/docx-preview@0.3.3/dist/docx-preview.min.js"></script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #525659;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .topbar {
            background-color: #323639;
            color: #fff;
            padding: 10px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          }
          .doc-name {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 70%;
          }
          .actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .btn {
            background: #475569;
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: background 0.15s;
          }
          .btn:hover {
            background: #64748b;
          }
          .btn-download {
            background: #C8102E;
          }
          .btn-download:hover {
            background: #a00c24;
          }
          .viewer-scroll {
            flex: 1;
            overflow-y: auto;
            padding: 32px 16px;
            display: flex;
            justify-content: center;
          }
          #viewer {
            width: 100%;
            max-width: 900px;
          }
          .docx-wrapper {
            background: transparent !important;
            padding: 0 !important;
          }
          .docx-wrapper > section.docx {
            background: white !important;
            box-shadow: 0 6px 24px rgba(0,0,0,0.35) !important;
            margin-bottom: 28px !important;
            padding: 64px 72px !important;
            border-radius: 2px !important;
          }
          .loading {
            text-align: center;
            padding: 80px 20px;
            color: #f1f5f9;
            font-size: 14px;
          }
          .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top-color: #C8102E;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="topbar">
          <div class="doc-name">
            <span>📄</span>
            <span>${name}</span>
          </div>
          <div class="actions">
            <button class="btn" onclick="window.print()">Print</button>
            <a class="btn btn-download" href="${previewUrl}" download="${name}">Download Copy</a>
          </div>
        </div>
        <div class="viewer-scroll">
          <div id="viewer">
            <div class="loading" id="loading-spinner">
              <div class="spinner"></div>
              <div>Rendering Word document preview...</div>
            </div>
          </div>
        </div>
        <script>
          (async function() {
            var viewer = document.getElementById('viewer');
            try {
              var attempts = 0;
              while ((!window.docx || !window.JSZip) && attempts < 60) {
                await new Promise(function(r) { setTimeout(r, 100); });
                attempts++;
              }
              if (!window.docx) throw new Error("Document rendering engine unavailable");

              var res = await fetch('${previewUrl}');
              var blob = await res.blob();
              
              viewer.innerHTML = '';
              await window.docx.renderAsync(blob, viewer, null, {
                className: 'docx',
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                breakPages: true
              });
            } catch (e) {
              console.error("Preview render error:", e);
              viewer.innerHTML = '<div style="background:white;padding:32px;border-radius:8px;max-width:500px;margin:40px auto;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.15);"><h3 style=\\"font-size:16px;margin-bottom:8px;\\">Unable to render document preview</h3><p style=\\"font-size:13px;color:#64748b;margin-bottom:16px;\\">' + (e.message || 'Error parsing document format.') + '</p><a href=\\"${previewUrl}\\" download=\\"${name}\\" style=\\"background:#C8102E;color:white;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:12px;font-weight:600;\\">Download to View</a></div>';
            }
          })();
        </script>
      </body>
    </html>
  `);
  newWin.document.close();
}

/**
 * Trigger download for a memo file
 */
export function downloadMemoFile(memo: MemoDetails) {
  if (memo.dataUrl) {
    const link = document.createElement('a');
    link.href = memo.dataUrl;
    link.download = memo.name || 'memo-attachment.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert(`Attached memo file: ${memo.name}\n(Direct file binary storage link is not hosted on cloud storage).`);
  }
}
