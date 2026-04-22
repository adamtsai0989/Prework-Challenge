export function useDebugMode() {
  return new URLSearchParams(window.location.search).get('debug') === 'true';
}
