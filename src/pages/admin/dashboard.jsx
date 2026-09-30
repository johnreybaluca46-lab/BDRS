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
  Mail,
  AlertTriangle,
  Clock,
  CalendarX,
  User,
  Coins,
  TrendingUp,
  Minus,
  ArrowRight
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
import CalendarCard from '../../components/CalendarCard';

const recentRequests = [
  { id: 1, name: 'Juan Dela Cruz', type: 'Barangay Clearance', status: 'Pending' },
  { id: 2, name: 'Maria Santos', type: 'Certificate of Residency', status: 'Pending' },
  { id: 3, name: 'Pedro Reyes', type: 'Business Permit', status: 'Pending' },
  { id: 4, name: 'Ana Lopez', type: 'Certificate of Indigency', status: 'Pending' },
];
const formatCurrencyAbbreviated = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
};
const StatCard = ({ title, value, icon: Icon, colorTheme, trend, trendValue, trendText, linkText, linkTo, valuePrefix = '' }) => {
  return (
    <div className={`summary-card new-card-${colorTheme}`}>
      <div className="summary-card-header">
        <div className="summary-card-icon-wrapper">
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <span className="summary-card-title">{title}</span>
      </div>
      <div className="summary-card-body">
        <div className="summary-card-value-wrapper">
          <span className="summary-card-value">{valuePrefix}{value}</span>
        </div>
      </div>
      <Link to={linkTo} className="summary-card-link-btn">
        {linkText} <ArrowRight size={14} />
      </Link>
      <div className="summary-card-bg-icon">
        <Icon size={120} strokeWidth={1.5} />
      </div>
    </div>
  );
};

export default function Dashboard() {
  useEffect(() => {
    document.title = "Admin | Dashboard";
  }, []);

  const cachedAdminRecent = JSON.parse(sessionStorage.getItem('adminDashboardRecent')) || [];
  const cachedAdminStats = JSON.parse(sessionStorage.getItem('adminDashboardStats')) || { total: 0, pending: 0, completed: 0, trash: 0, expired: 0, earned: 0 };
  const cachedResStats = JSON.parse(sessionStorage.getItem('adminDashboardResStats')) || { registered: 0, active: 0, pending: 0, rejected: 0 };
  const cachedAdminChart = JSON.parse(sessionStorage.getItem('adminDashboardChart')) || [];

  const [recentRequests, setRecentRequests] = useState(cachedAdminRecent);
  const [stats, setStats] = useState(cachedAdminStats);
  const [resStats, setResStats] = useState(cachedResStats);
  const [chartData, setChartData] = useState(cachedAdminChart);
  const navigate = useNavigate();
  const location = useLocation();
  const { isMaintenanceActive } = useMaintenance();

  useEffect(() => {
    // Fetch Recent 10 Requests
    const qRecent = query(collection(db, 'requests'), orderBy('timestamp', 'desc'), limit(10));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      const reqs = [];
      snapshot.forEach(doc => {
        reqs.push({ id: doc.id, ...doc.data() });
      });
      setRecentRequests(reqs);
      sessionStorage.setItem('adminDashboardRecent', JSON.stringify(reqs));
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
      const newStats = { total, pending, completed, trash, expired, earned };
      setStats(newStats);
      sessionStorage.setItem('adminDashboardStats', JSON.stringify(newStats));
      
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
      sessionStorage.setItem('adminDashboardChart', JSON.stringify(last6Months));
    });

    const unsubResStats = onSnapshot(collection(db, 'residents'), (snapshot) => {
      let activeCount = 0;
      let registeredCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.status === 'Approved') registeredCount++;
        else if (data.status === 'Pending') pendingCount++;
        else if (data.status === 'Rejected') rejectedCount++;

        // Only Approved users can be active anyway, but let's be safe
        if (data.status === 'Approved' && data.login_status === 'Active' && data.last_seen) {
          const lastSeenTime = data.last_seen.toMillis ? data.last_seen.toMillis() : (data.last_seen.seconds * 1000);
          if (Date.now() - lastSeenTime < 300000) { // 5 minutes timeout
            activeCount++;
          }
        }
      });
      const newResStats = { registered: registeredCount, active: activeCount, pending: pendingCount, rejected: rejectedCount };
      setResStats(newResStats);
      sessionStorage.setItem('adminDashboardResStats', JSON.stringify(newResStats));
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
      case 'processing payment': return 'status-processing';
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
            <StatCard 
              title="Total Request" 
              value={stats.total} 
              icon={FileText} 
              colorTheme="blue" 
              trend="up" 
              trendValue="+12%" 
              trendText="vs. last 7 days" 
              linkText="View all" 
              linkTo="/admin/document-requests" 
            />
            <StatCard 
              title="Pending Request" 
              value={stats.pending} 
              icon={Clock} 
              colorTheme="yellow" 
              trend="neutral" 
              trendValue="--" 
              trendText="no change" 
              linkText="View all" 
              linkTo="/admin/document-requests" 
            />
            <StatCard 
              title="Total Completed" 
              value={stats.completed} 
              icon={CheckCircle} 
              colorTheme="green" 
              trend="up" 
              trendValue="+8%" 
              trendText="vs. last 7 days" 
              linkText="View all" 
              linkTo="/admin/completed" 
            />
            <StatCard 
              title="Trash Request" 
              value={stats.trash} 
              icon={Trash2} 
              colorTheme="red" 
              trend="neutral" 
              trendValue="--" 
              trendText="no change" 
              linkText="View all" 
              linkTo="/admin/trash" 
            />
            <StatCard 
              title="Expired Request" 
              value={stats.expired} 
              icon={CalendarX} 
              colorTheme="purple" 
              trend="neutral" 
              trendValue="--" 
              trendText="no change" 
              linkText="View all" 
              linkTo="/admin/trash" 
            />
            <StatCard 
              title="Resident Registered" 
              value={resStats.registered} 
              icon={Users} 
              colorTheme="blue" 
              trend="up" 
              trendValue="+7%" 
              trendText="vs. last 7 days" 
              linkText="View all" 
              linkTo="/admin/residents" 
            />
            <StatCard 
              title="Active Users" 
              value={`${resStats.active}/${resStats.registered}`} 
              icon={User} 
              colorTheme="teal" 
              trend="neutral" 
              trendValue="--" 
              trendText="no change" 
              linkText="View all" 
              linkTo="/admin/residents" 
            />
            <StatCard 
              title="Total Earned" 
              value={formatCurrencyAbbreviated(stats.earned)} 
              valuePrefix="₱"
              icon={Coins} 
              colorTheme="gold" 
              trend="up" 
              trendValue="+15%" 
              trendText="vs. last 7 days" 
              linkText="View details" 
              linkTo="/admin/completed" 
            />
          </div>


          {/* Bottom Section */}
          <div className="dashboard-bottom-grid">
            
            {/* Chart Panel */}
            <div className="dashboard-panel">
              <h2 className="panel-title">Request Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer debounce={50}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#4a5568' }} />
                    <Line isAnimationActive={false} type="monotone" name="Total Requests" dataKey="requests" stroke="#3182ce" strokeWidth={3} dot={{r: 4, fill: '#3182ce', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                    <Line isAnimationActive={false} type="monotone" name="Pending Requests" dataKey="pending" stroke="#ed8936" strokeWidth={3} dot={{r: 4, fill: '#ed8936', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
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

            {/* Calendar */}
            <CalendarCard />
          </div>

          {/* Extra Charts Section */}
          <div className="dashboard-extra-charts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div className="dashboard-panel">
              <h2 className="panel-title">Overall Distribution</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer debounce={50}>
                  <PieChart>
                    <Pie
                      isAnimationActive={false}
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
                <ResponsiveContainer debounce={50}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Line isAnimationActive={false} type="monotone" name="Completed" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="dashboard-panel">
              <h2 className="panel-title">Trash Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer debounce={50}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Line isAnimationActive={false} type="monotone" name="Trash" dataKey="trash" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-panel">
              <h2 className="panel-title">Expired Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer debounce={50}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Line isAnimationActive={false} type="monotone" name="Expired" dataKey="expired" stroke="#805ad5" strokeWidth={3} dot={{r: 4, fill: '#805ad5', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
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
                <ResponsiveContainer debounce={50}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} tickFormatter={(value) => `₱${value}`} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} formatter={(value) => `₱${value.toFixed(2)}`} />
                    <Bar isAnimationActive={false} dataKey="earned" name="Revenue" fill="#ecc94b" radius={[4, 4, 0, 0]} />
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
