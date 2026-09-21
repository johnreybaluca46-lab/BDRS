import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  LayoutDashboard, FileText, Users, UserPlus, BarChart2, CheckCircle, UserCircle, LogOut, Settings, Trash2, Mail, Search, CheckSquare, Reply, Phone, Calendar, User, Save, CheckCheck, Send
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

import '../../lib/admin-layout.css';
import '../../lib/inbox.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';

export default function Inbox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 10;

  useEffect(() => {
    document.title = "Admin | Inbox";
    const q = query(collection(db, 'inbox_messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location.state?.selectedMessageId) {
      setSelectedMessageId(location.state.selectedMessageId);
      // Clear the state so it doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      const matchesSearch = msg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.subject?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || msg.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [messages, searchQuery, statusFilter]);

  // Reset to page 1 if filtering changes the total items significantly
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / messagesPerPage));
  const indexOfLastMessage = currentPage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
  const currentMessages = filteredMessages.slice(indexOfFirstMessage, indexOfLastMessage);

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

  useEffect(() => {
    if (selectedMessage) {
      setReplyInput(''); // Reset reply input when selecting a new message
      setShowReplyForm(false);
    } else {
      setReplyInput('');
      setShowReplyForm(false);
    }
  }, [selectedMessageId, messages]);

  const handleLogout = () => {
    Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout of the admin dashboard?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Logout'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await signOut(auth);
          navigate('/login', { state: { loggedOut: true } });
        } catch (error) {
          console.error('Failed to log out', error);
        }
      }
    });
  };

  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'inbox_messages', id), { status: 'Read' });
      Swal.fire({ title: 'Marked as Read', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Could not update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: 'Delete Message?',
      text: "This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, delete it'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'inbox_messages', id));
          if (selectedMessageId === id) setSelectedMessageId(null);
          Swal.fire({ title: 'Deleted!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (error) {
          console.error(error);
          Swal.fire('Error', 'Could not delete message', 'error');
        }
      }
    });
  };


  const handleSendReply = async () => {
    if (!selectedMessage) return;
    if (!replyInput.trim()) {
      Swal.fire('Error', 'Please enter a reply message.', 'error');
      return;
    }

    setIsSending(true);
    try {
      // Send email via EmailJS
      await emailjs.send(
        'service_n5mewts', // Your EmailJS Service ID
        'template_v0vapvr', // Replace with your EmailJS Template ID for Replies
        {
          to_name: selectedMessage.name,
          to_email: selectedMessage.email,
          reply_message: replyInput,
          subject: `Re: ${selectedMessage.subject}`
        },
        'fy21VopOUVrxljrdC' // Your EmailJS Public Key
      );

      // Update Firestore document status to Replied
      await updateDoc(doc(db, 'inbox_messages', selectedMessageId), {
        status: 'Replied',
        repliedAt: serverTimestamp(),
        replyText: replyInput
      });

      Swal.fire({ title: 'Sent!', text: 'Reply has been sent to the client.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      setReplyInput('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error sending reply: ', error);
      Swal.fire('Error', 'Failed to send reply. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };


  const handleMarkAllAsRead = async () => {
    const unreadMessages = messages.filter(m => m.status === 'New');
    if (unreadMessages.length === 0) {
      Swal.fire({ title: 'All Caught Up!', text: 'There are no new messages.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }

    try {
      const batch = writeBatch(db);
      unreadMessages.forEach(msg => {
        batch.update(doc(db, 'inbox_messages', msg.id), { status: 'Read' });
      });
      await batch.commit();
      Swal.fire({ title: 'All marked as read', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Could not update messages', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (messages.length === 0) return;

    Swal.fire({
      title: 'Delete ALL Messages?',
      text: "This will permanently delete ALL messages in your inbox. This cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, delete EVERYTHING'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const batch = writeBatch(db);
          messages.forEach(msg => {
            batch.delete(doc(db, 'inbox_messages', msg.id));
          });
          await batch.commit();
          setSelectedMessageId(null);
          Swal.fire('Deleted!', 'All messages have been deleted.', 'success');
        } catch (error) {
          console.error(error);
          Swal.fire('Error', 'Could not delete all messages', 'error');
        }
      }
    });
  };

  const getStatusPillClass = (status) => {
    switch (status) {
      case 'New': return 'pill-new';
      case 'Read': return 'pill-read';
      case 'Replied': return 'pill-replied';
      default: return '';
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAvatarColors = (name) => {
    const colors = [
      { bg: '#ebf8ff', text: '#3182ce' },
      { bg: '#f0fff4', text: '#38a169' },
      { bg: '#fffaf0', text: '#dd6b20' },
      { bg: '#faf5ff', text: '#805ad5' },
      { bg: '#fff5f5', text: '#e53e3e' },
      { bg: '#e6fffa', text: '#319795' },
    ];
    const idx = name ? name.length % colors.length : 0;
    return colors[idx];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return { date: '', time: '' };
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1>Inbox</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-content">
          <div className="inbox-wrapper">

            {/* Left Panel: Message List */}
            <div className="inbox-list-panel">
              <div className="inbox-list-header">
                <div className="inbox-list-title-container">
                  <h2 className="inbox-list-title">Messages</h2>
                  <span className="inbox-count-badge">{messages.length}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={handleMarkAllAsRead}
                    title="Mark all as read"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3182ce', padding: '5px' }}
                  >
                    <CheckCheck size={18} />
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    title="Delete all messages"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: '5px' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="inbox-search-container">
                <div className="inbox-search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Search messages..."
                    className="inbox-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search size={16} className="inbox-search-icon" />
                </div>
                <select
                  className="inbox-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All Status">All Status</option>
                  <option value="New">New</option>
                  <option value="Read">Read</option>
                  <option value="Replied">Replied</option>
                </select>
              </div>

              <div className="inbox-messages">
                {currentMessages.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>
                    No messages found.
                  </div>
                ) : (
                  currentMessages.map(msg => {
                    const avatar = getAvatarColors(msg.name);
                    const { date, time } = formatDate(msg.createdAt);
                    return (
                      <div
                        key={msg.id}
                        className={`inbox-item ${selectedMessageId === msg.id ? 'active' : ''}`}
                        onClick={() => setSelectedMessageId(msg.id)}
                      >
                        <div className="inbox-avatar" style={{ backgroundColor: avatar.bg, color: avatar.text }}>
                          {getInitials(msg.name)}
                        </div>
                        <div className="inbox-item-content">
                          <div className="inbox-item-header">
                            <h4 className="inbox-item-name">{msg.name}</h4>
                            <div className="inbox-item-date">
                              <div>{date}</div>
                              <div>{time}</div>
                            </div>
                          </div>
                          <p className="inbox-item-email" style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '4px', marginTop: '-4px' }}>{msg.email}</p>
                          <p className="inbox-item-subject">{msg.subject}</p>
                          <div className="inbox-item-snippet-container">
                            <p className="inbox-item-snippet">{msg.message}</p>
                            <span className={`inbox-status-pill ${getStatusPillClass(msg.status)}`}>{msg.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {filteredMessages.length > 0 && (
                <div className="inbox-pagination">
                  <span>Showing {indexOfFirstMessage + 1} to {Math.min(indexOfLastMessage, filteredMessages.length)} of {filteredMessages.length} entries</span>
                  <div className="pagination-controls">
                    <button
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >&lt;</button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >&gt;</button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Message Details */}
            {selectedMessage ? (
              <div className="inbox-details-panel">
                <div className="inbox-details-header">
                  <div className="inbox-details-title-group">
                    <h2 className="inbox-details-title">{selectedMessage.subject}</h2>
                    <span className={`inbox-status-pill ${getStatusPillClass(selectedMessage.status)}`}>{selectedMessage.status}</span>
                  </div>
                  <div className="inbox-details-actions">
                    <button className="inbox-action-btn mark-read" onClick={() => handleMarkAsRead(selectedMessage.id)}>
                      <CheckSquare size={16} /> Mark as Read
                    </button>
                    <button className={`inbox-action-btn ${showReplyForm ? 'active' : ''}`} onClick={() => setShowReplyForm(!showReplyForm)}>
                      <Reply size={16} /> {showReplyForm ? 'Cancel Reply' : 'Reply'}
                    </button>
                    <button className="inbox-action-btn delete" onClick={() => handleDelete(selectedMessage.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>

                <div className="inbox-details-content">
                  <div className="inbox-sender-meta">
                    <div className="inbox-meta-item">
                      <User size={16} className="inbox-meta-icon" />
                      <span>{selectedMessage.name}</span>
                    </div>
                    <div className="inbox-meta-item">
                      <Mail size={16} className="inbox-meta-icon" />
                      <a href={`mailto:${selectedMessage.email}`} style={{ color: '#3182ce', textDecoration: 'none' }}>
                        {selectedMessage.email}
                      </a>
                    </div>
                    {selectedMessage.phone && (
                      <div className="inbox-meta-item">
                        <Phone size={16} className="inbox-meta-icon" />
                        <span>{selectedMessage.phone}</span>
                      </div>
                    )}
                    <div className="inbox-meta-item">
                      <Calendar size={16} className="inbox-meta-icon" />
                      <span>{formatDate(selectedMessage.createdAt).date} {formatDate(selectedMessage.createdAt).time}</span>
                    </div>
                  </div>

                  <div className="inbox-message-body-section">
                    <div className="inbox-message-label">Message</div>
                    <div className="inbox-message-text">
                      {selectedMessage.message}
                    </div>
                  </div>


                    {showReplyForm && (
                      <div className="inbox-reply-container" style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                        <div className="inbox-form-group">
                          <label className="inbox-form-label" style={{ color: '#38a169', fontWeight: '600' }}>Reply to Client</label>
                          <textarea
                            className="inbox-textarea"
                            placeholder="Type your message to the client here..."
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            rows="4"
                            autoFocus
                          ></textarea>
                        </div>

                        <button
                          className="inbox-save-btn"
                          onClick={handleSendReply}
                          disabled={isSending}
                          style={{ backgroundColor: isSending ? '#a0aec0' : '#38a169', cursor: isSending ? 'not-allowed' : 'pointer' }}
                        >
                          <Send size={16} /> {isSending ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="inbox-details-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                <div style={{ textAlign: 'center' }}>
                  <Mail size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
                  <h3>Select a message</h3>
                  <p>Choose a message from the list to view its details.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
