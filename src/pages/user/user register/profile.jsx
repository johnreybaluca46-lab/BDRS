import React, { useState, useEffect, useRef } from 'react';
import SkeletonProfile from '../../../components/SkeletonProfile';
import Swal from 'sweetalert2';
import ResidentSidebar from '../../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../../components/ResidentNotificationBell';
import '../../../lib/admin-layout.css';
import {
  User, Edit, Save, X, Lock, Shield, Mail, Phone, MapPin, Calendar, AlertCircle, CheckCircle, XCircle, Monitor, Smartphone, Tablet, Globe, Clock, Trash2, KeyRound, Plus, ChevronRight
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, orderBy, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../database/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { showMissingInformationAlert } from '../../../utils/sweetAlerts';
import { compressImageToBase64 } from '../../../lib/imageUtils';

export default function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [residentDocId, setResidentDocId] = useState(null);
  const [residentData, setResidentData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [loginLogs, setLoginLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 5;

  const [editForm, setEditForm] = useState({
    fullName: '',
    purok: '',
    completeAddress: '',
    dateOfBirth: '',
    civilStatus: '',
    sex: '',
    contactNumber: '',
    houseNo: '',
    occupation: '',
    lengthOfStay: '',
    placeOfBirth: '',
    nationality: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    document.title = "Resident | Profile";

    let unsubSnapshot = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const docRef = doc(db, 'residents', user.uid);
      unsubSnapshot = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setResidentDocId(docSnap.id);
          setResidentData(data);
        }
        setLoading(false);
      });

      // Fetch login logs
      const logsQ = query(collection(db, 'login_logs'), where('actorId', '==', user.uid));
      window.unsubLogs = onSnapshot(logsQ, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        logs.sort((a, b) => {
          const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : a.timestamp) : 0;
          const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : b.timestamp) : 0;
          return timeB - timeA;
        });
        setLoginLogs(logs);
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
      if (window.unsubLogs) window.unsubLogs();
    };
  }, []);

  const formatLogDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const getMaskedIp = (ip) => {
    if (!ip || ip === 'Unknown' || ip === 'Unavailable') return 'Unavailable';
    return ip;
  };

  const handleStartEdit = () => {
    if (!residentData) return;
    setEditForm({
      fullName: residentData.fullName || '',
      purok: residentData.purok || '',
      completeAddress: residentData.completeAddress || '',
      dateOfBirth: residentData.dateOfBirth || '',
      civilStatus: residentData.civilStatus || '',
      sex: residentData.sex || '',
      contactNumber: residentData.contactNumber || '',
      houseNo: residentData.houseNo || '',
      occupation: residentData.occupation || '',
      lengthOfStay: residentData.lengthOfStay || '',
      placeOfBirth: residentData.placeOfBirth || '',
      nationality: residentData.nationality || ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!residentData) return;
    setEditForm({
      fullName: residentData.fullName || '',
      purok: residentData.purok || '',
      completeAddress: residentData.completeAddress || '',
      dateOfBirth: residentData.dateOfBirth || '',
      civilStatus: residentData.civilStatus || '',
      sex: residentData.sex || '',
      contactNumber: residentData.contactNumber || '',
      houseNo: residentData.houseNo || '',
      occupation: residentData.occupation || '',
      lengthOfStay: residentData.lengthOfStay || '',
      placeOfBirth: residentData.placeOfBirth || '',
      nationality: residentData.nationality || ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsEditing(false);
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!residentDocId || !residentData) return;

    if (!editForm.fullName.trim() || !editForm.purok.trim() || !editForm.completeAddress.trim()) {
      showMissingInformationAlert('Full Name, Purok, and Complete Address cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      let photoUrl = residentData.photo2x2 || null;

      if (photoFile) {
        // Use the existing compression utility for fast base64 storage
        photoUrl = await compressImageToBase64(photoFile);
      }

      // 1. Update resident profile doc in Firestore
      const resDocRef = doc(db, 'residents', residentDocId);
      await updateDoc(resDocRef, {
        fullName: editForm.fullName.trim(),
        purok: editForm.purok,
        completeAddress: editForm.completeAddress.trim(),
        dateOfBirth: editForm.dateOfBirth,
        civilStatus: editForm.civilStatus,
        sex: editForm.sex,
        contactNumber: editForm.contactNumber,
        houseNo: editForm.houseNo.trim(),
        occupation: editForm.occupation.trim(),
        lengthOfStay: editForm.lengthOfStay,
        placeOfBirth: editForm.placeOfBirth.trim(),
        nationality: editForm.nationality.trim(),
        ...(photoUrl && { photo2x2: photoUrl })
      });

      // 2. Create notification for admin with resident registration ID
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        residentId: residentDocId || 'Unknown',
        type: 'RESIDENT_PROFILE_UPDATE',
        residentName: editForm.fullName.trim(),
        userId: auth.currentUser ? auth.currentUser.uid : 'Unknown',
        timestamp: serverTimestamp()
      });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Profile Updated',
        text: 'Your profile has been updated successfully.',
        showConfirmButton: false,
        timer: 3000
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update profile details. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllLogs = async () => {
    const visibleLogs = loginLogs.filter(log => !residentData?.deletedLoginLogIds?.includes(log.id));
    if (visibleLogs.length === 0) return;

    const result = await Swal.fire({
      title: 'Delete All Activity?',
      text: "This will clear all your login activity logs from this view. You cannot undo this action.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Yes, delete all'
    });

    if (result.isConfirmed) {
      try {
        if (!residentDocId) throw new Error("Profile not found.");

        const currentIds = visibleLogs.map(n => n.id);
        const newDeleted = [...new Set([...(residentData?.deletedLoginLogIds || []), ...currentIds])];

        await updateDoc(doc(db, 'residents', residentDocId), {
          deletedLoginLogIds: newDeleted
        });

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Cleared',
          text: 'Your login activity has been cleared.',
          showConfirmButton: false,
          timer: 3000
        });
      } catch (error) {
        console.error("Failed to delete logs:", error);
        Swal.fire('Error', `Failed to delete activity logs. Details: ${error.message}`, 'error');
      }
    }
  };

  const visibleLoginLogs = loginLogs.filter(log => !residentData?.deletedLoginLogIds?.includes(log.id));

  // Pagination logic
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = visibleLoginLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(visibleLoginLogs.length / logsPerPage);

  const hashPin = async (pin) => {
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const promptForPin = async (title, htmlText, confirmButtonText) => {
    return Swal.fire({
      title,
      html: `
        <p style="color: #4a5568; font-size: 0.95rem; margin-bottom: 20px;">${htmlText}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <input id="pin-1" class="swal2-input pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" style="width: 45px; height: 55px; text-align: center; font-size: 24px; padding: 0; margin: 0; border-radius: 8px;">
          <input id="pin-2" class="swal2-input pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" style="width: 45px; height: 55px; text-align: center; font-size: 24px; padding: 0; margin: 0; border-radius: 8px;">
          <input id="pin-3" class="swal2-input pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" style="width: 45px; height: 55px; text-align: center; font-size: 24px; padding: 0; margin: 0; border-radius: 8px;">
          <input id="pin-4" class="swal2-input pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" style="width: 45px; height: 55px; text-align: center; font-size: 24px; padding: 0; margin: 0; border-radius: 8px;">
          <input id="pin-5" class="swal2-input pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" style="width: 45px; height: 55px; text-align: center; font-size: 24px; padding: 0; margin: 0; border-radius: 8px;">
          <input id="pin-6" class="swal2-input pin-box" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1" style="width: 45px; height: 55px; text-align: center; font-size: 24px; padding: 0; margin: 0; border-radius: 8px;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText,
      allowOutsideClick: false,
      didOpen: () => {
        const inputs = document.querySelectorAll('.pin-box');
        inputs.forEach((input, index) => {
          input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length === 1 && index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
              inputs[index - 1].focus();
            }
          });
        });
        if (inputs[0]) inputs[0].focus();
      },
      preConfirm: () => {
        const p1 = document.getElementById('pin-1').value;
        const p2 = document.getElementById('pin-2').value;
        const p3 = document.getElementById('pin-3').value;
        const p4 = document.getElementById('pin-4').value;
        const p5 = document.getElementById('pin-5').value;
        const p6 = document.getElementById('pin-6').value;
        const pin = p1 + p2 + p3 + p4 + p5 + p6;
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
          Swal.showValidationMessage('Please enter exactly 6 digits.');
          return false;
        }
        return pin;
      }
    });
  };

  const handleSetPin = async () => {
    const { value: pinStr } = await promptForPin(
      residentData?.pinCodeHash ? 'Change PIN' : 'Create PIN',
      'Enter a 6-digit PIN to secure your account as a second step.',
      'Next'
    );
    
    if (pinStr) {
      const { value: confirmPinStr } = await promptForPin('Confirm PIN', 'Re-enter your 6-digit PIN.', 'Save PIN');
      
      if (confirmPinStr) {
        if (confirmPinStr === pinStr) {
          const hashedPin = await hashPin(pinStr);
          await updateDoc(doc(db, 'residents', residentDocId), { pinCodeHash: hashedPin });
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'PIN saved successfully', showConfirmButton: false, timer: 3000 });
        } else {
          Swal.fire('Error', 'PINs do not match. Please try again.', 'error');
        }
      }
    }
  };

  const handleRemovePin = async () => {
    const { value: password } = await Swal.fire({
      title: 'Enter Password',
      input: 'password',
      inputLabel: 'Please re-authenticate to remove your PIN',
      inputPlaceholder: 'Enter your password',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      confirmButtonText: 'Remove'
    });

    if (password) {
      try {
        const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        await updateDoc(doc(db, 'residents', residentDocId), { pinCodeHash: null });
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'PIN removed', showConfirmButton: false, timer: 3000 });
      } catch (error) {
        Swal.fire('Error', 'Incorrect password or authentication failed.', 'error');
      }
    }
  };

  return (
    <div className="admin-dashboard-container">
      <ResidentSidebar />

      <main className="admin-main">
        <header className="admin-header resident-header">
          <h1>Profile Settings</h1>
          <div className="header-right">
            <ResidentNotificationBell />
            <ResidentProfileDropdown />
          </div>
        </header>

        <div className="dashboard-content">
          {loading ? <SkeletonProfile /> : !residentData ? (
            <div className="dashboard-panel" style={{ padding: '3rem', textAlign: 'center', color: '#718096' }}>
              No resident profile found for this account.
            </div>
          ) : (
            <div className="profile-content-wrapper">
              {/* Profile Header Card matching Image 2 */}
              <div className="profile-header-card">
                {/* Left: Avatar Section */}
                <div className="profile-avatar-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="profile-avatar-wrapper">
                    <div className="profile-avatar-placeholder" style={(isEditing ? (photoPreview || residentData.photo2x2) : residentData.photo2x2) ? { background: 'none' } : {}}>
                      {(isEditing ? (photoPreview || residentData.photo2x2) : residentData.photo2x2) ? (
                        <img src={isEditing ? (photoPreview || residentData.photo2x2) : residentData.photo2x2} alt="Resident Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <User size={60} color="#a0aec0" />
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{ marginTop: '12px' }}>
                      <label htmlFor="photoUpload" style={{ display: 'inline-block', padding: '6px 12px', background: '#e2e8f0', color: '#2d3748', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        Change Photo
                      </label>
                      <input id="photoUpload" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                    </div>
                  )}
                </div>

                {/* Middle: Info Section */}
                <div className="profile-info-section">
                  <div className="profile-primary-info" style={{ marginBottom: '12px' }}>
                    <h2 className="profile-name">{residentData.fullName}</h2>
                    <span className="profile-badge badge-blue">
                      Resident
                    </span>
                  </div>

                  <div className="profile-contact-grid" style={{ marginBottom: '16px' }}>
                    <div className="profile-contact-item">
                      <Mail size={16} className="contact-icon" />
                      <span>{residentData.emailAddress}</span>
                    </div>
                    <div className="profile-contact-item">
                      <Phone size={16} className="contact-icon" />
                      <span>{residentData.contactNumber}</span>
                    </div>
                    <div className="profile-contact-item full-width">
                      <MapPin size={16} className="contact-icon" />
                      <span>{residentData.completeAddress || residentData.purok}</span>
                    </div>
                  </div>

                  {/* Edit Profile Button */}
                  <div>
                    {!isEditing ? (
                      <button
                        onClick={handleStartEdit}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88rem' }}
                      >
                        <Edit size={16} /> Edit Profile
                      </button>
                    ) : (
                      <div style={{ display: 'inline-flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', backgroundColor: '#38a169', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.88rem' }}
                        >
                          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88rem' }}
                        >
                          <X size={16} /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Meta Sidebar */}
                <div className="profile-meta-section">
                  <div className="meta-item">
                    <Calendar size={16} className="meta-icon" />
                    <div className="meta-text">
                      <span className="meta-label">Date Registered</span>
                      <span className="meta-value">
                        {residentData.timestamp ? (
                          residentData.timestamp.toDate().toISOString().split('T')[0]
                        ) : '2026-08-27'}
                      </span>
                    </div>
                  </div>

                  <div className="meta-item">
                    <Shield size={16} className="meta-icon" />
                    <div className="meta-text">
                      <span className="meta-label">Registration ID</span>
                      <span className="meta-value" style={{ color: '#3182ce', fontWeight: 'bold' }}>
                        {residentData.resNumber || residentDocId}
                      </span>
                    </div>
                  </div>

                  <div className="meta-item">
                    <div className="status-dot active"></div>
                    <div className="meta-text">
                      <span className="meta-label">Status</span>
                      <span className="meta-value" style={{ textTransform: 'capitalize' }}>
                        {residentData.status === 'Approved' ? 'Active' : (residentData.status || 'Active')}
                      </span>
                    </div>
                  </div>

                  <div className="meta-item" style={{ marginTop: '10px' }}>
                    <Monitor size={16} className="meta-icon" style={{ color: '#718096' }} />
                    <div className="meta-text">
                      <span className="meta-label">App Version</span>
                      <span className="meta-value" style={{ color: '#718096', fontSize: '0.8rem' }}>
                        v{__APP_VERSION__}
                      </span>
                    </div>
                  </div>
                </div>
              </div>


              {/* Profile Tabs */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch', paddingRight: '30px' }}>
                  <button
                    onClick={() => setActiveTab('personal')}
                    style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', color: activeTab === 'personal' ? '#3182ce' : '#718096', borderBottom: activeTab === 'personal' ? '3px solid #3182ce' : 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Personal Details
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', color: activeTab === 'security' ? '#3182ce' : '#718096', borderBottom: activeTab === 'security' ? '3px solid #3182ce' : 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Security & Login Activity
                  </button>
                  <button
                    onClick={() => setActiveTab('passkey')}
                    style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', color: activeTab === 'passkey' ? '#3182ce' : '#718096', borderBottom: activeTab === 'passkey' ? '3px solid #3182ce' : 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    PIN & Security
                  </button>
                </div>
                {/* Scroll indicator for mobile */}
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: '11px', width: '50px', background: 'linear-gradient(to left, #fff 40%, rgba(255,255,255,0))', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#a0aec0', paddingRight: '4px' }}>
                  <ChevronRight size={18} style={{ opacity: 0.7, animation: 'pulse 2s infinite' }} />
                </div>
              </div>

              {activeTab === 'personal' ? (
                <>
                  {/* Editing Instruction Alert */}
                  {isEditing && (
                    <div style={{ background: '#ebf8ff', borderLeft: '4px solid #3182ce', padding: '12px 16px', borderRadius: '6px', color: '#2b6cb0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                      <AlertCircle size={20} style={{ flexShrink: 0 }} />
                      <span>
                        Note: You can now edit most of your personal fields. However, your <strong>Email Address</strong> remains read-only for security purposes.
                      </span>
                    </div>
                  )}

                  {/* Profile Information Form */}
                  <div className="dashboard-panel profile-details-panel">
                    <div className="profile-details-header">
                      <h3 className="panel-title" style={{ margin: 0 }}>Personal Details</h3>
                      {isEditing && (
                        <span style={{ fontSize: '0.8rem', color: '#718096', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Non-editable fields are locked
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleSaveProfile}>
                      <div className="profile-form-grid">
                        {/* Full Name - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Full Name {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="settings-input"
                              value={editForm.fullName}
                              onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                              required
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }}
                            />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>
                              {residentData.fullName}
                            </div>
                          )}
                        </div>

                        {/* Purok / Zone - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Purok / Zone {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <select
                              className="settings-select"
                              value={editForm.purok}
                              onChange={(e) => setEditForm(prev => ({ ...prev, purok: e.target.value }))}
                              required
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }}
                            >
                              <option value="">Select purok</option>
                              <option value="Purok Malipayon">Purok Malipayon</option>
                              <option value="Purok Bagong-Silang">Purok Bagong-Silang</option>
                              <option value="Purok Acacia">Purok Acacia</option>
                              <option value="Purok Orchids">Purok Orchids</option>
                              <option value="Purok Boguenvilla">Purok Boguenvilla</option>
                            </select>
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>
                              {residentData.purok}
                            </div>
                          )}
                        </div>

                        {/* Complete Address - EDITABLE */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Complete Address {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="settings-input"
                              value={editForm.completeAddress}
                              onChange={(e) => setEditForm(prev => ({ ...prev, completeAddress: e.target.value }))}
                              required
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }}
                            />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>
                              {residentData.completeAddress}
                            </div>
                          )}
                        </div>

                        {/* Date of Birth - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Date of Birth {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input type="date" className="settings-input" value={editForm.dateOfBirth} onChange={(e) => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }} />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.dateOfBirth || '—'}</div>
                          )}
                        </div>

                        {/* Civil Status - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Civil Status {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <select className="settings-select" value={editForm.civilStatus} onChange={(e) => setEditForm(prev => ({ ...prev, civilStatus: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }}>
                              <option value="">Select civil status</option>
                              <option value="Single">Single</option>
                              <option value="Married">Married</option>
                              <option value="Widowed">Widowed</option>
                              <option value="Separated">Separated</option>
                              <option value="Divorced">Divorced</option>
                            </select>
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.civilStatus || '—'}</div>
                          )}
                        </div>

                        {/* Sex - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Sex {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <select className="settings-select" value={editForm.sex} onChange={(e) => setEditForm(prev => ({ ...prev, sex: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }}>
                              <option value="">Select sex</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.sex || '—'}</div>
                          )}
                        </div>

                        {/* Contact Number - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Contact Number {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input type="text" className="settings-input" value={editForm.contactNumber} onChange={(e) => setEditForm(prev => ({ ...prev, contactNumber: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }} />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.contactNumber || '—'}</div>
                          )}
                        </div>

                        {/* Email Address - READ-ONLY */}
                        <div className="form-group">
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#718096', marginBottom: '6px' }}>
                            <span>Email Address</span>
                            {isEditing && <Lock size={12} color="#a0aec0" />}
                          </label>
                          <div style={{ padding: '10px 12px', background: '#edf2f7', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#718096' }}>
                            {residentData.emailAddress || '—'}
                          </div>
                        </div>

                        {/* House / Block No. - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            House / Block No. {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input type="text" className="settings-input" value={editForm.houseNo} onChange={(e) => setEditForm(prev => ({ ...prev, houseNo: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }} />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.houseNo || '—'}</div>
                          )}
                        </div>

                        {/* Occupation - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Occupation {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input type="text" className="settings-input" value={editForm.occupation} onChange={(e) => setEditForm(prev => ({ ...prev, occupation: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }} />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.occupation || '—'}</div>
                          )}
                        </div>

                        {/* Length of Stay in Barangay - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Length of Stay in Barangay {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <select className="settings-select" value={editForm.lengthOfStay} onChange={(e) => setEditForm(prev => ({ ...prev, lengthOfStay: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }}>
                              <option value="">Select length of stay</option>
                              <option value="Less than 6 months">Less than 6 months</option>
                              <option value="6 months to 1 year">6 months to 1 year</option>
                              <option value="1 to 3 years">1 to 3 years</option>
                              <option value="3 to 5 years">3 to 5 years</option>
                              <option value="More than 5 years">More than 5 years</option>
                            </select>
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.lengthOfStay || '—'}</div>
                          )}
                        </div>

                        {/* Place of Birth - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Place of Birth {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input type="text" className="settings-input" value={editForm.placeOfBirth} onChange={(e) => setEditForm(prev => ({ ...prev, placeOfBirth: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }} />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.placeOfBirth || '—'}</div>
                          )}
                        </div>

                        {/* Nationality - EDITABLE */}
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
                            Nationality {isEditing && <span style={{ color: '#e53e3e' }}>*</span>}
                          </label>
                          {isEditing ? (
                            <input type="text" className="settings-input" value={editForm.nationality} onChange={(e) => setEditForm(prev => ({ ...prev, nationality: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #3182ce', borderRadius: '6px' }} />
                          ) : (
                            <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#2d3748', fontWeight: 500 }}>{residentData.nationality || 'Filipino'}</div>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #edf2f7', paddingTop: '16px' }}>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            style={{ padding: '10px 20px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSaving}
                            style={{ padding: '10px 20px', backgroundColor: '#38a169', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Save size={16} /> {isSaving ? 'Saving Changes...' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </>
              ) : activeTab === 'security' ? (
                <div className="dashboard-panel profile-details-panel">
                  <div className="profile-details-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 className="panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={20} color="#3182ce" /> Login Activity
                      </h3>
                    </div>
                    {visibleLoginLogs.length > 0 && (
                      <button
                        onClick={handleDeleteAllLogs}
                        style={{ padding: '8px 12px', backgroundColor: '#fff', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                      >
                        <Trash2 size={16} /> Delete All
                      </button>
                    )}
                  </div>

                  <div className="login-logs-container" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    {visibleLoginLogs.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#718096', background: '#f8fafc', borderRadius: '8px' }}>
                        No login activity found.
                      </div>
                    ) : (
                      currentLogs.map(log => {
                        const isSuccess = log.result === 'success';
                        return (
                          <div key={log.id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px 20px',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '10px', background: isSuccess ? '#f0fff4' : '#fff5f5', borderRadius: '50%' }}>
                                  {(() => {
                                    if (log.deviceType === 'Mobile') {
                                      return <Smartphone size={24} color={isSuccess ? '#38a169' : '#e53e3e'} />;
                                    } else if (log.deviceType === 'Tablet') {
                                      return <Tablet size={24} color={isSuccess ? '#38a169' : '#e53e3e'} />;
                                    } else {
                                      return <Monitor size={24} color={isSuccess ? '#38a169' : '#e53e3e'} />;
                                    }
                                  })()}
                                </div>
                                <div>
                                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#2d3748' }}>{log.device || 'Unknown Device'}</h4>
                                  <div style={{ fontSize: '0.85rem', color: '#718096', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Globe size={14} /> {log.browser || 'Unknown Browser'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSuccess ? '#38a169' : '#e53e3e', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                {isSuccess ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                {isSuccess ? 'Login Successful' : 'Login Failed'}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', fontSize: '0.9rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: '#a0aec0', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Location</span>
                                <span style={{ color: '#4a5568', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {log.location || 'Unknown Location'}
                                  {log.locationType === 'Precise' && log.lat && log.lon ? (
                                    <a href={`https://www.google.com/maps?q=${log.lat},${log.lon}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', background: '#ebf8ff', color: '#3182ce', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title={`Lat: ${log.lat.toFixed(4)}, Lon: ${log.lon.toFixed(4)}`}>
                                      <MapPin size={10} /> GPS (Map)
                                    </a>
                                  ) : (
                                    <span title="Location is approximate and is based on your network/IP address." style={{ fontSize: '0.7rem', background: '#edf2f7', color: '#718096', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', cursor: 'help' }}>Approximate</span>
                                  )}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: '#a0aec0', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>IP Address</span>
                                <span style={{ color: '#4a5568', fontWeight: '500', fontFamily: 'monospace', wordBreak: 'break-all' }}>{getMaskedIp(log.ipAddress)}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: '#a0aec0', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Date & Time</span>
                                <span style={{ color: '#4a5568', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={14} /> {formatLogDate(log.timestamp)}
                                </span>
                              </div>
                            </div>

                            {!isSuccess && log.details && (
                              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fff5f5', borderLeft: '4px solid #fc8181', fontSize: '0.85rem', color: '#c53030' }}>
                                <strong>Reason:</strong> {log.details}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginTop: '20px', padding: '10px 0', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.85rem', color: '#718096' }}>
                        Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, visibleLoginLogs.length)} of {visibleLoginLogs.length} entries
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          style={{ padding: '6px 14px', background: currentPage === 1 ? '#f7fafc' : '#fff', color: currentPage === 1 ? '#a0aec0' : '#4a5568', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          style={{ padding: '6px 14px', background: currentPage === totalPages ? '#f7fafc' : '#fff', color: currentPage === totalPages ? '#a0aec0' : '#4a5568', border: '1px solid #cbd5e0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'passkey' ? (
                <div className="dashboard-panel profile-details-panel">
                  <div className="profile-details-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 className="panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <KeyRound size={20} color="#3182ce" /> PIN & Security
                      </h3>
                    </div>
                    {!residentData.pinCodeHash && (
                      <button
                        onClick={handleSetPin}
                        style={{ padding: '8px 12px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                      >
                        <Plus size={16} /> Add PIN
                      </button>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '20px' }}>
                    <p style={{ color: '#4a5568', fontSize: '0.95rem', marginBottom: '20px' }}>
                      A 6-digit PIN provides a secure second step when you sign in. 
                    </p>

                    {!residentData.pinCodeHash ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#718096', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e0' }}>
                        You haven't added a PIN yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '200px' }}>
                            <div style={{ padding: '12px', background: '#ebf8ff', borderRadius: '50%', color: '#3182ce', flexShrink: 0 }}>
                              <KeyRound size={24} />
                            </div>
                            <div style={{ whiteSpace: 'nowrap' }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#2d3748' }}>6-Digit PIN</h4>
                              <div style={{ fontSize: '0.85rem', color: '#38a169', fontWeight: 'bold' }}>
                                Active
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              onClick={handleSetPin}
                              style={{ padding: '8px 12px', backgroundColor: '#fff', color: '#3182ce', border: '1px solid #3182ce', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                            >
                              <Edit size={16} /> Change
                            </button>
                            <button
                              onClick={handleRemovePin}
                              style={{ padding: '8px 12px', backgroundColor: '#fff', color: '#e53e3e', border: '1px solid #fc8181', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                            >
                              <Trash2 size={16} /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
