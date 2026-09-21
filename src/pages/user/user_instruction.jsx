import React, { useEffect } from 'react';
import ResidentSidebar from '../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../components/ResidentNotificationBell';
import { FileText, Edit, CheckCircle, Send, Clock, CreditCard, Download, Building2, Ticket } from 'lucide-react';
import '../../lib/admin-layout.css';

const Step = ({ icon: Icon, label, description }) => (
  <div className="roadmap-step">
    <div className="roadmap-step-icon">
      <Icon className="roadmap-icon-svg" color="#16a34a" />
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
        <header className="admin-header resident-header">
          <h1>Guideline</h1>
          <div className="header-right">
            <ResidentNotificationBell />
            <ResidentProfileDropdown />
          </div>
        </header>

        <div className="instruction-content">
          
          <style>{`
            .instruction-content {
              padding: 24px;
              max-width: 1000px;
              margin: 0 auto;
            }
            .guide-section {
              background-color: #ffffff;
              border-radius: 16px;
              padding: 40px 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
              margin-bottom: 40px;
            }
            .guide-title {
              font-size: 1.5rem;
              color: #1e293b;
              margin-bottom: 10px;
              font-weight: bold;
            }
            .guide-desc {
              color: #64748b;
              font-size: 1rem;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            .steps-container {
              display: flex;
              flex-direction: column;
              gap: 24px;
              margin-bottom: 40px;
            }
            .step-row {
              display: flex;
              gap: 20px;
            }
            .step-icon-wrapper {
              flex-shrink: 0;
              width: 48px;
              height: 48px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .step-icon-svg {
              width: 24px;
              height: 24px;
            }
            .step-title {
              font-size: 1.1rem;
              color: #0f172a;
              margin: 0 0 8px 0;
            }
            .step-desc {
              color: #475569;
              font-size: 0.95rem;
              margin: 0;
              line-height: 1.6;
            }
            .roadmap-section {
              background-color: #f0fdf4;
              border-radius: 12px;
              padding: 30px 20px;
              border: 1px solid #bbf7d0;
            }
            .roadmap-title {
              text-align: center;
              color: #064e3b;
              font-size: 1.2rem;
              margin-bottom: 30px;
              font-weight: bold;
            }

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
            .roadmap-icon-svg {
              width: 28px;
              height: 28px;
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
              .instruction-content {
                padding: 16px;
              }
              .guide-section {
                padding: 24px 20px;
                margin-bottom: 24px;
              }
              .guide-title {
                font-size: 1.2rem;
                margin-bottom: 8px;
              }
              .guide-desc {
                font-size: 0.85rem;
                margin-bottom: 20px;
                line-height: 1.5;
              }
              .steps-container {
                gap: 16px;
                margin-bottom: 24px;
              }
              .step-row {
                gap: 12px;
              }
              .step-icon-wrapper {
                width: 36px;
                height: 36px;
              }
              .step-icon-svg {
                width: 18px;
                height: 18px;
              }
              .step-title {
                font-size: 0.95rem;
                margin: 0 0 4px 0;
              }
              .step-desc {
                font-size: 0.8rem;
                line-height: 1.4;
              }
              .roadmap-section {
                padding: 16px 12px;
              }
              .roadmap-title {
                font-size: 1rem;
                margin-bottom: 16px;
              }
              
              .roadmap-container {
                flex-direction: column;
                align-items: flex-start;
                padding-left: 10px;
                gap: 0;
              }
              .roadmap-step {
                flex-direction: row;
                width: 100%;
                text-align: left;
                gap: 12px;
              }
              .roadmap-step-icon {
                width: 42px;
                height: 42px;
              }
              .roadmap-icon-svg {
                width: 20px;
                height: 20px;
              }
              .roadmap-step-text {
                align-items: flex-start;
                margin-top: 0;
              }
              .roadmap-step-label {
                font-size: 0.85rem;
              }
              .roadmap-arrow {
                flex-direction: column;
                height: 30px;
                width: 2px;
                margin: 4px 0 4px 20px; /* Center align with 42px icon */
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
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-top: 6px solid #86efac;
                border-bottom: none;
                margin-left: -3px;
                margin-top: -2px;
              }
            }
          `}</style>

          {/* SECTION: ONLINE PAYMENT */}
          <div className="guide-section">
            <h2 className="guide-title">Detailed Guide: Online Payment</h2>
            <p className="guide-desc">
              Follow these instructions if you prefer to process your payment online and download your digital document.
            </p>

            <div className="steps-container">
              
              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#eff6ff', border: '2px solid #3b82f6' }}>
                  <FileText className="step-icon-svg" color="#3b82f6" />
                </div>
                <div>
                  <h3 className="step-title">Step 1: Request a Document</h3>
                  <p className="step-desc">
                    Navigate to <strong>Request documents</strong> in the sidebar. Select the specific type of document you need, fill out the application form, and submit it.
                  </p>
                </div>
              </div>

              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#fef3c7', border: '2px solid #d97706' }}>
                  <Clock className="step-icon-svg" color="#d97706" />
                </div>
                <div>
                  <h3 className="step-title">Step 2: Wait for Verification</h3>
                  <p className="step-desc">
                    Your request goes to the <strong>Approval request</strong> section. Please wait while the barangay officials verify your application against our records.
                  </p>
                </div>
              </div>

              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#f3e8ff', border: '2px solid #9333ea' }}>
                  <CreditCard className="step-icon-svg" color="#9333ea" />
                </div>
                <div>
                  <h3 className="step-title">Step 3: Process Online Payment</h3>
                  <p className="step-desc">
                    Once approved, your request moves to the <strong>Online Payment</strong> tab. Upload a screenshot of your payment receipt as proof of payment. Our staff will verify the transaction.
                  </p>
                </div>
              </div>

              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#f0fdf4', border: '2px solid #16a34a' }}>
                  <Download className="step-icon-svg" color="#16a34a" />
                </div>
                <div>
                  <h3 className="step-title">Step 4: Download Document</h3>
                  <p className="step-desc">
                    After your payment is verified, your document will be placed in the <strong>Completed</strong> section. You can now download and print the official copy.
                  </p>
                </div>
              </div>

            </div>

            {/* Online Payment Roadmap */}
            <div className="roadmap-section">
              <h3 className="roadmap-title">Visual Roadmap</h3>
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
          <div className="guide-section">
            <h2 className="guide-title">Detailed Guide: Barangay Pick Up</h2>
            <p className="guide-desc">
              Follow these instructions if you prefer to physically pick up your document at the Barangay Hall.
            </p>

            <div className="steps-container">
              
              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#eff6ff', border: '2px solid #3b82f6' }}>
                  <FileText className="step-icon-svg" color="#3b82f6" />
                </div>
                <div>
                  <h3 className="step-title">Step 1: Request a Document</h3>
                  <p className="step-desc">
                    Navigate to <strong>Request documents</strong> in the sidebar. Select your document type, fill out the required application form, and submit it.
                  </p>
                </div>
              </div>

              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#fef3c7', border: '2px solid #d97706' }}>
                  <Clock className="step-icon-svg" color="#d97706" />
                </div>
                <div>
                  <h3 className="step-title">Step 2: Wait for Verification</h3>
                  <p className="step-desc">
                    Your request goes to the <strong>Approval request</strong> section. Please wait patiently while the barangay officials review and verify your application.
                  </p>
                </div>
              </div>

              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#fce7f3', border: '2px solid #db2777' }}>
                  <Ticket className="step-icon-svg" color="#db2777" />
                </div>
                <div>
                  <h3 className="step-title">Step 3: Receive Reference Number</h3>
                  <p className="step-desc">
                    Once your application is approved and ready, you will be issued a reference or tracking number indicating that your physical document has been prepared.
                  </p>
                </div>
              </div>

              <div className="step-row">
                <div className="step-icon-wrapper" style={{ backgroundColor: '#f0fdf4', border: '2px solid #16a34a' }}>
                  <Building2 className="step-icon-svg" color="#16a34a" />
                </div>
                <div>
                  <h3 className="step-title">Step 4: Pick Up at Barangay Hall</h3>
                  <p className="step-desc">
                    Visit the Barangay Hall and present your reference number to the staff. If there are any associated fees, you can settle them in person before claiming your document.
                  </p>
                </div>
              </div>

            </div>

            {/* Barangay Pick Up Roadmap */}
            <div className="roadmap-section">
              <h3 className="roadmap-title">Visual Roadmap</h3>
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
