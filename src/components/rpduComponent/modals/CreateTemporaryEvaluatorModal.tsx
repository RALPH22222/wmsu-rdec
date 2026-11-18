import { UserPlus } from 'lucide-react';
import type { CreatedTemporaryEvaluatorResult, CreateTemporaryEvaluatorInput, SendTemporaryEvaluatorInviteResult } from '../../../types';
import { ModalShell } from '../../ui/ModalShell';
import { TemporaryEvaluatorForm } from '../TemporaryEvaluatorForm';

interface CreateTemporaryEvaluatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateTemporaryEvaluatorInput) => Promise<CreatedTemporaryEvaluatorResult>;
  onInvite?: (email: string) => Promise<SendTemporaryEvaluatorInviteResult>;
}

export function CreateTemporaryEvaluatorModal({ isOpen, onClose, onCreate, onInvite }: CreateTemporaryEvaluatorModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Temporary evaluator"
      subtitle="Send an email link so the evaluator can enter their details, or create an account directly."
      icon={UserPlus}
      size="md"
    >
      <TemporaryEvaluatorForm onCreate={onCreate} onInvite={onInvite} onCancel={onClose} />
    </ModalShell>
  );
}
