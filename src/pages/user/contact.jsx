import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Swal from 'sweetalert2';
import Logo from '../../assets/logo/barangay buluan seal.png';
import { db } from '../../database/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

const FacebookIcon = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);
import ContactFooter from '../../components/ContactFooter';
import { useSettings } from '../../context/SettingsContext';
import BannerImg from '../../assets/image/banner 2.png';
import '../../lib/contact.css';
import '../../lib/form.css';

export default function Contact() {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (errors[e.target.id]) {
      setErrors({ ...errors, [e.target.id]: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.name) newErrors.name = true;
    if (!formData.email) newErrors.email = true;
    if (!formData.subject) newErrors.subject = true;
    if (!formData.message) newErrors.message = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fill out all fields before sending.',
        showConfirmButton: false,
        timer: 3000
      });
      return;
    }

    try {
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: 'Sending...',
        text: 'Please wait while we send your message.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const messageDocRef = await addDoc(collection(db, 'inbox_messages'), {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        status: 'New',
        adminNotes: '',
        createdAt: serverTimestamp()
      });

      // Add notification for the admin
      if (settings?.notificationSettings?.admin_new_message !== false) {
        await addDoc(collection(db, 'notifications'), {
          type: 'NEW_MESSAGE',
          residentName: formData.name,
          documentType: formData.subject,
          messageId: messageDocRef.id,
          timestamp: serverTimestamp()
        });
      }

      // Send email via EmailJS (wrapped in separate try-catch to not block success if EmailJS fails)
      try {
        await emailjs.send(
          'service_n5mewts', // Replace with your EmailJS Service ID
          'template_h9ag68p', // Replace with your EmailJS Template ID
          {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
          },
          'fy21VopOUVrxljrdC' // Replace with your EmailJS Public Key
        );
      } catch (emailError) {
        console.error("EmailJS failed to send email: ", emailError);
        // We do not throw the error here so the user still gets a success message
        // since the database save was successful.
      }

      setErrors({});
      setFormData({ name: '', email: '', subject: '', message: '' });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Message Sent!',
        text: 'Thank you! Your message has been sent successfully.',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error) {
      console.error("Error sending message: ", error);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Error',
        text: 'Failed to send message. Please try again later.',
        showConfirmButton: false,
        timer: 3000
      });
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="contact-page-container">
      <Navbar />
      {/* Hero Section */}
      <section className="contact-hero-section">
        <div className="contact-hero-content">
          <h1 className="contact-hero-title">Contact Us</h1>
          <p className="contact-hero-subtitle">
            We're here to help! Reach out to us for any inquiries or assistance regarding document requests and other barangay services.
          </p>
          <div className="contact-hero-location">
            <MapPin className="location-icon" size={20} />
            <span>Barangay Buluan, Ipil, Zamboanga Sibugay</span>
          </div>
        </div>
        <div className="contact-hero-image-container">
          <img src={BannerImg} alt="Barangay Hall" className="contact-hero-image" />
        </div>
      </section>

      {/* Main Content */}
      <div className="contact-main-wrapper">
        <div className="contact-grid">

          {/* Left Column - Contact Information */}
          <div className="contact-info-card">
            <h2 className="contact-card-title">Contact Information</h2>

            <div className="info-list">
              <div className="info-item">
                <div className="info-icon-wrapper">
                  <MapPin size={24} />
                </div>
                <div className="info-text">
                  <h3>Address</h3>
                  <p>{settings?.address || 'Purok 3, Barangay Buluan, Ipil, Zamboanga Sibugay'}</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <Phone size={24} />
                </div>
                <div className="info-text">
                  <h3>Contact Number</h3>
                  <p>{settings?.contactNumber || '0912 345 6789'}</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <Mail size={24} />
                </div>
                <div className="info-text">
                  <h3>Email Address</h3>
                  <p>{settings?.emailAddress || 'barangaybuluan@gmail.com'}</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <Clock size={24} />
                </div>
                <div className="info-text">
                  <h3>Office Hours</h3>
                  <p>{settings?.officeHours || 'Monday - Friday 8:00 AM - 5:00 PM'}</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <FacebookIcon size={24} />
                </div>
                <div className="info-text">
                  <h3>Facebook Page</h3>
                  <p>Barangay Buluan Official Page</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Send Message Form */}
          <div className="contact-form-card">
            <h2 className="contact-card-title">Send Us a Message</h2>

            <form className="message-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Your Name</label>
                  <input type="text" id="name" placeholder="Enter your full name" className={`form-input ${errors.name ? 'error-border' : ''}`} value={formData.name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" placeholder="Enter your email address" className={`form-input ${errors.email ? 'error-border' : ''}`} value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input type="text" id="subject" placeholder="Enter the subject" className={`form-input ${errors.subject ? 'error-border' : ''}`} value={formData.subject} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" rows="6" placeholder="Type your message here..." className={`form-textarea ${errors.message ? 'error-border' : ''}`} value={formData.message} onChange={handleChange}></textarea>
              </div>

              <button type="submit" className="send-message-btn">
                <Send size={18} />
                <span>Send Message</span>
              </button>
              
              <p className="email-reminder-note" style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6a7491', lineHeight: '1.4' }}>
                <strong>Note:</strong> Please put your active email address and wait for our email message reply in your inbox.
              </p>
            </form>
          </div>

        </div>
      </div>

      <ContactFooter />

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <img src={Logo} alt="Logo" className="footer-icon" />
          <span className="footer-logo">BDRS</span>
          <span className="footer-text">© 2026 All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
