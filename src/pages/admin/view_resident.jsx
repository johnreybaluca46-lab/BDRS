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
import { doc, onSnapshot, collection, setDoc, serverTimestamp, writeBatch, query, where, getDocs } from 'firebase/firestore';
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
            idPicture: data.photo2x2 || null
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className="card-title" style={{ marginBottom: 0 }}>Resident Details</h2>
            </div>
            
            <div className="details-top-section">
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
            </div>
            
            <div className="details-divider"></div>
            
            <div className="details-bottom-section">
              <div className="request-status-section" style={{ width: '100%', textAlign: 'center' }}>
                <h4 className="section-subtitle" style={{ textAlign: 'center', width: '100%' }}>Resident Status</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <span className={`status-badge-large ${getBadgeClass(residentData.status)}`}>
                    {residentData.status === 'Approved' ? 'Registered' : residentData.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="details-actions">
              <button className="btn-back" onClick={() => navigate(residentData?.status === 'Pending' || residentData?.status === 'Rejected' ? '/admin/resident-approval' : '/admin/residents')}>
                {residentData?.status === 'Pending' ? 'Back to Approval' : 'Back to Residents'}
              </button>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
