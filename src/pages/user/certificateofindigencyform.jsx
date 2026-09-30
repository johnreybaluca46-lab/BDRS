import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ResidentSidebar from '../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../components/ResidentNotificationBell';
import '../../lib/admin-layout.css';
import '../../lib/form.css';
import { ArrowLeft, FileText, Check, Clock, Building, Info, UploadCloud, Calendar, ChevronDown, Send, FileSearch, Settings, CheckCircle, Printer, Home, Headset } from 'lucide-react';
import CertificateOfIndigencyImg from '../../assets/logo/certificate of indigency.png';
import Swal from 'sweetalert2';
import Loader from '../../components/Loader';

import { useSettings } from '../../context/SettingsContext';
import { db, auth } from '../../database/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { compressImageToBase64 } from '../../lib/imageUtils';

export default function CertificateOfIndigencyForm() {
  useEffect(() => {
    document.title = "BDRS | Certificate of Indigency";
  }, []);

  const [activeStep, setActiveStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    sex: '',
    civilStatus: '',
    address: '',
    purok: '',
    contactNumber: '',
    purpose: 'Medical Assistance',
    specifyPurpose: '',
    copies: '1',
    idType: 'Community Tax Certificate / Sedula',
    deliveryMethod: '',
  });
  
  const [photo2x2, setPhoto2x2] = useState(null);
  const [photo2x2Base64, setPhoto2x2Base64] = useState(null);
  const [validIdPhoto, setValidIdPhoto] = useState(null);
  const [validIdPhotoBase64, setValidIdPhotoBase64] = useState(null);
  const [generatedId, setGeneratedId] = useState('');
  const [is18YearsOld, setIs18YearsOld] = useState(false);

  const photoInputRef = React.useRef(null);
  const idInputRef = React.useRef(null);
  
  const navigate = useNavigate();
  
  const { settings, loading } = useSettings();
  const docSetting = settings?.documents?.find(d => d.id === 'certificate_of_indigency');
  const isOnlinePaymentActive = docSetting?.isOnlinePaymentActive !== false;
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
      setTotalPrice(parseFloat(docSetting.firstCopyFee) || 0);
    }
  }, [docSetting]);

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

  useEffect(() => {
    if (!isOnlinePaymentActive && formData.deliveryMethod === 'Online PDF') {
      setFormData(prev => ({ ...prev, deliveryMethod: '' }));
    }
  }, [isOnlinePaymentActive, formData.deliveryMethod]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    if (name === 'contactNumber') {
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
      if (type === 'photo2x2' && typeof handlePhotoUpload === 'function') {
        handlePhotoUpload(eFake);
      } else if (type === 'validIdPhoto' && typeof handleIdUpload === 'function') {
        handleIdUpload(eFake);
      }
    }
  };
const handleNextStep = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = true;
    if (!formData.dateOfBirth) newErrors.dateOfBirth = true;
    if (!formData.sex) newErrors.sex = true;
    if (!formData.civilStatus) newErrors.civilStatus = true;
    if (!formData.address) newErrors.address = true;
    if (!formData.purok) newErrors.purok = true;
    if (!formData.contactNumber) newErrors.contactNumber = true;
    if (is18YearsOld && !validIdPhotoBase64) newErrors.validIdPhoto = true;
    if (!photo2x2Base64) newErrors.photo2x2 = true;
    if (!formData.deliveryMethod) newErrors.deliveryMethod = true;
    if (formData.deliveryMethod === 'Online PDF' && !isOnlinePaymentActive) newErrors.deliveryMethod = true;

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
      const payload = {
        newId,
        type: "Certificate of Indigency",
        formData,
        images: {
          photo2x2: photo2x2Base64,
          validIdPhoto: validIdPhotoBase64,
        },
        copies: '1'
      };

      const response = await fetch('/api/submit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setActiveStep(3);
    } catch (error) {
      console.error("Error saving document: ", error);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Error',
        text: error.message || 'There was an error saving your request. Please try again.',
        showConfirmButton: false,
        timer: 3000
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const purposes = [
    'Medical Assistance', 'Educational Assistance', 'Financial Assistance', 
    'Burial Assistance', 'Hospital Assistance', 'Scholarship', 'Legal Assistance', 'Other'
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  return (
    <div className="admin-dashboard-container">
      {isTransitioning && <Loader text={activeStep === 2 ? 'Submitting, please wait...' : 'Loading...'} />}

      <ResidentSidebar />

      <main className="admin-main">
        <header className="admin-header resident-header">
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
                  <h2>{activeStep === 1 ? 'Certificate of Indigency Request' : 'Review Your Request'}</h2>
                  <p>{activeStep === 1 ? (docSetting?.desc || 'Loading...') : 'Please review all the information below before submitting your request.'}</p>
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <>
            <div className="form-section">
              <div className="section-title">
                <div className="step-circle">1</div>
                <h3>Personal Information</h3>
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
                  <label>Sex <span className="req">*</span></label>
                  <div className="select-wrapper">
                    <select name="sex" value={formData.sex} onChange={handleChange} id="field-sex" className={errors.sex ? "error-border" : ""}>
                      <option value="" disabled>Select Sex</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <ChevronDown size={18} className="select-icon" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Civil Status <span className="req">*</span></label>
                  <div className="select-wrapper">
                    <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} id="field-civilStatus" className={errors.civilStatus ? "error-border" : ""}>
                      <option value="" disabled>Select Civil Status</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="widowed">Widowed</option>
                      <option value="divorced">Divorced</option>
                    </select>
                    <ChevronDown size={18} className="select-icon" />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Complete Address <span className="req">*</span></label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="House/Block/Lot No., Street, Subdivision/Village" id="field-address" className={errors.address ? "error-border" : ""} />
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

                <div className="form-group full-width">
                  <label>Contact Number <span className="req">*</span></label>
                  <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="09XXXXXXXXX" id="field-contactNumber" className={errors.contactNumber ? "error-border" : ""} />
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
                <h3>Certificate Information</h3>
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

              {formData.purpose === 'Other' && (
                <div className="form-group full-width">
                  <label>Specify Purpose (if Other)</label>
                  <input type="text" name="specifyPurpose" value={formData.specifyPurpose} onChange={handleChange} placeholder="Please specify the purpose" />
                </div>
              )}

                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '6px', color: '#2b6cb0', fontWeight: 500, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Certificate Fee:</span>
                  {docSetting?.isFree ? (
                    <span style={{ color: '#38a169', fontWeight: 'bold' }}>Free</span>
                  ) : (
                    <span>₱{totalPrice.toFixed(2)}</span>
                  )}
                </div>
            </div>

              <div className="form-section">
              <div className="section-title">
                <div className="step-circle">3</div>
                <h3>Cedula (Community Tax Certificate)</h3>
              </div>

              {!formData.dateOfBirth && (
                <div className="info-alert" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <Info size={20} className="info-alert-icon" />
                  <p><strong>Date of Birth Required.</strong> Please select your Date of Birth in Section 1 to determine if a Cedula is required (for 18 years old and above).</p>
                </div>
              )}

              {!is18YearsOld && formData.dateOfBirth && (
                <div className="info-alert" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <Info size={20} className="info-alert-icon" />
                  <p><strong>No Cedula required.</strong> Because you are below 18 years old, you do not need to upload a Cedula. You may proceed to the next step.</p>
                </div>
              )}

              {is18YearsOld && (
                <div className="form-group full-width" id="field-validIdPhoto">
                  <label>Upload Community Tax Certificate / Sedula <span className="req">*</span></label>
                  <div className={`upload-dropzone ${errors.validIdPhoto ? "error-border" : ""}`} onClick={() => idInputRef.current.click()} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, "validIdPhoto")}>
                    <input type="file" ref={idInputRef} onChange={handleIdUpload} accept="image/*" style={{display: 'none'}} />
                    {validIdPhotoBase64 ? (
                      <img src={validIdPhotoBase64} alt="Sedula" style={{maxHeight: '100px', borderRadius: '8px'}} />
                    ) : (
                      <>
                        <UploadCloud size={32} color="#55627d" />
                        <div className="upload-text">
                          <p><span className="upload-link">Click to upload</span> or drag and drop</p>
                          <p className="upload-hint">PNG, JPG, JPEG, PDF (Max. 5MB)</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ color: '#d69e2e', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Info size={16} /> The cedula should be for this year. If it's expired, renew immediately in the secretary office.
                  </div>
                </div>
              )}
            </div>

            <div className="form-section">
              <div className="section-title">
                <div className="step-circle">4</div>
                <h3>Pick up Selection</h3>
              </div>
              <div className="form-group full-width" id="field-deliveryMethod">
                <label>Select Pick up Selection <span className="req">*</span></label>
                <div className="radio-grid">
                  <label className={`radio-label ${formData.deliveryMethod === 'Barangay Pickup' ? 'selected' : ''}`}>
                    <input type="radio" name="deliveryMethod" checked={formData.deliveryMethod === 'Barangay Pickup'} onChange={() => setFormData({...formData, deliveryMethod: 'Barangay Pickup'})} />
                    <span className="radio-custom"></span>
                    Barangay Pickup
                  </label>
                  <label className={`radio-label ${formData.deliveryMethod === 'Online PDF' ? 'selected' : ''}`} style={!isOnlinePaymentActive ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
                    <input type="radio" name="deliveryMethod" disabled={!isOnlinePaymentActive} checked={formData.deliveryMethod === 'Online PDF'} onChange={() => { if(isOnlinePaymentActive) setFormData({...formData, deliveryMethod: 'Online PDF'}) }} />
                    <span className="radio-custom"></span>
                    Online PDF
                    {!isOnlinePaymentActive && <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#e2e8f0', color: '#4a5568', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Unavailable</span>}
                  </label>
                </div>
                {formData.deliveryMethod === 'Barangay Pickup' && (
                  <div className="info-alert" style={{ marginTop: '10px', padding: '10px 15px' }}>
                    <Info size={16} className="info-alert-icon" style={{ marginTop: '2px' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>Note: Pickup your document at the barangay hall once approved.</p>
                  </div>
                )}
                {formData.deliveryMethod === 'Online PDF' && isOnlinePaymentActive && (
                  <div className="info-alert" style={{ marginTop: '10px', padding: '10px 15px' }}>
                    <Info size={16} className="info-alert-icon" style={{ marginTop: '2px' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      {docSetting?.isFree ? (
                        'Note: Download the documents directly once approved.'
                      ) : (
                        <>Note: Pay online using <span style={{ background: '#005CEE', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.7rem', margin: '0 5px' }}>GCash</span> and download the documents directly.</>
                      )}
                    </p>
                  </div>
                )}
                {!isOnlinePaymentActive && (
                  <div className="info-alert" style={{ marginTop: '10px', padding: '10px 15px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030' }}>
                    <Info size={16} className="info-alert-icon" style={{ marginTop: '2px', color: '#c53030' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0, color: '#c53030' }}>Note: Online PDF download is currently not available for this document.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions desktop-only-btn">
              <button className="btn-cancel" onClick={() => navigate('/user-dashboard')}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleNextStep}
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
                  <div className="review-row"><div className="review-label">Sex</div><div className="review-value" style={{textTransform: 'capitalize'}}>{formData.sex}</div></div>
                  <div className="review-row"><div className="review-label">Civil Status</div><div className="review-value" style={{textTransform: 'capitalize'}}>{formData.civilStatus}</div></div>
                  <div className="review-row"><div className="review-label">Complete Address</div><div className="review-value">{formData.address}</div></div>
                  <div className="review-row"><div className="review-label">Purok/Sitio</div><div className="review-value">{formData.purok}</div></div>
                  <div className="review-row"><div className="review-label">Contact Number</div><div className="review-value">{formData.contactNumber}</div></div>
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
                    <h3>Certificate Information</h3>
                  </div>
                  <div className="review-row"><div className="review-label">Purpose of Request</div><div className="review-value">{formData.purpose}</div></div>
                  {formData.purpose === 'Other' && (
                    <div className="review-row"><div className="review-label">Specify Purpose (if Other)</div><div className="review-value">{formData.specifyPurpose || '—'}</div></div>
                  )}
                </div>

                <div className="form-section">
                  <div className="section-title">
                    <div className="step-circle">3</div>
                    <h3>Cedula</h3>
                  </div>
                  {is18YearsOld && validIdPhotoBase64 ? (
                    <div className="review-row">
                      <div className="review-label">Uploaded Cedula</div>
                      <div className="review-value">
                        <div className="review-image">
                          <img src={validIdPhotoBase64} alt="Sedula" style={{maxHeight: '60px'}} />
                          <div className="review-image-details">
                            <span className="review-image-name">Sedula Photo</span>
                            <span className="review-image-meta">{validIdPhoto?.name}</span>
                            <span className="review-image-meta">(156 KB)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="review-row">
                      <div className="review-label">Cedula</div>
                      <div className="review-value" style={{color: '#718096'}}>Not required (Below 18)</div>
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <div className="section-title">
                    <div className="step-circle">4</div>
                    <h3>Pick up Selection</h3>
                  </div>
                  <div className="review-row"><div className="review-label">Method</div><div className="review-value">{formData.deliveryMethod}</div></div>
                </div>

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
                  <p className="success-subtitle">Your Certificate of Indigency request has been submitted. You can track the status of your request using your polling number.</p>
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
                  <img src={CertificateOfIndigencyImg} alt="Doc Icon" />
                </div>
                <div className="doc-info">
                  <span className="doc-label">Document Type</span>
                  <span className="doc-name">Certificate of Indigency</span>
                </div>
              </div>

              <div className="sidebar-divider"></div>

              <div className="sidebar-section">
                <div className="sidebar-subtitle">
                  <div className="icon-wrapper"><FileText size={18} /></div>
                  <h5>Cedula Requirement</h5>
                </div>
                <ul className="requirements-list">
                  {is18YearsOld && <li><Check size={16} /> Community Tax Certificate / Sedula</li>}
                  {!is18YearsOld && <li style={{color: '#718096'}}><Info size={16} /> No Cedula required for minors (below 18)</li>}
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
