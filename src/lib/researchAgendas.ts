export function proposalResearchAgendas(proposal: { researchAgendas?: string[]; thematicArea: string }): string[] {
  return [...new Set(proposal.researchAgendas?.length ? proposal.researchAgendas : [proposal.thematicArea])].filter(Boolean);
}
