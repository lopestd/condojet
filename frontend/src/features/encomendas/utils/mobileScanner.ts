function hasScannerApi(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia)
}

export function canOpenScannerCamera(): boolean {
  return hasScannerApi()
}

export function isMobileScannerAvailable(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const navWithUaData = navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  const userAgentDataMobile = typeof navWithUaData.userAgentData === 'object' && navWithUaData.userAgentData !== null
    ? Boolean(navWithUaData.userAgentData.mobile)
    : false
  const ua = navigator.userAgent || ''
  const isMobileAgent = /android|iphone|ipad|ipod|mobile|mobi/i.test(ua)
  const touchCapable = navigator.maxTouchPoints > 1
  const isMobileViewport = window.matchMedia('(max-width: 1024px)').matches

  return userAgentDataMobile || isMobileAgent || (touchCapable && isMobileViewport)
}
