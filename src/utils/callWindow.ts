import type { CallForProposals } from '../types';

export const callDateToday = (now = Date.now()) => new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
export const callStartAt = (call: CallForProposals) =>
  `${call.windowStartAt ? callDateToday(Date.parse(call.windowStartAt)) : call.startDate}T00:00:00+08:00`;
export const callEndAt = (call: CallForProposals) =>
  `${call.windowEndAt ? callDateToday(Date.parse(call.windowEndAt)) : call.endDate}T23:59:59.999+08:00`;

export const applyCallWindow = (call: CallForProposals, now = Date.now()): CallForProposals => {
  const rawStatus = String(call.rawStatus || call.status).toUpperCase();
  const published = ['OPEN', 'ACTIVE'].includes(rawStatus);
  const start = Date.parse(callStartAt(call));
  const end = Date.parse(callEndAt(call));
  const scheduledOpen = published && start > now;
  return { ...call, rawStatus, scheduledOpen,
    status: published && (scheduledOpen || end < now || !Number.isFinite(start) || !Number.isFinite(end)) ? 'CLOSED' : call.rawStatus ? rawStatus as CallForProposals['status'] : call.status,
  };
};

export const canReopenCall = (call: CallForProposals, now = Date.now()) => {
  const window = applyCallWindow(call, now);
  return String(window.status).toUpperCase() === 'CLOSED' && !window.scheduledOpen;
};
