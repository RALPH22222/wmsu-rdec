import { RecipientLetters } from '../../components/RecipientLetters';

export function EvaluatorLettersPage() {
  return <div className="mx-auto max-w-7xl"><RecipientLetters
    templateCode="WMSU-RPDU-LET-003.00"
    heading="Technical review invitations"
    description="Open your RPDU invitation before beginning the assigned double-blind technical review."
    emptyText="No technical review invitation has been issued to you yet."
  /></div>;
}
