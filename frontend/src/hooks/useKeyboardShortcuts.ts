import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatches = shortcut.meta ? event.metaKey : true;

        return keyMatches && ctrlMatches && shiftMatches && altMatches;
      });

      if (matchingShortcut) {
        // Don't prevent default if user is typing in an input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          // Only allow shortcuts with modifiers when in input fields
          if (!matchingShortcut.ctrl && !matchingShortcut.meta && !matchingShortcut.alt) {
            return;
          }
        }

        event.preventDefault();
        matchingShortcut.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

// Predefined app shortcuts
export const APP_SHORTCUTS = {
  NEW_TASK: { key: 'n', description: 'New task' },
  NEW_PROJECT: { key: 'p', description: 'New project' },
  NEW_IDEA: { key: 'i', description: 'New idea' },
  SEARCH: { key: '/', description: 'Search' },
  TOGGLE_DARK: { key: 'd', ctrl: true, description: 'Toggle dark mode' },
  GOTO_IDEAS: { key: '1', description: 'Go to Ideas' },
  GOTO_INBOX: { key: '2', description: 'Go to Inbox' },
  GOTO_PROJECTS: { key: '3', description: 'Go to Projects' },
  HELP: { key: '?', shift: true, description: 'Show help' },
};
