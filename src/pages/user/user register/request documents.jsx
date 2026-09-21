import React, { useEffect } from 'react';
import ResidentSidebar from '../../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../../components/ResidentNotificationBell';
import '../../../lib/admin-layout.css';
import '../../../lib/request-documents.css';
import { Link } from 'react-router-dom';
import { ArrowRight, FileCheck, Clock, Building } from 'lucide-react';
import brgyClearanceLogo from '../../../assets/logo/barangay clearance.png';
import certResidencyLogo from '../../../assets/logo/certificate of residency.png';
import certIndigencyLogo from '../../../assets/logo/certificate of indigency.png';
import bizClearanceLogo from '../../../assets/logo/business clearance.png';

export default function RequestDocuments() {
  useEffect(() => {
    document.title = "Resident | Request Documents";
  }, []);

  return (
      <div className="admin-dashboard-container">
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
    
          <div className="req-docs-container">
            
            {/* Barangay Clearance */}
            <div className="req-doc-card">
              <div className="req-doc-header">
                <div className="req-doc-icon-wrapper">
                  <img src={brgyClearanceLogo} alt="Barangay Clearance" />
                </div>
                <div className="req-doc-title-area">
                  <h3>1. Barangay Clearance</h3>
                  <p>An official document issued by the barangay to certify that a resident is known to the barangay and may be used for various requirements.</p>
                </div>
              </div>
              <h4 className="req-doc-section-title">Common Purposes</h4>
              <div className="req-doc-purposes">
                <div className="req-doc-purpose-item">Employment</div>
                <div className="req-doc-purpose-item">Local Employment</div>
                <div className="req-doc-purpose-item">Business</div>
                <div className="req-doc-purpose-item">Scholarship</div>
                <div className="req-doc-purpose-item">School Requirement</div>
                <div className="req-doc-purpose-item">Loan</div>
                <div className="req-doc-purpose-item">Financial Assistance</div>
                <div className="req-doc-purpose-item">Police Requirement</div>
                <div className="req-doc-purpose-item">Other official purposes</div>
              </div>
              <div className="req-doc-info-block">
                <FileCheck size={18} className="req-doc-info-icon" />
                <div className="req-doc-info-text">
                  <h4>Requirements</h4>
                  <p>Purok Clearance, Valid ID (National or Barangay ID).</p>
                </div>
              </div>
              <div className="req-doc-meta-row">
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Clock size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Processing Time</h4>
                    <p>1 hour first come first serve</p>
                  </div>
                </div>
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Building size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Release Method</h4>
                    <p>Pick up at the Barangay hall / Online PDF Download</p>
                  </div>
                </div>
              </div>
              <Link to="/barangay-clearance" className="req-doc-button">
                Request Barangay Clearance <ArrowRight size={18} />
              </Link>
            </div>

            {/* Certificate of Residency */}
            <div className="req-doc-card">
              <div className="req-doc-header">
                <div className="req-doc-icon-wrapper">
                  <img src={certResidencyLogo} alt="Certificate of Residency" />
                </div>
                <div className="req-doc-title-area">
                  <h3>2. Certificate of Residency</h3>
                  <p>An official document certifying that a person is a resident of Barangay Buluan, Ipil, Zamboanga Sibugay.</p>
                </div>
              </div>
              <h4 className="req-doc-section-title">Common Purposes</h4>
              <div className="req-doc-purposes">
                <div className="req-doc-purpose-item">Employment</div>
                <div className="req-doc-purpose-item">School Requirement</div>
                <div className="req-doc-purpose-item">Scholarship</div>
                <div className="req-doc-purpose-item">Government Transactions</div>
                <div className="req-doc-purpose-item">Bank/Loan Application</div>
                <div className="req-doc-purpose-item">Legal Requirements</div>
                <div className="req-doc-purpose-item">Financial Assistance</div>
                <div className="req-doc-purpose-item">Other official purposes</div>
              </div>
              <div className="req-doc-info-block">
                <FileCheck size={18} className="req-doc-info-icon" />
                <div className="req-doc-info-text">
                  <h4>Requirements</h4>
                  <p>Purok clearance - first (* if without get it first personally to the purok president), 18+ of age.</p>
                </div>
              </div>
              <div className="req-doc-meta-row">
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Clock size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Processing Time</h4>
                    <p>1 - 2 Working Days</p>
                  </div>
                </div>
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Building size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Release Method</h4>
                    <p>Pick up at the Barangay hall / Online PDF Download</p>
                  </div>
                </div>
              </div>
              <Link to="/certificate-of-residency" className="req-doc-button">
                Request Certificate of Residency <ArrowRight size={18} />
              </Link>
            </div>

            {/* Certificate of Indigency */}
            <div className="req-doc-card">
              <div className="req-doc-header">
                <div className="req-doc-icon-wrapper">
                  <img src={certIndigencyLogo} alt="Certificate of Indigency" />
                </div>
                <div className="req-doc-title-area">
                  <h3>3. Certificate of Indigency</h3>
                  <p>An official document certifying that an individual or family belongs to a financially disadvantaged household, subject to barangay verification.</p>
                </div>
              </div>
              <h4 className="req-doc-section-title">Common Purposes</h4>
              <div className="req-doc-purposes">
                <div className="req-doc-purpose-item">Medical Assistance</div>
                <div className="req-doc-purpose-item">Educational Assistance</div>
                <div className="req-doc-purpose-item">Financial Assistance</div>
                <div className="req-doc-purpose-item">Burial Assistance</div>
                <div className="req-doc-purpose-item">Hospital Assistance</div>
                <div className="req-doc-purpose-item">Scholarship</div>
                <div className="req-doc-purpose-item">Legal Assistance</div>
                <div className="req-doc-purpose-item">Other assistance programs</div>
              </div>
              <div className="req-doc-info-block">
                <FileCheck size={18} className="req-doc-info-icon" />
                <div className="req-doc-info-text">
                  <h4>Requirements</h4>
                  <p>Valid ID, household information, purpose/reason for request, and supporting documents.</p>
                </div>
              </div>
              <div className="req-doc-meta-row">
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Clock size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Processing Time</h4>
                    <p>1 - 2 Working Days</p>
                  </div>
                </div>
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Building size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Release Method</h4>
                    <p>Pick up at the Barangay hall / Online PDF Download</p>
                  </div>
                </div>
              </div>
              <Link to="/certificate-of-indigency" className="req-doc-button">
                Request Certificate of Indigency <ArrowRight size={18} />
              </Link>
            </div>

            {/* Business Permit */}
            <div className="req-doc-card">
              <div className="req-doc-header">
                <div className="req-doc-icon-wrapper">
                  <img src={bizClearanceLogo} alt="Business Permit" />
                </div>
                <div className="req-doc-title-area">
                  <h3>4. Business Permit</h3>
                  <p>An official document issued by the barangay for businesses operating or planning to operate within the barangay's jurisdiction.</p>
                </div>
              </div>
              <h4 className="req-doc-section-title">Common Purposes</h4>
              <div className="req-doc-purposes">
                <div className="req-doc-purpose-item">Business Registration</div>
                <div className="req-doc-purpose-item">Business Permit Application</div>
                <div className="req-doc-purpose-item">Business Renewal</div>
                <div className="req-doc-purpose-item">Local Business Transactions</div>
                <div className="req-doc-purpose-item">Other Business Requirements</div>
              </div>
              <div className="req-doc-info-block">
                <FileCheck size={18} className="req-doc-info-icon" />
                <div className="req-doc-info-text">
                  <h4>Requirements</h4>
                  <p>Valid ID, business information, registration documents (if required), and others.</p>
                </div>
              </div>
              <div className="req-doc-meta-row">
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Clock size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Processing Time</h4>
                    <p>1 - 2 Working Days</p>
                  </div>
                </div>
                <div className="req-doc-info-block" style={{ marginBottom: 0 }}>
                  <Building size={18} className="req-doc-info-icon" />
                  <div className="req-doc-info-text">
                    <h4>Release Method</h4>
                    <p>Pick up at the Barangay hall / Online PDF Download</p>
                  </div>
                </div>
              </div>
              <Link to="/business-clearance" className="req-doc-button">
                Request Business Permit <ArrowRight size={18} />
              </Link>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
