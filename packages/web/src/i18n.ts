/* ==========================================================================
   packages/web/src/i18n.ts
   ========================================================================== */
import { useMemo } from 'react';
import type { Language } from './types';

const dictionaries = {
  en: {
    product: 'UnitTrace',
    signIn: 'Sign in',
    summary: 'Dashboard',
    queue: 'Records to review',
    approvals: 'Approvals',
    audit: 'Activity history',
    methods: 'Method results',
    settings: 'Settings',
    smsSimulator: 'SMS / USSD simulator',
    task: 'Task',
    clerk: 'Clerk',
    supervisor: 'Supervisor',
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing',
    smart: 'Smart engine',
    rulesOnly: 'Rules only',
    toggleTheme: 'Toggle theme',
    chooseRole: 'Choose a role',
    placeholder: 'Placeholder page',
    smartOffline:
      'Smart matching is offline. You are seeing rule-based checks only. Confidence scores are not available.',
    mainOps: 'Main Operations',
    tools: 'Tools & Diagnostics',
    operationalRole: 'Operational Role',
    signInButton: 'Sign in to UnitTrace',
    facilityLabel: 'Facility / Centre',
  },
  sw: {
    product: 'UnitTrace',
    signIn: 'Ingia',
    summary: 'Dashibodi',
    queue: 'Rekodi za kukaguliwa',
    approvals: 'Idhini',
    audit: 'Historia ya shughuli',
    methods: 'Matokeo ya mbinu',
    settings: 'Mipangilio',
    smsSimulator: 'Kisimulizi cha SMS / USSD',
    task: 'Kazi',
    clerk: 'Karani',
    supervisor: 'Msimamizi',
    online: 'Mtandaoni',
    offline: 'Nje ya mtandao',
    syncing: 'Inasawazisha',
    smart: 'Injini mahiri',
    rulesOnly: 'Sheria pekee',
    toggleTheme: 'Badilisha mandhari',
    chooseRole: 'Chagua jukumu',
    placeholder: 'Ukurasa wa muda',
    smartOffline:
      'Ulinganishaji mahiri haupatikani. Unaona ukaguzi wa sheria pekee. Alama za uaminifu hazipatikani.',
    mainOps: 'Shughuli Kuu',
    tools: 'Zana na Uchunguzi',
    operationalRole: 'Jukumu la Uendeshaji',
    signInButton: 'Ingia UnitTrace',
    facilityLabel: 'Kituo / Kituo',
  },
} as const;

export type TranslationKey = keyof typeof dictionaries.en;

export function useT(language: Language): (key: TranslationKey) => string {
  return useMemo(
    () => (key: TranslationKey) => dictionaries[language][key],
    [language],
  );
}
