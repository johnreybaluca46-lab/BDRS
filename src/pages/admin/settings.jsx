import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  LayoutDashboard, FileText, Users, UserPlus, BarChart2, CheckCircle, UserCircle, LogOut, Settings, Trash2, Mail, Home, Bell, Upload, Trash, Edit, Info, Check, X, ShieldAlert, Database, CloudUpload, Clock, CheckCircle2, AlertCircle, RefreshCw, LayoutTemplate, Eye, Printer, Save, Loader2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../../database/firebase';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useSettings } from '../../context/SettingsContext';
import { exportDatabaseToJson, restoreDatabaseFromJson } from '../../utils/backupRestore';
import { useMaintenance } from '../../context/MaintenanceContext';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import { logActivity } from '../../utils/auditLogger';
import AdminSidebar from '../../components/AdminSidebar';
import Logo from '../../assets/logo/barangay buluan seal.png';
import ProvincialSeal from '../../assets/logo/provincial seal.png';
import BrgyClearanceImg from '../../assets/logo/barangay clearance.png';
import BusClearanceImg from '../../assets/logo/business clearance.png';
import CertResidencyImg from '../../assets/logo/certificate of residency.png';
import CertIndigencyImg from '../../assets/logo/certificate of indigency.png';

export default function SystemSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('general');
  const [docTab, setDocTab] = useState('all');
  const { settings, loading, updatePreview } = useSettings();
  const { effectiveStatus } = useMaintenance();

  const [maintSettings, setMaintSettings] = useState({ status: 'ended', message: 'BDRS is currently undergoing scheduled maintenance. Please try again later.' });
  const [isSavingMaint, setIsSavingMaint] = useState(false);
  const [maintScheduleMinutes, setMaintScheduleMinutes] = useState(10);

  useEffect(() => {
    const fetchMaint = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'maintenance'));
        if (snap.exists()) {
          const data = snap.data();
          setMaintSettings(data);
        }
      } catch (err) {
        console.error("Failed to load maintenance settings", err);
      }
    };
    fetchMaint();
  }, []);

  const [formData, setFormData] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(Logo);
  const [isSaving, setIsSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [documentSettings, setDocumentSettings] = useState([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [understandRestore, setUnderstandRestore] = useState(false);
  const [qrCodeFile, setQrCodeFile] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editTemplateMode, setEditTemplateMode] = useState(null);
  const [templateBody, setTemplateBody] = useState("");

  const defaultTemplateBodies = {
    barangay_clearance: `To Whom It May Concern:\n\nThis is to certify that MR./MRS. {{full_name}}, {{age}} years of age, {{civil_status}}, is cleared from all the obligations of this barangay, he/she has no derogatory records and that he/she has paid whatever liabilities he/she incurred as a resident of this barangay.\n\nThis clearance is issued upon request of the above named person for {{purpose}}.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay.`,
    certificate_of_residency: `To Whom It May Concern:\n\nThis is to certify that MR./MRS. {{full_name}}, of legal age, {{civil_status}}, whose signature appears below, is a bona fide resident of this barangay.\n\nBased on the records of this office, he/she has been residing at {{address}} since {{residing_since}}.\n\nThis certification is issued upon the request of the above named person for whatever legal purpose it may serve.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay.`,
    business_clearance: `To Whom It May Concern:\n\nThis is to certify that the business or trade activity described below:\n\nBusiness Name: {{business_name}}\nLocation: {{business_address}}\nOperator/Manager: {{operator_name}}\n\nhas been granted a Barangay Business Permit to operate within the jurisdiction of this barangay, subject to the provisions of existing laws and ordinances.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay.`,
    certificate_of_indigency: `To Whom It May Concern:\n\nThis is to certify that MR./MRS. {{full_name}}, {{age}} years of age, {{civil_status}}, is a bona fide resident of this barangay.\n\nThis further certifies that the above-named person belongs to an indigent family in this barangay and has no regular source of income to support their financial needs.\n\nThis certification is issued upon the request of the interested party for {{purpose}} purposes.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay.`
  };

  const getPreviewHTML = (templateString) => {
    if (!templateString) return "";
    let formatted = templateString;
    const now = new Date();
    const getOrdinalDay = (d) => {
      if (d > 3 && d < 21) return d + 'th';
      switch (d % 10) {
        case 1:  return d + "st";
        case 2:  return d + "nd";
        case 3:  return d + "rd";
        default: return d + "th";
      }
    };
    const dayFormat = getOrdinalDay(now.getDate());
    const monthFormat = now.toLocaleString('default', { month: 'long' });
    const yearFormat = now.getFullYear().toString();
    
    formatted = formatted
      .replace(/{{day}}/gi, `<strong>${dayFormat}</strong>`)
      .replace(/{{month}}/gi, `<strong>${monthFormat}</strong>`)
      .replace(/{{year}}/gi, `<strong>${yearFormat}</strong>`)
      .replace(/{{[\w_]+}}/g, '<strong>_________</strong>');
    
    return formatted;
  };

  const handleOpenEditTemplate = (template) => {
    setEditTemplateMode(template);
    const existingTemplates = formData.documentTemplates || {};
    setTemplateBody(existingTemplates[template.id] || defaultTemplateBodies[template.id] || "");
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      const updatedTemplates = {
        ...(formData.documentTemplates || {}),
        [editTemplateMode.id]: templateBody
      };
      
      const updatedSettings = { ...formData, documentTemplates: updatedTemplates };
      await setDoc(doc(db, 'settings', 'general'), updatedSettings, { merge: true });
      await logActivity({ action: 'Document Template Updated', targetType: 'settings', targetId: 'general', description: `Updated layout template for ${editTemplateMode.title}` });

      setFormData(updatedSettings);
      setEditTemplateMode(null);
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Template Saved',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error saving template:", error);
      Swal.fire('Error', 'Failed to save template. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (formData.documents) {
      const sanitizedDocs = formData.documents.map(d => {
        if (d.id === 'business_clearance' || d.title?.includes('Business Clearance')) {
          return { ...d, title: '4. Business Permit' };
        }
        return d;
      });
      setDocumentSettings(sanitizedDocs);
    }
  }, [formData.documents]);

  const handleDocToggle = async (docId) => {
    const updatedDocs = documentSettings.map(d =>
      d.id === docId ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d
    );
    setDocumentSettings(updatedDocs);
    setFormData(prev => ({ ...prev, documents: updatedDocs }));

    try {
      await setDoc(doc(db, 'settings', 'general'), { documents: updatedDocs }, { merge: true });
      const docName = updatedDocs.find(d => d.id === docId)?.name || docId;
      const newStatus = updatedDocs.find(d => d.id === docId)?.status === 'active' ? 'Enabled' : 'Disabled';
      await logActivity({ action: `Document ${newStatus}`, targetType: 'settings', targetId: 'general', description: `Changed status of ${docName} to ${newStatus}` });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Status Updated Successfully',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error saving status:", error);
    }
  };

  const handleEditDocSave = async () => {
    setIsSaving(true);
    let updatedDocToSave = { ...editingDoc };

    if (qrCodeFile) {
      try {
        const base64Url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(qrCodeFile);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
        updatedDocToSave.qrCodeUrl = base64Url;
      } catch (error) {
        console.error("Error converting QR code to base64:", error);
        Swal.fire('Upload Failed', 'Could not process the QR code image.', 'error');
        setIsSaving(false);
        return;
      }
    }

    const updatedDocs = documentSettings.map(d =>
      d.id === editingDoc.id ? updatedDocToSave : d
    );
    setDocumentSettings(updatedDocs);
    setFormData(prev => ({ ...prev, documents: updatedDocs }));
    setEditModalOpen(false);
    setEditingDoc(null);
    setQrCodeFile(null);

    try {
      await setDoc(doc(db, 'settings', 'general'), { documents: updatedDocs }, { merge: true });
      await logActivity({ action: 'Document Requirement/Fee Updated', targetType: 'settings', targetId: 'general', description: `Updated fees/requirements for ${editingDoc.name}` });
      Swal.fire({
        icon: 'success',
        title: 'Document Fees Updated!',
        text: 'The pricing and requirements have been saved successfully.',
        confirmButtonColor: '#3182ce'
      });
    } catch (error) {
      console.error("Error saving fees:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDocIcon = (docId) => {
    if (docId === 'barangay_clearance') return BrgyClearanceImg;
    if (docId === 'certificate_of_residency') return CertResidencyImg;
    if (docId === 'certificate_of_indigency') return CertIndigencyImg;
    if (docId === 'business_clearance') return BusClearanceImg;
    return BrgyClearanceImg;
  };

  const getDocBgColor = (docId) => {
    if (docId === 'barangay_clearance') return '#ebf8ff';
    if (docId === 'certificate_of_residency') return '#f0fff4';
    if (docId === 'certificate_of_indigency') return '#fffff0';
    if (docId === 'business_clearance') return '#faf5ff';
    return '#ebf8ff';
  };

  const handleEditClick = (doc) => {
    setEditingDoc(doc);
    setEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditModalOpen(false);
    setEditingDoc(null);
  };

  useEffect(() => {
    document.title = "Admin | System Settings";
  }, []);

  useEffect(() => {
    if (settings && !loading) {
      setFormData(settings);
      setLogoPreview(settings.logoUrl);
    }
  }, [settings, loading]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setLogoPreview(base64String); // Optimistic preview update

        try {
          Swal.fire({
            title: 'Uploading Logo...',
            text: 'Please wait while the logo is being saved.',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const updatedSettings = { ...formData, logoUrl: base64String };
          await setDoc(doc(db, 'settings', 'general'), updatedSettings, { merge: true });
      await logActivity({ action: 'Barangay Information Updated', targetType: 'settings', targetId: 'general', description: 'Updated general barangay information and contact details' });

          setFormData(updatedSettings);
          setLogoFile(null); // Clear pending file since it's already saved
          updatePreview({ logoUrl: base64String }); // Updates sidebar immediately

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Upload Successful',
            text: 'Barangay logo has been updated.',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          });
        } catch (error) {
          console.error("Error uploading logo:", error);
          Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            text: 'Failed to upload logo. Please try again.'
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(Logo);
    setFormData(prev => ({ ...prev, logoUrl: Logo }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      let currentLogoUrl = formData.logoUrl || Logo;


      const updatedSettings = { ...formData, logoUrl: currentLogoUrl };

      await setDoc(doc(db, 'settings', 'general'), updatedSettings, { merge: true });
      await logActivity({ action: 'General Settings Updated', targetType: 'settings', targetId: 'general', description: 'Updated general barangay and office information' });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Settings Saved',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
      setLogoFile(null);
    } catch (error) {
      console.error("Error saving settings:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const blob = await exportDatabaseToJson();
      await logActivity({ action: 'Backup Created', targetType: 'backup', targetId: 'manual_backup', description: 'Successfully created a manual database backup' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours() % 12 || 12).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${now.getHours() >= 12 ? 'PM' : 'AM'}`;
      link.download = `bdrs-backup-${formattedDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire({
        title: 'Backup Created',
        text: 'The backup file has been downloaded. Please move it to the "private backups" folder for safekeeping.',
        icon: 'success',
        confirmButtonColor: '#3182ce'
      });
    } catch (error) {
      console.error("Backup failed", error);
      Swal.fire('Backup Failed', 'An error occurred while generating the backup.', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreDatabase = async () => {
    if (!restoreFile) {
      Swal.fire('No File Selected', 'Please select a backup file to restore.', 'warning');
      return;
    }
    if (!understandRestore) {
      Swal.fire('Confirmation Required', 'You must check the confirmation box to proceed.', 'warning');
      return;
    }

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonString = e.target.result;
          await restoreDatabaseFromJson(jsonString);
          await logActivity({ action: 'Database Restored', targetType: 'backup', targetId: 'manual_restore', description: 'Successfully restored database from backup file' });

          Swal.fire({
            title: 'Restore Successful',
            text: 'The database has been successfully restored from the backup.',
            icon: 'success',
            confirmButtonColor: '#3182ce'
          }).then(() => {
            window.location.reload();
          });
        } catch (err) {
          console.error("Restore failed", err);
          Swal.fire('Restore Failed', 'An error occurred while parsing or restoring the backup file.', 'error');
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (error) {
      console.error("Restore failed", error);
      Swal.fire('Restore Failed', 'Failed to read the selected file.', 'error');
      setIsRestoring(false);
    }
  };

  const renderGeneralSettings = () => (
    <div className="settings-general-grid">
      <div className="settings-left-col">
        <h2 className="settings-header-title">General Settings</h2>
        <p className="settings-header-desc">Manage the basic information of your barangay.</p>

        <div className="settings-card">
          <h3 className="settings-section-title">Barangay Information</h3>
          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label">Barangay Name</label>
              <input type="text" className="settings-input" name="barangayName" value={formData.barangayName || ""} onChange={handleChange} />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Barangay Name (Short)</label>
              <input type="text" className="settings-input" name="barangayNameShort" value={formData.barangayNameShort || ""} onChange={handleChange} />
            </div>
          </div>
          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label">Address</label>
              <input type="text" className="settings-input" name="address" value={formData.address || ""} onChange={handleChange} />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Zip Code</label>
              <input type="text" className="settings-input" name="zipCode" value={formData.zipCode || ""} onChange={handleChange} />
            </div>
          </div>
          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label">Contact Number</label>
              <input type="text" className="settings-input" name="contactNumber" value={formData.contactNumber || ""} onChange={handleChange} />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Email Address</label>
              <input type="email" className="settings-input" name="emailAddress" value={formData.emailAddress || ""} onChange={handleChange} />
            </div>
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Official Website (Optional)</label>
            <input type="text" className="settings-input" name="officialWebsite" value={formData.officialWebsite || ""} onChange={handleChange} />
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-section-title">Office Information</h3>
          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label">Office Hours</label>
              <select className="settings-select" name="lunchBreak" value={formData.lunchBreak || ""} onChange={handleChange}>
                <option value="Monday - Friday 8:00 AM - 5:00 PM">Monday - Friday 8:00 AM - 5:00 PM</option>
              </select>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Lunch Break</label>
              <select className="settings-select" name="holidaySchedule" value={formData.holidaySchedule || ""} onChange={handleChange}>
                <option value="12:00 PM - 1:00 PM">12:00 PM - 1:00 PM</option>
              </select>
            </div>
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Holiday Schedule</label>
            <select className="settings-select" name="defaultReleaseMethod" value={formData.defaultReleaseMethod || ""} onChange={handleChange}>
              <option>Follow Regular Holidays</option>
            </select>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-section-title">Official Information</h3>
          <div className="settings-form-row" style={{ alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="settings-form-group">
                <label className="settings-label">Barangay Captain / Punong Barangay</label>
                <input type="text" className="settings-input" name="captain" value={formData.captain || ""} onChange={handleChange} />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Barangay Secretary</label>
                <input type="text" className="settings-input" name="secretary" value={formData.secretary || ""} onChange={handleChange} />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Default Release Method</label>
                <select className="settings-select" name="defaultReleaseMethod" value={formData.defaultReleaseMethod || ""} onChange={handleChange}>
                  <option value="Pick up at Barangay Hall">Pick up at Barangay Hall</option>
                </select>
              </div>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Document Footer / Note</label>
              <textarea className="settings-textarea" name="footerNote" value={formData.footerNote || ""} onChange={handleChange} style={{ height: '100%', minHeight: '180px', resize: 'vertical' }}></textarea>
            </div>
          </div>

          <div className="actions-footer">
            <button className="settings-btn-outline">Reset Changes</button>
            <button className="settings-btn-primary" onClick={handleSaveSettings} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>

      <div className="settings-right-col">
        <div className="settings-card">
          <h3 className="settings-section-title" style={{ color: '#1a202c', borderBottom: 'none' }}>Barangay Logo</h3>
          <div className="logo-preview-area">
            <img src={logoPreview} alt="Barangay Logo" className="logo-preview-image" />
            <div className="logo-actions">
              <div>
                <input type="file" id="logo-upload" style={{ display: 'none' }} accept="image/*" onChange={handleLogoChange} />
                <button className="settings-btn-outline-primary" onClick={() => document.getElementById('logo-upload').click()}><Upload size={16} /> Change Logo</button>
              </div>
              <button className="settings-btn-outline-danger" onClick={handleRemoveLogo}><Trash2 size={16} /> Remove</button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">Recommended size: 512x512px<br />JPG, PNG or WEBP (Max. 2MB)</p>
        </div>

        <div className="settings-card" style={{ padding: '0', overflow: 'hidden' }}>
          <h3 className="settings-section-title" style={{ color: '#1a202c', borderBottom: 'none', padding: '20px 20px 0 20px', margin: 0 }}>Preview</h3>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
              <img src={logoPreview} alt="Preview Logo" style={{ width: '60px', height: '60px' }} />
              <div>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#1a202c' }}>{formData.barangayName || "Barangay Name"}</h4>
                <p style={{ margin: '0', fontSize: '0.8rem', color: '#718096' }}>{formData.address || "Address"}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#718096' }}>{formData.contactNumber || "Contact"} | {formData.emailAddress || "Email"}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: '#718096', width: '100px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={14} /> Office Hours</span>
                <span style={{ fontSize: '0.8rem', color: '#2d3748' }}>{formData.officeHours || "Office Hours"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: '#718096', width: '100px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={14} /> Lunch Break</span>
                <span style={{ fontSize: '0.8rem', color: '#2d3748' }}>{formData.lunchBreak || "Lunch Break"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: '#718096', width: '100px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={14} /> Release Method</span>
                <span style={{ fontSize: '0.8rem', color: '#2d3748' }}>{formData.defaultReleaseMethod || "Release Method"}</span>
              </div>
            </div>

            <div className="settings-info-box">
              <Info size={16} className="settings-info-box-icon" />
              <p>This information will be used in system documents and public forms.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentFees = () => (
    <div className="settings-general-grid" style={{ gridTemplateColumns: '1fr' }}>
      <div className="settings-left-col">
        <div className="settings-doc-header">
          <div>
            <h2 className="settings-header-title" style={{ marginBottom: '5px' }}>Document Fees & Pricing</h2>
            <p className="settings-header-desc" style={{ marginBottom: 0 }}>Manage the fees, requirements, processing time and other details for each document type.</p>
          </div>
        </div>

        {/* Document Items */}
        <div className="doc-fee-list" style={{ marginTop: '20px' }}>
          {documentSettings.map((doc, index) => (
            <div className="doc-fee-item" key={doc.id}>
              <div className="doc-fee-info">
                <div className="doc-fee-icon" style={{ backgroundColor: getDocBgColor(doc.id), padding: '8px' }}>
                  <img src={getDocIcon(doc.id)} alt={doc.title} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                </div>
                <div className="doc-fee-details">
                  <div className="doc-fee-title" style={{ color: doc.status === 'inactive' ? '#a0aec0' : 'inherit' }}>
                    {doc.title}
                    <span className="doc-fee-status" style={{ backgroundColor: doc.status === 'active' ? '#c6f6d5' : '#e2e8f0', color: doc.status === 'active' ? '#2f855a' : '#718096' }}>
                      {doc.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="doc-fee-pricing">
                {doc.id === 'business_clearance' && !doc.isFree ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div className="doc-fee-price-row">
                      <span className="doc-fee-price-label">New Business</span>
                      <div className="doc-fee-price-input" style={{ opacity: doc.status === 'inactive' ? 0.5 : 1 }}>
                        <span>₱</span>
                        <input type="text" value={doc.firstCopyFee || ''} readOnly />
                      </div>
                    </div>
                    <div className="doc-fee-price-row">
                      <span className="doc-fee-price-label">Renewal</span>
                      <div className="doc-fee-price-input" style={{ opacity: doc.status === 'inactive' ? 0.5 : 1 }}>
                        <span>₱</span>
                        <input type="text" value={doc.renewalFee || ''} readOnly />
                      </div>
                    </div>
                    <div className="doc-fee-price-row">
                      <span className="doc-fee-price-label">Closure</span>
                      <div className="doc-fee-price-input" style={{ opacity: doc.status === 'inactive' ? 0.5 : 1 }}>
                        <span>₱</span>
                        <input type="text" value={doc.closureFee || ''} readOnly />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="doc-fee-price-row">
                    <span className="doc-fee-price-label">Copy Fee</span>
                    {doc.isFree ? (
                      <div style={{ color: '#38a169', fontWeight: 'bold', padding: '5px 10px', backgroundColor: '#f0fff4', borderRadius: '4px', border: '1px solid #c6f6d5', opacity: doc.status === 'inactive' ? 0.5 : 1 }}>
                        Free
                      </div>
                    ) : (
                      <div className="doc-fee-price-input" style={{ opacity: doc.status === 'inactive' ? 0.5 : 1 }}>
                        <span>₱</span>
                        <input type="text" value={doc.firstCopyFee} readOnly />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="doc-fee-actions">
                <label className="toggle-switch">
                  <input type="checkbox" checked={doc.status === 'active'} onChange={() => handleDocToggle(doc.id)} />
                  <span className="toggle-slider"></span>
                </label>
                <button className="btn-edit" onClick={() => handleEditClick({ ...doc, icon: getDocIcon(doc.id) })}><Edit size={14} /> Edit</button>
              </div>
            </div>
          ))}
        </div>

        <div className="actions-footer" style={{ marginTop: '20px' }}>
          <button className="settings-btn-outline">Reset Changes</button>
          <button className="settings-btn-primary" onClick={handleSaveSettings} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save All Changes'}</button>
        </div>
      </div>
    </div>
  );

  const renderDocumentTemplateSettings = () => {
    const templates = [
      {
        id: 'barangay_clearance',
        title: 'Barangay Clearance',
        desc: 'Official clearance issued to residents for various purposes (employment, travel, business, etc.).',
        previewImage: BrgyClearanceImg
      },
      {
        id: 'certificate_of_residency',
        title: 'Residency Certificate',
        desc: 'Certifies that the individual is a resident of the barangay.',
        previewImage: CertResidencyImg
      },
      {
        id: 'business_clearance',
        title: 'Barangay Business Permit',
        desc: 'Clearance for businesses operating in the barangay.',
        previewImage: BusClearanceImg
      },
      {
        id: 'certificate_of_indigency',
        title: 'Certificate of Indigency',
        desc: 'Certifies that the individual is indigent and has no income or sufficient resources.',
        previewImage: CertIndigencyImg
      }
    ];

    const handleAction = (action, template) => {
      if (action === 'Preview') {
        setPreviewTemplate(template);
      } else if (action === 'Edit') {
        handleOpenEditTemplate(template);
      }
    };

    return (
      <div className="settings-general-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="settings-left-col">
          <div className="settings-doc-header">
            <div>
              <h2 className="settings-header-title" style={{ marginBottom: '5px' }}>Document Templates</h2>
              <p className="settings-header-desc" style={{ marginBottom: 0 }}>Manage and customize templates for generated documents.</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '20px' }}>
            {templates.map((template) => (
              <div key={template.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                    <div style={{ backgroundColor: '#ebf8ff', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'fit-content' }}>
                      <img src={template.previewImage} alt="icon" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a202c', margin: '0 0 5px 0' }}>{template.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{template.desc}</p>
                    </div>
                  </div>
                  
                  <div style={{ width: '140px', height: '105px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '10px', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                       <img src={Logo} alt="Seal" style={{ width: '20px', height: '20px' }} />
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                         <div style={{ width: '50px', height: '2px', backgroundColor: '#cbd5e1' }}></div>
                         <div style={{ width: '70px', height: '2px', backgroundColor: '#cbd5e1' }}></div>
                       </div>
                     </div>
                     <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#1a202c', textAlign: 'center', marginBottom: '6px' }}>{template.title.toUpperCase()}</div>
                     <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e8f0', marginBottom: '4px' }}></div>
                     <div style={{ width: '90%', height: '2px', backgroundColor: '#cbd5e1', marginBottom: '3px' }}></div>
                     <div style={{ width: '80%', height: '2px', backgroundColor: '#cbd5e1', marginBottom: '3px' }}></div>
                     <div style={{ width: '85%', height: '2px', backgroundColor: '#cbd5e1', marginBottom: '3px' }}></div>
                     <div style={{ width: '40%', height: '2px', backgroundColor: '#cbd5e1', alignSelf: 'flex-start' }}></div>
                     
                     <div style={{ position: 'absolute', bottom: '6px', right: '6px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                       <div style={{ width: '20px', height: '2px', backgroundColor: '#cbd5e1' }}></div>
                       <div style={{ width: '30px', height: '1px', backgroundColor: '#94a3b8' }}></div>
                     </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button 
                    onClick={() => handleAction('Edit', template)}
                    className="settings-btn-primary" 
                    style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem' }}
                  >
                    <Edit size={16} /> Edit Template
                  </button>
                  <button 
                    onClick={() => handleAction('Preview', template)}
                    className="settings-btn-outline" 
                    style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', color: '#3182ce', borderColor: '#3182ce' }}
                  >
                    <Eye size={16} /> Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleNotificationToggle = async (key) => {
    const currentSettings = formData.notificationSettings || {};
    const currentValue = currentSettings[key] !== undefined ? currentSettings[key] : true;

    const updatedNotificationSettings = {
      ...currentSettings,
      [key]: !currentValue
    };

    setFormData(prev => ({
      ...prev,
      notificationSettings: updatedNotificationSettings
    }));

    try {
      await setDoc(doc(db, 'settings', 'general'), {
        notificationSettings: updatedNotificationSettings
      }, { merge: true });
      await logActivity({ action: 'Notification Settings Updated', targetType: 'settings', targetId: 'general', description: `Toggled notification setting for ${key}` });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Settings Saved',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Failed to save',
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  const renderNotificationSettings = () => {
    const notifs = formData.notificationSettings || {};
    const getVal = (key) => notifs[key] !== undefined ? notifs[key] : true;

    const renderCardHeader = (icon, title, subtitle) => (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0b1c4e' }}>{title}</h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>{subtitle}</p>
        </div>
      </div>
    );

    const renderToggleRow = (key, label, hint) => (
      <div className="settings-form-row" style={{ alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ flex: 1, paddingRight: '2rem' }}>
          <label style={{ marginBottom: '4px', display: 'block', fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{label}</label>
          <span style={{ display: 'block', color: '#64748b', fontSize: '0.85rem' }}>{hint}</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={getVal(key)} onChange={() => handleNotificationToggle(key)} />
          <span className="toggle-slider"></span>
        </label>
      </div>
    );

    return (
      <div className="settings-general-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="settings-left-col">
          <div className="settings-doc-header">
            <div>
              <h2 className="settings-header-title" style={{ marginBottom: '5px' }}>Notification Settings</h2>
              <p className="settings-header-desc" style={{ marginBottom: 0 }}>Configure which system alerts and emails are dispatched to users and administrators.</p>
            </div>
          </div>

          <div className="settings-card" style={{ marginTop: '20px', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            {renderCardHeader(
              <FileText size={26} color="#3b82f6" />,
              "Resident Notifications",
              "Receive alerts for document request updates and resident events."
            )}

            {renderToggleRow('resident_req_confirmation', 'New Request Confirmation', 'Send a notification to the resident when they submit a new document request.')}
            {renderToggleRow('resident_req_approved', 'Request Approved', 'Notify residents when their document request has been approved.')}
            {renderToggleRow('resident_req_rejected', 'Request Rejected', 'Notify residents if their request is rejected, including the reason.')}
            {renderToggleRow('resident_req_ready', 'Request Ready for Pickup / Completed', 'Notify residents when their document is ready for pickup or download.')}
            <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0, alignItems: 'center' }} className="settings-form-row">
              <div style={{ flex: 1, paddingRight: '2rem' }}>
                <label style={{ marginBottom: '4px', display: 'block', fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Request Cancelled</label>
                <span style={{ display: 'block', color: '#64748b', fontSize: '0.85rem' }}>Notify residents when a request is cancelled or deleted.</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={getVal('resident_req_cancelled')} onChange={() => handleNotificationToggle('resident_req_cancelled')} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-card" style={{ marginTop: '20px', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            {renderCardHeader(
              <Users size={26} color="#3b82f6" />,
              "Secretary / Admin Notifications",
              "Receive alerts when users interact with the system."
            )}

            {renderToggleRow('admin_new_registration', 'New Resident Registration', 'Receive an alert when a new resident registers for an account.')}
            {renderToggleRow('admin_new_request', 'New Document Request', 'Receive an alert for every new document request submitted.')}
            <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0, alignItems: 'center' }} className="settings-form-row">
              <div style={{ flex: 1, paddingRight: '2rem' }}>
                <label style={{ marginBottom: '4px', display: 'block', fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>New Message / Inquiry</label>
                <span style={{ display: 'block', color: '#64748b', fontSize: '0.85rem' }}>Receive an alert when a user submits a contact form message.</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={getVal('admin_new_message')} onChange={() => handleNotificationToggle('admin_new_message')} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-card" style={{ marginTop: '20px', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            {renderCardHeader(
              <ShieldAlert size={26} color="#3b82f6" />,
              "Security Notifications",
              "Stay informed about critical security events."
            )}

            <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0, alignItems: 'center' }} className="settings-form-row">
              <div style={{ flex: 1, paddingRight: '2rem' }}>
                <label style={{ marginBottom: '4px', display: 'block', fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Failed Login Attempts</label>
                <span style={{ display: 'block', color: '#64748b', fontSize: '0.85rem' }}>Get immediate alerts when someone fails to log in multiple times.</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={getVal('security_failed_login')} onChange={() => handleNotificationToggle('security_failed_login')} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>


        </div>
      </div>
    );
  };

  const handleBackupFreqChange = async (e) => {
    const newFreq = e.target.value;
    
    setFormData(prev => ({
      ...prev,
      backupSettings: {
        ...(prev.backupSettings || {}),
        frequency: newFreq
      }
    }));

    try {
      await setDoc(doc(db, 'settings', 'general'), {
        backupSettings: { frequency: newFreq }
      }, { merge: true });
      await logActivity({ action: 'Backup Schedule Updated', targetType: 'settings', targetId: 'general', description: `Changed automated backup frequency to ${newFreq}` });
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Settings Saved',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error saving backup settings:", error);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Failed to save',
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  const handleEndMaintenance = async () => {
    setIsSavingMaint(true);
    try {
      const updatedSettings = {
        ...maintSettings,
        status: 'ended',
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'settings', 'maintenance'), updatedSettings, { merge: true });
      setMaintSettings(updatedSettings);

      const adminName = sessionStorage.getItem('adminName') || 'Unknown Admin';
      const adminRole = sessionStorage.getItem('adminRole') || 'Admin';

      await logActivity({ action: `Maintenance Mode Ended`, targetType: 'settings', targetId: 'maintenance', description: `Maintenance mode was ended by ${adminName}` }, adminName, adminRole);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Maintenance Ended',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error ending maintenance:", error);
      Swal.fire('Error', 'Failed to end maintenance mode.', 'error');
    } finally {
      setIsSavingMaint(false);
    }
  };
  const handleSaveMaintenance = async (actionType) => {
    setIsSavingMaint(true);
    try {
      const isStartNow = actionType === 'active';
      const status = isStartNow ? 'active' : 'scheduled';
      
      const maintenanceStartTime = isStartNow 
        ? Timestamp.now() 
        : Timestamp.fromMillis(Date.now() + maintScheduleMinutes * 60 * 1000);

      const updatedSettings = {
        ...maintSettings,
        status,
        maintenanceStartTime,
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'settings', 'maintenance'), updatedSettings, { merge: true });
      setMaintSettings(updatedSettings);

      const adminName = sessionStorage.getItem('adminName') || 'Unknown Admin';
      const adminRole = sessionStorage.getItem('adminRole') || 'Admin';

      await logActivity({ 
        action: `Maintenance Mode ${status === 'active' ? 'Started' : 'Scheduled'}`, 
        targetType: 'settings', 
        targetId: 'maintenance', 
        description: `Maintenance mode was ${status === 'active' ? 'started immediately' : `scheduled for ${maintScheduleMinutes} minutes from now`} by ${adminName}` 
      }, adminName, adminRole);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Maintenance ${status === 'active' ? 'Started' : 'Scheduled'}`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error saving maintenance settings:", error);
      Swal.fire('Error', 'Failed to save maintenance settings.', 'error');
    } finally {
      setIsSavingMaint(false);
    }
  };

  const renderMaintenanceSettings = () => (
    <div className="settings-general-grid" style={{ gridTemplateColumns: '1fr' }}>
      <div className="settings-left-col">
        <div className="settings-doc-header">
          <div>
            <h2 className="settings-header-title" style={{ marginBottom: '5px' }}>Maintenance Mode</h2>
            <p className="settings-header-desc" style={{ marginBottom: 0 }}>Temporarily block resident access while performing administrative maintenance.</p>
          </div>
        </div>

        <div className="settings-card" style={{ marginTop: '20px', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          
          <div style={{ marginBottom: '20px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#334155' }}>Current Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {effectiveStatus === 'active' ? (
                <span style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>🔴 ACTIVE</span>
              ) : effectiveStatus === 'scheduled' ? (
                <span style={{ backgroundColor: '#feebc8', color: '#c05621', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>🟡 SCHEDULED</span>
              ) : (
                <span style={{ backgroundColor: '#c6f6d5', color: '#2f855a', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>🟢 ENDED (Normal Operations)</span>
              )}
            </div>
            
            {effectiveStatus === 'scheduled' && maintSettings.maintenanceStartTime && (
              <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#475569' }}>
                Maintenance is scheduled to start at: <strong>{new Date(maintSettings.maintenanceStartTime.toMillis ? maintSettings.maintenanceStartTime.toMillis() : maintSettings.maintenanceStartTime).toLocaleString()}</strong>
              </p>
            )}
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Maintenance Message (Visible to Residents)</label>
            <textarea 
              className="settings-textarea" 
              style={{ height: '80px', resize: 'vertical' }}
              value={maintSettings.message || ''} 
              onChange={e => setMaintSettings({ ...maintSettings, message: e.target.value })}
            ></textarea>
          </div>

          {effectiveStatus === 'ended' && (
            <div className="settings-form-group">
              <label className="settings-label">Schedule Start Time</label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#475569' }}>Starts in</span>
                <input 
                  type="number"
                  className="settings-input"
                  style={{ width: '100px' }}
                  value={maintScheduleMinutes}
                  onChange={e => setMaintScheduleMinutes(parseInt(e.target.value) || 0)}
                  min="1"
                />
                <span style={{ fontSize: '0.9rem', color: '#475569' }}>minutes</span>
              </div>
            </div>
          )}
          
          <div style={{ backgroundColor: '#fffbeb', padding: '15px', borderRadius: '8px', border: '1px solid #fef3c7', marginTop: '20px', display: 'flex', gap: '10px' }}>
            <AlertCircle color="#d97706" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
              <strong>Note:</strong> Active maintenance blocks all resident access. Residents will be warned during the scheduled period. Maintenance will <strong>not</strong> end automatically.
            </div>
          </div>

          <div className="actions-footer" style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {effectiveStatus === 'ended' ? (
              <>
                <button className="settings-btn-primary" onClick={() => handleSaveMaintenance('scheduled')} disabled={isSavingMaint}>
                  {isSavingMaint ? 'Saving...' : 'Schedule Maintenance'}
                </button>
                <button 
                  onClick={() => handleSaveMaintenance('active')} 
                  disabled={isSavingMaint}
                  style={{ backgroundColor: '#dd6b20', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Start Maintenance Immediately
                </button>
              </>
            ) : (
              <>
                {(effectiveStatus === 'active' || effectiveStatus === 'scheduled') && (
                  <button 
                    onClick={handleEndMaintenance} 
                    disabled={isSavingMaint}
                    style={{ backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    End Maintenance
                  </button>
                )}
                {effectiveStatus === 'scheduled' && (
                  <button 
                    onClick={() => handleSaveMaintenance('active')} 
                    disabled={isSavingMaint}
                    style={{ backgroundColor: '#dd6b20', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Start Maintenance Now
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackupSettings = () => {
    const freq = formData.backupSettings?.frequency || 'Manual Only';

    const renderStatusBanner = () => {
      if (freq === 'Manual Only') {
        return (
          <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#334155', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#64748b', borderRadius: '50%', display: 'inline-block', marginRight: '8px' }}></span>
                Automatic backup is disabled.
              </div>
              <div style={{ color: '#475569', fontSize: '0.8rem' }}>Backups will only be created manually.</div>
            </div>
            <div style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Manual Only</div>
          </div>
        );
      } else {
        return (
          <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#166534', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block', marginRight: '8px' }}></span>
                Automatic backup is configured for {freq.toLowerCase()}.
              </div>
              <div style={{ color: '#15803d', fontSize: '0.8rem' }}>A cloud scheduler will securely process these backups.</div>
            </div>
            <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Active</div>
          </div>
        );
      }
    };
    return (
      <div className="settings-general-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="settings-left-col">
          <div className="settings-doc-header">
            <div>
              <h2 className="settings-header-title" style={{ marginBottom: '5px' }}>Database Backup & Recovery</h2>
              <p className="settings-header-desc" style={{ marginBottom: 0 }}>Manage your database backups and restore data when needed.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
            {/* Backup Settings Card */}
            <div className="settings-card" style={{ flex: '1 1 500px', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <CloudUpload size={24} color="#3b82f6" style={{ marginRight: '1rem' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0b1c4e' }}>Backup Settings</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure automatic backups for your database.</p>
                </div>
              </div>

              {renderStatusBanner()}

              <div className="settings-form-row">
                <div className="settings-form-group">
                  <label className="settings-label">Backup Frequency</label>
                  <select className="settings-select" value={freq} onChange={handleBackupFreqChange}>
                    <option value="Manual Only">Manual Only</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div className="settings-form-group">
                  <label className="settings-label">Retention Period</label>
                  <select className="settings-select" disabled>
                    <option>Local Storage Limit</option>
                  </select>
                </div>
              </div>
              <div className="settings-form-row">
                <div className="settings-form-group" style={{ width: '100%' }}>
                  <label className="settings-label">Storage Location</label>
                  <select className="settings-select" disabled>
                    <option>Local Computer (/private backups)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Manual Backup Card */}
            <div className="settings-card" style={{ flex: '1 1 300px', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                <Database size={24} color="#3b82f6" style={{ marginRight: '1rem' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0b1c4e' }}>Manual Backup</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Create a backup of your database right now.</p>
                </div>
              </div>

              <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'flex-start', marginBottom: '20px' }}>
                <Info size={16} color="#3b82f6" style={{ marginTop: '2px', marginRight: '8px', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a' }}>This will download a JSON backup file. Please save it directly into the <strong>private backups</strong> folder.</p>
              </div>

              <button
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className="settings-btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', marginBottom: '20px' }}
              >
                {isBackingUp ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CloudUpload size={18} />} 
                {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
              </button>
            </div>
          </div>

          {/* Restore Database Card */}
          <div className="settings-card" style={{ marginTop: '20px', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <RefreshCw size={24} color="#3b82f6" style={{ marginRight: '1rem' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0b1c4e' }}>Restore Database</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Restore your database from a previously created JSON backup file.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 400px' }}>
                <label className="settings-label" style={{ marginBottom: '8px', display: 'block' }}>Select Backup File</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    id="backup-file-upload"
                    accept=".json"
                    onChange={(e) => setRestoreFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="backup-file-upload"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      width: '100%', padding: '24px 16px', border: '2px dashed #cbd5e1', borderRadius: '8px', 
                      backgroundColor: '#f8fafc', cursor: 'pointer', color: '#64748b',
                      transition: 'all 0.2s ease', textAlign: 'center'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  >
                    <Upload size={24} style={{ marginBottom: '4px' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Click to browse for backup file</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Only .json files are supported</span>
                  </label>
                </div>

                {restoreFile && (
                  <div style={{ marginTop: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}>
                    <CheckCircle2 size={16} color="#166534" style={{ marginRight: '8px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>File selected</div>
                      <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Name: {restoreFile.name} | Size: {(restoreFile.size / 1024).toFixed(2)} KB</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ flex: '1 1 300px' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: '#1e3a8a', fontSize: '0.9rem', marginBottom: '8px' }}>
                    <Info size={16} style={{ marginRight: '6px' }} /> Important
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                    <li>This will replace your current database with the selected backup.</li>
                    <li>Make sure to verify the backup is correct before proceeding.</li>
                    <li>For safety, consider testing the restore process in a separate environment first.</li>
                  </ul>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '15px' }}>
                  <input type="checkbox" checked={understandRestore} onChange={(e) => setUnderstandRestore(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>I understand that this will replace my current data.</span>
                </label>

                <button
                  onClick={handleRestoreDatabase}
                  disabled={isRestoring || !restoreFile || !understandRestore}
                  className="settings-btn-primary"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                >
                  {isRestoring ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={18} />} 
                  {isRestoring ? 'Restoring...' : 'Restore Database'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };


  return (
    <div className="admin-dashboard-container">
      {/* Main Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>System Settings</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        <div className="dashboard-content">
          {/* Settings Dashboard Wrapper */}
          <div className="settings-dashboard-wrapper">

            {/* Inner Settings Sidebar */}
            <div className="settings-inner-sidebar">
              <h3 className="settings-sidebar-title">Settings Menu</h3>
              <nav className="settings-nav">
                <button
                  className={`settings-nav-item ${activeTab === 'general' ? 'active' : ''}`}
                  onClick={() => setActiveTab('general')}
                >
                  <Home size={18} className="settings-nav-item-icon" />
                  <div className="settings-nav-item-text">
                    <span className="settings-nav-item-title">General Settings</span>
                    <span className="settings-nav-item-desc">Manage barangay information and contact details</span>
                  </div>
                </button>

                <button
                  className={`settings-nav-item ${activeTab === 'documents' ? 'active' : ''}`}
                  onClick={() => setActiveTab('documents')}
                >
                  <FileText size={18} className="settings-nav-item-icon" />
                  <div className="settings-nav-item-text">
                    <span className="settings-nav-item-title">Document & Fees</span>
                    <span className="settings-nav-item-desc">Manage documents, requirements, processing time and fees</span>
                  </div>
                </button>

                <button
                  className={`settings-nav-item ${activeTab === 'templates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('templates')}
                >
                  <LayoutTemplate size={18} className="settings-nav-item-icon" />
                  <div className="settings-nav-item-text">
                    <span className="settings-nav-item-title">Document Template</span>
                    <span className="settings-nav-item-desc">Manage and customize templates for generated documents</span>
                  </div>
                </button>

                <button
                  className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => setActiveTab('notifications')}
                >
                  <Bell size={18} className="settings-nav-item-icon" />
                  <div className="settings-nav-item-text">
                    <span className="settings-nav-item-title">Notifications</span>
                    <span className="settings-nav-item-desc">Configure system notifications and alerts</span>
                  </div>
                </button>
                <button
                  className={`settings-nav-item ${activeTab === 'maintenance' ? 'active' : ''}`}
                  onClick={() => setActiveTab('maintenance')}
                >
                  <AlertCircle size={18} className="settings-nav-item-icon" />
                  <div className="settings-nav-item-text">
                    <span className="settings-nav-item-title">Maintenance Mode</span>
                    <span className="settings-nav-item-desc">Temporarily disable public access</span>
                  </div>
                </button>
                <button
                  className={`settings-nav-item ${activeTab === 'backup' ? 'active' : ''}`}
                  onClick={() => setActiveTab('backup')}
                >
                  <Database size={18} className="settings-nav-item-icon" />
                  <div className="settings-nav-item-text">
                    <span className="settings-nav-item-title">Database Backup & Recovery</span>
                    <span className="settings-nav-item-desc">Backup your database and restore it when needed</span>
                  </div>
                </button>
                {/* Note: Excluded Copy Pricing, Users & Permissions, and Security & Audit Logs per user request */}
              </nav>
            </div>

            {/* Content Area */}
            <div className="settings-content-area">
              {activeTab === 'general' && renderGeneralSettings()}
              {activeTab === 'documents' && renderDocumentFees()}
              {activeTab === 'templates' && renderDocumentTemplateSettings()}
              {activeTab === 'notifications' && renderNotificationSettings()}
              {activeTab === 'maintenance' && renderMaintenanceSettings()}
              {activeTab === 'backup' && renderBackupSettings()}
            </div>

          </div>
        </div>
      </main>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white', borderRadius: '12px', padding: '0',
            width: '800px', maxWidth: '95%', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye size={20} color="#3182ce" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1a202c' }}>{previewTemplate.title} Preview</h2>
              </div>
              <button onClick={() => setPreviewTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '30px', backgroundColor: '#e2e8f0', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
              {/* Document Preview Paper */}
              <div style={{ width: '210mm', height: '297mm', backgroundColor: 'white', padding: '40px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ border: '3px double #2d3748', padding: '40px', flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Watermark Logo */}
                  <img src={Logo} alt="Watermark" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', opacity: 0.08, zIndex: 0 }} />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative' }}>
                      <img src={Logo} alt="Barangay Seal" style={{ width: '100px', height: '100px', position: 'absolute', left: '0' }} />
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
                    <h2 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '24px', margin: '50px 0 30px 0', fontWeight: 'bold', fontFamily: 'serif', color: '#1a202c' }}>
                      {previewTemplate.title}
                    </h2>
                    
                    {/* Body Content */}
                    <div 
                      dangerouslySetInnerHTML={{ __html: getPreviewHTML(formData.documentTemplates?.[previewTemplate.id] || defaultTemplateBodies[previewTemplate.id] || "") }}
                      style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', fontFamily: 'serif', color: '#1a202c', whiteSpace: 'pre-wrap' }}
                    />
                    
                    {/* Signatures */}
                    <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center', width: '250px' }}>
                        <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '30px' }}></div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', fontFamily: 'serif', textTransform: 'uppercase' }}>{formData?.secretary || "BARANGAY SECRETARY"}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontFamily: 'serif' }}>Barangay Secretary</p>
                      </div>
                      <div style={{ textAlign: 'center', width: '250px' }}>
                        <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '30px' }}></div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', fontFamily: 'serif', textTransform: 'uppercase' }}>{formData?.captain || "HON. JUAN DELA CRUZ"}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontFamily: 'serif' }}>Barangay Captain</p>
                      </div>
                    </div>
                    
                    {/* Footer Info */}
                    <div style={{ marginTop: '50px', fontSize: '14px', fontFamily: 'serif', color: '#1a202c' }}>
                      <p style={{ margin: '5px 0' }}>Paid Under O.R. # _________________</p>
                      <p style={{ margin: '5px 0' }}>Issued at Buluan, Ipil, Zamboanga Sibugay</p>
                      <p style={{ margin: '5px 0' }}>
                        Amount Paid: {(() => {
                          const docFee = documentSettings.find(d => d.id === previewTemplate.id);
                          if (!docFee) return '₱ 0.00';
                          if (docFee.isFree) return 'Free';
                          return `₱ ${docFee.firstCopyFee || '0.00'}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '15px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#ffffff', borderRadius: '0 0 12px 12px' }}>
              <button onClick={() => setPreviewTemplate(null)} className="settings-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} /> Done
              </button>
            </div>
          </div>
        </div>
      )}

      {editTemplateMode && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white', borderRadius: '12px',
            width: '210mm', maxWidth: '95%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit size={20} color="#3182ce" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1a202c' }}>{editTemplateMode.title} Template Editor</h2>
              </div>
              <button onClick={() => setEditTemplateMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}><X size={20} /></button>
            </div>
            
            <div id="print-edit-area" style={{ padding: '30px', backgroundColor: '#e2e8f0', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
              <style>
                {`
                  @media print {
                    @page { margin: 0; size: auto; }
                    
                    /* Hide main layout elements entirely */
                    .admin-main, .admin-sidebar, .mobile-toggle, .sidebar-overlay {
                      display: none !important;
                    }
                    
                    body, html {
                      margin: 0 !important;
                      padding: 0 !important;
                      background: white !important;
                      height: 100% !important;
                    }

                    .modal-overlay {
                      position: static !important;
                      background: none !important;
                      display: block !important;
                      height: 100% !important;
                    }

                    /* Hide modal headers and footers */
                    .modal-content > div:not(#print-edit-area) {
                      display: none !important;
                    }
                    .modal-content {
                      height: 100% !important;
                      background: transparent !important;
                      box-shadow: none !important;
                      width: 100% !important;
                      max-width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    
                    #print-edit-area, #print-edit-area * {
                      visibility: visible !important;
                    }
                    
                    #print-edit-area {
                      position: relative !important;
                      display: block !important;
                      width: 100% !important;
                      height: 100% !important;
                      background: white !important;
                      padding: 0 !important;
                      margin: 0 !important;
                      overflow: visible !important;
                    }
                    
                    .print-paper {
                      width: 100% !important;
                      height: 100% !important;
                      box-shadow: none !important;
                      margin: 0 !important;
                      padding: 20px !important;
                      border: none !important;
                      box-sizing: border-box !important;
                    }
                    
                    .print-paper textarea {
                      border: none !important;
                      resize: none !important;
                      background: transparent !important;
                      overflow: visible !important;
                      white-space: pre-wrap !important;
                    }
                  }
                `}
              </style>
              {/* Document Preview Paper */}
              <div className="print-paper" style={{ width: '210mm', height: '297mm', backgroundColor: 'white', padding: '40px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ border: '3px double #2d3748', padding: '40px', flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Watermark Logo */}
                  <img src={Logo} alt="Watermark" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', opacity: 0.08, zIndex: 0 }} />
                  
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', position: 'relative' }}>
                      <img src={Logo} alt="Barangay Seal" style={{ width: '100px', height: '100px', position: 'absolute', left: '0' }} />
                      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                      {editTemplateMode.title}
                    </h2>
                    
                    {/* Editable Body Content */}
                    <textarea 
                      value={templateBody}
                      onChange={(e) => setTemplateBody(e.target.value)}
                      style={{ 
                        flex: 1, 
                        width: '100%', 
                        minHeight: '400px', 
                        fontSize: '15px', 
                        lineHeight: '1.8', 
                        textAlign: 'justify', 
                        fontFamily: 'serif', 
                        color: '#1a202c', 
                        border: '1px dashed #cbd5e1', 
                        backgroundColor: 'rgba(255,255,255,0.8)', 
                        resize: 'vertical',
                        padding: '10px'
                      }} 
                    />
                    
                    {/* Signatures */}
                    <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center', width: '250px' }}>
                        <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '30px' }}></div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', fontFamily: 'serif', textTransform: 'uppercase' }}>{formData?.secretary || "BARANGAY SECRETARY"}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontFamily: 'serif' }}>Barangay Secretary</p>
                      </div>
                      <div style={{ textAlign: 'center', width: '250px' }}>
                        <div style={{ borderBottom: '1px solid #1a202c', marginBottom: '5px', height: '30px' }}></div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', fontFamily: 'serif', textTransform: 'uppercase' }}>{formData?.captain || "HON. JUAN DELA CRUZ"}</p>
                        <p style={{ margin: 0, fontSize: '14px', fontFamily: 'serif' }}>Barangay Captain</p>
                      </div>
                    </div>
                    
                    {/* Footer Info */}
                    <div style={{ marginTop: '50px', fontSize: '14px', fontFamily: 'serif', color: '#1a202c' }}>
                      <p style={{ margin: '5px 0' }}>Paid Under O.R. # _________________</p>
                      <p style={{ margin: '5px 0' }}>Issued at Buluan, Ipil, Zamboanga Sibugay</p>
                      <p style={{ margin: '5px 0' }}>
                        Amount Paid: {(() => {
                          const docFee = documentSettings.find(d => d.id === editTemplateMode.id);
                          if (!docFee) return '₱ 0.00';
                          if (docFee.isFree) return 'Free';
                          return `₱ ${docFee.firstCopyFee || '0.00'}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '15px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#ffffff', borderRadius: '0 0 12px 12px' }}>
              <button onClick={() => window.print()} className="settings-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={16} /> Print Document
              </button>
              <button onClick={handleSaveTemplate} disabled={isSaving} className="settings-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white', borderRadius: '12px', padding: '24px',
            width: '650px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1a202c' }}>Edit Document Fees</h2>
              <button onClick={() => { handleCloseModal(); setQrCodeFile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0' }}><X size={20} /></button>
            </div>

            {editingDoc && (
              <>
                <div style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: '#f7fafc', borderRadius: '8px', marginBottom: '20px' }}>
                  <div style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <img src={editingDoc.icon} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#2d3748', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {editingDoc.title} <span className="doc-fee-status" style={{ backgroundColor: editingDoc.status === 'active' ? '#c6f6d5' : '#e2e8f0', color: editingDoc.status === 'active' ? '#2f855a' : '#718096' }}>{editingDoc.status === 'active' ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#718096', margin: '5px 0 0 0', lineHeight: 1.4 }}>{editingDoc.desc}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', margin: 0 }}>Free Document</label>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={editingDoc.isFree || false} onChange={e => setEditingDoc({ ...editingDoc, isFree: e.target.checked, firstCopyFee: e.target.checked ? '0.00' : (editingDoc.firstCopyFee === '0.00' ? '' : editingDoc.firstCopyFee) })} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    {!editingDoc.isFree && editingDoc.id === 'business_clearance' ? (
                      <>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>New Business Fee <span style={{ color: '#e53e3e' }}>*</span></label>
                        <div className="doc-fee-price-input" style={{ width: '100%', marginBottom: '15px' }}>
                          <span>₱</span>
                          <input type="text" value={editingDoc.firstCopyFee || ''} onChange={e => setEditingDoc({ ...editingDoc, firstCopyFee: e.target.value })} />
                        </div>

                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Renewal Fee <span style={{ color: '#e53e3e' }}>*</span></label>
                        <div className="doc-fee-price-input" style={{ width: '100%', marginBottom: '15px' }}>
                          <span>₱</span>
                          <input type="text" value={editingDoc.renewalFee || ''} onChange={e => setEditingDoc({ ...editingDoc, renewalFee: e.target.value })} />
                        </div>

                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Closure Fee <span style={{ color: '#e53e3e' }}>*</span></label>
                        <div className="doc-fee-price-input" style={{ width: '100%', marginBottom: '15px' }}>
                          <span>₱</span>
                          <input type="text" value={editingDoc.closureFee || ''} onChange={e => setEditingDoc({ ...editingDoc, closureFee: e.target.value })} />
                        </div>
                      </>
                    ) : !editingDoc.isFree && (
                      <>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Copy Fee <span style={{ color: '#e53e3e' }}>*</span></label>
                        <div className="doc-fee-price-input" style={{ width: '100%', marginBottom: '15px' }}>
                          <span>₱</span>
                          <input type="text" value={editingDoc.firstCopyFee || ''} onChange={e => setEditingDoc({ ...editingDoc, firstCopyFee: e.target.value })} />
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Status</label>
                    <label className="toggle-switch" style={{ marginBottom: '15px', display: 'block' }}>
                      <input type="checkbox" checked={editingDoc.status === 'active'} onChange={e => setEditingDoc({ ...editingDoc, status: e.target.checked ? 'active' : 'inactive' })} />
                      <span className="toggle-slider"></span>
                    </label>

                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Description</label>
                    <textarea className="settings-textarea" style={{ height: '120px', resize: 'none', width: '100%' }} value={editingDoc.desc} onChange={e => setEditingDoc({ ...editingDoc, desc: e.target.value })}></textarea>
                  </div>
                </div>

                {!editingDoc.isFree && (
                  <div style={{ marginTop: '5px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2d3748', margin: '0 0 15px 0' }}>Online Payment Details</h3>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Payment Method Name (e.g., GCash)</label>
                        <input 
                          type="text" 
                          value={editingDoc.paymentMethodName || ''} 
                          onChange={e => setEditingDoc({ ...editingDoc, paymentMethodName: e.target.value })} 
                          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }} 
                          placeholder="e.g. GCash, Maya, Bank Transfer"
                          onFocus={(e) => { e.target.style.borderColor = '#3182ce'; e.target.style.boxShadow = '0 0 0 1px #3182ce'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Account Name (e.g., E*** A**)</label>
                        <input 
                          type="text" 
                          value={editingDoc.paymentAccountName || ''} 
                          onChange={e => setEditingDoc({ ...editingDoc, paymentAccountName: e.target.value })} 
                          style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }} 
                          placeholder="e.g. Juan D."
                          onFocus={(e) => { e.target.style.borderColor = '#3182ce'; e.target.style.boxShadow = '0 0 0 1px #3182ce'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>
                    </div>
                    
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#4a5568', marginBottom: '5px' }}>Payment QR Code</label>
                    {editingDoc.qrCodeUrl && !qrCodeFile && (
                      <div style={{ marginBottom: '10px' }}>
                        <img src={editingDoc.qrCodeUrl} alt="QR Code" style={{ maxWidth: '100px', maxHeight: '100px', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                      </div>
                    )}
                    <div style={{ position: 'relative', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '16px', textAlign: 'center', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#3182ce'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                      <Upload size={24} color="#a0aec0" style={{ margin: '0 auto 8px auto' }} />
                      <div style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 500 }}>
                        {qrCodeFile ? qrCodeFile.name : "Click to upload QR Code"}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setQrCodeFile(e.target.files[0])} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={handleCloseModal} className="settings-btn-outline" style={{ padding: '8px 16px' }} disabled={isSaving}>Cancel</button>
                  <button onClick={handleEditDocSave} className="settings-btn-primary" style={{ padding: '8px 16px', opacity: isSaving ? 0.7 : 1 }} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
