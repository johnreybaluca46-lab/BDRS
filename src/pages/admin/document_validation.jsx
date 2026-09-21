import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  History,
  Camera,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { db, auth } from '../../database/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, getDocs, where, startAfter } from 'firebase/firestore';
import { logActivity } from '../../utils/auditLogger';

import '../../lib/admin-layout.css';
import '../../lib/document-validation.css';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeaderRight from '../../components/AdminHeaderRight';

export default function DocumentValidation() {
  const [manualId, setManualId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVerificationComplete, setIsVerificationComplete] = useState(false);
  
  const [validationResult, setValidationResult] = useState(null);
  // null | { valid: boolean, type: 'VERIFIED' | 'INVALID' | 'REVOKED' | 'NOT_FOUND' | 'MISMATCH' | 'PENDING_MANUAL', message: string, record: any }
  
  const [history, setHistory] = useState([]);
  const scannerRef = useRef(null);
  
  // Pagination States
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentCursor, setCurrentCursor] = useState(null);
  const [pageHistory, setPageHistory] = useState([]); 
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Top-level cleanup for scanner
  useEffect(() => {
    document.title = "Admin | Document Validation";
    return () => stopScannerSafely();
  }, []);

  // Fetch validation history with pagination
  useEffect(() => {
    // Fetch rowsPerPage + 1 to determine if there is a next page
    let q = query(collection(db, 'document_validations'), orderBy('timestamp', 'desc'), limit(rowsPerPage + 1));
    if (currentCursor) {
      q = query(q, startAfter(currentCursor));
    }
    
    const unsub = onSnapshot(q, (snapshot) => {
      const hist = [];
      const docsCount = snapshot.docs.length;
      
      // Determine if there's a next page
      const more = docsCount > rowsPerPage;
      setHasMore(more);

      // Only process and display up to `rowsPerPage` items
      const displayDocs = more ? snapshot.docs.slice(0, rowsPerPage) : snapshot.docs;
      
      displayDocs.forEach(d => {
        hist.push({ id: d.id, ...d.data() });
      });
      setHistory(hist);
      
      if (displayDocs.length > 0) {
        setLastVisibleDoc(displayDocs[displayDocs.length - 1]);
      } else {
        setLastVisibleDoc(null);
      }
    });

    return () => unsub();
  }, [rowsPerPage, currentCursor]);

  const handleNextPage = () => {
    if (hasMore && lastVisibleDoc) {
      setPageHistory(prev => [...prev, currentCursor]); 
      setCurrentCursor(lastVisibleDoc);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newHistory = [...pageHistory];
      const prevCursor = newHistory.pop(); 
      setPageHistory(newHistory);
      setCurrentCursor(prevCursor || null); 
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
    setCurrentCursor(null);
    setPageHistory([]);
  };

  const stopScannerSafely = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        // Ignore cleanly
      }
      try {
        scannerRef.current.clear();
      } catch (err) {}
      scannerRef.current = null;
    }
  };

  const handleScanAnother = async () => {
    setValidationResult(null);
    setScannedData(null);
    setManualId('');
    setIsVerificationComplete(false);
    
    await stopScannerSafely();
    setIsCameraActive(true);
  };

  useEffect(() => {
    let isMounted = true;

    if (!isCameraActive) {
      stopScannerSafely();
      return;
    }

    const startScanner = async () => {
      // Small delay prevents React 18 Strict Mode double-initialization bugs
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isMounted) return;

      // Ensure cleanup before starting
      await stopScannerSafely();
      if (!isMounted) return;

      try {
        const reader = document.getElementById("qr-reader");
        if (reader) reader.innerHTML = '';

        scannerRef.current = new Html5Qrcode("qr-reader");
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          onScanFailure
        );
      } catch (err) {
        console.error("Camera failed to start automatically: ", err);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScannerSafely();
    };
  }, [isCameraActive]);

  const onScanSuccess = async (decodedText) => {
    // Stop scanning immediately to prevent multiple callbacks
    await stopScannerSafely();
    setIsCameraActive(false);

    try {
      const data = JSON.parse(decodedText);
      if (data && data.id) {
        setScannedData(data);
        handleVerification(data.id, data.token);
      } else {
        throw new Error("Invalid QR format");
      }
    } catch (e) {
      setValidationResult({
        valid: false,
        type: 'INVALID',
        message: 'This QR code does not correspond to an official BDRS document.',
        record: null
      });
    }
  };

  const onScanFailure = (error) => {
    // handle scan failure, usually better to ignore and keep scanning
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    const fullId = `BLN-${manualId.trim()}`;
    handleVerification(fullId, null);
  };

  const handleVerification = async (requestId, token) => {
    setIsSearching(true);
    setValidationResult(null);
    try {
      const docRef = doc(db, 'requests', requestId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setValidationResult({
          valid: false,
          type: 'NOT_FOUND',
          message: 'Document Request ID not found in the official records.',
          record: null
        });
        return;
      }

      const recordData = docSnap.data();

      // Check if deleted/trashed
      if (recordData.status === 'Trash' || recordData.status === 'Deleted') {
        setValidationResult({
          valid: false,
          type: 'REVOKED',
          message: 'This document request was rejected or revoked.',
          record: { id: docSnap.id, ...recordData }
        });
        return;
      }

      // If a token was provided via QR, verify it
      if (token && recordData.verificationToken !== token) {
        setValidationResult({
          valid: false,
          type: 'INVALID',
          message: 'The security token in the QR code is invalid or expired.',
          record: { id: docSnap.id, ...recordData }
        });
        return;
      }

      // Check if it was already verified
      const valQuery = query(
        collection(db, 'document_validations'), 
        where('requestId', '==', requestId),
        where('status', '==', 'VERIFIED'),
        limit(1)
      );
      const valSnap = await getDocs(valQuery);
      
      if (!valSnap.empty) {
        const prevData = valSnap.docs[0].data();
        setValidationResult({
          valid: false,
          type: 'ALREADY_VERIFIED',
          message: 'This document has already been verified in the system.',
          record: { id: docSnap.id, ...recordData },
          previousValidation: prevData
        });
        return;
      }

      // Record is valid, wait for manual admin verification
      setValidationResult({
        valid: true,
        type: 'PENDING_MANUAL',
        message: 'Record retrieved successfully. Please compare with the physical document.',
        record: { id: docSnap.id, ...recordData }
      });
      
    } catch (error) {
      console.error("Verification error:", error);
      Swal.fire('Error', 'An error occurred while communicating with the database.', 'error');
    } finally {
      setIsSearching(false);
      setManualId('');
    }
  };

  const submitValidation = async (status, reason = '') => {
    if (!validationResult || !validationResult.record) return;
    const record = validationResult.record;
    
    try {
      const adminRole = localStorage.getItem('cachedAdminRole') || 'System Administrator';
      
      // Save to document_validations
      await addDoc(collection(db, 'document_validations'), {
        requestId: record.id,
        residentName: record.name || record.fullName || 'Unknown',
        documentType: record.type || 'Unknown Document',
        status: status,
        reason: reason,
        verifiedBy: adminRole,
        timestamp: serverTimestamp()
      });

      // Log activity
      await logActivity({
        action: 'Document Validated',
        targetType: 'document_validation',
        targetId: record.id,
        description: `Marked document ${record.id} as ${status}${reason ? ` (Reason: ${reason})` : ''}`
      });

      Swal.fire({
        title: status === 'VERIFIED' ? 'Verified!' : 'Marked as Invalid',
        text: `The document has been successfully recorded as ${status}.`,
        icon: status === 'VERIFIED' ? 'success' : 'warning'
      });

      setValidationResult(prev => ({
        ...prev,
        type: status,
        message: reason || 'Document verified successfully.'
      }));
      setIsVerificationComplete(true);
    } catch (error) {
      console.error("Error saving validation:", error);
      Swal.fire('Error', 'Failed to save verification record.', 'error');
    }
  };

  const handleVerifyConfirm = () => {
    Swal.fire({
      title: 'Confirm Verification',
      text: "Does the presented document exactly match this official record?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#38a169',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, Verify Document'
    }).then((result) => {
      if (result.isConfirmed) {
        submitValidation('VERIFIED');
      }
    });
  };

  const handleInvalidConfirm = () => {
    Swal.fire({
      title: 'Mark as Invalid',
      text: 'Please select the reason for marking this document as invalid:',
      input: 'select',
      inputOptions: {
        'INFORMATION_MISMATCH': 'Information Mismatch (Data was altered)',
        'REVOKED': 'Document was Revoked / Rejected',
        'FORGED': 'Forged / Fake Document',
        'OTHER': 'Other Reason'
      },
      inputPlaceholder: 'Select a reason',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      inputValidator: (value) => {
        if (!value) return 'You need to choose a reason!';
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        submitValidation(result.value);
      }
    });
  };

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main">
        <header className="admin-header">
          <h1>Document Validation</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        <div className="document-validation-container">
          
          <div className="validation-main-grid">
            
            {/* SCANNER SECTION */}
            <div className="scanner-card">
              <h2 className="scanner-title"><Camera size={20} /> Scan QR Code</h2>
              
              {isVerificationComplete ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a5568' }}>
                  <CheckCircle size={48} style={{ color: validationResult?.type === 'VERIFIED' ? '#48bb78' : '#e53e3e', marginBottom: '15px' }} />
                  <h3 style={{ margin: '0 0 10px 0' }}>Verification Logged</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>Review the result or scan the next document.</p>
                </div>
              ) : (
                <>
                  {isCameraActive ? (
                    <>
                      <div className="scanner-viewport" id="qr-reader"></div>
                      <button 
                        onClick={() => setIsCameraActive(false)}
                        style={{ width: '100%', padding: '10px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                      >
                        Close Camera
                      </button>
                    </>
                  ) : (
                    <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', border: '2px dashed #cbd5e0', borderRadius: '8px', backgroundColor: '#f8fafc', marginBottom: '10px' }}>
                      <button 
                        onClick={() => setIsCameraActive(true)}
                        style={{ 
                          padding: '12px 24px', background: '#3182ce', color: '#fff', 
                          border: 'none', borderRadius: '6px', fontWeight: 600, 
                          display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2b6cb0'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3182ce'}
                      >
                        <Camera size={20} />
                        Open Camera
                      </button>
                    </div>
                  )}
                </>
              )}
              
              <div className="manual-search-divider">OR</div>
              
              <form onSubmit={handleManualSearch} className="manual-search-input-group">
                <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #cbd5e0', borderRadius: '6px', flex: 1, backgroundColor: 'white', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f7fafc', padding: '0 12px', borderRight: '1px solid #cbd5e0', color: '#4a5568', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                    BLN-
                  </div>
                  <input 
                    type="text" 
                    className="manual-search-input" 
                    style={{ border: 'none', borderRadius: '0', flex: 1, outline: 'none' }}
                    placeholder="1234-5678" 
                    value={manualId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9-]/g, '');
                      setManualId(val);
                    }}
                  />
                </div>
                <button type="submit" className="btn-search" disabled={isSearching || !manualId.trim()}>
                  {isSearching ? '...' : <Search size={18} />}
                </button>
              </form>
            </div>

            {/* RESULT SECTION */}
            <div className="result-card">
              {!validationResult ? (
                <div className="result-placeholder">
                  <ShieldCheck size={64} style={{ color: '#cbd5e0', marginBottom: '16px' }} />
                  <h3 style={{ margin: '0 0 8px 0', color: '#4a5568' }}>Waiting for Scan</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>Scan a document's QR code or manually enter a Request ID to retrieve the official record.</p>
                </div>
              ) : (
                <>
                  <div className={`result-status-banner ${validationResult.type === 'VERIFIED' ? 'valid' : validationResult.type === 'PENDING_MANUAL' ? '' : validationResult.type === 'ALREADY_VERIFIED' ? 'warning' : 'invalid'}`} style={{ backgroundColor: validationResult.type === 'VERIFIED' ? '#c6f6d5' : validationResult.type === 'PENDING_MANUAL' ? '#ebf8ff' : validationResult.type === 'ALREADY_VERIFIED' ? '#feebc8' : '#fed7d7' }}>
                    {validationResult.type === 'VERIFIED' ? <CheckCircle size={24} color="#2f855a" /> : validationResult.type === 'PENDING_MANUAL' ? <Search size={24} color="#2b6cb0" /> : validationResult.type === 'ALREADY_VERIFIED' ? <AlertTriangle size={24} color="#dd6b20" /> : <XCircle size={24} color="#c53030" />}
                    <div>
                      <h3 className="result-status-title" style={{ color: validationResult.type === 'VERIFIED' ? '#2f855a' : validationResult.type === 'PENDING_MANUAL' ? '#2b6cb0' : validationResult.type === 'ALREADY_VERIFIED' ? '#dd6b20' : '#c53030' }}>
                        {validationResult.type === 'VERIFIED' ? 'Document Successfully Verified' : validationResult.type === 'PENDING_MANUAL' ? 'QR Recognized' : validationResult.type === 'ALREADY_VERIFIED' ? 'Previously Verified' : 'Document Marked as Invalid'}
                      </h3>
                      {validationResult.type !== 'VERIFIED' && (
                        <p className="result-status-desc" style={{ color: validationResult.type === 'PENDING_MANUAL' ? '#2b6cb0' : validationResult.type === 'ALREADY_VERIFIED' ? '#dd6b20' : '#c53030' }}>{validationResult.message}</p>
                      )}
                    </div>
                  </div>

                  {validationResult.record && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ margin: '16px 0', fontSize: '1rem', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        {isVerificationComplete ? 'Verification Summary' : 'Official BDRS Record'}
                      </h4>
                      
                      <div className="result-details-grid">
                        <div className="result-detail-item">
                          <span className="result-detail-label">Request ID</span>
                          <span className="result-detail-value">{validationResult.record.id}</span>
                        </div>
                        <div className="result-detail-item">
                          <span className="result-detail-label">Resident Name</span>
                          <span className="result-detail-value">{validationResult.record.name || validationResult.record.fullName || 'Unknown'}</span>
                        </div>
                        <div className="result-detail-item">
                          <span className="result-detail-label">Document Type</span>
                          <span className="result-detail-value">{validationResult.record.type || 'Unknown'}</span>
                        </div>
                        
                        {isVerificationComplete ? (
                          <>
                            {validationResult.type !== 'VERIFIED' && (
                              <div className="result-detail-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="result-detail-label">Reason</span>
                                <span className="result-detail-value" style={{ color: '#e53e3e', fontWeight: 'bold' }}>{validationResult.message}</span>
                              </div>
                            )}
                            <div className="result-detail-item">
                              <span className="result-detail-label">Verified By</span>
                              <span className="result-detail-value">{auth.currentUser?.displayName || 'Secretary'}</span>
                            </div>
                            <div className="result-detail-item">
                              <span className="result-detail-label">Date Logged</span>
                              <span className="result-detail-value">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                          </>
                        ) : validationResult.type === 'ALREADY_VERIFIED' ? (
                          <>
                            <div className="result-detail-item">
                              <span className="result-detail-label">Last Verified By</span>
                              <span className="result-detail-value">{validationResult.previousValidation?.verifiedBy || 'Unknown'}</span>
                            </div>
                            <div className="result-detail-item">
                              <span className="result-detail-label">Last Verified</span>
                              <span className="result-detail-value">
                                {validationResult.previousValidation?.timestamp 
                                  ? new Date(validationResult.previousValidation.timestamp.seconds * 1000).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'Unknown'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="result-detail-item">
                              <span className="result-detail-label">Date Issued</span>
                              <span className="result-detail-value">
                                {validationResult.record.approvedAt 
                                  ? new Date(validationResult.record.approvedAt.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                  : 'Unknown'}
                              </span>
                            </div>
                            <div className="result-detail-item">
                              <span className="result-detail-label">Document Status</span>
                              <span className="result-detail-value" style={{ textTransform: 'capitalize' }}>
                                {validationResult.record.status === 'Processing Payment' ? 'Processing' : validationResult.record.status}
                              </span>
                            </div>
                            <div className="result-detail-item">
                              <span className="result-detail-label">Purpose</span>
                              <span className="result-detail-value">{validationResult.record.purpose || 'N/A'}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {validationResult.type === 'PENDING_MANUAL' && !isVerificationComplete && (
                        <div className="result-actions">
                          <button className="btn-verify" onClick={handleVerifyConfirm}>
                            <CheckCircle size={18} /> Verify Document
                          </button>
                          <button className="btn-invalid" onClick={handleInvalidConfirm}>
                            <XCircle size={18} /> Mark as Invalid
                          </button>
                        </div>
                      )}

                      {(isVerificationComplete || validationResult.type === 'ALREADY_VERIFIED') && (
                        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                          <button 
                            onClick={handleScanAnother}
                            style={{ 
                              width: '100%', padding: '14px', background: '#3182ce', color: '#fff', 
                              border: 'none', borderRadius: '6px', fontWeight: 600, 
                              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2b6cb0'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3182ce'}
                          >
                            <Camera size={20} />
                            Scan Another Document
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* HISTORY SECTION */}
          <div className="history-section">
            <div className="history-header">
              <h2 className="history-title"><History size={20} /> Verification History</h2>
            </div>
            
            <div className="doc-table-wrapper">
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                  No verification history found.
                </div>
              ) : (
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Request ID</th>
                      <th>Resident</th>
                      <th>Document</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th>Verified By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => (
                      <tr key={item.id}>
                        <td>
                          {item.timestamp 
                            ? new Date(item.timestamp.seconds * 1000).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Unknown'}
                        </td>
                        <td style={{ color: '#38a169', fontWeight: 'bold' }}>{item.requestId}</td>
                        <td>{item.residentName}</td>
                        <td>{item.documentType}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-badge ${item.status === 'VERIFIED' ? 'status-completed' : item.status.toLowerCase()}`}>
                            {item.status === 'VERIFIED' ? 'Verified' : item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{item.verifiedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            
            {history.length > 0 && (
              <div className="doc-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div className="doc-pagination-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span>Showing {history.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {(currentPage - 1) * rowsPerPage + history.length} entries</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem', color: '#4a5568' }}>Rows:</label>
                    <select 
                      value={rowsPerPage} 
                      onChange={handleRowsPerPageChange}
                      style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        border: '1px solid #cbd5e0', 
                        backgroundColor: 'white', 
                        color: '#4a5568', 
                        outline: 'none', 
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                <div className="pagination-controls">
                  <button 
                    className="page-btn"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>
                  
                  <button className="page-btn active">
                    {currentPage}
                  </button>
                  
                  <button 
                    className="page-btn"
                    onClick={handleNextPage}
                    disabled={!hasMore}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
