/* ==========================================================================
   packages/web/src/offline.ts
   Offline PWA queue & sync powered by idb
   ========================================================================== */

export {
  getDb,
  submitDecisionWithOfflineSync,
  syncQueue,
  type QueuedDecision,
  type DecisionResult,
} from './api';
