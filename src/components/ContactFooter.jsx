import React from 'react';
import { Headset, Phone, MapPin, Clock } from 'lucide-react';
import './lib/ContactFooter.css';
import { useSettings } from '../context/SettingsContext';

export default function ContactFooter() {
  const { settings } = useSettings();
  return (
    <div id="contact-footer" className="contact-footer-container">
      <div className="contact-footer-item">
        <Headset className="contact-footer-icon" size={28} style={{color: '#3182ce', strokeWidth: 2}} />
        <div className="contact-footer-text">
          <div className="contact-footer-title">Need Help?</div>
          <div className="contact-footer-desc">For any questions, you may contact the Barangay Hall during office hours.</div>
        </div>
      </div>
      
      <div className="contact-footer-item" style={{ alignItems: 'center' }}>
        <Phone className="contact-footer-icon" size={20} style={{color: '#3182ce'}} />
        <div className="contact-footer-text">
          <div className="contact-footer-title" style={{ fontWeight: '500' }}>{settings?.contactNumber || '09679330142'}</div>
        </div>
      </div>

      <div className="contact-footer-item">
        <MapPin className="contact-footer-icon" size={20} style={{color: '#3182ce'}} />
        <div className="contact-footer-text">
          <div className="contact-footer-title">{settings?.address || 'Barangay Buluan, Ipil, Zamboanga Sibugay'}</div>
        </div>
      </div>

      <div className="contact-footer-item">
        <Clock className="contact-footer-icon" size={20} style={{color: '#3182ce'}} />
        <div className="contact-footer-text">
          <div className="contact-footer-title">Office Hours</div>
          <div className="contact-footer-desc">{settings?.officeHours || 'Monday - Friday 8:00 AM - 5:00 PM'}</div>
        </div>
      </div>
    </div>
  );
}
