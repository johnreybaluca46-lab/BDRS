import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  confirmLogoutAlert, 
  showMissingInformationAlert, 
  showIncorrectPasswordAlert, 
  showPasswordChangedAlert 
} from '../../utils/sweetAlerts';
import { 
  LayoutDashboard, 
  FileText, 
  Users,
  UserPlus, 
  BarChart2, 
  CheckCircle, 
  UserCircle, 
  LogOut, 
  Settings,
  Trash2,
  Camera,
  User,
  Lock,
  History,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Clock,
  LogIn,
  FileCheck,
  Megaphone
} from 'lucide-react';
import { signOut, onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateEmail } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, limit, deleteDoc, getDocs } from 'firebase/firestore';
import { logActivity, logLoginEvent, getOptionalLocation } from '../../utils/auditLogger';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [currentUser, setCurrentUser] = useState(null);
  
  // State for UI purposes
  const [profileData, setProfileData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'System Administrator',
    contactNumber: '',
    dateJoined: '',
    address: '',
    photoURL: ''
  });

  useEffect(() => {
    document.title = "Admin | Profile";
    let unsubProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        
        const docRef = doc(db, 'admin_profiles', user.uid);
        unsubProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfileData(prev => ({ ...prev, ...docSnap.data(), email: user.email }));
          } else {
            setProfileData(prev => ({ ...prev, email: user.email }));
          }
        }, (error) => {
          console.error("Error fetching profile:", error);
          setProfileData(prev => ({ ...prev, email: user.email }));
        });
        
      } else {
        navigate('/login');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [navigate]);

  const handleLogout = () => {
    confirmLogoutAlert(async () => {
      try {
        if (auth.currentUser?.email) {
          const locationOverride = await getOptionalLocation();
          await logLoginEvent({ event: 'Logout Successful', result: 'success', email: auth.currentUser.email, role: 'Admin', locationOverride });
        }
        await signOut(auth);
        navigate('/login', { state: { loggedOut: true } });
      } catch (error) {
        console.error('Failed to log out', error);
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await setDoc(doc(db, 'admin_profiles', currentUser.uid), profileData, { merge: true });
      
      await logActivity({ action: 'Profile Updated', targetType: 'admin_profile', targetId: currentUser.uid, description: 'Admin profile details were modified' });

      Swal.fire({
        title: 'Success!',
        text: 'Profile updated successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to update profile.', 'error');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
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
        
        // Compress to JPEG with 0.7 quality to ensure small base64 size
        const base64String = canvas.toDataURL('image/jpeg', 0.7);

        try {
          Swal.fire({
            title: 'Saving...',
            text: 'Please wait while we update your photo.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          await setDoc(doc(db, 'admin_profiles', currentUser.uid), { photoURL: base64String }, { merge: true });
          
          setProfileData(prev => ({ ...prev, photoURL: base64String }));

          Swal.fire({
            title: 'Success!',
            text: 'Profile photo updated.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Failed to save photo to database.', 'error');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1>Profile Settings</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="profile-content-container">
          
          {/* Profile Header Card */}
          <div className="profile-header-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar-placeholder" style={profileData.photoURL ? { background: 'none' } : {}}>
                  {profileData.photoURL ? (
                    <img src={profileData.photoURL} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={60} color="#a0aec0" />
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
                <button className="profile-upload-btn" title="Upload Photo" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={16} />
                </button>
              </div>
            </div>
            
            <div className="profile-info-section">
              <div className="profile-primary-info">
                <h2 className="profile-name">{profileData.fullName}</h2>
                <span className="profile-badge badge-blue">Administrator</span>
              </div>
              
              <div className="profile-contact-grid">
                <div className="profile-contact-item">
                  <Mail size={16} className="contact-icon" />
                  <span>{profileData.email}</span>
                </div>
                <div className="profile-contact-item">
                  <Phone size={16} className="contact-icon" />
                  <span>{profileData.contactNumber}</span>
                </div>
                <div className="profile-contact-item full-width">
                  <MapPin size={16} className="contact-icon" />
                  <span>{profileData.address}</span>
                </div>
              </div>
            </div>

            <div className="profile-meta-section">
              <div className="meta-item">
                <Calendar size={16} className="meta-icon" />
                <div className="meta-text">
                  <span className="meta-label">Date Joined</span>
                  <span className="meta-value">{profileData.dateJoined || 'Not set'}</span>
                </div>
              </div>
              <div className="meta-item">
                <Shield size={16} className="meta-icon" />
                <div className="meta-text">
                  <span className="meta-label">Role</span>
                  <span className="meta-value">{profileData.role}</span>
                </div>
              </div>
              <div className="meta-item">
                <div className="status-dot active"></div>
                <div className="meta-text">
                  <span className="meta-label">Status</span>
                  <span className="meta-value">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Layout Grid */}
          <div className="profile-layout-grid">
            
            {/* Left Column: Forms */}
            <div className="profile-form-panel">
              <h3 className="panel-title">Personal Information</h3>
              <form onSubmit={handleSaveProfile} className="profile-form">
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" name="fullName" value={profileData.fullName} onChange={handleInputChange} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label>Username</label>
                        <input type="text" name="username" value={profileData.username} onChange={handleInputChange} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" name="email" value={profileData.email} className="form-input" disabled style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} title="To change your email, please go to Security & Audit Logs -> Account Security" />
                      </div>
                      <div className="form-group">
                        <label>Role</label>
                        <select name="role" value={profileData.role} onChange={handleInputChange} className="form-input form-select">
                          <option>System Administrator</option>
                          <option>Barangay Official</option>
                          <option>Barangay Secretary</option>
                          <option>Staff</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Contact Number</label>
                        <input type="text" name="contactNumber" value={profileData.contactNumber} onChange={handleInputChange} className="form-input" />
                      </div>
                      <div className="form-group">
                        <label>Date Joined</label>
                        <input type="date" name="dateJoined" value={profileData.dateJoined} onChange={handleInputChange} className="form-input" />
                      </div>
                      <div className="form-group full-width">
                        <label>Address</label>
                        <input type="text" name="address" value={profileData.address} onChange={handleInputChange} className="form-input" />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-save">Save Changes</button>
                    </div>
                  </form>
            </div>

          </div>
          
        </div>
      </main>
    </div>
  );
}
