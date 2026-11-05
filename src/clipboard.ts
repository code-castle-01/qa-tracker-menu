export async function copyEvidence(blob: Blob) {
  if (
    !window.isSecureContext ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === 'undefined'
  ) {
    throw new DOMException('Clipboard unavailable', 'NotSupportedError');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
