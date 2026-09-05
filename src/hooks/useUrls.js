import { useSyncExternalStore } from 'react'
import { urlStore } from '../store/urlStore'

/**
 * Subscribe a component to the in-memory URL store.
 * Re-renders whenever the stored list changes.
 */
export function useUrls() {
  return useSyncExternalStore(urlStore.subscribe, urlStore.getSnapshot)
}
