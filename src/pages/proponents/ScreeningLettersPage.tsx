import { RecipientLetters } from '../../components/RecipientLetters';

export default function ScreeningLettersPage() {
  return <div className="mx-auto max-w-7xl">
    <RecipientLetters
      templateCode="WMSU-RPDU-LET-001.01"
      heading="Screening result letters"
      description="View the proposals for which RPDU has issued an official screening result letter."
      emptyText="No screening result letter has been issued for your proposals yet."
    />
  </div>;
}
