import { FacebookScheduleDraft } from '../types/facebookTypes';

const STORAGE_KEY = 'voltara_facebook_schedule_drafts';

const readDrafts = (): FacebookScheduleDraft[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeDrafts = (drafts: FacebookScheduleDraft[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
};

export const facebookScheduleDraftService = {
  getDrafts(): FacebookScheduleDraft[] {
    return readDrafts().sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  },

  saveDraft(draft: FacebookScheduleDraft): FacebookScheduleDraft {
    const drafts = readDrafts();
    const index = drafts.findIndex(item => item.id === draft.id);
    const next = { ...draft, updatedAt: new Date().toISOString() };
    if (index >= 0) drafts[index] = next;
    else drafts.push(next);
    writeDrafts(drafts);
    return next;
  },

  deleteDraft(id: string): void {
    writeDrafts(readDrafts().filter(item => item.id !== id));
  }
};
