import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ContactFooter from '../../components/ContactFooter';
import { User, MapPin, Users, Home, Target, Eye, Heart, Check, Info, FileText, Shield } from 'lucide-react';
import '../../lib/about.css';
import '../../lib/form.css';
import Logo from '../../assets/logo/barangay buluan seal.png';
import BannerImage from '../../assets/image/banner 2.png';

export default function About() {
  useEffect(() => {
    document.title = "BDRS | About";
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="about-page-container">
      <Navbar />
      
      {/* Hero Section */}
      <section className="about-hero-section">
        <div className="about-hero-content">
          <div className="about-hero-subtitle">ABOUT US</div>
          <h1 className="about-hero-title">About Document Request System</h1>
          <p className="about-hero-text">
            The Barangay Document Request System (BDRS) is a pioneering digital platform designed to modernize local governance for Barangay Buluan. We are committed to delivering efficient, accessible, and transparent public service to our constituents.
          </p>
        </div>
        
        <div className="about-hero-image-container">
          <img src={BannerImage} alt="Barangay Hall" className="about-hero-image" />
        </div>
      </section>

      {/* Mission, Vision & Values Section */}
      <section className="about-mission-section">
        <div className="section-heading-center">
          <h2>Our Mission, Vision & Values</h2>
        </div>
        
        <div className="mission-cards-grid">
          <div className="mission-card">
            <div className="mission-card-icon"><Target size={28} strokeWidth={2.5} /></div>
            <h3>Mission</h3>
            <p>To provide efficient, accessible, and transparent public service that promotes the welfare and development of every constituent through digital transformation.</p>
          </div>
          
          <div className="mission-card">
            <div className="mission-card-icon"><Eye size={28} strokeWidth={2.5} /></div>
            <h3>Vision</h3>
            <p>A united and progressive Barangay Buluan where constituents enjoy quality services, simplified bureaucratic processes, and a better quality of life.</p>
          </div>
          
          <div className="mission-card">
            <div className="mission-card-icon"><Heart size={28} strokeWidth={2.5} /></div>
            <h3>Core Values</h3>
            <ul>
              <li>Integrity</li>
              <li>Transparency</li>
              <li>Accountability</li>
              <li>Respect</li>
              <li>Service Excellence</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="about-commitment-section">
        <div className="commitment-card">
          <div className="commitment-left">
            <h3>Our Commitment</h3>
            <p>
              Through this Document Request System, we aim to simplify the process of requesting official documents. This platform is designed to save your time, reduce hassle, and ensure a smooth transaction between the constituents and the barangay administration.
            </p>
          </div>
          <div className="commitment-right">
            <div className="commitment-item">
              <div className="commitment-check"><Check size={16} strokeWidth={3} /></div>
              Fast and easy document requests
            </div>
            <div className="commitment-item">
              <div className="commitment-check"><Check size={16} strokeWidth={3} /></div>
              Secure and confidential processing
            </div>
            <div className="commitment-item">
              <div className="commitment-check"><Check size={16} strokeWidth={3} /></div>
              Real-time updates on request status
            </div>
            <div className="commitment-item">
              <div className="commitment-check"><Check size={16} strokeWidth={3} /></div>
              Committed to excellent public service
            </div>
          </div>
        </div>
      </section>

      {/* Restored Text Sections */}
      <div className="form-content-wrapper" style={{ maxWidth: '1200px', margin: '0 auto 80px', padding: '0 5%' }}>
        <div className="form-column" style={{ width: '100%' }}>
          
          <div className="form-section">
            <div className="section-title">
              <div className="step-circle"><Info size={16} /></div>
              <h3>About BDRS</h3>
            </div>
            <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>The Barangay Document Request System (BDRS) is a pioneering digital platform conceptualized, designed, and developed specifically to modernize the local governance and public service delivery for the residents of Barangay Buluan. In today’s rapidly evolving digital age, where efficiency and accessibility are paramount, the traditional methods of bureaucratic processing have often proven to be slow, cumbersome, and frustrating for both the citizens and the public servants. Recognizing this urgent need for innovation, our dedicated team embarked on a mission to completely overhaul the system. The result is the BDRS—a comprehensive, robust, and user-centric web application that seamlessly bridges the communication and service gap between the local barangay administration and its constituents.</p>
              <p>Historically, acquiring essential barangay documents required residents to take significant time out of their busy schedules, often losing a day of work or personal time just to visit the barangay hall. This process was fraught with physical inconveniences: enduring long queues, dealing with the unpredictability of office hours, repeatedly filling out manual paper forms, and waiting in crowded waiting areas. Furthermore, the manual tracking of these requests placed a heavy administrative burden on barangay officials, leading to inevitable delays, misplaced paperwork, and inefficiencies. The BDRS was born out of a deep-seated desire to eliminate these hurdles. By transitioning these critical public services into a secure online environment, we have empowered every resident to request vital documents directly from the comfort of their own homes, using their smartphones, tablets, or personal computers, at any time of the day or night.</p>
              <p>The core functionality of the BDRS focuses on the four most highly requested documents in the barangay: the Barangay Clearance, the Certificate of Residency, the Certificate of Indigency, and the Business Permit. Each of these modules has been carefully tailored to gather the precise information required for the respective document. For instance, the Barangay Clearance flow ensures that all personal details and valid IDs are captured securely to verify good moral character. The Certificate of Residency flow focuses on verifying local addresses and length of stay. The Certificate of Indigency module includes specific fields to assess the financial situation of the requesting resident, ensuring that assistance reaches those who genuinely need it. Finally, the Business Permit module is distinctively designed to capture enterprise-specific data, supporting the local economy by making it easier for entrepreneurs to establish and renew their business permits.</p>
              <p>From the resident's perspective, the user experience has been crafted to be as intuitive and frictionless as possible. The interface boasts a clean, modern aesthetic with clear typography and logical step-by-step progressions. Users are guided through a simple three-step process: filling out the form, reviewing their submitted information for accuracy to prevent errors, and finally, receiving a confirmation of their submission. This significantly reduces the cognitive load on the user and ensures that even those who may not be highly tech-savvy can navigate the system with ease and confidence.</p>
              <p>Equally important are the profound administrative benefits the system provides to the barangay officials. The BDRS is not just a front-end portal; it is backed by a powerful, centralized database system that revolutionizes how officials manage data. Instead of sifting through physical logbooks or disorganized filing cabinets, officials can now access a secure dashboard that displays all incoming requests in real-time. They can filter, search, verify, and approve requests with just a few clicks. This automation drastically reduces manual labor, minimizes human error, and allows the barangay staff to redirect their valuable time and resources toward more pressing community initiatives and on-the-ground public service.</p>
              <p>Transparency and accountability are the cornerstones of effective local governance, and the BDRS embodies these principles perfectly. Upon the successful submission of any document request, the system instantly generates a unique tracking identifier known as a "Polling Number." This simple yet effective feature allows residents to hold the administration accountable by providing them with a concrete reference for their request. It eliminates the anxiety of wondering whether a request was received or lost in the shuffle. By bringing this level of transparency to the barangay level, the BDRS fosters a stronger sense of trust and mutual respect between the government and the community.</p>
              <p>In designing the BDRS, security and data privacy were treated with the utmost importance. We understand that residents are entrusting the barangay with highly sensitive personal and financial information, as well as copies of their valid identification cards. Therefore, the platform implements modern security protocols to ensure that all data transmitted is encrypted and securely stored. Access to the administrative dashboard is strictly regulated and limited only to authorized barangay personnel. The system is fully compliant with national data privacy standards, guaranteeing that citizen data is never misused, mishandled, or exposed to unauthorized entities.</p>
              <p>Beyond efficiency and security, the implementation of the BDRS also represents a significant step forward in environmental sustainability. The traditional document request process was heavily reliant on paper—from the application forms to the logbooks and the physical receipts. By digitizing the entire application phase, Barangay Buluan is drastically reducing its paper consumption and carbon footprint. This shift towards a paperless environment not only cuts down on operational costs for the barangay but also aligns our community with global efforts to promote eco-friendly and sustainable administrative practices.</p>
              <p>Looking ahead, the Barangay Document Request System is designed to be scalable and future-proof. While the current iteration focuses on the four primary certificates, the underlying architecture is flexible enough to accommodate additional services in the future. We envision a continuous evolution of the platform, potentially integrating with municipal databases, incorporating online payment gateways for processing fees, and expanding to include features like community announcements, incident reporting, and digital barangay IDs. The BDRS is not merely a static software solution; it is a dynamic, living ecosystem that will grow and adapt to the changing needs of Barangay Buluan.</p>
              <p>In conclusion, the Barangay Document Request System is much more than a technological upgrade; it is a fundamental transformation in how public service is delivered. It symbolizes a forward-thinking administration that values the time, convenience, and dignity of its residents. By embracing digital innovation, eliminating bureaucratic red tape, prioritizing data security, and championing environmental sustainability, Barangay Buluan is setting a new standard for local governance. We are immensely proud of this platform and remain steadfast in our commitment to utilizing technology as a force for good, ensuring that essential public services are always accessible, equitable, and just a click away for every single resident.</p>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">
              <div className="step-circle"><FileText size={16} /></div>
              <h3>Terms and Conditions</h3>
            </div>
            <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p>By using the BDRS platform, you agree to the following terms:</p>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong>Accuracy of Information:</strong> You certify that all personal information, business details, and uploaded IDs provided in your resident registration and document requests are true, correct, and accurate to the best of your knowledge.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Fraudulent Submissions:</strong> Any falsification of documents, identities, or information during registration or requesting may result in the rejection of your application and potential legal action.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Processing & Collection:</strong> A polling number will be provided upon successful submission of document requests. Documents must be collected in person at the Barangay Hall by presenting the polling number and the original copies of uploaded Valid IDs.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Payment:</strong> Any applicable fees for the requested documents must be paid in full at the Barangay Hall during collection.</li>
              </ul>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title">
              <div className="step-circle"><Shield size={16} /></div>
              <h3>Privacy Policy</h3>
            </div>
            <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p>Your privacy is important to us. This policy outlines how we handle your data in accordance with the Data Privacy Act of 2012.</p>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong>Data Collection:</strong> We collect personal information (name, address, date of birth, contact number, etc.) and uploaded IDs solely for the purpose of processing your resident registration and verifying your document requests.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Data Usage:</strong> The information collected is used exclusively by authorized barangay officials for the approval of resident accounts and the issuance of requested certificates and clearances.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Data Protection:</strong> We implement strict security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Data Retention:</strong> Your data will be kept securely as long as you are an active registered resident, or as necessary for the fulfillment of document requests and required barangay record-keeping.</li>
              </ul>
            </div>
          </div>
          
        </div>
      </div>

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
