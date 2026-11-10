import { useMemo } from 'react';
import type { Language } from './types';

const dictionaries = {
  en: {
    product: 'Data Quality Workbench', signIn: 'Sign in', summary: 'Summary', queue: 'Review queue',
    approvals: 'Approvals', audit: 'Audit trail', methods: 'Methods', settings: 'Settings',
    smsSimulator: 'SMS simulator', task: 'Task', clerk: 'Clerk', supervisor: 'Supervisor', online: 'Online',
    offline: 'Offline', syncing: 'Syncing', smart: 'Smart engine', rulesOnly: 'Rules only',
    toggleTheme: 'Toggle theme', chooseRole: 'Choose a role', placeholder: 'Placeholder page',
    smartOffline: 'Smart matching is offline. You are seeing rule-based checks only. Confidence scores are not available.',
  },
  sw: {
    product: 'Data Quality Workbench', signIn: 'Ingia', summary: 'Muhtasari', queue: 'Foleni ya ukaguzi',
    approvals: 'Idhini', audit: 'Rekodi ya ukaguzi', methods: 'Mbinu', settings: 'Mipangilio',
    smsSimulator: 'Kisimulizi cha SMS', task: 'Kazi', clerk: 'Karani', supervisor: 'Msimamizi', online: 'Mtandaoni',
    offline: 'Nje ya mtandao', syncing: 'Inasawazisha', smart: 'Injini mahiri', rulesOnly: 'Sheria pekee',
    toggleTheme: 'Badilisha mandhari', chooseRole: 'Chagua jukumu', placeholder: 'Ukurasa wa muda',
    smartOffline: 'Ulinganishaji mahiri haupatikani. Unaona ukaguzi wa sheria pekee. Alama za uaminifu hazipatikani.',
  },
} as const;

export type TranslationKey = keyof typeof dictionaries.en;
export function useT(language: Language): (key: TranslationKey) => string {
  return useMemo(() => (key: TranslationKey) => dictionaries[language][key], [language]);
}
