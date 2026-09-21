import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  LayoutDashboard, 
  FileText, 
  Users,
  UserPlus, 
  BarChart2, 
  CheckCircle, 
  UserCircle, 
  LogOut, 
  Settings,
  Bell,
  Trash2,
  Mail
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';
import { useMaintenance } from '../../context/MaintenanceContext';
import { AlertTriangle } from 'lucide-react';

const recentRequests = [
  { id: 1, name: 'Juan Dela Cruz', type: 'Barangay Clearance', status: 'Pending' },
  { id: 2, name: 'Maria Santos', type: 'Certificate of Residency', status: 'Pending' },
  { id: 3, name: 'Pedro Reyes', type: 'Business Permit', status: 'Pending' },
  { id: 4, name: 'Ana Lopez', type: 'Certificate of Indigency', status: 'Pending' },
];

export default function Dashboard() {
  useEffect(() => {
    document.title = "Admin | Dashboard";
  }, []);

  const [recentRequests, setRecentRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, trash: 0, expired: 0, earned: 0 });
  const [resStats, setResStats] = useState({ registered: 0, active: 0, pending: 0, rejected: 0 });
  const [chartData, setChartData] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { isMaintenanceActive } = useMaintenance();

  useEffect(() => {
    // Fetch Recent 4 Requests
    const qRecent = query(collection(db, 'requests'), orderBy('timestamp', 'desc'), limit(4));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      const reqs = [];
      snapshot.forEach(doc => {
        reqs.push({ id: doc.id, ...doc.data() });
      });
      setRecentRequests(reqs);
    });

    // Fetch Stats
    const unsubStats = onSnapshot(collection(db, 'requests'), (snapshot) => {
      let total = snapshot.size;
      let pending = 0;
      let completed = 0;
      let trash = 0;
      let expired = 0;
      let earned = 0;
      
      const now = new Date();
      const monthCounts = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const rawStatus = data.status || 'Pending';
        const isExpired = data.expired || (rawStatus === 'Approved' && data.expiresAt && data.expiresAt.toDate && data.expiresAt.toDate() < now);

        let isCompleted = false;
        let isTrash = false;

        if (isExpired) {
          expired++;
        }

        if (rawStatus === 'Pending' || rawStatus === 'Processing' || rawStatus === 'Processing Payment' || rawStatus === 'Approved') pending++;
        else if (rawStatus === 'Completed') { 
          completed++; 
          isCompleted = true; 
          earned += parseFloat(data.totalFee || 0) || 0;
        }
        else if (rawStatus === 'Trash' || rawStatus === 'Rejected') { trash++; isTrash = true; }
        
        if (data.timestamp) {
           const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp.seconds * 1000);
           const month = date.toLocaleString('default', { month: 'short' });
           if (!monthCounts[month]) {
             monthCounts[month] = { total: 0, completed: 0, trash: 0, pending: 0, expired: 0, earned: 0 };
           }
           monthCounts[month].total += 1;
           if (isCompleted) {
             monthCounts[month].completed += 1;
             monthCounts[month].earned += parseFloat(data.totalFee || 0) || 0;
           }
           if (isTrash) monthCounts[month].trash += 1;
           if (rawStatus === 'Pending') monthCounts[month].pending += 1;
           if (isExpired) monthCounts[month].expired += 1;
        }
      });
      setStats({ total, pending, completed, trash, expired, earned });
      
      const last6Months = [];
      const d = new Date();
      d.setMonth(d.getMonth() - 5);
      for(let i=0; i<6; i++) {
         const m = d.toLocaleString('default', { month: 'short' });
         last6Months.push({ 
           name: m, 
           requests: monthCounts[m] ? monthCounts[m].total : 0,
           completed: monthCounts[m] ? monthCounts[m].completed : 0,
           trash: monthCounts[m] ? monthCounts[m].trash : 0,
           pending: monthCounts[m] ? monthCounts[m].pending : 0,
           expired: monthCounts[m] ? monthCounts[m].expired : 0,
           earned: monthCounts[m] ? monthCounts[m].earned : 0
         });
         d.setMonth(d.getMonth() + 1);
      }
      setChartData(last6Months);
    });

    const unsubResStats = onSnapshot(collection(db, 'residents'), (snapshot) => {
      let activeCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.login_status === 'Active' && data.last_seen) {
          const lastSeenTime = data.last_seen.toMillis ? data.last_seen.toMillis() : (data.last_seen.seconds * 1000);
          if (Date.now() - lastSeenTime < 300000) { // 5 minutes timeout
            activeCount++;
          }
        }
      });
      setResStats({ registered: snapshot.size, active: activeCount, pending: 0, rejected: 0 });
    });

    return () => {
      unsubRecent();
      unsubStats();
      unsubResStats();
    };
  }, []);

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

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'completed': return 'status-completed';
      case 'rejected': return 'status-rejected';
      case 'trash': return 'status-rejected';
      default: return '';
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Custom Logout Confirmation Modal removed in favor of SweetAlert2 */}

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1>Dashboard</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-content">
          
          {isMaintenanceActive && (
            <div style={{ backgroundColor: '#fff5f5', borderLeft: '4px solid #f56565', padding: '16px', borderRadius: '4px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle color="#c53030" size={24} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#9b2c2c' }}>Maintenance Mode is Active</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#c53030' }}>The public portal is currently disabled. Only authorized administrators can access the system.</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card card-blue">
              <span className="summary-card-title">Total Request</span>
              <span className="summary-card-value">{stats.total}</span>
              <Link to="/admin/document-requests" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-orange">
              <span className="summary-card-title">Pending Request</span>
              <span className="summary-card-value">{stats.pending}</span>
              <Link to="/admin/document-requests" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-green">
              <span className="summary-card-title">Total Completed</span>
              <span className="summary-card-value">{stats.completed}</span>
              <Link to="/admin/completed" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-red">
              <span className="summary-card-title">Trash Request</span>
              <span className="summary-card-value">{stats.trash}</span>
              <Link to="/admin/trash" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-purple">
              <span className="summary-card-title">Expired Request</span>
              <span className="summary-card-value">{stats.expired}</span>
              <Link to="/admin/trash" className="summary-card-link" style={{ color: '#805ad5' }}>View all</Link>
            </div>
            <div className="summary-card card-blue">
              <span className="summary-card-title">Resident Registered</span>
              <span className="summary-card-value">{resStats.registered}</span>
              <Link to="/admin/residents" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-green">
              <span className="summary-card-title">Active Users</span>
              <span className="summary-card-value">{resStats.active}/{resStats.registered}</span>
              <Link to="/admin/residents" className="summary-card-link" style={{ color: '#2f855a' }}>View all</Link>
            </div>
            <div className="summary-card card-yellow" style={{ backgroundColor: '#fffff0', border: '1px solid #fefcbf' }}>
              <span className="summary-card-title" style={{ color: '#b7791f' }}>Total Earned</span>
              <span className="summary-card-value" style={{ color: '#975a16' }}>₱{stats.earned.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              <Link to="/admin/completed" className="summary-card-link" style={{ color: '#d69e2e' }}>View details</Link>
            </div>

          </div>

          {/* Bottom Section */}
          <div className="dashboard-bottom-grid">
            
            {/* Chart Panel */}
            <div className="dashboard-panel">
              <h2 className="panel-title">Request Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#4a5568' }} />
                    <Line type="monotone" name="Total Requests" dataKey="requests" stroke="#3182ce" strokeWidth={3} dot={{r: 4, fill: '#3182ce', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                    <Line type="monotone" name="Pending Requests" dataKey="pending" stroke="#ed8936" strokeWidth={3} dot={{r: 4, fill: '#ed8936', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Requests */}
            <div className="dashboard-panel">
              <h2 className="panel-title">Recent Requests</h2>
              <div className="requests-list">
                {recentRequests.length > 0 ? (
                  recentRequests.map(request => (
                    <div key={request.id} className="request-item">
                      <div className="request-info">
                        <div className="request-name">{request.fullName || request.name}</div>
                        <div className="request-type">{request.type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '2px' }}>Polling No: {request.id}</div>
                      </div>
                      <div className={`request-status ${getStatusClass(request.status)}`}>
                        {request.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: '#a0aec0', fontStyle: 'italic', fontSize: '0.95rem'}}>
                    No request yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Extra Charts Section */}
          <div className="dashboard-extra-charts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div className="dashboard-panel">
              <h2 className="panel-title">Overall Distribution</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Doc Pending', value: stats.pending },
                        { name: 'Doc Complete', value: stats.completed },
                        { name: 'Doc Trash', value: stats.trash },
                        { name: 'Doc Expire', value: stats.expired },
                        { name: 'Res Registered', value: resStats.registered },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {
                        [
                          { name: 'Doc Pending', value: stats.pending },
                          { name: 'Doc Complete', value: stats.completed },
                          { name: 'Doc Trash', value: stats.trash },
                          { name: 'Doc Expire', value: stats.expired },
                          { name: 'Res Registered', value: resStats.registered },
                        ].filter(d => d.value > 0).map((entry, index) => {
                          const colors = {
                            'Doc Pending': '#ed8936',
                            'Doc Complete': '#10b981',
                            'Doc Trash': '#ef4444',
                            'Doc Expire': '#805ad5',
                            'Res Registered': '#4fd1c5'
                          };
                          return <Cell key={`cell-${index}`} fill={colors[entry.name]} />;
                        })
                      }
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#4a5568' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="dashboard-panel">
              <h2 className="panel-title">Completed Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" name="Completed" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="dashboard-panel">
              <h2 className="panel-title">Trash Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" name="Trash" dataKey="trash" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-panel">
              <h2 className="panel-title">Expired Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" name="Expired" dataKey="expired" stroke="#805ad5" strokeWidth={3} dot={{r: 4, fill: '#805ad5', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Full-width Earnings Overview */}
          <div style={{ marginTop: '20px' }}>
            <div className="dashboard-panel">
              <h2 className="panel-title">Earnings Overview</h2>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} tickFormatter={(value) => `₱${value}`} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} formatter={(value) => `₱${value.toFixed(2)}`} />
                    <Bar dataKey="earned" name="Revenue" fill="#ecc94b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
