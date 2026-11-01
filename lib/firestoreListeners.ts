export function initFirestoreListeners(store: any): () => void {
  try {
    if (typeof store.getState === 'function') {
      const state = store.getState();
      if (typeof state.startRealtimeListeners === 'function') {
        state.startRealtimeListeners();
        return () => {
          if (typeof store.getState().stopRealtimeListeners === 'function') {
            store.getState().stopRealtimeListeners();
          }
        };
      }
    }
  } catch (err) {
    console.warn('initFirestoreListeners caught initialization note:', err);
  }
  return () => {};
}
