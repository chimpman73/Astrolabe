import { useState, useEffect } from 'react';

export function useFontsLoaded(): boolean {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    } else {
      setFontsLoaded(true); // Fallback if document.fonts is not available
    }
  }, []);

  return fontsLoaded;
}
