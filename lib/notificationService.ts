export async function dispatchTrigger(triggerType: string, payload: any): Promise<void> {
  try {
    console.info(`[Notification Service] Dispatched trigger: ${triggerType}`, payload);
    // In production environment or client, dispatch notifications or browser alerts
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`NDIS Alert: ${triggerType}`, {
        body: payload?.description || payload?.title || 'An NDIS alert requires your attention.'
      });
    }
  } catch (err) {
    console.warn('dispatchTrigger failed:', err);
  }
}
