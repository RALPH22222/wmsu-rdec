import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DocxPreview } from '../components/ui/DocxPreview';
import { documentPreviewKind } from '../lib/documentPreview';

export function DocumentPreviewPage() {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get('url') || '';
  const fileName = searchParams.get('name') || 'Document';
  const kind = documentPreviewKind(fileName || rawUrl);

  useEffect(() => {
    document.title = `${fileName} - Document Preview`;
  }, [fileName]);

  if (!rawUrl) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#323639] p-6 text-sm text-slate-300">
        <p>No document URL provided for preview.</p>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="h-screen w-screen bg-[#525659]">
        <iframe src={rawUrl} title={fileName} className="h-full w-full border-0" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#525659]">
      <DocxPreview
        url={rawUrl}
        fileName={fileName}
        title={fileName}
        isFullPage
        className="h-screen w-full"
      />
    </div>
  );
}

export default DocumentPreviewPage;
