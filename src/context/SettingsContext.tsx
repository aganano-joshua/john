/**
 * SettingsContext.tsx
 * ==================
 * Global settings context for LinguaFlow.
 *
 * This context stores user-level preferences, most importantly the
 * "default display language". When a user sets their default language
 * (e.g. "Yoruba"), every text message they send or receive is
 * automatically translated into that language on THEIR screen only.
 *
 * The original (untranslated) message is always what gets sent over
 * the socket so each recipient can translate it into their OWN
 * preferred language independently.
 *
 * Settings are persisted to localStorage so they survive page refreshes.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { TranslationLanguage, TranslationModel } from "@/types";

/* ─── Shape of the settings object ─── */
export interface AppSettings {
  /** The language in which the user wants to SEE all messages */
  defaultLanguage: TranslationLanguage;
  /** The translation model to use for auto-translation */
  translationModel: TranslationModel;
}

/* ─── Context value exposed to consumers ─── */
interface SettingsContextType {
  settings: AppSettings;
  /** Update one or more settings fields */
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** Whether auto-translation is active (language ≠ English) */
  isAutoTranslateEnabled: boolean;
}

const STORAGE_KEY = "linguaflow_settings";

/** Sensible defaults — English means "no auto-translation" */
const DEFAULT_SETTINGS: AppSettings = {
  defaultLanguage: "English",
  translationModel: "hypa-llama3-2-8b-sft-2025-12-rvl",
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

/**
 * SettingsProvider
 * Wraps the app and provides read/write access to user settings.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  /* Load persisted settings (or fall back to defaults) */
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* corrupted storage — ignore */
    }
    return DEFAULT_SETTINGS;
  });

  /* Persist whenever settings change */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  /** Merge a partial update into the current settings */
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  /**
   * Auto-translate is only meaningful when the user's default
   * language is something other than English (the baseline).
   */
  const isAutoTranslateEnabled = settings.defaultLanguage !== "English";

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, isAutoTranslateEnabled }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to consume settings from any component.
 * Must be used inside a <SettingsProvider>.
 */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
