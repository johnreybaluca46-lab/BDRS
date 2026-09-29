import React, { useState, useEffect } from 'react';
import './AutoUpdater.css';

export default function AutoUpdater() {
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, available, downloading, ready, error
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState({ transferred: 0, total: 0, speed: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  
  const isNativeApp = window.Capacitor !== undefined || navigator.userAgent.toLowerCase().includes('electron');
  
  useEffect(() => {
    if (!isNativeApp) return;
    
    const { ipcRenderer } = window.require ? window.require('electron') : {};
    if (!ipcRenderer) return;

    // Trigger update check after a short delay so we don't block initial render
    const checkTimeout = setTimeout(() => {
      ipcRenderer.send('check-for-updates');
    }, 5000);

    const handleUpdateAvailable = () => {
      setUpdateStatus('available');
    };

    const handleUpdateError = (event, errMessage) => {
      // If we haven't shown anything yet, we can ignore background errors like 'no internet'.
      // Only show errors if we were actively downloading.
      if (updateStatus === 'downloading') {
        setUpdateStatus('error');
        setErrorMessage(errMessage);
      }
    };

    const handleDownloadProgress = (event, progressObj) => {
      setUpdateStatus('downloading');
      setDownloadProgress(Math.round(progressObj.percent));
      setDownloadStats({
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
        speed: progressObj.bytesPerSecond || 0
      });
    };

    const handleUpdateDownloaded = () => {
      setUpdateStatus('ready');
    };

    ipcRenderer.on('update-available', handleUpdateAvailable);
    ipcRenderer.on('update-error', handleUpdateError);
    ipcRenderer.on('update-download-progress', handleDownloadProgress);
    ipcRenderer.on('update-downloaded', handleUpdateDownloaded);

    return () => {
      clearTimeout(checkTimeout);
      ipcRenderer.removeAllListeners('update-available');
      ipcRenderer.removeAllListeners('update-error');
      ipcRenderer.removeAllListeners('update-download-progress');
      ipcRenderer.removeAllListeners('update-downloaded');
    };
  }, [isNativeApp, updateStatus]);

  const handleUpdateNow = () => {
    const { ipcRenderer } = window.require ? window.require('electron') : {};
    if (ipcRenderer) {
      setUpdateStatus('downloading');
      setDownloadProgress(0);
      ipcRenderer.send('download-update');
    }
  };

  const handleLater = () => {
    setUpdateStatus('idle'); // Hide modal
  };

  const handleInstallAndRestart = () => {
    const { ipcRenderer } = window.require ? window.require('electron') : {};
    if (ipcRenderer) {
      ipcRenderer.send('install-update');
    }
  };

  const handleCloseApp = () => {
    const { ipcRenderer } = window.require ? window.require('electron') : {};
    if (ipcRenderer) {
      ipcRenderer.send('close-app');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Do not render anything if there's no active update state
  if (updateStatus === 'idle') return null;

  return (
    <div className="update-modal-overlay">
      <div className="update-modal-card">
        <h2 className="update-modal-title">New Update Available</h2>
        
        {updateStatus === 'available' && (
          <>
            <p className="update-modal-message">A new version of BDRS is available.</p>
            <div className="update-modal-actions">
              <button className="update-btn-later" onClick={handleLater}>Later</button>
              <button className="update-btn-now" onClick={handleUpdateNow}>Update Now</button>
            </div>
          </>
        )}

        {updateStatus === 'downloading' && (
          <>
            <p className="update-modal-message">Downloading update...</p>
            <div className="update-progress-bar-container">
              <div 
                className="update-progress-bar-fill" 
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <p className="update-progress-text" style={{ margin: 0, fontWeight: 'bold' }}>{downloadProgress}%</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                {formatBytes(downloadStats.transferred)} / {formatBytes(downloadStats.total)} • {formatBytes(downloadStats.speed)}/s
              </p>
            </div>
          </>
        )}

        {updateStatus === 'ready' && (
          <>
            <p className="update-modal-message">Update downloaded and ready to install.</p>
            <div className="update-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="update-btn-later" onClick={handleCloseApp}>Close App</button>
              <button className="update-btn-now" onClick={handleInstallAndRestart}>Install & Restart</button>
            </div>
          </>
        )}

        {updateStatus === 'error' && (
          <>
            <p className="update-modal-message" style={{ color: '#ef4444' }}>
              Update failed: {errorMessage}
            </p>
            <div className="update-modal-actions" style={{ justifyContent: 'center' }}>
              <button className="update-btn-later" onClick={handleLater}>Dismiss</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
