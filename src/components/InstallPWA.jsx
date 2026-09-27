import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallPWA({ platform, buttonClassName }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We can only use the prompt once
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // If already installed, we might want to show a message or hide the button
  if (isInstalled) {
    return (
      <button className={buttonClassName} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
        <Download size={20} />
        Installed
      </button>
    );
  }

  // If not installable (e.g. prompt not available), fallback to an instruction or keep it active to try?
  // We'll keep the button visible but maybe it just alerts if they can't install yet
  const handleFallbackInstall = () => {
    let instruction = 'To install, use the "Add to Home Screen" or "Install App" option in your browser menu.';
    
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    if (isIOS) {
      instruction = 'To install BDRS on iOS, tap the Share icon at the bottom of Safari, then select "Add to Home Screen".';
    } else if (isAndroid) {
      instruction = 'To install BDRS on Android, tap the menu (⋮) in Chrome and select "Install app" or "Add to Home screen".';
    } else {
      instruction = 'To install on PC, click the Install icon (⤓ or ⊕) inside the address bar of Chrome/Edge.';
    }

    alert(instruction);
  };

  return (
    <button 
      className={buttonClassName} 
      onClick={isInstallable ? handleInstallClick : handleFallbackInstall}
    >
      <Download size={20} />
      Install BDRS
    </button>
  );
}
