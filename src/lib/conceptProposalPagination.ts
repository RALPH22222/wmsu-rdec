export const CONCEPT_PROPOSALS_PER_PAGE = 10;

export function paginateConceptProposals<T>(proposals: T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(proposals.length / CONCEPT_PROPOSALS_PER_PAGE));
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(requestedPage, totalPages)) : 1;
  const offset = (page - 1) * CONCEPT_PROPOSALS_PER_PAGE;
  const firstButton = Math.max(1, Math.min(page - 2, totalPages - 4));
  return {
    page,
    totalPages,
    items: proposals.slice(offset, offset + CONCEPT_PROPOSALS_PER_PAGE),
    start: proposals.length ? offset + 1 : 0,
    end: Math.min(offset + CONCEPT_PROPOSALS_PER_PAGE, proposals.length),
    pages: Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstButton + index),
  };
}
