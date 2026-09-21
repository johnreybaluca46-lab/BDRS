import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ResidentSidebar from '../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../components/ResidentNotificationBell';
import '../../lib/admin-layout.css';
import '../../lib/form.css';
import { ArrowLeft, FileText, Check, Clock, Building, Info, UploadCloud, Calendar, ChevronDown, Send, FileSearch, Settings, CheckCircle, Printer, Home, Headset } from 'lucide-react';
import BusinessClearanceImg from '../../assets/logo/business clearance.png';
import Swal from 'sweetalert2';
import Loader from '../../components/Loader';

import { useSettings } from '../../context/SettingsContext';
import { db, auth } from '../../database/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { compressImageToBase64 } from '../../lib/imageUtils';

export default function BusinessClearanceForm() {
  useEffect(() => {
    document.title = "BDRS | Business Permit";
  }, []);

  const [activeStep, setActiveStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    contactNumber: '',
    emailAddress: '',
    address: '',
    businessName: '',
    businessType: 'Sari-sari Store',
    businessDescription: '',
    businessAddress: '',
    purok: '',
    natureOfBusiness: '',
    numberOfEmployees: '',
    businessContactNumber: '',
    purpose: 'New Business',
    specifyPurpose: '',
    purpose: 'New Business',
    specifyPurpose: '',
    idType: 'Business Permit',
    deliveryMethod: '',
  });
  
  const [photo2x2, setPhoto2x2] = useState(null);
  const [photo2x2Base64, setPhoto2x2Base64] = useState(null);
  const [validIdPhoto, setValidIdPhoto] = useState(null);
  const [validIdPhotoBase64, setValidIdPhotoBase64] = useState(null);
  const [generatedId, setGeneratedId] = useState('');
  const [is18YearsOld, setIs18YearsOld] = useState(false);
  const [appFormPhotoBase64, setAppFormPhotoBase64] = useState(null);
  const [dtiPhotoBase64, setDtiPhotoBase64] = useState(null);
  const [leasePhotoBase64, setLeasePhotoBase64] = useState(null);
  const [prevPermitPhotoBase64, setPrevPermitPhotoBase64] = useState(null);
  const [closureLetterPhotoBase64, setClosureLetterPhotoBase64] = useState(null);

  const appFormRef = React.useRef(null);
  const dtiRef = React.useRef(null);
  const leaseRef = React.useRef(null);
  const prevPermitRef = React.useRef(null);
  const closureLetterRef = React.useRef(null);
  const photoInputRef = React.useRef(null);
  const idInputRef = React.useRef(null);
  
  const navigate = useNavigate();
  
  const { settings, loading } = useSettings();
  const docSetting = settings?.documents?.find(d => d.id === 'business_clearance');
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (!loading && docSetting && docSetting.status === 'inactive') {
      Swal.fire({
        title: 'Form Unavailable',
        text: 'This form is currently inactive. Please wait for the admin to activate it.',
        icon: 'warning',
        confirmButtonColor: '#3182ce',
        confirmButtonText: 'Go Back',
        allowOutsideClick: false
      }).then(() => {
        navigate('/user-dashboard');
      });
    }
  }, [loading, docSetting, navigate]);

  useEffect(() => {
    if (docSetting) {
      let fee = parseFloat(docSetting.firstCopyFee) || 0;
      if (formData.purpose === 'Renewal') fee = parseFloat(docSetting.renewalFee) || 0;
      if (formData.purpose === 'Closure') fee = parseFloat(docSetting.closureFee) || 0;
      setTotalPrice(fee);
    }
  }, [docSetting, formData.purpose]);

  useEffect(() => {
    if (formData.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setIs18YearsOld(age >= 18);
    } else {
      setIs18YearsOld(false);
    }
  }, [formData.dateOfBirth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'contactNumber' || name === 'businessContactNumber') {
      newValue = value.replace(/\D/g, '').slice(0, 11);
    }
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handlePhotoUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto2x2(file);
      try {
        const base64 = await compressImageToBase64(file);
        setPhoto2x2Base64(base64);
        if (errors.photo2x2) setErrors(prev => ({ ...prev, photo2x2: false }));
      } catch (err) {
        console.error("Error compressing photo:", err);
      }
    }
  };

  const handleGenericUpload = async (e, setBase64, errorKey) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await compressImageToBase64(file);
        setBase64(base64);
        if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: false }));
      } catch (err) {
        console.error("Error compressing file:", err);
      }
    }
  };

  const handleIdUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setValidIdPhoto(file);
      try {
        const base64 = await compressImageToBase64(file);
        setValidIdPhotoBase64(base64);
        if (errors.validIdPhoto) setErrors(prev => ({ ...prev, validIdPhoto: false }));
      } catch (err) {
        console.error("Error compressing valid ID:", err);
      }
    }
  };

  
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const eFake = { target: { files: e.dataTransfer.files } };
      if (type === 'photo2x2' && typeof handlePhotoUpload === 'function') handlePhotoUpload(eFake);
      else if (type === 'validIdPhoto' && typeof handleIdUpload === 'function') handleIdUpload(eFake);
      else if (type === 'appForm') handleGenericUpload(eFake, setAppFormPhotoBase64, 'appForm');
      else if (type === 'dti') handleGenericUpload(eFake, setDtiPhotoBase64, 'dti');
      else if (type === 'lease') handleGenericUpload(eFake, setLeasePhotoBase64, 'lease');
      else if (type === 'prevPermit') handleGenericUpload(eFake, setPrevPermitPhotoBase64, 'prevPermit');
      else if (type === 'closureLetter') handleGenericUpload(eFake, setClosureLetterPhotoBase64, 'closureLetter');
    }
  };
const handleNextStep = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = true;
    if (!formData.dateOfBirth) newErrors.dateOfBirth = true;
    if (!formData.contactNumber) newErrors.contactNumber = true;
    if (!formData.address) newErrors.address = true;
    if (!formData.businessName) newErrors.businessName = true;
    if (!formData.businessAddress) newErrors.businessAddress = true;
    if (!formData.purok) newErrors.purok = true;
    if (!formData.natureOfBusiness) newErrors.natureOfBusiness = true;
    if (!formData.numberOfEmployees) newErrors.numberOfEmployees = true;
    if (!formData.businessContactNumber) newErrors.businessContactNumber = true;
    
    if (formData.purpose === 'New Business') {
      if (!appFormPhotoBase64) newErrors.appForm = true;
      if (!validIdPhotoBase64) newErrors.validIdPhoto = true;
    } else if (formData.purpose === 'Renewal') {
      if (!prevPermitPhotoBase64) newErrors.prevPermit = true;
    } else if (formData.purpose === 'Closure') {
      if (!prevPermitPhotoBase64) newErrors.prevPermit = true;
      if (!closureLetterPhotoBase64) newErrors.closureLetter = true;
      if (!validIdPhotoBase64) newErrors.validIdPhoto = true;
    }

    if (!photo2x2Base64) newErrors.photo2x2 = true;
    if (!formData.deliveryMethod) newErrors.deliveryMethod = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Incomplete Form',
        text: 'Please fill out all the required fields before proceeding.',
        showConfirmButton: false,
        timer: 3000
      });
      const firstErrorKey = Object.keys(newErrors)[0];
      const errorElement = document.getElementById("field-" + firstErrorKey);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setErrors({});
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveStep(2);
      setIsTransitioning(false);
    }, 1500);
  };

  const handleSubmitRequest = async () => {
    setIsTransitioning(true);
    
    const random1 = Math.floor(1000 + Math.random() * 9000);
    const random2 = Math.floor(1000 + Math.random() * 9000);
    const newId = `BLN-${random1}-${random2}`;
    setGeneratedId(newId);

    try {
      const requestRef = doc(db, "requests", newId);
      await setDoc(requestRef, {
        id: newId,
        type: "Business Permit",
        status: "Pending",
        timestamp: serverTimestamp(),
        totalFee: totalPrice.toFixed(2),
        userId: auth.currentUser.uid,
        ...formData,
        photo2x2: photo2x2Base64,
        validIdPhoto: validIdPhotoBase64,
        appFormPhoto: appFormPhotoBase64,
        dtiPhoto: dtiPhotoBase64,
        leasePhoto: leasePhotoBase64,
        prevPermitPhoto: prevPermitPhotoBase64,
        closureLetterPhoto: closureLetterPhotoBase64,
        deliveryMethod: formData.deliveryMethod,
      });

      if (settings?.notificationSettings?.admin_new_request !== false) {
        const notifRef = doc(collection(db, "notifications"));
        await setDoc(notifRef, {
          requestId: newId,
          type: "NEW",
          documentType: "Business Clearance",
          residentName: formData.fullName,
          timestamp: serverTimestamp(),
        });
      }

      // Notification for the resident themselves
      if (settings?.notificationSettings?.resident_req_confirmation !== false) {
        const residentNotifRef = doc(collection(db, "notifications"));
        await setDoc(residentNotifRef, {
          requestId: newId,
          userId: auth.currentUser.uid,
          type: "SUBMITTED",
          documentType: "Business Clearance",
          residentName: formData.fullName,
          timestamp: serverTimestamp(),
        });
      }

      setActiveStep(3);
    } catch (error) {
      console.error("Error saving document: ", error);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Error',
        text: 'There was an error saving your request. Please try again.',
        showConfirmButton: false,
        timer: 3000
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const purposes = [
    'New Business', 'Renewal', 'Closure'
  ];

  const businessTypes = [
    'Sari-sari Store', 'Food Business', 'Retail', 'Service', 'Online Business'
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  return (
    <div className="admin-dashboard-container">
      {isTransitioning && <Loader text={activeStep === 2 ? 'Submitting, please wait...' : 'Loading...'} />}

      <ResidentSidebar />

      <main className="admin-main">
        <header className="admin-header">
          <h1>Request Documents</h1>
          <div className="header-right">
            <ResidentNotificationBell />
            <ResidentProfileDropdown />
          </div>
        </header>

        <div className="dashboard-content">
          <div className="back-link-container">
            <Link to="/user-request-documents" className="back-link">
              <ArrowLeft size={20} strokeWidth={2.5} />
              <span>Back to Document Requests</span>
            </Link>
          </div>

        <div className="form-content-wrapper">
          {/* Left Column: Form */}
          <div className="form-column">
            
            {activeStep !== 3 && (
              <div className="form-header-card">
                <div className="form-icon-box">
                  <FileText size={32} color="#1a58d3" strokeWidth={2} />
                  <div className="form-icon-badge"></div>
                </div>
                <div className="form-header-text">
                  <h2>{activeStep === 1 ? 'Business Permit Request' : 'Review Your Request'}</h2>
                  <p>{activeStep === 1 ? (docSetting?.desc || 'Loading...') : 'Please review all the information below before submitting your request.'}</p>
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <>
            <div className="form-section">
              <div className="section-title">
                <div className="step-circle">1</div>
                <h3>Applicant/Owner Information</h3>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name <span className="req">*</span></label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" id="field-fullName" className={errors.fullName ? "error-border" : ""} />
                </div>
                
                <div className="form-group">
                  <label>Date of Birth <span className="req">*</span></label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} id="field-dateOfBirth" className={errors.dateOfBirth ? "error-border" : ""} />
                </div>

                <div className="form-group">
                  <label>Contact Number <span className="req">*</span></label>
                  <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="09XXXXXXXXX" id="field-contactNumber" className={errors.contactNumber ? "error-border" : ""} />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="emailAddress" value={formData.emailAddress} onChange={handleChange} placeholder="Enter email address" />
                </div>

                <div className="form-group full-width">
                  <label>Complete Residential Address <span className="req">*</span></label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="House/Block/Lot No., Street, Subdivision/Village" id="field-address" className={errors.address ? "error-border" : ""} />
                </div>

                <div className="form-group full-width" id="field-photo2x2">
                  <label>Upload Photo (with white background) <span className="req">*</span></label>
                  <div className={`upload-dropzone ${errors.photo2x2 ? "error-border" : ""}`} onClick={() => photoInputRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "photo2x2")}>
                    <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" style={{display: 'none'}} />
                    {photo2x2Base64 ? (
                      <img src={photo2x2Base64} alt="2x2" style={{maxHeight: '100px', borderRadius: '8px'}} />
                    ) : (
                      <>
                        <UploadCloud size={32} color="#55627d" />
                        <div className="upload-text">
                          <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                          <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">
                <div className="step-circle">2</div>
                <h3>Business Information</h3>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Business Name <span className="req">*</span></label>
                  <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="Enter business name" id="field-businessName" className={errors.businessName ? "error-border" : ""} />
                </div>

                <div className="form-group full-width">
                  <label>Business Type <span className="req">*</span></label>
                  <div className="radio-grid">
                    {businessTypes.map((type) => (
                      <label 
                        key={type} 
                        className={`radio-label ${formData.businessType === type ? 'selected' : ''}`}
                      >
                        <input 
                          type="radio" 
                          name="businessType" 
                          checked={formData.businessType === type} 
                          onChange={() => setFormData({...formData, businessType: type})} 
                        />
                        <span className="radio-custom"></span>
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Business Description</label>
                  <textarea name="businessDescription" value={formData.businessDescription} onChange={handleChange} placeholder="Briefly describe your business operations." rows="2" className="form-textarea"></textarea>
                </div>

                <div className="form-group full-width">
                  <label>Business Address <span className="req">*</span></label>
                  <input type="text" name="businessAddress" value={formData.businessAddress} onChange={handleChange} placeholder="House/Block/Lot No., Street, Subdivision/Village" id="field-businessAddress" className={errors.businessAddress ? "error-border" : ""} />
                </div>
                
                <div className="form-group">
                  <label>Purok/Sitio <span className="req">*</span></label>
                  <div className="select-wrapper">
                    <select name="purok" value={formData.purok} onChange={handleChange} id="field-purok" className={errors.purok ? "error-border" : ""}>
                      <option value="">Select Purok</option>
                      <option value="Purok Malipayon">Purok Malipayon</option>
                      <option value="Purok Bagong-Silang">Purok Bagong-Silang</option>
                      <option value="Purok Acacia">Purok Acacia</option>
                      <option value="Purok Orchids">Purok Orchids</option>
                      <option value="Purok Boguenvilla">Purok Boguenvilla</option>
                    </select>
                    <ChevronDown size={18} className="select-icon" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Nature of Business <span className="req">*</span></label>
                  <input type="text" name="natureOfBusiness" value={formData.natureOfBusiness} onChange={handleChange} placeholder="Example: Retailing" id="field-natureOfBusiness" className={errors.natureOfBusiness ? "error-border" : ""} />
                </div>

                <div className="form-group">
                  <label>Number of Employees <span className="req">*</span></label>
                  <input type="number" name="numberOfEmployees" value={formData.numberOfEmployees} onChange={handleChange} placeholder="Example: 2" min="0" id="field-numberOfEmployees" className={errors.numberOfEmployees ? "error-border" : ""} />
                </div>

                <div className="form-group">
                  <label>Business Contact Number <span className="req">*</span></label>
                  <input type="text" name="businessContactNumber" value={formData.businessContactNumber} onChange={handleChange} placeholder="09XXXXXXXXX or Telephone No." id="field-businessContactNumber" className={errors.businessContactNumber ? "error-border" : ""} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">
                <div className="step-circle">3</div>
                <h3>Request Details & Requirements</h3>
              </div>

              <div className="form-group full-width">
                <label>Purpose of Request <span className="req">*</span></label>
                <div className="radio-grid">
                  {purposes.map((purpose) => (
                    <label 
                      key={purpose} 
                      className={`radio-label ${formData.purpose === purpose ? 'selected' : ''}`}
                    >
                      <input 
                        type="radio" 
                        name="purpose" 
                        checked={formData.purpose === purpose} 
                        onChange={() => setFormData({...formData, purpose})} 
                      />
                      <span className="radio-custom"></span>
                      {purpose}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '6px', color: '#2b6cb0', fontWeight: 500, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Certificate Fee:</span>
                {docSetting?.isFree ? (
                  <span style={{ color: '#38a169', fontWeight: 'bold' }}>Free</span>
                ) : (
                  <span>₱{totalPrice.toFixed(2)}</span>
                )}
              </div>

              {formData.purpose === 'New Business' && (
                <>
                  <div className="form-group full-width" id="field-appForm">
                    <label>Upload Barangay Business Application Form <span className="req">*</span></label>
                    <div className={`upload-dropzone ${errors.appForm ? "error-border" : ""}`} onClick={() => appFormRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "appForm")}>
                      <input type="file" ref={appFormRef} onChange={(e) => handleGenericUpload(e, setAppFormPhotoBase64, 'appForm')} accept="image/*,application/pdf" style={{display: 'none'}} />
                      {appFormPhotoBase64 ? (
                        <img src={appFormPhotoBase64} alt="Application Form" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="form-group full-width" id="field-validIdPhoto">
                    <label>Upload Valid ID of the Business Owner <span className="req">*</span></label>
                    <div className={`upload-dropzone ${errors.validIdPhoto ? "error-border" : ""}`} onClick={() => idInputRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "validIdPhoto")}>
                      <input type="file" ref={idInputRef} onChange={handleIdUpload} accept="image/*" style={{display: 'none'}} />
                      {validIdPhotoBase64 ? (
                        <img src={validIdPhotoBase64} alt="Valid ID" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="form-group full-width" id="field-dti">
                    <label>Upload DTI / Business Name Registration (If available)</label>
                    <div className="upload-dropzone" onClick={() => dtiRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "dti")}>
                      <input type="file" ref={dtiRef} onChange={(e) => handleGenericUpload(e, setDtiPhotoBase64, 'dti')} accept="image/*" style={{display: 'none'}} />
                      {dtiPhotoBase64 ? (
                        <img src={dtiPhotoBase64} alt="DTI Registration" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="form-group full-width" id="field-lease">
                    <label>Upload Lease Contract / Proof of Location (If applicable)</label>
                    <div className="upload-dropzone" onClick={() => leaseRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "lease")}>
                      <input type="file" ref={leaseRef} onChange={(e) => handleGenericUpload(e, setLeasePhotoBase64, 'lease')} accept="image/*" style={{display: 'none'}} />
                      {leasePhotoBase64 ? (
                        <img src={leasePhotoBase64} alt="Lease Contract" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {formData.purpose === 'Renewal' && (
                <>
                  <div className="form-group full-width" id="field-prevPermit">
                    <label>Upload Previous/Existing Business Permit <span className="req">*</span></label>
                    <div className={`upload-dropzone ${errors.prevPermit ? "error-border" : ""}`} onClick={() => prevPermitRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "prevPermit")}>
                      <input type="file" ref={prevPermitRef} onChange={(e) => handleGenericUpload(e, setPrevPermitPhotoBase64, 'prevPermit')} accept="image/*" style={{display: 'none'}} />
                      {prevPermitPhotoBase64 ? (
                        <img src={prevPermitPhotoBase64} alt="Previous Permit" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="form-group full-width" id="field-validIdPhoto">
                    <label>Upload Valid ID of the Business Owner (If required)</label>
                    <div className="upload-dropzone" onClick={() => idInputRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "validIdPhoto")}>
                      <input type="file" ref={idInputRef} onChange={handleIdUpload} accept="image/*" style={{display: 'none'}} />
                      {validIdPhotoBase64 ? (
                        <img src={validIdPhotoBase64} alt="Valid ID" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {formData.purpose === 'Closure' && (
                <>
                  <div className="form-group full-width" id="field-prevPermit">
                    <label>Upload Existing/Previous Business Permit <span className="req">*</span></label>
                    <div className={`upload-dropzone ${errors.prevPermit ? "error-border" : ""}`} onClick={() => prevPermitRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "prevPermit")}>
                      <input type="file" ref={prevPermitRef} onChange={(e) => handleGenericUpload(e, setPrevPermitPhotoBase64, 'prevPermit')} accept="image/*" style={{display: 'none'}} />
                      {prevPermitPhotoBase64 ? (
                        <img src={prevPermitPhotoBase64} alt="Previous Permit" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="form-group full-width" id="field-closureLetter">
                    <label>Upload Business Closure / Request Letter <span className="req">*</span></label>
                    <div className={`upload-dropzone ${errors.closureLetter ? "error-border" : ""}`} onClick={() => closureLetterRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "closureLetter")}>
                      <input type="file" ref={closureLetterRef} onChange={(e) => handleGenericUpload(e, setClosureLetterPhotoBase64, 'closureLetter')} accept="image/*" style={{display: 'none'}} />
                      {closureLetterPhotoBase64 ? (
                        <img src={closureLetterPhotoBase64} alt="Closure Letter" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="form-group full-width" id="field-validIdPhoto">
                    <label>Upload Valid ID of the Business Owner <span className="req">*</span></label>
                    <div className={`upload-dropzone ${errors.validIdPhoto ? "error-border" : ""}`} onClick={() => idInputRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "validIdPhoto")}>
                      <input type="file" ref={idInputRef} onChange={handleIdUpload} accept="image/*" style={{display: 'none'}} />
                      {validIdPhotoBase64 ? (
                        <img src={validIdPhotoBase64} alt="Valid ID" style={{maxHeight: '100px', borderRadius: '8px'}} />
                      ) : (
                        <>
                          <UploadCloud size={32} color="#55627d" />
                          <div className="upload-text">
                            <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                            <p className="upload-hint">PNG, JPG, JPEG (Max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="form-group full-width" style={{ marginTop: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'default' }}>
                  <input 
                    type="checkbox" 
                    checked={is18YearsOld} 
                    disabled 
                    style={{ width: '20px', height: '20px', cursor: 'not-allowed', accentColor: '#1a58d3', opacity: 0.8 }}
                  />
                  <span style={{ fontSize: '1rem', color: '#334155', fontWeight: '500' }}>I confirm that I am 18 years of age or older. (Auto-checked based on Date of Birth) <span className="req">*</span></span>
                </label>
                {formData.dateOfBirth && !is18YearsOld && (
                  <div style={{ color: '#e53e3e', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '600', paddingLeft: '30px' }}>
                    * Underage (Must be 18 or older)
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">
                <div className="step-circle">4</div>
                <h3>Payment Method</h3>
              </div>
              <div className="form-group full-width" id="field-deliveryMethod">
                <label>Select Payment / Delivery Method <span className="req">*</span></label>
                <div className="radio-grid">
                  <label className={`radio-label ${formData.deliveryMethod === 'Barangay Pickup' ? 'selected' : ''}`}>
                    <input type="radio" name="deliveryMethod" checked={formData.deliveryMethod === 'Barangay Pickup'} onChange={() => setFormData({...formData, deliveryMethod: 'Barangay Pickup'})} />
                    <span className="radio-custom"></span>
                    Barangay Pickup
                  </label>
                  <label className={`radio-label ${formData.deliveryMethod === 'Online PDF' ? 'selected' : ''}`}>
                    <input type="radio" name="deliveryMethod" checked={formData.deliveryMethod === 'Online PDF'} onChange={() => setFormData({...formData, deliveryMethod: 'Online PDF'})} />
                    <span className="radio-custom"></span>
                    Online PDF
                  </label>
                </div>
                {formData.deliveryMethod === 'Barangay Pickup' && (
                  <div className="info-alert" style={{ marginTop: '10px', padding: '10px 15px' }}>
                    <Info size={16} className="info-alert-icon" style={{ marginTop: '2px' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>Note: Pay at the secretary and pickup your document at the barangay hall.</p>
                  </div>
                )}
                {formData.deliveryMethod === 'Online PDF' && (
                  <div className="info-alert" style={{ marginTop: '10px', padding: '10px 15px' }}>
                    <Info size={16} className="info-alert-icon" style={{ marginTop: '2px' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      Note: Pay online using <span style={{ background: '#005CEE', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.7rem', margin: '0 5px' }}>GCash</span> and download the documents directly.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions desktop-only-btn">
              <button className="btn-cancel" onClick={() => navigate('/user-dashboard')}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleNextStep}
                disabled={!is18YearsOld}
                style={{ opacity: !is18YearsOld ? 0.5 : 1, cursor: !is18YearsOld ? 'not-allowed' : 'pointer' }}
              >
                Next: Review Request <ArrowLeft size={18} style={{transform: 'rotate(180deg)'}} />
              </button>
            </div>
            </>
            )}
            
            {activeStep === 2 && (
              <>
                <div className="form-section">
                  <div className="section-title">
                    <div className="step-circle">1</div>
                    <h3>Personal Information</h3>
                  </div>
                  <div className="review-row"><div className="review-label">Full Name</div><div className="review-value">{formData.fullName}</div></div>
                  <div className="review-row"><div className="review-label">Date of Birth</div><div className="review-value">{formData.dateOfBirth}</div></div>
                  <div className="review-row"><div className="review-label">Contact Number</div><div className="review-value">{formData.contactNumber}</div></div>
                  <div className="review-row"><div className="review-label">Email Address</div><div className="review-value">{formData.emailAddress || '—'}</div></div>
                  <div className="review-row"><div className="review-label">Complete Residential Address</div><div className="review-value">{formData.address}</div></div>
                  <div className="review-row">
                    <div className="review-label">Uploaded 2x2 Photo</div>
                    <div className="review-value">
                      <div className="review-image">
                        <img src={photo2x2Base64} alt="2x2 Photo" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        <div className="review-image-details">
                          <span className="review-image-name">Profile Photo</span>
                          <span className="review-image-meta">{photo2x2?.name}</span>
                          <span className="review-image-meta">(120 KB)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-title">
                    <div className="step-circle">2</div>
                    <h3>Business Information</h3>
                  </div>
                  <div className="review-row"><div className="review-label">Business Name</div><div className="review-value">{formData.businessName}</div></div>
                  <div className="review-row"><div className="review-label">Business Type</div><div className="review-value">{formData.businessType}</div></div>
                  <div className="review-row"><div className="review-label">Business Description</div><div className="review-value">{formData.businessDescription || '—'}</div></div>
                  <div className="review-row"><div className="review-label">Business Address</div><div className="review-value">{formData.businessAddress}</div></div>
                  <div className="review-row"><div className="review-label">Purok/Sitio</div><div className="review-value">{formData.purok}</div></div>
                  <div className="review-row"><div className="review-label">Nature of Business</div><div className="review-value">{formData.natureOfBusiness}</div></div>
                  <div className="review-row"><div className="review-label">Number of Employees</div><div className="review-value">{formData.numberOfEmployees}</div></div>
                  <div className="review-row"><div className="review-label">Business Contact Number</div><div className="review-value">{formData.contactNumber}</div></div>
                </div>

                <div className="form-section">
                  <div className="section-title">
                    <div className="step-circle">3</div>
                    <h3>Payment Method</h3>
                  </div>
                  <div className="review-row"><div className="review-label">Method</div><div className="review-value">{formData.deliveryMethod}</div></div>
                </div>

                <div className="form-section">
                  <div className="section-title">
                    <div className="step-circle">4</div>
                    <h3>Request Details & Requirements</h3>
                  </div>
                  <div className="review-row"><div className="review-label">Purpose of Request</div><div className="review-value">{formData.purpose}</div></div>
                  {formData.purpose === 'New Business' && (
                    <>
                      {appFormPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Application Form</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={appFormPhotoBase64} alt="Application Form" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Barangay Business Application Form</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {validIdPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Valid ID</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={validIdPhotoBase64} alt="Valid ID" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Valid ID of the Business Owner</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {dtiPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">DTI Registration</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={dtiPhotoBase64} alt="DTI Registration" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">DTI / Business Name Registration</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {leasePhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Lease Contract</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={leasePhotoBase64} alt="Lease Contract" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Lease Contract / Proof of Location</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {formData.purpose === 'Renewal' && (
                    <>
                      {prevPermitPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Previous Permit</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={prevPermitPhotoBase64} alt="Previous Permit" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Previous/Existing Business Permit</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {validIdPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Valid ID</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={validIdPhotoBase64} alt="Valid ID" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Valid ID of the Business Owner</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {formData.purpose === 'Closure' && (
                    <>
                      {prevPermitPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Previous Permit</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={prevPermitPhotoBase64} alt="Previous Permit" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Existing/Previous Business Permit</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {closureLetterPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Closure Letter</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={closureLetterPhotoBase64} alt="Closure Letter" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Business Closure / Request Letter</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {validIdPhotoBase64 && (
                        <div className="review-row">
                          <div className="review-label">Valid ID</div>
                          <div className="review-value">
                            <div className="review-image">
                              <img src={validIdPhotoBase64} alt="Valid ID" style={{maxHeight: '60px'}} />
                              <div className="review-image-details">
                                <span className="review-image-name">Valid ID of the Business Owner</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ marginTop: '20px', marginBottom: '20px', padding: '15px', backgroundColor: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '8px', color: '#2b6cb0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Certificate Fee:</span>
                      {docSetting?.isFree ? (
                        <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#38a169' }}>Free</span>
                      ) : (
                        <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>₱{totalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="alert-warning">
                    <Info size={24} className="alert-icon" />
                    <p className="alert-warning-text">Please review all information carefully.<br/>Once submitted, you cannot edit your request.</p>
                  </div>
                </div>

                <div className="form-actions desktop-only-btn">
                  <button className="btn-cancel" onClick={() => setActiveStep(1)}><ArrowLeft size={18} style={{marginRight: '8px'}} /> Back to Edit</button>
                  <button className="btn-primary" onClick={handleSubmitRequest}>Submit Request <Send size={16} style={{marginLeft: '8px'}} /></button>
                </div>
              </>
            )}

            {activeStep === 3 && (
              <div className="success-container">
                <div className="success-header-wrapper">
                  <div className="success-checkmark"><Check size={40} strokeWidth={3} /></div>
                  <h2 className="success-title">Request Submitted Successfully!</h2>
                  <p className="success-subtitle">Your Business Permit request has been submitted. You can track the status of your request using your polling number.</p>
                </div>

                <div className="polling-card">
                  <div className="polling-card-title">Your Polling Number</div>
                  <div className="polling-number">{generatedId}</div>
                  <div className="polling-card-hint">Please save this number for tracking your request.</div>
                </div>

                <div style={{ background: '#f0fff4', color: '#2f855a', padding: '15px', borderRadius: '8px', border: '1px solid #c6f6d5', textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '600' }}>
                  {docSetting?.isFree ? (
                    <span>Your document is <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Free</span> of charge.</span>
                  ) : (
                    <span>Please prepare <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₱{totalPrice.toFixed(2)}</span> upon claiming your document.</span>
                  )}
                </div>



                <div className="info-alert" style={{width: '100%', marginBottom: '2rem'}}>
                  <Info size={20} className="info-alert-icon" />
                  {formData.deliveryMethod === 'Online PDF' || formData.deliveryMethod === 'Online Pick up' ? (
                    <p>Please save this polling number to track your request. Wait for the admin to approve your request. Once approved, check your <strong>'Approved Requests'</strong> and click <strong>'View Details'</strong> to proceed with your online payment. You will be able to download your document after the payment is verified.</p>
                  ) : (
                    <p>Please take a screenshot or print this receipt to save your polling number. You must present this polling number when you proceed to the Barangay Hall to claim your requested document. Please keep this number secure, as it serves as your official reference for tracking and releasing your document.</p>
                  )}
                </div>

                <div className="success-actions">
                  <button className="btn-outline" style={{flex: 1}} onClick={() => window.print()}><Printer size={18} className="success-action-icon" /> Print Receipt</button>
                  <button className="btn-primary" onClick={() => navigate('/user-my-requests')} style={{flex: 1}}><Home size={18} className="success-action-icon" /> My Request</button>
                </div>

                <div className="success-banner">
                  <div className="success-banner-icon"><Check size={20} /></div>
                  <div className="success-banner-content">
                    <h4>Thank you!</h4>
                    <p>We appreciate your patience. Rest assured that your request will be processed as soon as possible.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="sidebar-column">
            
            <div className="sidebar-card">
              <h4>Request Progress</h4>
              <div className="stepper">
                <div className={`step ${activeStep === 1 ? 'active' : 'completed'}`}>
                  <div className="step-num">{activeStep === 1 ? '1' : <Check size={14} strokeWidth={3} />}</div>
                  <span className="step-label">Fill Out Form</span>
                </div>
                <div className={`step-line ${activeStep > 1 ? 'completed' : ''}`}></div>
                <div className={`step ${activeStep === 2 ? 'active' : (activeStep > 2 ? 'completed' : '')}`}>
                  <div className="step-num">{activeStep > 2 ? <Check size={14} strokeWidth={3} /> : '2'}</div>
                  <span className="step-label">Review</span>
                </div>
                <div className={`step-line ${activeStep > 2 ? 'completed' : ''}`}></div>
                <div className={`step ${activeStep === 3 ? 'completed' : ''}`}>
                  <div className="step-num">{activeStep === 3 ? <Check size={14} strokeWidth={3} /> : '3'}</div>
                  <span className="step-label">Submitted</span>
                </div>
              </div>
            </div>

            <div className="sidebar-card">
              <h4>Request Summary</h4>
              <div className="summary-item">
                <div className="doc-icon-small">
                  <img src={BusinessClearanceImg} alt="Doc Icon" />
                </div>
                <div className="doc-info">
                  <span className="doc-label">Document Type</span>
                  <span className="doc-name">Business Permit</span>
                </div>
              </div>

              <div className="sidebar-divider"></div>

              <div className="sidebar-section">
                <div className="sidebar-subtitle">
                  <div className="icon-wrapper"><FileText size={18} /></div>
                  <h5>Requirements</h5>
                </div>
                <ul className="requirements-list">
                  {formData.purpose === 'New Business' && (
                    <>
                      <li><Check size={16} /> Barangay Business Application Form</li>
                      <li><Check size={16} /> Valid ID of the Business Owner</li>
                      <li><Check size={16} /> DTI / Business Name Registration<br/><span className="sub-hint">(if available)</span></li>
                      <li><Check size={16} /> Lease Contract / Proof of Location<br/><span className="sub-hint">(if applicable)</span></li>
                    </>
                  )}
                  {formData.purpose === 'Renewal' && (
                    <>
                      <li><Check size={16} /> Previous/Existing Business Permit</li>
                      <li><Check size={16} /> Valid ID of the Business Owner<br/><span className="sub-hint">(if required)</span></li>
                    </>
                  )}
                  {formData.purpose === 'Closure' && (
                    <>
                      <li><Check size={16} /> Existing/Previous Business Permit</li>
                      <li><Check size={16} /> Business Closure / Request Letter</li>
                      <li><Check size={16} /> Valid ID of the Business Owner</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="sidebar-divider"></div>

              <div className="sidebar-section">
                <div className="sidebar-subtitle">
                  <div className="icon-wrapper"><Clock size={18} /></div>
                  <h5>Processing Time</h5>
                </div>
                <p className="sidebar-value">1 - 2 Working Days</p>
              </div>

              <div className="sidebar-divider"></div>

              <div className="sidebar-section">
                <div className="sidebar-subtitle">
                  <div className="icon-wrapper"><Building size={18} /></div>
                  <h5>Release Method</h5>
                </div>
                <p className="sidebar-value">Pick up at the Barangay hall / Online PDF Download</p>
              </div>
            </div>

            {activeStep === 3 ? (
              <div className="need-help-card">
                <div className="need-help-header">
                  <Headset size={20} className="need-help-icon" />
                  <h4>Need Help?</h4>
                </div>
                <p>For any questions, you may contact the Barangay Hall during office hours.</p>
                <div className="need-help-phone">09679330142</div>
              </div>
            ) : (
              <div className="info-alert" style={{ marginTop: '1rem' }}>
                <Info size={20} className="info-alert-icon" />
                <p>Please make sure all information provided is accurate. Incorrect information may cause delay in processing your request.</p>
              </div>
            )}

          </div>
        </div>

        <div className="mobile-only-btn">
          {activeStep === 1 && (
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => navigate('/user-dashboard')}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleNextStep}
                disabled={!is18YearsOld}
                style={{ opacity: !is18YearsOld ? 0.5 : 1, cursor: !is18YearsOld ? 'not-allowed' : 'pointer' }}
              >
                Next: Review Request <ArrowLeft size={18} style={{transform: 'rotate(180deg)'}} />
              </button>
            </div>
          )}
          {activeStep === 2 && (
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setActiveStep(1)}><ArrowLeft size={18} style={{marginRight: '8px'}} /> Back to Edit</button>
              <button className="btn-primary" onClick={handleSubmitRequest}>Submit Request <Send size={16} style={{marginLeft: '8px'}} /></button>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
