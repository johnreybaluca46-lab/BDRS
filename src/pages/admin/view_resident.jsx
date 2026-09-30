import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
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
  Trash2,
  ChevronLeft,
  XCircle,
  UserPlus,
  Mail,
  Edit
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { doc, onSnapshot, collection, setDoc, serverTimestamp, writeBatch, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { logActivity } from '../../utils/auditLogger';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';

export default function ViewResident() {
  useEffect(() => {
    document.title = "Admin | View Resident";
  }, []);

  const { id } = useParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [residentData, setResidentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!id) return;
    
    let docRef = null;
    let unsubscribe = null;
    let actualId = id;

    const setupListener = async () => {
      // If the URL contains a legacy RES- Number, query to find the actual UID
      if (id.startsWith('RES-')) {
        try {
          const q = query(collection(db, 'residents'), where('resNumber', '==', id));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
             actualId = snapshot.docs[0].id; // The UID
          }
        } catch (err) {
          console.error("Error looking up legacy RES Number", err);
        }
      }

      docRef = doc(db, 'residents', actualId);
      
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let formattedDate = 'N/A';
          if (data.timestamp) {
            const date = data.timestamp.toDate();
            formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          }
          
          setResidentData({
            ...data,
            id: docSnap.id,
            name: data.fullName || 'N/A',
            date: formattedDate,
            status: data.status || 'Registered',
            idPicture: data.photo2x2 || null,
            validId: data.validId || null,
            validIdType: data.validIdType || 'Valid ID'
          });
        } else {
          setResidentData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching resident:", error);
        setLoading(false);
      });
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
    Swal.fire({
      title: 'Confirm Approval',
      text: 'Are you sure you want to approve this resident application?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#48bb78',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Approve'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsProcessing(true);
        try {
          if (!requestData?.qrToken) {
              throw new Error("Missing QR token for this resident");
          }

          const batch = writeBatch(db);
          batch.update(doc(db, 'residents', id), { 
              status: 'Approved', 
              approvedAt: serverTimestamp() 
          });
          batch.update(doc(db, 'registration_status', requestData.qrToken), { 
              status: 'Approved', 
              updatedAt: serverTimestamp() 
          });
          
          await batch.commit();
          
          Swal.fire({
            title: 'Approved!',
            text: 'The resident registration has been approved.',
            icon: 'success'
          });
          navigate('/admin/resident-approval');
        } catch (error) {
          console.error('Failed to approve request', error);
          Swal.fire({
            title: 'Error!',
            text: 'Failed to approve registration. Please try again.',
            icon: 'error'
          });
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleRejectClick = () => {
    if (!id || isProcessing) return;
    Swal.fire({
      title: 'Reject Registration',
      text: 'Are you sure you want to reject this resident registration? This will mark it as Rejected.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Reject'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsProcessing(true);
        try {
          if (!requestData?.qrToken) {
              throw new Error("Missing QR token for this resident");
          }

          const batch = writeBatch(db);
          batch.update(doc(db, 'residents', id), { 
              status: 'Rejected', 
              rejectedAt: serverTimestamp() 
          });
          batch.update(doc(db, 'registration_status', requestData.qrToken), { 
              status: 'Rejected', 
              updatedAt: serverTimestamp() 
          });
          
          await batch.commit();
          
          Swal.fire({
            title: 'Rejected!',
            text: 'The resident registration has been rejected.',
            icon: 'success'
          });
          navigate('/admin/resident-approval');
        } catch (error) {
          console.error('Failed to reject request', error);
          Swal.fire({
            title: 'Error!',
            text: 'Failed to reject registration. Please try again.',
            icon: 'error'
          });
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const getBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Approved': case 'Registered': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      default: return '';
    }
  };

  const fieldLabels = {
    dateOfBirth: 'Date of Birth',
    placeOfBirth: 'Place of Birth',
    sex: 'Sex',
    civilStatus: 'Civil Status',
    nationality: 'Nationality',
    contactNumber: 'Contact Number',
    emailAddress: 'Email Address',
    occupation: 'Occupation',
    purok: 'Purok / Sitio',
    houseNo: 'House No. / Street',
    lengthOfStay: 'Length of Stay (Months/Years)',
    completeAddress: 'Complete Address'
  };

  const handleApprove = () => {
    Swal.fire({
      title: 'Approve Resident?',
      text: `Are you sure you want to approve ${residentData?.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#38a169',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, approve!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const batch = writeBatch(db);
          const actualId = residentData.id;
          batch.update(doc(db, 'residents', actualId), {
            status: 'Approved',
            approvedAt: serverTimestamp()
          });
          if (residentData?.qrToken) {
            batch.update(doc(db, 'registration_status', residentData.qrToken), {
              status: 'Approved',
              updatedAt: serverTimestamp()
            });
          }
          await batch.commit();
          await logActivity({
            action: 'Resident Approved',
            targetType: 'Resident',
            targetId: actualId,
            description: `Approved registration for ${residentData?.name}`
          });
          Swal.fire('Approved!', `${residentData?.name} is now registered.`, 'success').then(() => {
             navigate('/admin/resident-approval');
          });
        } catch (error) {
          console.error("Error approving resident:", error);
          Swal.fire('Error!', 'There was an error approving the resident.', 'error');
        }
      }
    });
  };

  const handleReject = async () => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Resident?',
      text: `Please provide a reason for rejecting ${residentData?.name}'s registration:`,
      input: 'textarea',
      inputPlaceholder: 'Type your reason here...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, reject!',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason!'
        }
      }
    });

    if (reason) {
      try {
        const batch = writeBatch(db);
        const actualId = residentData.id;
        batch.update(doc(db, 'residents', actualId), {
          status: 'Rejected',
          rejectReason: reason,
          rejectedAt: serverTimestamp()
        });
        if (residentData?.qrToken) {
          batch.update(doc(db, 'registration_status', residentData.qrToken), {
            status: 'Rejected',
            rejectReason: reason,
            updatedAt: serverTimestamp()
          });
        }
        await batch.commit();
        await logActivity({
          action: 'Resident Rejected',
          targetType: 'Resident',
          targetId: actualId,
          description: `Rejected registration for ${residentData?.name}. Reason: ${reason}`
        });
        Swal.fire('Rejected!', `${residentData?.name}'s registration has been rejected.`, 'success').then(() => {
           navigate('/admin/resident-approval');
        });
      } catch (error) {
        console.error("Error rejecting resident:", error);
        Swal.fire('Error!', 'There was an error rejecting the resident.', 'error');
      }
    }
  };

  const handleDeleteResident = () => {
    Swal.fire({
      title: 'Delete Resident?',
      text: `Are you sure you want to delete ${residentData?.name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const actualId = residentData.id;
          await deleteDoc(doc(db, 'residents', actualId));
          await logActivity({
            action: 'Resident Deleted',
            targetType: 'Resident',
            targetId: actualId,
            description: `Deleted resident account for ${residentData?.name}`
          });
          Swal.fire('Deleted!', 'The resident has been deleted.', 'success').then(() => {
            navigate(residentData?.status === 'Pending' || residentData?.status === 'Rejected' ? '/admin/resident-approval' : '/admin/residents');
          });
        } catch (error) {
          console.error("Error deleting resident:", error);
          Swal.fire('Error!', 'There was an error deleting the resident.', 'error');
        }
      }
    });
  };

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1 style={{ display: 'flex', alignItems: 'center', fontSize: '1.1rem', margin: 0 }}>
            <button onClick={() => navigate(residentData?.status === 'Pending' || residentData?.status === 'Rejected' ? '/admin/resident-approval' : '/admin/residents')} style={{color: '#718096', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', fontSize: '1.1rem', fontWeight: 'normal'}}>
              <ChevronLeft size={18} style={{marginRight: '5px'}} /> Back
            </button>
            <span style={{margin: '0 10px', color: '#718096', fontSize: '0.9rem'}}>&gt;</span>
            <span style={{color: '#1a202c', fontWeight: '600'}}>{residentData?.resNumber || residentData?.id || id}</span>
          </h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="view-request-container">
          {loading ? (
            <div style={{padding: '40px', textAlign: 'center'}}>Loading resident details...</div>
          ) : !residentData ? (
            <div style={{padding: '40px', textAlign: 'center'}}>Resident not found.</div>
          ) : (
          <div className="request-details-card">
            <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Resident Details</h2>
            
            <div className="details-top-section" style={{ flexWrap: 'wrap' }}>
              <div className="user-profile-section">
                {residentData.idPicture ? (
                  <img src={residentData.idPicture} alt="2x2 Photo" className="id-picture-preview" />
                ) : (
                  <div className="id-picture-placeholder">
                    <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>2x2 Picture<br/>(Not Uploaded)</span>
                  </div>
                )}
                <span className="user-name-large">{residentData.name}</span>
              </div>
              
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Registration ID</span>
                  <span className="detail-value">{residentData.resNumber || residentData.id}</span>
                </div>
                
                <div className="detail-item">
                  <span className="detail-label">Date Registered</span>
                  <span className="detail-value">{residentData.date}</span>
                </div>

                {Object.keys(fieldLabels).map(key => {
                  if (key === 'password') return null;
                  if (residentData[key] && residentData[key] !== '') {
                    return (
                      <div className="detail-item" key={key}>
                        <span className="detail-label">{fieldLabels[key]}</span>
                        <span className="detail-value" style={['sex', 'civilStatus'].includes(key) ? {textTransform: 'capitalize'} : {}}>
                          {residentData[key]}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="request-status-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <h4 className="section-subtitle" style={{ textAlign: 'center', margin: '0 0 8px 0' }}>Resident Status</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px' }}>
                  <span className={`status-badge-large ${getBadgeClass(residentData.status)}`}>
                    {residentData.status === 'Approved' ? 'Registered' : residentData.status}
                  </span>
                  {residentData.status === 'Rejected' && (
                    <div style={{ marginTop: '10px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fca5a5', maxWidth: '300px' }}>
                      <span style={{ display: 'block', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Reason for Rejection</span>
                      <span style={{ color: '#475569', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                        {residentData.rejectReason || 'No specific reason provided.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {residentData.validId && (
              <>
                <div className="details-divider"></div>
                <div className="details-bottom-section" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  <div className="valid-id-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: '600' }}>Uploaded {residentData.validIdType}</span>
                    <img src={residentData.validId} alt="Valid ID" style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }} />
                  </div>
                </div>
              </>
            )}
            
            <div className="details-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <button className="btn-back" onClick={() => navigate(residentData?.status === 'Pending' || residentData?.status === 'Rejected' ? '/admin/resident-approval' : '/admin/residents')}>
                {residentData?.status === 'Pending' || residentData?.status === 'Rejected' ? 'Back to Approval' : 'Back to Residents'}
              </button>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {residentData?.status === 'Pending' && (
                  <>
                    <button className="btn-approve" onClick={handleApprove} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#38a169', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                      <CheckCircle size={18} /> Approve
                    </button>
                    <button className="btn-reject" onClick={handleReject} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                      <XCircle size={18} /> Reject
                    </button>
                  </>
                )}
                <button className="btn-reject" onClick={handleDeleteResident} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                  <Trash2 size={18} /> Delete
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
