import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'react-qr-code';
import { renderToString } from 'react-dom/server';
import { X, CheckCircle, XCircle, FileText, Calendar, Clock, DollarSign, User, MapPin, Hourglass, Upload, Send, Printer, Download } from 'lucide-react';
import { doc, getDoc, updateDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../database/firebase';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';
import Logo from '../assets/logo/barangay buluan seal.png';
import ProvincialSeal from '../assets/logo/provincial seal.png';
import '../lib/my-requests.css';
import { generateDocumentHTML, resolveDocumentTemplateId } from '../utils/documentGenerator';
import NetworkCheckModal from './NetworkCheckModal';

const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'processing': return { bg: '#ebf8ff', text: '#3182ce' };
      case 'approved': return { bg: '#f0fff4', text: '#38a169' };
      case 'completed': return { bg: '#f0fff4', text: '#38a169' };
      case 'trash': return { bg: '#fff5f5', text: '#e53e3e' };
      case 'pending': return { bg: '#fffff0', text: '#d69e2e' };
      default: return { bg: '#edf2f7', text: '#4a5568' };
    }
  };

  const statusColors = getStatusColor(request.status);

  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [paymentMethodName, setPaymentMethodName] = useState(null);
  const [paymentAccountName, setPaymentAccountName] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState(null);
  
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showNetworkCheck, setShowNetworkCheck] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if ((request.status?.toLowerCase() === 'approved' || request.status?.toLowerCase() === 'completed') && request.deliveryMethod === 'Online PDF') {
        try {
          const docRef = doc(db, 'settings', 'general');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSettings(docSnap.data());
            if (docSnap.data().documents) {
              const docs = docSnap.data().documents;
              const normalizedId = resolveDocumentTemplateId(request.type);
              const match = docs.find(d => 
                d.id === normalizedId ||
                d.title === request.type || 
                d.name === request.type
              );
              if (match) {
                if (match.qrCodeUrl) setQrCodeUrl(match.qrCodeUrl);
                if (match.paymentMethodName) setPaymentMethodName(match.paymentMethodName);
                if (match.paymentAccountName) setPaymentAccountName(match.paymentAccountName);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching settings:", error);
        }
      }
    };
    fetchSettings();
  }, [request]);

  useEffect(() => {
    if (request?.autoDownload && settings && !isDownloading) {
      const runAutoDownload = async () => {
        await handleDownloadPDF();
        if (onClose) onClose();
      };
      runAutoDownload();
    }
  }, [request, settings, isDownloading]);

  const handleSendBack = async () => {
    if (!proofFile) {
      Swal.fire('Missing Proof', 'Please upload your proof of payment.', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const base64Url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(proofFile);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG with 0.6 quality to stay well under 1MB Firestore limit
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          };
          img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
      });

      const reqRef = doc(db, 'requests', request.id);
      await updateDoc(reqRef, {
        proofOfPaymentUrl: base64Url,
        referenceNumber: referenceNumber,
        status: 'Processing Payment'
      });

      const notifRef = doc(collection(db, "notifications"));
      await setDoc(notifRef, {
        title: "Payment Proof Submitted",
        message: `${request.name || request.fullName || 'A resident'} has submitted proof of payment for their ${request.type || 'document request'}.`,
        type: "PAYMENT_PROOF",
        requestId: request.id,
        timestamp: serverTimestamp(),
        read: false
      });

      const residentNotifRef = doc(collection(db, "notifications"));
      await setDoc(residentNotifRef, {
        title: "Proof of Payment Sent",
        message: `Your proof of payment for ${request.type || 'document request'} has been sent successfully and is currently under review.`,
        type: "PAYMENT_PROOF_SENT",
        userId: request.userId || (auth.currentUser ? auth.currentUser.uid : 'unknown'),
        requestId: request.id,
        timestamp: serverTimestamp(),
        read: false
      });

      Swal.fire('Sent successfully', 'Your proof of payment is now processing.', 'success');
      onClose();
    } catch (error) {
      console.error("Error uploading proof:", error);
      Swal.fire('Upload Failed', `Failed to submit proof of payment. Error: ${error.message || error}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormattedTemplate = () => {
    try {
      const { html } = generateDocumentHTML(request, settings);
      return html;
    } catch (error) {
      console.error("Template generation error:", error.message);
      return null;
    }
  };

  const handleViewDocument = () => {
    const formatted = getFormattedTemplate();
    if (!formatted) {
      Swal.fire('Error', 'Could not generate document template.', 'error');
      return;
    }
    setPreviewContent(formatted);
    setShowPreview(true);
  };

  const handleDownloadPDF = async () => {
    const formatted = getFormattedTemplate();
    if (!formatted) {
      Swal.fire('Error', 'Could not generate document template.', 'error');
      return;
    }
    
    // We update Firestore IMMEDIATELY to prevent multiple clicks or bypasses
    try {
      const reqRef = doc(db, 'requests', request.id);
      await updateDoc(reqRef, {
        pdfDownloaded: true
      });
      // Update local state to hide button immediately
      request.pdfDownloaded = true;
    } catch (err) {
      console.error("Failed to mark document as downloaded:", err);
      Swal.fire('Error', 'Failed to initialize download. Please try again.', 'error');
      return;
    }

    setIsDownloading(true);
    
    const qrHtml = request?.verificationToken 
      ? renderToString(<QRCode value={JSON.stringify({ id: request.id, token: request.verificationToken })} size={80} level="H" />)
      : '';

    // Create a temporary container off-screen to render the PDF content
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="width: 210mm; min-height: 296mm; max-height: 296mm; overflow: hidden; background-color: white; padding: 40px; box-sizing: border-box; position: relative; display: flex; flex-direction: column;">
        <div style="border: 3px double #2d3748; padding: 40px; flex: 1; box-sizing: border-box; position: relative; display: flex; flex-direction: column;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; pointer-events: none; z-index: 1;">
            <img src="${Logo}" style="width: 400px; height: 400px;" />
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; z-index: 2; position: relative;">
            <div style="width: 80px; height: 80px;"><img src="${Logo}" style="width: 100%; height: 100%; object-fit: contain;" /></div>
            <div style="text-align: center; flex: 1; padding: 0 20px;">
              <div style="font-size: 10pt; margin-bottom: 2px;">Republic of the Philippines</div>
              <div style="font-size: 10pt; margin-bottom: 2px;">Province of Zamboanga Sibugay</div>
              <div style="font-size: 10pt; margin-bottom: 2px;">Municipality of Ipil</div>
              <div style="font-size: 12pt; font-weight: bold; margin-bottom: 8px;">Barangay Buluan</div>
              <div style="font-size: 10pt; font-style: italic;">OFFICE OF the BARANGAY CAPTAIN</div>
            </div>
            <div style="width: 80px; height: 80px;"><img src="${ProvincialSeal}" style="width: 100%; height: 100%; object-fit: contain;" /></div>
          </div>
          
          <h1 style="text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 20px 0 40px 0; letter-spacing: 1px; color: #1a202c; z-index: 2; position: relative;">
            ${request.type}
          </h1>
          
          <div style="font-size: 11pt; line-height: 1.8; color: #2d3748; text-align: justify; flex: 1; z-index: 2; position: relative; white-space: pre-wrap;">${formatted}</div>
          
          <div style="margin-top: 60px; display: flex; justify-content: space-between; z-index: 2; position: relative;">
            <div style="text-align: center; width: 250px;">
              <div style="border-bottom: 1px solid #1a202c; margin-bottom: 5px; height: 40px; position: relative;">
                ${settings?.secretarySignatureUrl ? `<img src="${settings.secretarySignatureUrl}" style="height: 60px; object-fit: contain; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 10;" />` : ''}
              </div>
              <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">${settings?.secretary || "BARANGAY SECRETARY"}</div>
              <div style="font-size: 10pt;">Barangay Secretary</div>
            </div>
            
            <div style="text-align: center;">
              ${qrHtml}
              ${qrHtml ? '<div style="font-size: 8pt; margin-top: 5px; color: #4a5568;">Scan to verify</div>' : ''}
            </div>

            <div style="text-align: center; width: 250px;">
              <div style="border-bottom: 1px solid #1a202c; margin-bottom: 5px; height: 40px; position: relative;">
                ${settings?.captainSignatureUrl ? `<img src="${settings.captainSignatureUrl}" style="height: 60px; object-fit: contain; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 10;" />` : ''}
              </div>
              <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">${settings?.captain || "HON. JUAN DELA CRUZ"}</div>
              <div style="font-size: 10pt;">Barangay Captain</div>
            </div>
          </div>
          
          ${settings?.footerNote ? `<div style="margin-top: 40px; font-size: 9pt; color: #4a5568; text-align: center; font-family: serif; font-style: italic; z-index: 2; position: relative;">${settings.footerNote}</div>` : ''}

        </div>
      </div>
    `;

    const opt = {
      margin:       0,
      filename:     `${request.type}_${request.id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
      setIsDownloading(false);
    }).catch(err => {
      console.error(err);
      setIsDownloading(false);
    });
  };

  const formattedDate = request.timestamp 
    ? new Date(request.timestamp.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown Date';

  return createPortal(
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999,
      display: request?.autoDownload ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="modal-content" style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative',
        padding: 0,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '30px 30px 0', background: '#fff', zIndex: 10, flexShrink: 0 }}>
          <div style={{ paddingBottom: '20px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="modal-title" style={{ margin: '0 0 4px 0', color: '#2d3748' }}>{request.type}</h2>
              <div style={{ fontSize: '0.875rem', color: '#718096' }}>Request #{request.id}</div>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
              color: '#a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', transition: 'background 0.2s'
            }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 30px 30px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {/* Status Banner */}
          <div className="modal-status-banner" style={{
            backgroundColor: statusColors.bg, color: statusColors.text
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              {request.expired ? <Hourglass size={20} /> : request.status === 'Trash' ? <XCircle size={20} /> : request.status === 'Pending' ? <Clock size={20} /> : <CheckCircle size={20} />}
              Status: {request.status === 'Completed' ? 'Paid' : request.expired ? 'Expired' : request.status === 'Trash' ? 'Rejected' : request.status}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              Fee: ₱{request.totalFee || '0.00'}
            </div>
          </div>

          <div className="modal-details-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Requested On
              </span>
              <span style={{ color: '#2d3748', fontWeight: '500' }}>{formattedDate}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> Purpose
              </span>
              <span style={{ color: '#2d3748', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{request.purpose || 'Not specified'}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Applicant
              </span>
              <span style={{ color: '#2d3748', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{request.fullName || 'Unknown'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} /> Address
              </span>
              <span style={{ color: '#2d3748', fontWeight: '500', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{request.address || 'Not specified'}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #edf2f7', margin: '8px 0' }}></div>

          <div>
            <h3 style={{ fontSize: '1rem', color: '#4a5568', margin: '0 0 12px 0' }}>Request Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {request.copies && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#718096' }}>Copies</span>
                  <span style={{ fontWeight: '500' }}>{request.copies}</span>
                </div>
              )}
              {request.idType && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#718096' }}>ID Type</span>
                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{request.idType.replace('_', ' ')}</span>
                </div>
              )}
              {request.contactNumber && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#718096' }}>Contact Number</span>
                  <span style={{ fontWeight: '500' }}>{request.contactNumber}</span>
                </div>
              )}
              {request.deliveryMethod && request.deliveryMethod !== 'N/A' && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#718096' }}>Payment Method</span>
                  <span style={{ fontWeight: '500' }}>{request.deliveryMethod === 'Barangay Pickup' ? 'Barangay Pick up' : (request.deliveryMethod === 'Online PDF' ? 'Online Pick up' : request.deliveryMethod)}</span>
                </div>
              )}
            </div>
            
            {request.status?.toLowerCase() === 'approved' && request.approvedAt && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#c53030', textTransform: 'uppercase' }}>Expiration Countdown</h4>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#9b2c2c' }}>
                  {(() => {
                    const approvedDate = request.approvedAt.toDate ? request.approvedAt.toDate() : new Date(request.approvedAt.seconds * 1000);
                    const expiryDate = new Date(approvedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const now = new Date();
                    const diffTime = expiryDate - now;
                    if (diffTime <= 0) return 'Expired';
                    
                    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    return `${days} days, ${hours} hours remaining`;
                  })()}
                </div>
              </div>
            )}

            {(request.status?.toLowerCase() === 'trash' || request.status?.toLowerCase() === 'rejected') && !request.expired && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#c53030', textTransform: 'uppercase', fontWeight: '700' }}>Reason for Rejection</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#9b2c2c', fontWeight: '500', lineHeight: 1.5 }}>
                  {request.rejectionReason || 'No specific reason provided. Please contact the barangay hall for details.'}
                </p>
              </div>
            )}

            {request.status?.toLowerCase() === 'completed' && request.deliveryMethod === 'Online PDF' && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#276749', textTransform: 'uppercase', fontWeight: '700' }}>Document Ready</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#2f855a', fontWeight: '500', lineHeight: 1.5 }}>
                  Your document has been processed and is ready for download. Please click the button below to view or download your PDF document.
                </p>
              </div>
            )}

            {/* QR Code and Proof of Payment Upload */}
            {request.status?.toLowerCase() === 'approved' && request.deliveryMethod === 'Online PDF' && parseFloat(request.totalFee || 0) !== 0 && (
              <div style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#2d3748' }}>
                  Online Payment {paymentMethodName ? `(${paymentMethodName})` : ''}
                </h4>
                
                {qrCodeUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Please scan the QR code to pay the fee.</p>
                    <img src={qrCodeUrl} alt="Payment QR Code" style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    {paymentAccountName && (
                      <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#4a5568', background: '#e2e8f0', padding: '6px 12px', borderRadius: '4px', fontWeight: '500' }}>
                        Account Name: <span style={{ fontWeight: 'bold' }}>{paymentAccountName}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>No QR code available for this document. Please contact the barangay hall.</p>
                )}

                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '8px' }}>Upload Proof of Payment</label>
                  <div style={{ position: 'relative', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '16px', textAlign: 'center', backgroundColor: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#3182ce'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                    <Upload size={24} color="#a0aec0" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 10px' }}>
                      {proofFile ? proofFile.name : "Click to upload Proof of Payment"}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setProofFile(e.target.files[0])} 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                    />
                  </div>
                  
                  <div style={{ marginTop: '15px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '8px' }}>Reference Number (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Enter Reference Number" 
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      style={{ fontSize: '0.85rem', width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }} 
                      onFocus={(e) => { e.target.style.borderColor = '#3182ce'; e.target.style.boxShadow = '0 0 0 1px #3182ce'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {request.status === 'Processing Payment' && request.proofOfPaymentUrl && (
              <div style={{ marginTop: '20px', padding: '16px', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#2b6cb0', textTransform: 'uppercase', fontWeight: '700' }}>Payment Processing</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#2c5282', fontWeight: '500', lineHeight: 1.5 }}>
                  Your proof of payment has been submitted and is currently being reviewed by the administration.
                </p>
                <div style={{ marginTop: '15px' }}>
                  <p style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: '600', marginBottom: '8px' }}>Your Submitted Proof:</p>
                  <img src={request.proofOfPaymentUrl} alt="Submitted Proof" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', border: '1px solid #cbd5e0' }} />
                </div>
              </div>
            )}
          </div>

        </div>
        
        {/* Footer */}
        <div className="modal-footer" style={{ padding: '16px 30px', borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'flex-end', background: '#f7fafc', borderRadius: '0 0 12px 12px', flexShrink: 0, gap: '10px' }}>
          
          <div className="modal-footer-spacer" style={{ display: 'flex', flex: 1 }}></div>

          {request.status?.toLowerCase() === 'completed' && request.deliveryMethod === 'Online PDF' && (
            <div className="modal-footer-actions" style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleViewDocument}
                className="modal-btn"
                style={{
                  padding: '8px 16px', background: '#38a169', border: 'none',
                  borderRadius: '6px', color: 'white', fontWeight: '500', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <FileText size={16} /> View Document
              </button>
              
              {!request.pdfDownloaded && (
                <button 
                  onClick={() => setShowNetworkCheck(true)}
                  disabled={isDownloading}
                  className="modal-btn"
                  style={{
                    padding: '8px 16px', background: '#3182ce', border: 'none',
                    borderRadius: '6px', color: 'white', fontWeight: '500', cursor: isDownloading ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', opacity: isDownloading ? 0.7 : 1
                  }}
                >
                  <Download size={16} /> {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              )}
            </div>
          )}

          <button onClick={onClose} className="modal-btn" style={{
            padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e0',
            borderRadius: '6px', color: '#4a5568', fontWeight: '500', cursor: 'pointer'
          }}>
            Close
          </button>
          
          {request.status?.toLowerCase() === 'approved' && request.deliveryMethod === 'Online PDF' && (
            <button 
              onClick={handleSendBack}
              disabled={isSubmitting || !proofFile}
              style={{
                padding: '8px 16px', background: '#3182ce', border: 'none',
                borderRadius: '6px', color: 'white', fontWeight: '500', cursor: isSubmitting || !proofFile ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !proofFile ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Send size={16} />
              {isSubmitting ? 'Sending...' : 'Send Back'}
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="modal-content" style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            
            <div className="modal-header" style={{ padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-preview-title" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1a202c' }}>{request.type} - Document Preview</h2>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}><X size={20} /></button>
            </div>

            <div className="print-wrapper" style={{ padding: '30px', display: 'flex', justifyContent: 'center', backgroundColor: '#cbd5e1', overflowY: 'auto' }}>
              <div className="print-paper" style={{ width: '210mm', height: '297mm', backgroundColor: 'white', padding: '40px', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ border: '3px double #2d3748', padding: '40px', flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Background Watermark */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.05, pointerEvents: 'none' }}>
                    <img src={Logo} alt="Watermark" style={{ width: '400px', height: '400px' }} />
                  </div>
                  
                  {/* Header (Letterhead) */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px', position: 'relative', zIndex: 10 }}>
                    <img src={Logo} alt="Barangay Logo" style={{ width: '80px', height: '80px', position: 'absolute', left: '0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0', fontSize: '14px', fontFamily: 'serif' }}>Republic of the Philippines</p>
                      <p style={{ margin: '0', fontSize: '14px', fontFamily: 'serif' }}>Province of Zamboanga Sibugay</p>
                      <p style={{ margin: '0', fontSize: '14px', fontFamily: 'serif' }}>Municipality of Ipil</p>
                      <h3 style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold', fontFamily: 'serif', color: '#1a202c' }}>Barangay Buluan</h3>
                      <p style={{ margin: '15px 0 0 0', fontSize: '14px', fontStyle: 'italic', fontFamily: 'serif' }}>OFFICE OF the BARANGAY CAPTAIN</p>
                    </div>
                    <img src={ProvincialSeal} alt="Provincial Seal" style={{ width: '80px', height: '80px', position: 'absolute', right: '0' }} />
                  </div>

                  {/* Title */}
                  <h2 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '24px', margin: '30px 0 30px 0', fontWeight: 'bold', fontFamily: 'serif', color: '#1a202c', position: 'relative', zIndex: 10 }}>
                    {request.type}
                  </h2>

                  {/* Body Content */}
                  <div 
                    className="print-body-content"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                    style={{ 
                      flex: 1, 
                      width: '100%', 
                      fontSize: '15px', 
                      lineHeight: '1.8', 
                      textAlign: 'justify', 
                      fontFamily: 'serif', 
                      color: '#1a202c', 
                      position: 'relative',
                      zIndex: 10,
                      whiteSpace: 'pre-wrap',
                      outline: 'none'
                    }} 
                  />

                  {/* Signature block */}
                  <div className="print-signature-block" style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10, fontFamily: 'serif' }}>
                    <div style={{ textAlign: 'center', width: '250px' }}>
                      <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '40px', position: 'relative' }}>
                        {settings?.secretarySignatureUrl && (
                          <img src={settings.secretarySignatureUrl} style={{ height: '60px', objectFit: 'contain', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }} alt="Secretary Signature" />
                        )}
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase' }}>{settings?.secretary || "BARANGAY SECRETARY"}</div>
                      <div style={{ fontSize: '14px' }}>Barangay Secretary</div>
                    </div>

                    {request?.verificationToken && (
                      <div style={{ textAlign: 'center' }}>
                        <QRCode value={JSON.stringify({ id: request.id, token: request.verificationToken })} size={80} level="H" />
                        <div style={{ fontSize: '10px', marginTop: '5px', color: '#4a5568' }}>Scan to verify</div>
                      </div>
                    )}

                    <div style={{ textAlign: 'center', width: '250px' }}>
                      <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '40px', position: 'relative' }}>
                        {settings?.captainSignatureUrl && (
                          <img src={settings.captainSignatureUrl} style={{ height: '60px', objectFit: 'contain', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }} alt="Captain Signature" />
                        )}
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase' }}>{settings?.captain || "HON. JUAN DELA CRUZ"}</div>
                      <div style={{ fontSize: '14px' }}>Barangay Captain</div>
                    </div>
                  </div>

                  {settings?.footerNote && (
                    <div style={{ marginTop: '40px', fontSize: '12px', color: '#4a5568', textAlign: 'center', fontFamily: 'serif', fontStyle: 'italic', zIndex: 2, position: 'relative' }}>
                      {settings.footerNote}
                    </div>
                  )}

                </div>
              </div>
            </div>
            
            <div className="modal-footer" style={{ padding: '15px 20px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPreview(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', color: '#4a5568', fontWeight: 500, cursor: 'pointer' }}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

      <NetworkCheckModal 
        isOpen={showNetworkCheck}
        onClose={() => setShowNetworkCheck(false)}
        onProceed={() => {
          setShowNetworkCheck(false);
          handleDownloadPDF();
        }}
      />
    </div>,
    document.body
  );
};

export default RequestDetailsModal;

