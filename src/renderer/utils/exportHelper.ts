/**
 * Shared utility to handle canvas-to-PNG export via Electron IPC
 * or falling back to raw browser download, triggering custom store toasts for feedback.
 */
export const saveCanvasExport = async (
  dataUrl: string,
  defaultName: string,
  label: string,
  setToast: (toast: { type: 'success' | 'error'; text: string } | null) => void
): Promise<void> => {
  if (window.astrolabeAPI) {
    try {
      const res = await window.astrolabeAPI.exportPngFile(dataUrl, defaultName);
      if (res.success && res.data) {
        setToast({
          type: 'success',
          text: `Successfully exported ${label} to: ${res.data}`,
        });
      } else {
        setToast({
          type: 'error',
          text: `Export failed: ${res.error || 'Unknown IPC Error'}`,
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        text: `IPC Export Exception: ${err.message || err}`,
      });
    }
  } else {
    // Fallback: Web browser download link trigger
    try {
      const link = document.createElement('a');
      link.download = defaultName;
      link.href = dataUrl;
      link.click();
      setToast({
        type: 'success',
        text: `Successfully downloaded ${label} via web browser fallback.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        text: `Browser download fallback failed: ${err.message || err}`,
      });
    }
  }
};
