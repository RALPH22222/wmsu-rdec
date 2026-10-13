// Steps 7.1 (assign/remove evaluators) and 7.6 (revision cross-check) belong to the RPDU Head.
// These strings are the backend's 403 messages (requireRpduHead in rpduRoutes.js); headOnly.test.ts pins them.
export const HEAD_ONLY_ASSIGN = 'Only the RPDU Head can assign or remove evaluators.';
export const HEAD_ONLY_CHECK = 'Only the RPDU Head can cross-check revisions.';
