export interface InternalMemoTemplate {
  id: string;
  step: string;
  title: string;
  subject: string;
  requiredFields: string[];
}

export interface InternalMemoFields {
  memoNumber: string;
  dateIssued: string;
  to: string;
  through: string;
  from: string;
  signatoryName: string;
  signatoryTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  implementationStart: string;
  implementationEnd: string;
  designation: string;
  additionalNotes: string;
}

export interface GenerateMemoRequest {
  templateId: string;
  conceptProposalId: string;
  fields: InternalMemoFields;
}

export interface GeneratedMemo {
  templateId: string;
  step: string;
  subject: string;
  html: string;
  fileName: string;
}

export function memoIssueDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}
