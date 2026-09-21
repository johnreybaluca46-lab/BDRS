import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../lib/service.css';
import '../../lib/home.css';
import Navbar from '../../components/Navbar';
import ContactFooter from '../../components/ContactFooter';
import { MapPin, FileText, Clock, Building, ArrowRight, Edit3, CheckCircle, Send, Award, Search, Info, CheckCircle2, Phone, Headset } from 'lucide-react';
import Logo from '../../assets/logo/barangay buluan seal.png';
import BannerImg from '../../assets/image/banner 2.png';
import BarangayClearanceImg from '../../assets/logo/barangay clearance.png';
import CertificateOfResidencyImg from '../../assets/logo/certificate of residency.png';
import CertificateOfIndigencyImg from '../../assets/logo/certificate of indigency.png';
import BusinessClearanceImg from '../../assets/logo/business clearance.png';
import Loader from '../../components/Loader';
import Swal from 'sweetalert2';

export default function Service() {
  useEffect(() => {
    document.title = "BDRS | Services";
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestClick = (e, path) => {
    e.preventDefault();
    Swal.fire({
      title: 'Sign In Required',
      text: 'You need to sign in first to continue your document request.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sign In',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
    }).then((result) => {
      if (result.isConfirmed) {
        navigate('/user-login');
      }
    });
  };

  return (
    <div className="services-page-container">
      {isLoading && <Loader />}
      <Navbar />
      
      <div className="hero-section" style={{ minHeight: '350px' }}>
        <div className="hero-content">
          <h1 className="hero-title">Our Services</h1>
          <p className="hero-subtitle">
            Request official barangay documents<br/>
            online quickly and conveniently.
          </p>
          <div className="location-badge" style={{ marginTop: '1rem' }}>
            <MapPin size={18} strokeWidth={2.5} className="location-icon" />
            <span style={{ color: '#0b1c4e', fontWeight: 600, fontSize: '0.95rem' }}>Barangay Buluan, Ipil, Zamboanga Sibugay</span>
          </div>
        </div>
        
        <div className="hero-image-container">
          <img src={BannerImg} alt="Barangay Hall" className="hero-banner" />
        </div>
      </div>

      <main className="services-main-content">
        <div className="services-grid">
          
          {/* Barangay Clearance */}
          <div className="service-item-card">
            <div className="service-card-header">
              <div className="service-card-icon">
                <img src={BarangayClearanceImg} alt="Barangay Clearance" />
              </div>
              <div className="service-card-title-area">
                <h3>1. Barangay Clearance</h3>
                <p>An official document issued by the barangay to certify that a resident is known to the barangay and may be used for various requirements.</p>
              </div>
            </div>
            
            <h4 className="service-section-title">Common Purposes</h4>
            <ul className="common-purposes-list">
              <li>Employment</li>
              <li>Local Employment</li>
              <li>Business</li>
              <li>Scholarship</li>
              <li>School Requirement</li>
              <li>Loan</li>
              <li>Financial Assistance</li>
              <li>Police Requirement</li>
              <li>Other official purposes</li>
            </ul>

            <div className="service-requirements">
              <FileText size={18} className="service-requirements-icon" />
              <div className="service-req-text">
                <h4>Requirements</h4>
                <p>Purok Clearance, Valid ID (National or Barangay ID).</p>
              </div>
            </div>

            <div className="service-meta-grid">
              <div className="meta-item">
                <Clock size={18} />
                <div className="meta-text">
                  <h4>Processing Time</h4>
                  <p>1 hour first come first serve</p>
                </div>
              </div>
              <div className="meta-item">
                <Building size={18} />
                <div className="meta-text">
                  <h4>Release Method</h4>
                  <p>Pick up at the Barangay hall / Online PDF Download</p>
                </div>
              </div>
            </div>

            <button className="btn-full-width" onClick={(e) => handleRequestClick(e, '/barangay-clearance')}>
              Request Barangay Clearance <ArrowRight size={18} />
            </button>
          </div>

          {/* Certificate of Residency */}
          <div className="service-item-card">
            <div className="service-card-header">
              <div className="service-card-icon">
                <img src={CertificateOfResidencyImg} alt="Certificate of Residency" />
              </div>
              <div className="service-card-title-area">
                <h3>2. Certificate of Residency</h3>
                <p>An official document certifying that a person is a resident of Barangay Buluan, Ipil, Zamboanga Sibugay.</p>
              </div>
            </div>
            
            <h4 className="service-section-title">Common Purposes</h4>
            <ul className="common-purposes-list">
              <li>Employment</li>
              <li>School Requirement</li>
              <li>Scholarship</li>
              <li>Government Transactions</li>
              <li>Bank/Loan Application</li>
              <li>Legal Requirements</li>
              <li>Financial Assistance</li>
              <li>Other official purposes</li>
            </ul>

            <div className="service-requirements">
              <FileText size={18} className="service-requirements-icon" />
              <div className="service-req-text">
                <h4>Requirements</h4>
                <p>Purok clearance - first (* if without get it first personally to the purok president), 18+ of age.</p>
              </div>
            </div>

            <div className="service-meta-grid">
              <div className="meta-item">
                <Clock size={18} />
                <div className="meta-text">
                  <h4>Processing Time</h4>
                  <p>1 – 2 Working Days</p>
                </div>
              </div>
              <div className="meta-item">
                <Building size={18} />
                <div className="meta-text">
                  <h4>Release Method</h4>
                  <p>Pick up at the Barangay hall / Online PDF Download</p>
                </div>
              </div>
            </div>

            <button className="btn-full-width" onClick={(e) => handleRequestClick(e, '/certificate-of-residency')}>
              Request Certificate of Residency <ArrowRight size={18} />
            </button>
          </div>

          {/* Certificate of Indigency */}
          <div className="service-item-card">
            <div className="service-card-header">
              <div className="service-card-icon">
                <img src={CertificateOfIndigencyImg} alt="Certificate of Indigency" />
              </div>
              <div className="service-card-title-area">
                <h3>3. Certificate of Indigency</h3>
                <p>An official document certifying that an individual or family belongs to a financially disadvantaged household, subject to barangay verification.</p>
              </div>
            </div>
            
            <h4 className="service-section-title">Common Purposes</h4>
            <ul className="common-purposes-list">
              <li>Medical Assistance</li>
              <li>Educational Assistance</li>
              <li>Financial Assistance</li>
              <li>Burial Assistance</li>
              <li>Hospital Assistance</li>
              <li>Scholarship</li>
              <li>Legal Assistance</li>
              <li>Other assistance programs</li>
            </ul>

            <div className="service-requirements">
              <FileText size={18} className="service-requirements-icon" />
              <div className="service-req-text">
                <h4>Requirements</h4>
                <p>Valid ID, household information, purpose/reason for request, and supporting documents.</p>
              </div>
            </div>

            <div className="service-meta-grid">
              <div className="meta-item">
                <Clock size={18} />
                <div className="meta-text">
                  <h4>Processing Time</h4>
                  <p>1 – 2 Working Days</p>
                </div>
              </div>
              <div className="meta-item">
                <Building size={18} />
                <div className="meta-text">
                  <h4>Release Method</h4>
                  <p>Pick up at the Barangay hall / Online PDF Download</p>
                </div>
              </div>
            </div>

            <button className="btn-full-width" onClick={(e) => handleRequestClick(e, '/certificate-of-indigency')}>
              Request Certificate of Indigency <ArrowRight size={18} />
            </button>
          </div>

          {/* Business Permit */}
          <div className="service-item-card">
            <div className="service-card-header">
              <div className="service-card-icon">
                <img src={BusinessClearanceImg} alt="Business Permit" />
              </div>
              <div className="service-card-title-area">
                <h3>4. Business Permit</h3>
                <p>An official document issued by the barangay for businesses operating or planning to operate within the barangay's jurisdiction.</p>
              </div>
            </div>
            
            <h4 className="service-section-title">Common Purposes</h4>
            <ul className="common-purposes-list">
              <li>Business Registration</li>
              <li>Business Permit Application</li>
              <li>Business Renewal</li>
              <li>Local Business Transactions</li>
              <li>Other Business Requirements</li>
            </ul>

            <div className="service-requirements">
              <FileText size={18} className="service-requirements-icon" />
              <div className="service-req-text">
                <h4>Requirements</h4>
                <p>Valid ID, business information, registration documents (if required), and others.</p>
              </div>
            </div>

            <div className="service-meta-grid">
              <div className="meta-item">
                <Clock size={18} />
                <div className="meta-text">
                  <h4>Processing Time</h4>
                  <p>1 – 2 Working Days</p>
                </div>
              </div>
              <div className="meta-item">
                <Building size={18} />
                <div className="meta-text">
                  <h4>Release Method</h4>
                  <p>Pick up at the Barangay hall / Online PDF Download</p>
                </div>
              </div>
            </div>

            <button className="btn-full-width" onClick={(e) => handleRequestClick(e, '/business-clearance')}>
              Request Business Permit <ArrowRight size={18} />
            </button>
          </div>

        </div>

        <div className="bottom-info-row">
          {/* Flowchart Card */}
          <div className="flowchart-card">
            <h3>How to Request a Document</h3>
            <div className="flowchart-row">
              <div className="flowchart-steps" style={{ width: '100%' }}>
                <div className="flowchart-step">
                  <div className="step-icon-circle"><FileText size={20} /></div>
                  <span>Select Document</span>
                </div>
                <div className="flowchart-connector"></div>
                <div className="flowchart-step">
                  <div className="step-icon-circle"><Edit3 size={20} /></div>
                  <span>Fill Out Request Form</span>
                </div>
                <div className="flowchart-connector"></div>
                <div className="flowchart-step">
                  <div className="step-icon-circle"><CheckCircle size={20} /></div>
                  <span>Review Your Information</span>
                </div>
                <div className="flowchart-connector"></div>
                <div className="flowchart-step">
                  <div className="step-icon-circle"><Send size={20} /></div>
                  <span>Submit Request</span>
                </div>
              </div>
            </div>
            
            <div className="flowchart-row" style={{ marginTop: '2rem', justifyContent: 'center' }}>
              <div className="flowchart-steps" style={{ width: '35%' }}>
                <div className="flowchart-step">
                  <div className="step-icon-circle"><Award size={20} /></div>
                  <span>Receive Polling Number</span>
                </div>
                <div className="flowchart-connector"></div>
                <div className="flowchart-step">
                  <div className="step-icon-circle"><Building size={20} /></div>
                  <span>Pick Up at Barangay Hall</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist Card */}
          <div className="checklist-card">
            <h3>Before You Request</h3>
            <p>Please prepare the following:</p>
            <ul className="checklist-items">
              <li><CheckCircle2 size={18} /> Valid government-issued ID</li>
              <li><CheckCircle2 size={18} /> Complete and accurate personal information</li>
              <li><CheckCircle2 size={18} /> Purpose of the document</li>
              <li><CheckCircle2 size={18} /> Supporting documents, if applicable</li>
              <li><CheckCircle2 size={18} /> Active contact number</li>
            </ul>
            <div className="warning-note">
              <Info size={18} />
              <p><strong>Important:</strong> Requirements, processing time, and fees may vary depending on the document and barangay policy.</p>
            </div>
          </div>
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
