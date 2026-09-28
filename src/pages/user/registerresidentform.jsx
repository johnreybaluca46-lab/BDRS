import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Swal from 'sweetalert2';
import { 
    showMissingInformationAlert, 
    showRegistrationSuccessAlert, 
    showRegistrationFailedAlert 
} from '../../utils/sweetAlerts';
import {
    Users, ShieldCheck, FileText, Clock, ArrowLeft,
    UserSquare2, Phone, ClipboardList, Building2, UploadCloud,
    Check, Send, Info, Printer, Home, Bookmark, ChevronRight, AlertTriangle, LogIn, CheckSquare, Square, Eye, EyeOff, Copy, ExternalLink
} from 'lucide-react';
import { compressImageToBase64 } from '../../lib/imageUtils';
import Navbar from '../../components/Navbar';
import ContactFooter from '../../components/ContactFooter';
import BannerImg from '../../assets/image/banner 2.png';
import Logo from '../../assets/logo/barangay buluan seal.png';
import HallImg from '../../assets/icon/hall.png';
import '../../lib/registerresidentform.css';
import Loader from '../../components/Loader';
import { db, auth, functions } from '../../database/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useSettings } from '../../context/SettingsContext';

const isNativeApp = window.Capacitor !== undefined || window.electron !== undefined || navigator.userAgent.toLowerCase().includes('electron');

export default function RegisterResidentForm() {
    const { settings } = useSettings();
    const navigate = useNavigate();
    const isNativeApp = window.Capacitor !== undefined || navigator.userAgent.toLowerCase().includes('electron');
    const cancelRoute = isNativeApp ? '/user-login' : '/';
    const [isLoading, setIsLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [activeStep, setActiveStep] = useState(1);
    const [generatedId, setGeneratedId] = useState('');
    const [generatedQrToken, setGeneratedQrToken] = useState('');
    const [isCertified, setIsCertified] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [formData, setFormData] = useState({
        fullName: '',
        dateOfBirth: '',
        civilStatus: '',
        sex: '',
        contactNumber: '',
        emailAddress: '',
        password: '',
        confirmPassword: '',
        purok: '',
        houseNo: '',
        occupation: '',
        lengthOfStay: '',
        placeOfBirth: '',
        nationality: 'Filipino',
        completeAddress: ''
    });

    const [passwordStrength, setPasswordStrength] = useState({
        score: 'BAD',
        criteria: {
            length: false,
            upper: false,
            lower: false,
            number: false,
            special: false,
            notCommon: false
        }
    });

    const calculatePasswordStrength = (pwd) => {
        const criteria = {
            length: pwd.length >= 12,
            upper: /[A-Z]/.test(pwd),
            lower: /[a-z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
            notCommon: !/^(password|123456|qwerty|admin|password123|12345678|123456789|1234567890)$/i.test(pwd) && pwd.length > 0
        };

        const metCount = Object.values(criteria).filter(Boolean).length;
        
        let score = 'BAD';
        if (metCount === 6) {
            score = 'EXCELLENT';
        } else if (metCount >= 4 && criteria.length && criteria.notCommon) {
            score = 'GOOD';
        }

        if (pwd.length === 0) {
            score = 'BAD';
        }

        setPasswordStrength({ score, criteria });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;
        if (name === 'contactNumber') {
            newValue = value.replace(/\D/g, '').slice(0, 11);
        }
        setFormData(prev => ({ ...prev, [name]: newValue }));
        if (name === 'password') {
            calculatePasswordStrength(newValue);
        }
    };
    const [photo2x2, setPhoto2x2] = useState(null);
    const [photo2x2Base64, setPhoto2x2Base64] = useState(null);
    const photoInputRef = React.useRef(null);

    const handlePhotoUpload = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto2x2(file);
            try {
                const base64 = await compressImageToBase64(file);
                setPhoto2x2Base64(base64);
                if (photoInputRef.current && photoInputRef.current.closest('.upload-dropzone')) {
                    photoInputRef.current.closest('.upload-dropzone').classList.remove('error-border');
                }
            } catch (err) {
                console.error("Error compressing photo:", err);
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const eFake = { target: { files: e.dataTransfer.files } };
            handlePhotoUpload(eFake);
        }
    };

    useEffect(() => {
        document.title = "BDRS | Resident Registration";
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2500); // 2.5s loading simulation
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const form = e.target;
        const allInputs = form.querySelectorAll('input, select');
        allInputs.forEach(input => {
            const dropzone = input.closest('.upload-dropzone');
            if (dropzone) dropzone.classList.remove('error-border');
            else input.classList.remove('error-border');
        });

        if (!form.checkValidity()) {
            const invalidInputs = form.querySelectorAll(':invalid');
            invalidInputs.forEach(input => {
                const dropzone = input.closest('.upload-dropzone');
                if (dropzone) dropzone.classList.add('error-border');
                else input.classList.add('error-border');
                
                const handler = function() {
                    if (this.checkValidity()) {
                        if (dropzone) dropzone.classList.remove('error-border');
                        else this.classList.remove('error-border');
                    }
                };
                input.addEventListener('input', handler, { once: true });
                if (input.type === 'file') {
                    input.addEventListener('change', handler, { once: true });
                }
            });

            showMissingInformationAlert();

            if (invalidInputs.length > 0) {
                invalidInputs[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            showRegistrationFailedAlert('Your passwords do not match.');
            return;
        }

        if (passwordStrength.score === 'BAD') {
            showRegistrationFailedAlert('Your password is too weak. Please meet the minimum security requirements.');
            const pwdInput = form.querySelector('input[name="password"]');
            if (pwdInput) {
                pwdInput.classList.add('error-border');
                pwdInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                pwdInput.addEventListener('input', function() {
                    this.classList.remove('error-border');
                }, { once: true });
            }
            return;
        }

        setIsTransitioning(true);

        try {
            // Check if email already exists in the residents database
            const residentsRef = collection(db, "residents");
            const q = query(residentsRef, where("emailAddress", "==", formData.emailAddress));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                setIsTransitioning(false);
                showRegistrationFailedAlert('This email address is already registered.');
                
                const emailInput = form.querySelector('input[name="emailAddress"]');
                if (emailInput) {
                    emailInput.classList.add('error-border');
                    emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    emailInput.addEventListener('input', function() {
                        this.classList.remove('error-border');
                    }, { once: true });
                }
                return;
            }
        } catch (err) {
            console.error("Error verifying email availability:", err);
            // If the query fails for some reason, we'll let Firebase Auth catch it during submitRegistration
        }

        setTimeout(() => {
            setActiveStep(2);
            setIsTransitioning(false);
        }, 800);
    };

    const submitRegistration = async () => {
        setIsTransitioning(true);
        
        try {
            // Step 1: Create Firebase Auth Account
            const userCredential = await createUserWithEmailAndPassword(auth, formData.emailAddress, formData.password);
            const user = userCredential.user;
            let isNewUserCreated = true;

            const { password: _pw, confirmPassword: _cpw, ...dataToSave } = formData;
            
            try {
                // Step 2: Generate identifiers
                const qrToken = crypto.randomUUID();
                
                // Keep the human readable RES Number format
                const year = new Date().getFullYear();
                const randomNum = Math.floor(10000 + Math.random() * 90000);
                const resNumber = `RES-${year}-${randomNum}`;
                
                // Step 3: Atomic Firestore Batch Write
                const batch = writeBatch(db);
                
                // Resident document (UID-based)
                const residentRef = doc(db, 'residents', user.uid);
                batch.set(residentRef, {
                    ...dataToSave,
                    userId: user.uid,
                    resNumber: resNumber,
                    qrToken: qrToken,
                    status: 'Pending',
                    photo2x2: photo2x2Base64,
                    registeredAt: serverTimestamp()
                });
                
                // Public QR tracking document
                const qrStatusRef = doc(db, 'registration_status', qrToken);
                batch.set(qrStatusRef, {
                    resNumber: resNumber,
                    status: 'Pending',
                    submittedAt: serverTimestamp()
                });
                
                // Admin notification
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    type: 'NEW_RESIDENT',
                    residentName: dataToSave.fullName,
                    residentId: resNumber,
                    timestamp: serverTimestamp(),
                    isRead: false
                });
                
                // Execute atomic write
                await batch.commit();

                setGeneratedId(resNumber);
                setGeneratedQrToken(qrToken);

                showRegistrationSuccessAlert();
                setActiveStep(3);
            } catch (firestoreError) {
                console.error("Firestore batch error:", firestoreError);
                // Clean up the Auth user since the database registration failed
                if (isNewUserCreated && user) {
                    try {
                        await user.delete();
                    } catch (deleteErr) {
                        console.error("Failed to clean up orphaned Auth user:", deleteErr);
                    }
                }
                throw firestoreError; // re-throw to be caught by the outer catch
            }
        } catch (error) {
            console.error("Error registering resident: ", error);
            
            let errorMessage = 'Unable to create your account. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email address is already registered.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'The password is too weak. Please use a stronger password.';
            }

            showRegistrationFailedAlert(errorMessage);
        } finally {
            setIsTransitioning(false);
        }
    };

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeStep]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (activeStep === 3) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        
        const handleKeyDown = (e) => {
            if (activeStep === 3) {
                if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r') || (e.metaKey && e.key.toLowerCase() === 'r')) {
                    e.preventDefault();
                    handleBackToHome(window.location.pathname);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeStep]);

    const handleBackToHome = (targetPath = '/') => {
        let timerInterval;
        Swal.fire({
            title: 'Are you sure you want to exit?',
            html: `
                <div style="text-align: left; font-size: 0.95rem; line-height: 1.5; color: #4a5568;">
                    <p style="margin-bottom: 10px;"><strong>Please take note of the following before exiting:</strong></p>
                    <ul style="padding-left: 20px; margin-bottom: 0;">
                        <li style="margin-bottom: 5px;">Make sure to screenshot and copy the link.</li>
                        <li style="margin-bottom: 5px;">Do not lose this registration ID and the QR code.</li>
                        <li style="margin-bottom: 5px;">Always visit the site to see the status of your account.</li>
                        <li>Please wait for approval in 1 or 2 days.</li>
                    </ul>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3182ce',
            cancelButtonColor: '#a0aec0',
            confirmButtonText: 'Yes, exit (5)',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false,
            didOpen: () => {
                const confirmBtn = Swal.getConfirmButton();
                confirmBtn.disabled = true;
                confirmBtn.style.cursor = 'not-allowed';
                confirmBtn.style.opacity = '0.7';
                let secondsLeft = 5;
                timerInterval = setInterval(() => {
                    secondsLeft--;
                    if (secondsLeft > 0) {
                        confirmBtn.textContent = `Yes, exit (${secondsLeft})`;
                    } else {
                        confirmBtn.textContent = 'Yes, exit';
                        confirmBtn.disabled = false;
                        confirmBtn.style.cursor = 'pointer';
                        confirmBtn.style.opacity = '1';
                        clearInterval(timerInterval);
                    }
                }, 1000);
            },
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then((result) => {
            if (result.isConfirmed) {
                navigate(targetPath);
            }
        });
    };

    useEffect(() => {
        if (activeStep === 3) {
            window.history.pushState(null, '', window.location.href);

            const handlePopState = () => {
                window.history.pushState(null, '', window.location.href);
                handleBackToHome('/');
            };

            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [activeStep]);

    if (isLoading) {
        return (
            <div className="register-loading-screen">
                <img src={BannerImg} alt="Background" className="register-loading-bg" />
                <div className="register-loading-overlay"></div>
                <div className="register-loading-card">
                    <div className="register-loading-icon-wrapper">
                        <Users size={40} />
                    </div>
                    <h2>Resident Registration</h2>
                    <p className="subtitle">
                        You're about to register as a resident of Barangay Buluan.<br />
                        This will only take a few minutes.
                    </p>

                    <div className="register-features">
                        <div className="register-feature-item">
                            <div className="register-feature-icon">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="register-feature-text">
                                <h4>Secure & Private</h4>
                                <p>Your information is safe and will only be used for official barangay records.</p>
                            </div>
                        </div>

                        <div className="register-feature-item">
                            <div className="register-feature-icon">
                                <FileText size={20} />
                            </div>
                            <div className="register-feature-text">
                                <h4>Easy Process</h4>
                                <p>Fill out the form and submit your registration in just a few steps.</p>
                            </div>
                        </div>

                        <div className="register-feature-item">
                            <div className="register-feature-icon">
                                <Clock size={20} />
                            </div>
                            <div className="register-feature-text">
                                <h4>Fast & Convenient</h4>
                                <p>Get registered quickly and enjoy better access to barangay services.</p>
                            </div>
                        </div>
                    </div>

                    <div className="register-progress-container">
                        <div className="register-progress-text">
                            <div className="spinner"></div> Preparing registration form...
                        </div>
                        <div className="register-progress-bar">
                            <div className="register-progress-fill"></div>
                        </div>
                        <p>Please wait while we set things up for you.</p>
                    </div>

                    <div className="register-secure-text">
                        <ShieldCheck size={16} /> Your information is secure and will only be used for barangay record and public service purposes.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="register-page">
            {isTransitioning && <Loader text={activeStep === 2 ? 'Creating account, please wait...' : 'Loading...'} />}
            <Navbar 
                blockNavigation={activeStep === 3}
                onBlockedNavigation={(e, path) => handleBackToHome(path)}
            />

            <main className="register-main">
                {activeStep !== 3 && (
                    <>
                        {!isNativeApp && (
                            <Link to="/" className="back-link">
                                <ArrowLeft size={18} /> Back to Home
                            </Link>
                        )}

                        <div className="register-header">
                            <div className="register-header-icon">
                                <UserSquare2 size={40} />
                            </div>
                            <div className="register-header-content">
                                <h1>Resident Registration</h1>
                                <p>
                                    Register as a resident of Barangay Buluan to be included in our official records.
                                    Your information will help us deliver better and faster services.
                                </p>
                                <div className="register-secure-alert">
                                    <ShieldCheck size={18} />
                                    Your information is secure and will only be used for barangay record and public service purposes.
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className={`register-grid ${activeStep === 3 ? 'success-mode' : ''}`}>
                    {/* Left Col - Form */}
                    <div className="register-form-container">
                        {activeStep === 2 && (
                            <h2 className="form-section-title">
                                <Users size={24} color="#2563eb" /> Review Registration
                            </h2>
                        )}

                        {activeStep === 1 && (
                            <form id="resident-register-form" onSubmit={handleSubmit} noValidate>
                            
                            <h2 className="form-section-title" style={{ marginTop: 0 }}>
                                <LogIn size={24} color="#2563eb" /> Sign Up / Account Setup
                            </h2>
                            <div className="form-grid" style={{ marginBottom: '30px' }}>
                                <div className="form-group full-width">
                                    <label className="form-label">Email Address (Gmail) <span className="required-asterisk">*</span></label>
                                    <input type="email" name="emailAddress" value={formData.emailAddress} onChange={handleChange} className="form-input" placeholder="Enter your email address" required />
                                    <div style={{ color: '#0284c7', fontSize: '0.85rem', marginTop: '6px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Info size={14} /> Note: Must use an active Gmail account. If you forgot your password, your account will be recovered using your active Gmail.
                                    </div>
                                </div>
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label className="form-label">Password <span className="required-asterisk">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="form-input" placeholder="Enter your password" required style={{ paddingRight: '2.5rem' }} />
                                        <button 
                                            type="button" 
                                            className="password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 0 }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    
                                    {/* Password Strength UI */}
                                    {formData.password.length > 0 && (
                                        <div className="password-strength-container" style={{ marginTop: '10px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                                            <div className="strength-meter" style={{ width: '100%', backgroundColor: '#e2e8f0', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                                                <div className={`strength-bar ${passwordStrength.score.toLowerCase()}`} style={{ height: '4px', background: passwordStrength.score === 'EXCELLENT' ? '#10b981' : passwordStrength.score === 'GOOD' ? '#f59e0b' : '#ef4444', transition: 'all 0.3s', width: passwordStrength.score === 'EXCELLENT' ? '100%' : passwordStrength.score === 'GOOD' ? '66%' : '33%' }}></div>
                                            </div>
                                            <span className={`strength-text ${passwordStrength.score.toLowerCase()}`} style={{ fontSize: '12px', fontWeight: 'bold', color: passwordStrength.score === 'EXCELLENT' ? '#10b981' : passwordStrength.score === 'GOOD' ? '#f59e0b' : '#ef4444' }}>
                                                {passwordStrength.score}
                                            </span>
                                            
                                            <div className="password-requirements" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '10px', fontSize: '11px', color: '#666' }}>
                                                <div className={`req-item ${passwordStrength.criteria.length ? 'met' : ''}`} style={{ color: passwordStrength.criteria.length ? '#10b981' : '#ef4444' }}><Check size={12}/> 12+ Characters</div>
                                                <div className={`req-item ${passwordStrength.criteria.upper ? 'met' : ''}`} style={{ color: passwordStrength.criteria.upper ? '#10b981' : '#ef4444' }}><Check size={12}/> Uppercase</div>
                                                <div className={`req-item ${passwordStrength.criteria.lower ? 'met' : ''}`} style={{ color: passwordStrength.criteria.lower ? '#10b981' : '#ef4444' }}><Check size={12}/> Lowercase</div>
                                                <div className={`req-item ${passwordStrength.criteria.number ? 'met' : ''}`} style={{ color: passwordStrength.criteria.number ? '#10b981' : '#ef4444' }}><Check size={12}/> Number</div>
                                                <div className={`req-item ${passwordStrength.criteria.special ? 'met' : ''}`} style={{ color: passwordStrength.criteria.special ? '#10b981' : '#ef4444' }}><Check size={12}/> Special Char</div>
                                                <div className={`req-item ${passwordStrength.criteria.notCommon ? 'met' : ''}`} style={{ color: passwordStrength.criteria.notCommon ? '#10b981' : '#ef4444' }}><Check size={12}/> Not Common</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm Password <span className="required-asterisk">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="form-input" placeholder="Confirm your password" required style={{ paddingRight: '2.5rem' }} />
                                        <button 
                                            type="button" 
                                            className="password-toggle"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 0 }}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <h2 className="form-section-title" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <Users size={24} color="#2563eb" /> Resident Registration Form
                            </h2>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Full Name <span className="required-asterisk">*</span></label>
                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="form-input" placeholder="Enter your full name" required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Date of Birth <span className="required-asterisk">*</span></label>
                                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="form-input" required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Civil Status <span className="required-asterisk">*</span></label>
                                    <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} className="form-select" required>
                                        <option value="">Select civil status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Widowed">Widowed</option>
                                        <option value="Separated">Separated</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Sex <span className="required-asterisk">*</span></label>
                                    <select name="sex" value={formData.sex} onChange={handleChange} className="form-select" required>
                                        <option value="">Select sex</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Contact Number <span className="required-asterisk">*</span></label>
                                    <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="form-input" placeholder="09XX XXX XXXX" required />
                                </div>


                                <div className="form-group">
                                    <label className="form-label">Purok / Zone <span className="required-asterisk">*</span></label>
                                    <select name="purok" value={formData.purok} onChange={handleChange} className="form-select" required>
                                        <option value="">Select purok</option>
                                        <option value="Purok Malipayon">Purok Malipayon</option>
                                        <option value="Purok Bagong-Silang">Purok Bagong-Silang</option>
                                        <option value="Purok Acacia">Purok Acacia</option>
                                        <option value="Purok Orchids">Purok Orchids</option>
                                        <option value="Purok Boguenvilla">Purok Boguenvilla</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">House / Block No. <span className="required-asterisk">*</span></label>
                                    <input type="text" name="houseNo" value={formData.houseNo} onChange={handleChange} className="form-input" placeholder="Enter house or block no." required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Occupation</label>
                                    <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="form-input" placeholder="Enter your occupation" />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Length of Stay in Barangay <span className="required-asterisk">*</span></label>
                                    <select name="lengthOfStay" value={formData.lengthOfStay} onChange={handleChange} className="form-select" required>
                                        <option value="">Select length of stay</option>
                                        <option value="Less than 6 months">Less than 6 months</option>
                                        <option value="6 months to 1 year">6 months to 1 year</option>
                                        <option value="1-5 years">1-5 years</option>
                                        <option value="More than 5 years">More than 5 years</option>
                                        <option value="Since birth">Since birth</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Place of Birth <span className="required-asterisk">*</span></label>
                                    <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className="form-input" placeholder="Enter your place of birth" required />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Nationality <span className="required-asterisk">*</span></label>
                                    <select name="nationality" value={formData.nationality} onChange={handleChange} className="form-select" required>
                                        <option value="Filipino">Filipino</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group full-width">
                                    <label className="form-label">Complete Address <span className="required-asterisk">*</span></label>
                                    <input type="text" name="completeAddress" value={formData.completeAddress} onChange={handleChange} className="form-input" placeholder="Enter your complete address" required />
                                </div>
                                
                                <div className="form-group full-width" id="field-photo2x2">
                                    <label className="form-label">Upload Photo (with white background) <span className="required-asterisk">*</span></label>
                                    <div className="upload-dropzone" onClick={() => photoInputRef.current.click()} onDragOver={handleDragOver} onDrop={handleDrop}>
                                        <input type="file" required ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" style={{display: 'none'}} />
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
                                    <div style={{ color: '#d69e2e', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Info size={16} /> Note: The uploaded photo must be a formal profile picture with a plain white background.
                                    </div>
                                </div>
                            </div>

                            <div className="form-checkbox-group">
                                <input type="checkbox" id="certify" checked={isCertified} onChange={(e) => setIsCertified(e.target.checked)} className="form-checkbox" required />
                                <label htmlFor="certify" className="form-checkbox-label">
                                    I hereby certify that the above information is true and correct.
                                </label>
                            </div>

                            <div className="form-actions desktop-only-btn">
                                <button type="button" className="btn-cancel" onClick={() => navigate(cancelRoute)}>Cancel</button>
                                <button type="submit" className="btn-next" disabled={!isCertified} style={{ opacity: !isCertified ? 0.5 : 1, cursor: !isCertified ? 'not-allowed' : 'pointer' }}>
                                    <UserSquare2 size={18} /> Next: Review Registration &rarr;
                                </button>
                            </div>
                        </form>
                        )}

                        {activeStep === 2 && (
                            <>
                                <div className="form-section" style={{marginBottom: '2rem'}}>
                                    <div className="review-row"><div className="review-label">Full Name</div><div className="review-value">{formData.fullName}</div></div>
                                    <div className="review-row"><div className="review-label">Date of Birth</div><div className="review-value">{formData.dateOfBirth}</div></div>
                                    <div className="review-row"><div className="review-label">Civil Status</div><div className="review-value">{formData.civilStatus}</div></div>
                                    <div className="review-row"><div className="review-label">Sex</div><div className="review-value">{formData.sex}</div></div>
                                    <div className="review-row"><div className="review-label">Contact Number</div><div className="review-value">{formData.contactNumber}</div></div>
                                    <div className="review-row"><div className="review-label">Email Address</div><div className="review-value">{formData.emailAddress}</div></div>

                                    <div className="review-row"><div className="review-label">Purok / Zone</div><div className="review-value">{formData.purok}</div></div>
                                    <div className="review-row"><div className="review-label">House / Block No.</div><div className="review-value">{formData.houseNo}</div></div>
                                    <div className="review-row"><div className="review-label">Occupation</div><div className="review-value">{formData.occupation || '—'}</div></div>
                                    <div className="review-row"><div className="review-label">Length of Stay</div><div className="review-value">{formData.lengthOfStay}</div></div>
                                    <div className="review-row"><div className="review-label">Place of Birth</div><div className="review-value">{formData.placeOfBirth}</div></div>
                                    <div className="review-row"><div className="review-label">Nationality</div><div className="review-value">{formData.nationality}</div></div>
                                    <div className="review-row"><div className="review-label">Complete Address</div><div className="review-value">{formData.completeAddress}</div></div>
                                    <div className="review-row">
                                        <div className="review-label">Uploaded 2x2 Photo</div>
                                        <div className="review-value">
                                            <div className="review-image">
                                                <img src={photo2x2Base64} alt="2x2 Photo" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                                                <div className="review-image-details">
                                                    <span className="review-image-name">Profile Photo</span>
                                                    <span className="review-image-meta">{photo2x2?.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="alert-warning">
                                    <Info size={24} className="alert-icon" />
                                    <p className="alert-warning-text">Please review all information carefully.<br/>Once submitted, you cannot edit your registration.</p>
                                </div>
                                <div className="form-actions desktop-only-btn">
                                    <button className="btn-cancel" onClick={() => setActiveStep(1)}><ArrowLeft size={18} style={{marginRight: '8px'}} /> Back to Edit</button>
                                    <button className="btn-primary" onClick={submitRegistration}>Register <Send size={16} style={{marginLeft: '8px'}} /></button>
                                </div>
                            </>
                        )}

                        {activeStep === 3 && (
                            <div className="res-success-view">
                                <div className="res-success-header">
                                    <div className="res-success-checkmark"><Check size={40} strokeWidth={3} color="#22c55e" /></div>
                                    <h2 className="res-success-title">Registration Successful!</h2>
                                    <p className="res-success-subtitle">Your resident registration has been received by Barangay Buluan.</p>
                                </div>

                                <div className="res-success-summary">
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                                        <span className="status-badge status-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <AlertTriangle size={14} /> Pending Approval
                                        </span>
                                    </div>
                                    <div className="res-success-qr-container">
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.5rem', color: '#1e293b' }}>{generatedId}</h3>
                                        <p style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '0.9rem' }}>Please save this Registration Number.</p>
                                        
                                        <div className="res-success-qr-box">
                                            {generatedQrToken && (
                                                <QRCode 
                                                    value={`${window.location.origin}/status?token=${generatedQrToken}`} 
                                                    size={160}
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    level="H"
                                                />
                                            )}
                                        </div>
                                        <p style={{ marginTop: '20px', fontSize: '0.95rem', color: '#475569' }}>
                                            <strong>Note:</strong> Please take a screenshot of this QR code or copy the link to make sure you don't lose access to your registration status!
                                        </p>
                                        {generatedQrToken && (
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px', flexWrap: 'wrap' }}>
                                                <a 
                                                    href={`${window.location.origin}/status?token=${generatedQrToken}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-primary"
                                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                >
                                                    <ExternalLink size={16} /> View Status
                                                </a>
                                                <button 
                                                    className="btn-outline" 
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin}/status?token=${generatedQrToken}`);
                                                        Swal.fire({ title: 'Copied!', text: 'Status link copied to clipboard.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                >
                                                    <Copy size={16} /> Copy Link
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="res-success-alert" style={{ backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#f87171' }}>
                                    <AlertTriangle size={20} className="res-success-alert-icon" color="#991b1b" style={{ flexShrink: 0 }} />
                                    <span>Your account is pending admin approval. Please DO NOT attempt to sign in until your status is approved.</span>
                                </div>

                                <div className="res-success-actions">
                                    <button className="btn-outline" onClick={() => handleBackToHome('/')}><Home size={18} /> Back to Home</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Col - Sidebar */}
                    {activeStep !== 3 && (
                        <div className="register-sidebar">
                        <div className="sidebar-card">
                            <h3>Registration Progress</h3>
                            <div className="progress-steps">
                                <div className="progress-line">
                                    <div className="progress-line-fill" style={{ width: activeStep === 1 ? '0%' : activeStep === 2 ? '50%' : '100%' }}></div>
                                </div>
                                <div className={`progress-step ${activeStep === 1 ? 'active' : 'completed'}`}>
                                    <div className="step-circle">{activeStep === 1 ? '1' : <Check size={14} strokeWidth={3} />}</div>
                                    <span className="step-label">Fill Out Form</span>
                                </div>
                                <div className={`progress-step ${activeStep === 2 ? 'active' : (activeStep > 2 ? 'completed' : '')}`}>
                                    <div className="step-circle">{activeStep > 2 ? <Check size={14} strokeWidth={3} /> : '2'}</div>
                                    <span className="step-label">Review</span>
                                </div>
                                <div className={`progress-step ${activeStep === 3 ? 'completed' : ''}`}>
                                    <div className="step-circle">{activeStep === 3 ? <Check size={14} strokeWidth={3} /> : '3'}</div>
                                    <span className="step-label">Register</span>
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-card">
                            <h3><Users size={20} color="#2563eb" /> Why Register?</h3>
                            <div className="register-features">
                                <div className="register-feature-item">
                                    <div className="register-feature-icon">
                                        <ClipboardList size={18} color="#2563eb" />
                                    </div>
                                    <div className="register-feature-text">
                                        <h4>Official Record</h4>
                                        <p>Your information will be part of the official resident record of Barangay Buluan.</p>
                                    </div>
                                </div>

                                <div className="register-feature-item">
                                    <div className="register-feature-icon">
                                        <ShieldCheck size={18} color="#2563eb" />
                                    </div>
                                    <div className="register-feature-text">
                                        <h4>Faster Transactions</h4>
                                        <p>Easier and faster processing of your document requests.</p>
                                    </div>
                                </div>

                                <div className="register-feature-item">
                                    <div className="register-feature-icon">
                                        <Building2 size={18} color="#2563eb" />
                                    </div>
                                    <div className="register-feature-text">
                                        <h4>Better Services</h4>
                                        <p>Helps the barangay understand and serve the community better.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-card">
                            <h3>Already Registered?</h3>
                            <p className="already-text">If you need to update your information, please contact the Barangay Office.</p>
                            <button className="btn-outline" onClick={() => navigate('/contact')}>
                                <Phone size={18} /> Contact Barangay Office
                            </button>
                        </div>
                    </div>
                    )}
                </div>

                <div className="form-actions mobile-only-btn" style={{marginTop: '0'}}>
                    {activeStep === 1 && (
                        <>
                            <button type="button" className="btn-cancel" onClick={() => navigate(cancelRoute)}>Cancel</button>
                            <button type="submit" form="resident-register-form" className="btn-next" disabled={!isCertified || isTransitioning} style={{ opacity: (!isCertified || isTransitioning) ? 0.5 : 1, cursor: (!isCertified || isTransitioning) ? 'not-allowed' : 'pointer' }}>
                                {isTransitioning ? 'Submitting...' : <><UserSquare2 size={18} /> Next: Review &rarr;</>}
                            </button>
                        </>
                    )}
                    {activeStep === 2 && (
                        <>
                            <button className="btn-cancel" onClick={() => setActiveStep(1)}><ArrowLeft size={18} style={{marginRight: '8px'}} /> Back to Edit</button>
                            <button className="btn-primary" onClick={submitRegistration} disabled={isTransitioning} style={{ opacity: isTransitioning ? 0.5 : 1, cursor: isTransitioning ? 'not-allowed' : 'pointer' }}>
                                {isTransitioning ? 'Submitting...' : <>Submit Registration <Send size={16} style={{marginLeft: '8px'}} /></>}
                            </button>
                        </>
                    )}
                </div>

            </main>

            <ContactFooter />
            <footer className="footer">
                <div className="footer-content">
                    <img src={Logo} alt="BDRS Icon" className="footer-icon" />
                    <span className="footer-logo">BDRS</span>
                    <span className="footer-text">&copy; 2026 All Rights Reserved.</span>
                </div>
            </footer>
        </div>
    );
}
