import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { renderToString } from 'react-dom/server';
import Swal from 'sweetalert2';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart2, 
  CheckCircle, 
  UserCircle, 
  LogOut, 
  Settings,
  Bell,
  Trash2,
  ChevronLeft,
  Check,
  UserPlus,
  AlertCircle,
  Mail,
  Printer,
  X,
  Download
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { doc, onSnapshot, updateDoc, deleteDoc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateDocumentHTML } from '../../utils/documentGenerator';
import { logActivity } from '../../utils/auditLogger';
import { useSettings } from '../../context/SettingsContext';
import html2pdf from 'html2pdf.js';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import ProvincialSeal from '../../assets/logo/provincial seal.png';
import AdminSidebar from '../../components/AdminSidebar';

export default function ViewDocumentRequest() {
  useEffect(() => {
    document.title = "Admin | View Request";
  }, []);

  const { settings } = useSettings();

  const { id } = useParams();
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printContent, setPrintContent] = useState('');
  const [printTitle, setPrintTitle] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isPaymentView = requestData?.status === 'Approved' || requestData?.status === 'Processing Payment';
  const backLink = requestData?.status === 'Trash' ? '/admin/trash' : requestData?.status === 'Completed' ? '/admin/completed' : isPaymentView ? '/admin/payment' : '/admin/document-requests';
  const backText = requestData?.status === 'Trash' ? 'Trash Requests' : requestData?.status === 'Completed' ? 'Completed Requests' : isPaymentView ? 'Payment' : 'Document Requests';

  // Automatically update the location state so the AdminSidebar highlights the correct item
  // if the user navigated here without a 'from' state (e.g. from a notification).
  useEffect(() => {
    if (requestData && !location.state?.from) {
      navigate(location.pathname, { 
        replace: true, 
        state: { ...location.state, from: backLink } 
      });
    }
  }, [requestData?.status, location.state?.from, location.pathname, navigate, backLink]);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'requests', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let formattedDate = 'N/A';
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        
        setRequestData({
          ...data,
          id: docSnap.id,
          name: data.fullName || data.name || 'N/A',
          contactNumber: data.contactNumber || 'N/A',
          address: data.address || 'N/A',
          type: data.type || 'Unknown',
          date: formattedDate,
          purpose: data.purpose || 'N/A',
          deliveryMethod: data.deliveryMethod || 'N/A',
          status: data.status === 'Processing' ? 'Pending' : (data.status || 'Pending'),
          idPicture: data.photo2x2 || null,
          validIdPicture: data.validIdPhoto || null,
          purokClearancePhoto: data.purokClearancePhoto || null,
          nationalIdPhoto: data.nationalIdPhoto || null,
          barangayIdPhoto: data.barangayIdPhoto || null,
          appFormPhoto: data.appFormPhoto || null,
          dtiPhoto: data.dtiPhoto || null,
          leasePhoto: data.leasePhoto || null,
          prevPermitPhoto: data.prevPermitPhoto || null,
          closureLetterPhoto: data.closureLetterPhoto || null,
          requirements: (data.type === 'Barangay Clearance' || data.type === 'Certificate of Residency') ? [
            { name: 'Purok Clearance', status: 'Submitted' },
            ...(data.nationalIdPhoto ? [{ name: 'National ID', status: 'Submitted' }] : []),
            ...(data.barangayIdPhoto ? [{ name: 'Barangay ID', status: 'Submitted' }] : []),
            { name: 'Purpose of Request', status: 'Submitted' }
          ] : (data.type === 'Business Permit') ? [
            ...(data.appFormPhoto ? [{ name: 'Application Form', status: 'Submitted' }] : []),
            ...(data.validIdPhoto ? [{ name: 'Valid ID', status: 'Submitted' }] : []),
            ...(data.dtiPhoto ? [{ name: 'DTI Registration', status: 'Submitted' }] : []),
            ...(data.leasePhoto ? [{ name: 'Lease Contract', status: 'Submitted' }] : []),
            ...(data.prevPermitPhoto ? [{ name: 'Previous Permit', status: 'Submitted' }] : []),
            ...(data.closureLetterPhoto ? [{ name: 'Closure Letter', status: 'Submitted' }] : []),
            { name: 'Purpose of Request', status: 'Submitted' }
          ] : [
            { name: data.idType ? data.idType.replace('_', ' ') : 'Valid ID', status: 'Submitted' },
            { name: 'Purpose of Request', status: 'Submitted' }
          ],
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  
  const handleLogout = () => {
    Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout of the admin dashboard?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Logout'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await signOut(auth);
          navigate('/login', { state: { loggedOut: true } });
        } catch (error) {
          console.error('Failed to log out', error);
        }
      }
    });
  };

  const handleApproveClick = () => {
    if (!id || isProcessing) return;
    
    const feeStr = String(requestData?.totalFee || '0').toLowerCase().trim();
    const parsedFee = parseFloat(feeStr);
    const isFree = feeStr === 'free' || feeStr === '0' || feeStr === '0.00' || parsedFee === 0 || isNaN(parsedFee);

    Swal.fire({
      title: 'Confirm Approval',
      text: isFree 
        ? 'Are you sure you want to approve this request? Since it is free, it will be immediately marked as Completed.' 
        : 'Are you sure you want to approve this request? It will be moved to the Payment section.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#48bb78',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Approve'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsProcessing(true);
        try {
          if (isFree) {
            const verificationToken = crypto.randomUUID();
            await updateDoc(doc(db, 'requests', id), {
              status: 'Processing Payment',
              approvedAt: serverTimestamp(),
              verificationToken
            });

            if (settings?.notificationSettings?.resident_req_approved !== false) {
              const notifRef = doc(collection(db, "notifications"));
              await setDoc(notifRef, {
                requestId: requestData?.id || id,
                userId: requestData?.userId || "",
                type: "APPROVED",
                documentType: requestData?.type || "Unknown",
                residentName: requestData?.name || requestData?.fullName || "Unknown",
                timestamp: serverTimestamp(),
              });
            }
            await logActivity({ action: 'Request Approved', targetType: 'document_request', targetId: id, description: `Approved free request and moved to Processing for ${requestData?.type || "Unknown"}` });
            Swal.fire({
              title: 'Approved & Processing!',
              text: 'The request is free and has been automatically moved to Processing Payment.',
              icon: 'success'
            });
            navigate('/admin/payment');
          } else {
            const verificationToken = crypto.randomUUID();
            await updateDoc(doc(db, 'requests', id), {
              status: 'Approved',
              approvedAt: serverTimestamp(),
              verificationToken
            });

            if (settings?.notificationSettings?.resident_req_approved !== false) {
              const notifRef = doc(collection(db, "notifications"));
              await setDoc(notifRef, {
                requestId: requestData?.id || id,
                userId: requestData?.userId || "",
                type: "APPROVED",
                documentType: requestData?.type || "Unknown",
                residentName: requestData?.name || requestData?.fullName || "Unknown",
                timestamp: serverTimestamp(),
              });
            }
            await logActivity({ action: 'Request Approved', targetType: 'document_request', targetId: id, description: `Approved request for ${requestData?.type || "Unknown"}` });
            Swal.fire({
              title: 'Approved!',
              text: 'The request has been approved and moved to Payment.',
              icon: 'success'
            });
            navigate('/admin/payment');
          }
        } catch (error) {
          console.error('Failed to approve request', error);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePrintClick = () => {
    if (requestData && settings) {
      const { html } = generateDocumentHTML(requestData, settings);
      setPrintTitle(requestData.type.toUpperCase());
      setPrintContent(html);
      setShowPrintModal(true);
    }
  };

  const handleDownloadPDF = () => {
    if (isDownloading) return;
    setIsDownloading(true);

    let element = document.querySelector('.print-paper');
    
    // If the modal isn't open, we create a temporary container off-screen
    if (!element) {
      if (!requestData || !settings) {
        Swal.fire('Error', 'Data not fully loaded.', 'error');
        setIsDownloading(false);
        return;
      }
      
      const { html } = generateDocumentHTML(requestData, settings);
      
      let qrHtml = '';
      if (requestData.verificationToken) {
        const qrPayload = JSON.stringify({ id: requestData.id, token: requestData.verificationToken });
        qrHtml = renderToString(<QRCode value={qrPayload} size={80} level="H" />);
      }
      
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
                <div style="font-size: 10pt; margin-bottom: 2px; font-family: serif;">Republic of the Philippines</div>
                <div style="font-size: 10pt; margin-bottom: 2px; font-family: serif;">Province of Zamboanga Sibugay</div>
                <div style="font-size: 10pt; margin-bottom: 2px; font-family: serif;">Municipality of Ipil</div>
                <div style="font-size: 12pt; font-weight: bold; margin-bottom: 8px; font-family: serif; color: #1a202c;">Barangay Buluan</div>
                <div style="font-size: 10pt; font-style: italic; font-family: serif;">OFFICE OF the BARANGAY CAPTAIN</div>
              </div>
              <div style="width: 80px; height: 80px;"><img src="${ProvincialSeal}" style="width: 100%; height: 100%; object-fit: contain;" /></div>
            </div>
            
            <h1 style="text-align: center; font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 30px 0; font-family: serif; color: #1a202c; z-index: 2; position: relative;">
              ${requestData.type}
            </h1>
            
            <div style="font-size: 11pt; line-height: 1.8; color: #1a202c; text-align: justify; flex: 1; z-index: 2; position: relative; white-space: pre-wrap; font-family: serif;">${html}</div>
            
            <div style="margin-top: 60px; display: flex; justify-content: space-between; z-index: 2; position: relative; font-family: serif; color: #1a202c;">
              <div style="text-align: center; width: 250px;">
                <div style="border-bottom: 1px solid #1a202c; margin-bottom: 5px; height: 40px; position: relative;">
                  ${settings?.secretarySignatureUrl ? `<img src="${settings.secretarySignatureUrl}" style="height: 60px; object-fit: contain; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 10;" />` : ''}
                </div>
                <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">${settings?.secretary || "BARANGAY SECRETARY"}</div>
                <div style="font-size: 10.5pt;">Barangay Secretary</div>
              </div>
              
              <div style="text-align: center;">
                ${qrHtml}
                ${qrHtml ? '<div style="font-size: 8pt; margin-top: 5px; color: #4a5568;">Scan to verify</div>' : ''}
              </div>

              <div style="text-align: center; width: 250px;">
                <div style="border-bottom: 1px solid #1a202c; margin-bottom: 5px; height: 40px; position: relative;">
                  ${settings?.captainSignatureUrl ? `<img src="${settings.captainSignatureUrl}" style="height: 60px; object-fit: contain; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 10;" />` : ''}
                </div>
                <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">${settings?.captain || "HON. JUAN DELA CRUZ"}</div>
                <div style="font-size: 10.5pt;">Barangay Captain</div>
              </div>
            </div>
            
            ${settings?.footerNote ? `<div style="margin-top: 40px; font-size: 9pt; color: #4a5568; text-align: center; font-family: serif; font-style: italic; z-index: 2; position: relative;">${settings.footerNote}</div>` : ''}

          </div>
        </div>
      `;
      element = container;
    }

    const opt = {
      margin:       0,
      filename:     `${requestData.type}_${id}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloading(false);
    }).catch(err => {
      console.error(err);
      Swal.fire('Error', 'Failed to download PDF.', 'error');
      setIsDownloading(false);
    });
  };

  const handlePaidClick = () => {
    if (!id || isProcessing) return;
    Swal.fire({
      title: 'Confirm Payment',
      text: 'Mark this request as Paid/Completed?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3182ce',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Paid'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsProcessing(true);
          try {
            const updates = {
              status: 'Completed',
              completedAt: serverTimestamp()
            };
            if (!requestData?.verificationToken) {
              updates.verificationToken = crypto.randomUUID();
            }
            await updateDoc(doc(db, 'requests', id), updates);

          if (settings?.notificationSettings?.resident_req_ready !== false) {
            const notifRef = doc(collection(db, "notifications"));
            await setDoc(notifRef, {
              requestId: requestData?.id || id,
              userId: requestData?.userId || "",
              type: "COMPLETED",
              documentType: requestData?.type || "Unknown",
              residentName: requestData?.name || requestData?.fullName || "Unknown",
              timestamp: serverTimestamp(),
            });
          }

          await logActivity({ action: 'Request Completed', targetType: 'document_request', targetId: id, description: `Marked request as Paid/Completed for ${requestData?.type || "Unknown"}` });
          Swal.fire({
            title: 'Completed!',
            text: 'The request has been marked as Paid and Completed.',
            icon: 'success'
          });
          navigate('/admin/completed');
        } catch (error) {
          console.error('Failed to mark as paid', error);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleTrashClick = () => {
    if (!id || isProcessing) return;
    Swal.fire({
      title: 'Reject Request',
      text: 'Please provide a reason for rejecting this document request:',
      input: 'textarea',
      inputPlaceholder: 'Type reason for rejection here...',
      inputAttributes: {
        'aria-label': 'Type reason for rejection here'
      },
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Reject Request',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'You must enter a reason for rejection!';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const rejectionReason = result.value.trim();
        setIsProcessing(true);
        try {
          await updateDoc(doc(db, 'requests', id), {
            status: 'Trash',
            rejectionReason: rejectionReason,
            trashedAt: serverTimestamp()
          });

          if (settings?.notificationSettings?.resident_req_rejected !== false) {
            const notifRef = doc(collection(db, "notifications"));
            await setDoc(notifRef, {
              requestId: requestData?.id || id,
              userId: requestData?.userId || "",
              type: "TRASHED",
              rejectionReason: rejectionReason,
              documentType: requestData?.type || "Unknown",
              residentName: requestData?.fullName || requestData?.name || "Unknown",
              timestamp: serverTimestamp(),
            });
          }
          await logActivity({ action: 'Request Rejected', targetType: 'document_request', targetId: id, description: `Rejected ${requestData?.type || "Unknown"} (Reason: ${rejectionReason})` });
          Swal.fire({
            title: 'Request Rejected!',
            text: 'The request has been rejected and moved to trash.',
            icon: 'success'
          });
          navigate('/admin/document-requests');
        } catch (error) {
          console.error('Failed to trash request', error);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleDeleteClick = () => {
    if (!id || isProcessing) return;
    Swal.fire({
      title: 'Permanently Delete',
      text: 'Are you sure you want to permanently delete this request? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsProcessing(true);
        try {
          await deleteDoc(doc(db, 'requests', id));

          if (settings?.notificationSettings?.resident_req_cancelled !== false) {
            const notifRef = doc(collection(db, "notifications"));
            await setDoc(notifRef, {
              requestId: requestData?.id || id,
              userId: requestData?.userId || "",
              type: "DELETED",
              documentType: requestData?.type || "Unknown",
              residentName: requestData?.name || "Unknown",
              timestamp: serverTimestamp(),
            });
          }
          await logActivity({ action: 'Request Deleted', targetType: 'document_request', targetId: id, description: `Deleted ${requestData?.type || "Unknown"}` });
          Swal.fire({
            title: 'Deleted!',
            text: 'The request has been permanently deleted.',
            icon: 'success'
          });
          navigate(fromCompleted ? '/admin/completed' : '/admin/trash');
        } catch (error) {
          console.error('Failed to delete request', error);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const fieldLabels = {
    dateOfBirth: 'Date of Birth',
    sex: 'Sex',
    civilStatus: 'Civil Status',
    emailAddress: 'Email Address',
    purok: 'Purok / Sitio',
    zipCode: 'Zip Code',
    businessName: 'Business Name',
    businessType: 'Business Type',
    businessDescription: 'Business Description',
    businessAddress: 'Business Address',
    natureOfBusiness: 'Nature of Business',
    numberOfEmployees: 'Number of Employees',
    businessContactNumber: 'Business Contact Number',
    occupation: 'Occupation',
    monthlyIncome: 'Monthly Income',
    householdMembers: 'Household Members',
    reason: 'Reason for Request',
    specifyPurpose: 'Specified Purpose',
    copies: 'Number of Copies',
    idType: 'Valid ID Type',
    idNumber: 'ID Number',
    deliveryMethod: 'Payment Method'
  };

  return (
    <div className="admin-dashboard-container">
      {/* Image Modal */}
      {showImageModal && modalImageUrl && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)} style={{zIndex: 1000}}>
          <div className="modal-content" style={{maxWidth: '90vw', maxHeight: '90vh', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', boxShadow: 'none'}} onClick={e => e.stopPropagation()}>
            <div style={{position: 'relative'}}>
              <img src={modalImageUrl} alt="Valid ID Full" style={{maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'}} />
              <button onClick={() => setShowImageModal(false)} style={{position: 'absolute', top: '-15px', right: '-15px', background: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#4a5568'}}>X</button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Modals removed in favor of SweetAlert2 */}

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1 style={{ display: 'flex', alignItems: 'center', fontSize: '1.1rem', margin: 0 }}>
            <Link to={backLink} style={{color: '#718096', textDecoration: 'none', display: 'flex', alignItems: 'center'}}>
              <ChevronLeft size={18} style={{marginRight: '5px'}} /> {backText}
            </Link>
            <span style={{margin: '0 10px', color: '#718096', fontSize: '0.9rem'}}>&gt;</span>
            <span style={{color: '#1a202c', fontWeight: '600'}}>{requestData?.id || id}</span>
          </h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="view-request-container">
          {loading ? (
            <div style={{padding: '40px', textAlign: 'center'}}>Loading request details...</div>
          ) : !requestData ? (
            <div style={{padding: '40px', textAlign: 'center'}}>Request not found.</div>
          ) : (
          <div className="request-details-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h2 className="card-title" style={{ marginBottom: 0 }}>Request Details</h2>
              {requestData.status === 'Approved' && requestData.approvedAt && (
                <div style={{ padding: '8px 16px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', textAlign: 'right' }}>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.75rem', color: '#c53030', textTransform: 'uppercase' }}>Expiration Countdown</h4>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#9b2c2c' }}>
                    {(() => {
                      const approvedDate = requestData.approvedAt.toDate ? requestData.approvedAt.toDate() : new Date(requestData.approvedAt.seconds * 1000);
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
            </div>
            
            <div className="details-top-section">
              <div className="user-profile-section">
                {requestData.idPicture ? (
                  <img src={requestData.idPicture} alt="ID" className="id-picture-preview" />
                ) : (
                  <div className="id-picture-placeholder">
                    <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>2x2 Picture<br/>(Not Uploaded)</span>
                  </div>
                )}
                <span className="user-name-large">{requestData.name}</span>
              </div>
              
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Contact Number</span>
                  <span className="detail-value">{requestData.contactNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Request ID</span>
                  <span className="detail-value">{requestData.id}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{requestData.address}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Document Type</span>
                  <span className="detail-value">{requestData.type}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Date Requested</span>
                  <span className="detail-value">{requestData.date}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Purpose</span>
                  <span className="detail-value">{requestData.purpose}</span>
                </div>

                {Object.keys(fieldLabels).map(key => {
                  if (requestData[key] && requestData[key] !== '') {
                    if (key === 'idType' && requestData.type === 'Certificate of Indigency') return null;
                    return (
                      <div className="detail-item" key={key}>
                        <span className="detail-label">{fieldLabels[key]}</span>
                        <span className="detail-value" style={['sex', 'civilStatus', 'idType'].includes(key) ? {textTransform: 'capitalize'} : {}}>
                          {key === 'idType' ? requestData[key].replace('_', ' ') : requestData[key]}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            
            <div className="details-divider"></div>
            
            <div className="details-bottom-section">
              <div style={{ display: 'flex', gap: '60px' }}>
                <div className="requirements-section">
                  <h4 className="section-subtitle">Requirements Submitted</h4>
                  <ul className="req-list">
                    {requestData.requirements.map((req, idx) => (
                      <li key={idx} className="req-list-item">
                        <span className="req-name" style={{ textTransform: 'capitalize' }}>
                          <Check size={16} color="#48bb78" style={{ marginRight: '8px' }} />
                          {req.name}
                        </span>
                        <span className="req-status">{req.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {(requestData?.type === 'Barangay Clearance' || requestData?.type === 'Certificate of Residency') ? (
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div className="valid-id-display">
                      <h4 className="section-subtitle">Purok Clearance</h4>
                      {requestData.purokClearancePhoto ? (
                        <img src={requestData.purokClearancePhoto} alt="Purok Clearance" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.purokClearancePhoto); setShowImageModal(true); }} title="Click to view full image" />
                      ) : (
                        <div className="valid-id-placeholder"><span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>Not Uploaded</span></div>
                      )}
                    </div>
                    {requestData.nationalIdPhoto && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">National ID</h4>
                        <img src={requestData.nationalIdPhoto} alt="National ID" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.nationalIdPhoto); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                    {requestData.barangayIdPhoto && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">Barangay ID</h4>
                        <img src={requestData.barangayIdPhoto} alt="Barangay ID" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.barangayIdPhoto); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                  </div>
                ) : (requestData?.type === 'Business Permit') ? (
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {requestData.appFormPhoto && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">Application Form</h4>
                        <img src={requestData.appFormPhoto} alt="Application Form" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.appFormPhoto); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                    {requestData.validIdPicture && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">Valid ID</h4>
                        <img src={requestData.validIdPicture} alt="Valid ID" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.validIdPicture); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                    {requestData.dtiPhoto && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">DTI Registration</h4>
                        <img src={requestData.dtiPhoto} alt="DTI Registration" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.dtiPhoto); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                    {requestData.leasePhoto && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">Lease Contract</h4>
                        <img src={requestData.leasePhoto} alt="Lease Contract" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.leasePhoto); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                    {requestData.prevPermitPhoto && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">Previous Permit</h4>
                        <img src={requestData.prevPermitPhoto} alt="Previous Permit" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.prevPermitPhoto); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                    {requestData.closureLetterPhoto && (
                      <div className="valid-id-display">
                        <h4 className="section-subtitle">Closure Letter</h4>
                        <img src={requestData.closureLetterPhoto} alt="Closure Letter" className="valid-id-image" onClick={() => { setModalImageUrl(requestData.closureLetterPhoto); setShowImageModal(true); }} title="Click to view full image" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="valid-id-display">
                    <h4 className="section-subtitle" style={{ textTransform: 'capitalize' }}>{requestData.idType ? requestData.idType.replace('_', ' ') : 'Valid ID'}</h4>
                    {requestData.validIdPicture ? (
                      <img src={requestData.validIdPicture} alt={requestData.idType ? requestData.idType.replace('_', ' ') : 'Valid ID'} className="valid-id-image" onClick={() => { setModalImageUrl(requestData.validIdPicture); setShowImageModal(true); }} title="Click to view full image" />
                    ) : (
                      <div className="valid-id-placeholder">
                        <span style={{ fontSize: '0.75rem', color: '#a0aec0', textTransform: 'capitalize', textAlign: 'center' }}>{requestData.idType ? requestData.idType.replace('_', ' ') : 'Valid ID'}<br/>(Not Uploaded)</span>
                      </div>
                    )}
                  </div>
                )}
                
                {requestData.proofOfPaymentUrl && (
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 className="section-subtitle" style={{ alignSelf: 'flex-start' }}>Proof of Payment</h4>
                    <img 
                      src={requestData.proofOfPaymentUrl} 
                      alt="Proof of Payment" 
                      className="valid-id-image" 
                      onClick={() => { setModalImageUrl(requestData.proofOfPaymentUrl); setShowImageModal(true); }} 
                      title="Click to view full image" 
                    />
                    {requestData.referenceNumber && (
                      <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#4a5568', textAlign: 'center' }}>
                        <strong>Reference Number:</strong> {requestData.referenceNumber}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="request-status-section">
                <h4 className="section-subtitle">Request Status</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <span className={`status-badge-large status-${requestData.status.toLowerCase().replace(' ', '-')}`}>
                    {requestData.status === 'Completed' ? 'Paid' : requestData.status === 'Processing Payment' ? 'Processing' : requestData.status}
                  </span>
                </div>
                
                {requestData.status === 'Approved' && requestData.approvedAt && (
                  <div style={{ display: 'none' }}></div>
                )}
                
                {requestData.totalFee && (
                  <>
                    <h4 className="section-subtitle">{(requestData.type === 'Barangay Clearance' || requestData.type === 'Certificate of Residency' || requestData.type === 'Certificate of Indigency' || requestData.type === 'Business Permit') ? 'Certificate Fee' : 'Amount to Collect'}</h4>
                    {requestData.totalFee === "0.00" || requestData.totalFee === 0 ? (
                      <div style={{ display: 'inline-block', background: '#f0fff4', border: '1px solid #c6f6d5', padding: '12px 24px', borderRadius: '8px', color: '#38a169', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        Free
                      </div>
                    ) : (
                      <div style={{ display: 'inline-block', background: '#ebf8ff', border: '1px solid #bee3f8', padding: '12px 24px', borderRadius: '8px', color: '#2b6cb0', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        ₱{requestData.totalFee}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="details-actions">
              <button className="btn-back" onClick={() => navigate(backLink, { state: { activeTab: location.state?.activeTab } })}>Back</button>
              {requestData?.status === 'Pending' && (
                <div className="action-buttons-right">
                  <button className="btn-reject" onClick={handleTrashClick}><Trash2 size={16} /> Reject Request</button>
                  <button className="btn-approve" onClick={handleApproveClick}><CheckCircle size={16} /> Approve Request</button>
                </div>
              )}
              {(requestData?.status === 'Approved' || requestData?.status === 'Processing Payment') && requestData?.deliveryMethod !== 'Online PDF' && (
                <div className="action-buttons-right">
                  <button className="btn-approve" style={{backgroundColor: '#38a169', color: 'white', marginRight: '8px'}} onClick={handlePrintClick}><FileText size={16} /> View Document</button>
                  <button className="btn-approve" style={{backgroundColor: '#3182ce', color: 'white', marginRight: '8px'}} onClick={handleDownloadPDF} disabled={isDownloading}><Download size={16} /> {isDownloading ? 'Generating...' : 'Download PDF'}</button>
                  <button className="btn-approve" style={{backgroundColor: '#3182ce'}} onClick={handlePaidClick}><CheckCircle size={16} /> Paid</button>
                </div>
              )}
              {requestData?.status === 'Processing Payment' && requestData?.deliveryMethod === 'Online PDF' && (
                <div className="action-buttons-right">
                  <button className="btn-reject" onClick={handleTrashClick}><Trash2 size={16} /> Reject Payment</button>
                  <button className="btn-approve" style={{backgroundColor: '#3182ce'}} onClick={handlePaidClick}><CheckCircle size={16} /> Verify & Paid</button>
                </div>
              )}
              {requestData?.status === 'Completed' && (
                <div className="action-buttons-right">
                  <button className="btn-approve" style={{backgroundColor: '#38a169', color: 'white', marginRight: '8px'}} onClick={handlePrintClick}><FileText size={16} /> View Document</button>
                  <button className="btn-reject" onClick={handleDeleteClick}><Trash2 size={16} /> Delete Permanently</button>
                </div>
              )}
              {requestData?.status === 'Trash' && (
                <div className="action-buttons-right">
                  <button className="btn-reject" onClick={handleDeleteClick}><Trash2 size={16} /> Delete Permanently</button>
                </div>
              )}
            </div>
          </div>
                  )}
        </div>
      </main>

      {/* Print Document Modal */}
      {showPrintModal && (
        <div className="modal-overlay" style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          <style>
            {`
              @media print {
                @page { margin: 0; size: auto; }
                .admin-main, .admin-sidebar, .mobile-toggle, .sidebar-overlay, .modal-header, .modal-footer {
                  display: none !important;
                }
                body, html { margin: 0 !important; padding: 0 !important; background: white !important; height: 100% !important; }
                .modal-overlay { position: static !important; background: none !important; display: block !important; padding: 0 !important; margin: 0 !important; height: 100% !important; }
                .modal-content { background: transparent !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; height: 100% !important; }
                .modal-content > div:not(#print-edit-area) { display: none !important; }
                
                #print-edit-area {
                  position: static !important; display: block !important; width: 100% !important;
                  height: 100% !important; background: white !important; padding: 0 !important;
                  margin: 0 !important; overflow: visible !important; box-shadow: none !important;
                }
                
                .print-paper {
                  width: 100% !important;
                  max-width: 100% !important;
                  height: 100% !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  padding: 20px !important;
                  border: none !important;
                  box-sizing: border-box !important;
                }
              }
            `}
          </style>

          <div className="modal-content" style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            
            <div className="modal-header" style={{ padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1a202c' }}>{printTitle} - Document Preview</h2>
              <button onClick={() => setShowPrintModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}><X size={20} /></button>
            </div>

            <div id="print-edit-area" className="print-wrapper" style={{ padding: '30px', display: 'flex', justifyContent: 'center', backgroundColor: '#cbd5e1', overflowY: 'auto' }}>
              <div className="print-paper" style={{ width: '210mm', height: '297mm', backgroundColor: 'white', padding: '40px', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ border: '3px double #2d3748', padding: '40px', flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Background Watermark */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.05, pointerEvents: 'none' }}>
                  <img src={Logo} alt="Watermark" style={{ width: '400px', height: '400px' }} />
                </div>
                
                {/* Header (Letterhead) */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px', position: 'relative' }}>
                  <img src={Logo} alt="Barangay Logo" style={{ width: '100px', height: '100px', position: 'absolute', left: '0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0', fontSize: '14px', fontFamily: 'serif' }}>Republic of the Philippines</p>
                    <p style={{ margin: '0', fontSize: '14px', fontFamily: 'serif' }}>Province of Zamboanga Sibugay</p>
                    <p style={{ margin: '0', fontSize: '14px', fontFamily: 'serif' }}>Municipality of Ipil</p>
                    <h3 style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold', fontFamily: 'serif', color: '#1a202c' }}>Barangay Buluan</h3>
                    <p style={{ margin: '15px 0 0 0', fontSize: '14px', fontStyle: 'italic', fontFamily: 'serif' }}>OFFICE OF the BARANGAY CAPTAIN</p>
                  </div>
                  <img src={ProvincialSeal} alt="Provincial Seal" style={{ width: '100px', height: '100px', position: 'absolute', right: '0' }} />
                </div>
                
                {/* Title */}
                <h2 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '24px', margin: '30px 0 30px 0', fontWeight: 'bold', fontFamily: 'serif', color: '#1a202c' }}>
                  {printTitle}
                </h2>
                
                {/* Body Content */}
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setPrintContent(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: printContent }}
                  style={{ 
                    flex: 1, 
                    width: '100%', 
                    minHeight: '400px', 
                    fontSize: '15px', 
                    lineHeight: '1.8', 
                    textAlign: 'justify', 
                    fontFamily: 'serif', 
                    color: '#1a202c', 
                    border: '1px dashed transparent',
                    backgroundColor: 'transparent', 
                    outline: 'none',
                    padding: '0',
                    whiteSpace: 'pre-wrap'
                  }} 
                />
                
                {/* Signatures */}
                <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', width: '250px' }}>
                    <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '40px', position: 'relative' }}>
                      {settings?.secretarySignatureUrl && (
                        <img src={settings.secretarySignatureUrl} style={{ height: '60px', objectFit: 'contain', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }} alt="Secretary Signature" />
                      )}
                    </div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', fontFamily: 'serif', textTransform: 'uppercase' }}>{settings?.secretary || "BARANGAY SECRETARY"}</p>
                    <p style={{ margin: 0, fontSize: '14px', fontFamily: 'serif' }}>Barangay Secretary</p>
                  </div>

                  {requestData?.verificationToken && (
                    <div style={{ textAlign: 'center' }}>
                      <QRCode value={JSON.stringify({ id: requestData.id, token: requestData.verificationToken })} size={80} level="H" />
                      <p style={{ margin: '5px 0 0 0', fontSize: '10px', color: '#4a5568' }}>Scan to verify</p>
                    </div>
                  )}

                  <div style={{ textAlign: 'center', width: '250px' }}>
                    <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '40px', position: 'relative' }}>
                      {settings?.captainSignatureUrl && (
                        <img src={settings.captainSignatureUrl} style={{ height: '60px', objectFit: 'contain', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }} alt="Captain Signature" />
                      )}
                    </div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', fontFamily: 'serif', textTransform: 'uppercase' }}>{settings?.captain || "HON. JUAN DELA CRUZ"}</p>
                    <p style={{ margin: 0, fontSize: '14px', fontFamily: 'serif' }}>Barangay Captain</p>
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

            <div className="modal-footer" style={{ padding: '15px 20px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowPrintModal(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#4a5568', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              {requestData?.status !== 'Completed' && (
                <button onClick={handleDownloadPDF} disabled={isDownloading} style={{ padding: '8px 16px', backgroundColor: '#3182ce', color: 'white', borderRadius: '6px', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: isDownloading ? 'not-allowed' : 'pointer', opacity: isDownloading ? 0.7 : 1 }}>
                  <Download size={16} /> {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
