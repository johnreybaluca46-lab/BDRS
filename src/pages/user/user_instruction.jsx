import React, { useEffect } from 'react';
import ResidentSidebar from '../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../components/ResidentNotificationBell';
import { FileText, Edit, CheckCircle, Send, Clock, CreditCard, Download, Building2, Ticket } from 'lucide-react';
import '../../lib/admin-layout.css';

const Step = ({ icon: Icon, label, description }) => (
  <div className="roadmap-step">
    <div className="roadmap-step-icon">
      <Icon size={28} color="#16a34a" />
    </div>
    <div className="roadmap-step-text">
      <span className="roadmap-step-label">{label}</span>
      {description && <span className="roadmap-step-desc">{description}</span>}
    </div>
  </div>
);

const DashedArrow = () => (
  <div className="roadmap-arrow">
    <div className="roadmap-arrow-line"></div>
    <div className="roadmap-arrow-head"></div>
  </div>
);

export default function UserInstruction() {
  useEffect(() => {
    document.title = "Instruction | BDRS";
  }, []);

  return (
    <div className="admin-dashboard-container">
      <ResidentSidebar />
      
      <main className="admin-main">
        <header className="admin-header">
          <h1>Document Request Guidelines</h1>
          <div className="header-right">
            <ResidentNotificationBell />
            <ResidentProfileDropdown />
          </div>
        </header>

        <div className="instruction-content" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
          
          <style>{`
            .roadmap-container {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              max-width: 850px;
              margin: 0 auto;
              padding-bottom: 20px;
            }
            .roadmap-step {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 170px;
              text-align: center;
              z-index: 2;
            }
            .roadmap-step-icon {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              background-color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              flex-shrink: 0;
            }
            .roadmap-step-text {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 12px;
            }
            .roadmap-step-label {
              font-size: 0.9rem;
              font-weight: 600;
              color: #065f46;
              line-height: 1.2;
              margin-bottom: 6px;
            }
            .roadmap-step-desc {
              font-size: 0.75rem;
              color: #475569;
              line-height: 1.4;
            }
            .roadmap-arrow {
              display: flex;
              align-items: center;
              flex: 1;
              min-width: 20px;
              margin: 0 5px;
              position: relative;
              top: 30px;
              z-index: 1;
            }
            .roadmap-arrow-line {
              flex: 1;
              height: 0;
              border-top: 2px dashed #86efac;
            }
            .roadmap-arrow-head {
              width: 0;
              height: 0;
              border-top: 5px solid transparent;
              border-bottom: 5px solid transparent;
              border-left: 7px solid #86efac;
              margin-left: -2px;
            }
            
            @media (max-width: 768px) {
              .roadmap-container {
                flex-direction: column;
                align-items: flex-start;
                padding-left: 20px;
                gap: 0;
              }
              .roadmap-step {
                flex-direction: row;
                width: 100%;
                text-align: left;
                gap: 20px;
              }
              .roadmap-step-text {
                align-items: flex-start;
                margin-top: 0;
              }
              .roadmap-step-label {
                font-size: 1rem;
              }
              .roadmap-arrow {
                flex-direction: column;
                height: 40px;
                width: 2px;
                margin: 5px 0 5px 31px; /* Center align with 64px icon (32px half - 1px border) */
                top: 0;
                min-width: 0;
              }
              .roadmap-arrow-line {
                border-top: none;
                border-left: 2px dashed #86efac;
                flex: 1;
                width: 0;
                height: auto;
              }
              .roadmap-arrow-head {
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 7px solid #86efac;
                border-bottom: none;
                margin-left: -4px;
                margin-top: -2px;
              }
            }
          `}</style>

          {/* SECTION: ONLINE PAYMENT */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px 30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '10px', fontWeight: 'bold' }}>Detailed Guide: Online Payment</h2>
            <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
              Follow these instructions if you prefer to process your payment online and download your digital document.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3b82f6' }}>
                  <FileText size={24} color="#3b82f6" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 1: Request a Document</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    Navigate to <strong>Request documents</strong> in the sidebar. Select the specific type of document you need (e.g., Barangay Clearance, Certificate of Residency), completely fill out the required application form, and submit it.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #d97706' }}>
                  <Clock size={24} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 2: Wait for Verification</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    Your request goes to the <strong>Approval request</strong> section. Please wait while the barangay officials verify your application against our records.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #9333ea' }}>
                  <CreditCard size={24} color="#9333ea" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 3: Process Online Payment</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    Once approved, your request moves to the <strong>Online Payment</strong> tab. Upload a screenshot of your payment receipt (e.g., GCash) as proof of payment. Our staff will then verify the transaction.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #16a34a' }}>
                  <Download size={24} color="#16a34a" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 4: Download Document</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    After your payment is verified, your document will be placed in the <strong>Completed</strong> section. You can now download and print the official copy of your document.
                  </p>
                </div>
              </div>

            </div>

            {/* Online Payment Roadmap */}
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '30px 20px', border: '1px solid #bbf7d0' }}>
              <h3 style={{ textAlign: 'center', color: '#064e3b', fontSize: '1.2rem', marginBottom: '30px', fontWeight: 'bold' }}>Visual Roadmap</h3>
              <div className="roadmap-container">
                <Step icon={FileText} label="Select Document" description="Choose the document you need from Request Documents." />
                <DashedArrow />
                <Step icon={Edit} label="Fill Out Form" description="Provide all required details in the application form." />
                <DashedArrow />
                <Step icon={Clock} label="Wait for Approval" description="Wait for officials to verify your application." />
                <DashedArrow />
                <Step icon={CreditCard} label="Process Payment" description="Upload your payment receipt in Online Payment." />
                <DashedArrow />
                <Step icon={Download} label="Download Document" description="Get your approved document in the Completed tab." />
              </div>
            </div>
          </div>

          {/* SECTION: BARANGAY PICK UP */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px 30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '10px', fontWeight: 'bold' }}>Detailed Guide: Barangay Pick Up</h2>
            <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
              Follow these instructions if you prefer to physically pick up your document at the Barangay Hall.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3b82f6' }}>
                  <FileText size={24} color="#3b82f6" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 1: Request a Document</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    Navigate to <strong>Request documents</strong> in the sidebar. Select your document type, fill out the required application form, and submit it.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #d97706' }}>
                  <Clock size={24} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 2: Wait for Verification</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    Your request goes to the <strong>Approval request</strong> section. Please wait patiently while the barangay officials review and verify your application.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #db2777' }}>
                  <Ticket size={24} color="#db2777" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 3: Receive Reference Number</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    Once your application is approved and ready, you will be issued a reference or tracking number indicating that your physical document has been prepared.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flexShrink: 0, width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #16a34a' }}>
                  <Building2 size={24} color="#16a34a" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 8px 0' }}>Step 4: Pick Up at Barangay Hall</h3>
                  <p style={{ color: '#475569', margin: 0, lineHeight: '1.6' }}>
                    Visit the Barangay Hall and present your reference number to the staff. If there are any associated fees, you can settle them in person before claiming your document.
                  </p>
                </div>
              </div>

            </div>

            {/* Barangay Pick Up Roadmap */}
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '30px 20px', border: '1px solid #bbf7d0' }}>
              <h3 style={{ textAlign: 'center', color: '#064e3b', fontSize: '1.2rem', marginBottom: '30px', fontWeight: 'bold' }}>Visual Roadmap</h3>
              <div className="roadmap-container">
                <Step icon={FileText} label="Select Document" description="Choose the document you need from Request Documents." />
                <DashedArrow />
                <Step icon={Edit} label="Fill Out Form" description="Provide all required details in the application form." />
                <DashedArrow />
                <Step icon={Clock} label="Wait for Approval" description="Wait for officials to verify your application." />
                <DashedArrow />
                <Step icon={Ticket} label="Reference Number" description="Once approved, note your tracking number." />
                <DashedArrow />
                <Step icon={Building2} label="Pick Up at Hall" description="Present your number at the Barangay Hall." />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
