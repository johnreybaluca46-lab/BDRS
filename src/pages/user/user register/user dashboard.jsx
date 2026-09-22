import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ResidentSidebar from '../../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../../components/ResidentNotificationBell';
import GreetingBanner from '../../../components/GreetingBanner';
import SkeletonDashboard from '../../../components/SkeletonDashboard';
import '../../../lib/admin-layout.css';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../database/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function UserDashboard() {
  const cachedStats = JSON.parse(sessionStorage.getItem('residentDashboardStats')) || null;
  const cachedRecent = JSON.parse(sessionStorage.getItem('residentDashboardRecent')) || [];
  const cachedChart = JSON.parse(sessionStorage.getItem('residentDashboardChart')) || [];

  const [loading, setLoading] = useState(cachedStats === null);
  const [recentRequests, setRecentRequests] = useState(cachedRecent);
  const [stats, setStats] = useState(cachedStats || { total: 0, pending: 0, approved: 0, completed: 0, trash: 0, expired: 0 });
  const [chartData, setChartData] = useState(cachedChart);

  useEffect(() => {
    document.title = "Resident | Dashboard";

    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up any previous snapshot listener
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (!user) return;

      const q = query(
        collection(db, 'requests'),
        where('userId', '==', user.uid)
      );

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        let total = 0;
        let pending = 0;
        let approved = 0;
        let completed = 0;
        let trash = 0;
        let expired = 0;
        
        const now = new Date();
        const monthCounts = {};
        const reqs = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          const id = doc.id;
          let status = data.status || 'Pending';
          if (status === 'Processing') status = 'Pending';
          
          // Check if Approved but expired
          const isExpired = status === 'Approved' && data.expiresAt && data.expiresAt.toDate() < now;
          if (isExpired) status = 'Expired';
          
          const isHidden = data.hiddenByUser;
          
          reqs.push({ id, ...data, _resolvedStatus: status });

          if (!isHidden) {
              total++;
              if (status === 'Pending') pending++;
              else if (status === 'Approved') approved++;
              else if (status === 'Completed') completed++;
              else if (status === 'Trash' || status === 'Rejected') trash++;
              else if (status === 'Expired') expired++;
              
              if (data.timestamp) {
                 const date = data.timestamp.toDate();
                 const month = date.toLocaleString('default', { month: 'short' });
                 if (!monthCounts[month]) {
                   monthCounts[month] = { total: 0, pending: 0, completed: 0, rejected: 0, expired: 0, approved: 0 };
                 }
                 monthCounts[month].total += 1;
                 if (status === 'Pending') monthCounts[month].pending += 1;
                 if (status === 'Approved') monthCounts[month].approved += 1;
                 if (status === 'Completed') monthCounts[month].completed += 1;
                 if (status === 'Trash' || status === 'Rejected') monthCounts[month].rejected += 1;
                 if (status === 'Expired') monthCounts[month].expired += 1;
              }
          }
        });

        const newStats = { total, pending, approved, completed, trash, expired };
        setStats(newStats);
        sessionStorage.setItem('residentDashboardStats', JSON.stringify(newStats));

        reqs.sort((a, b) => {
          const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
          const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
          return timeB - timeA;
        });
        const newRecent = reqs.slice(0, 4);
        setRecentRequests(newRecent);
        sessionStorage.setItem('residentDashboardRecent', JSON.stringify(newRecent));
        
        const last6Months = [];
        const d = new Date();
        d.setMonth(d.getMonth() - 5);
        for(let i=0; i<6; i++) {
           const m = d.toLocaleString('default', { month: 'short' });
           last6Months.push({ 
             name: m, 
             requests: monthCounts[m] ? monthCounts[m].total : 0,
             pending: monthCounts[m] ? monthCounts[m].pending : 0,
             completed: monthCounts[m] ? monthCounts[m].completed : 0,
             rejected: monthCounts[m] ? monthCounts[m].rejected : 0,
             expired: monthCounts[m] ? monthCounts[m].expired : 0,
             approved: monthCounts[m] ? monthCounts[m].approved : 0
           });
           d.setMonth(d.getMonth() + 1);
        }
        setChartData(last6Months);
        sessionStorage.setItem('residentDashboardChart', JSON.stringify(last6Months));
      });
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'processing':
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'completed': return 'status-completed';
      case 'rejected':
      case 'trash': return 'status-rejected';
      case 'expired': return 'status-expired';
      default: return '';
    }
  };

  const getDisplayStatus = (req) => {
    const s = req._resolvedStatus || req.status;
    if (s === 'Processing') return 'Pending';
    if (s === 'Trash') return 'Rejected';
    return s;
  };

  const pieData = [
    { name: 'Doc Pending', value: stats.pending },
    { name: 'Doc Approved', value: stats.approved },
    { name: 'Doc Complete', value: stats.completed },
    { name: 'Doc Reject', value: stats.trash },
    { name: 'Doc Expire', value: stats.expired },
  ].filter(d => d.value > 0);

  const displayPieData = pieData.length > 0 ? pieData : [{ name: 'No Requests', value: 1 }];

  return (
      <div className="admin-dashboard-container">
        <ResidentSidebar />
  
        <main className="admin-main">
          <header className="admin-header resident-header">
            <h1>Dashboard</h1>
            <div className="header-right">
              <ResidentNotificationBell />
              <ResidentProfileDropdown />
            </div>
          </header>
  
          <div className="dashboard-content">
    
          {loading ? <SkeletonDashboard /> : <><GreetingBanner pendingCount={stats.pending} />
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card card-blue">
              <span className="summary-card-title">Total Requests</span>
              <span className="summary-card-value">{stats.total}</span>
              <Link to="/user-my-requests" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-orange">
              <span className="summary-card-title">Pending Requests</span>
              <span className="summary-card-value">{stats.pending}</span>
              <Link to="/user-my-requests" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-green">
              <span className="summary-card-title">Approved Requests</span>
              <span className="summary-card-value">{stats.approved}</span>
              <Link to="/user-approved-requests" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-green">
              <span className="summary-card-title">Completed Requests</span>
              <span className="summary-card-value">{stats.completed}</span>
              <Link to="/user-completed-requests" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card card-red">
              <span className="summary-card-title">Rejected Requests</span>
              <span className="summary-card-value">{stats.trash}</span>
              <Link to="/user-rejected-requests" className="summary-card-link">View all</Link>
            </div>
            <div className="summary-card" style={{ borderTopColor: '#805ad5', backgroundColor: '#faf5ff' }}>
              <span className="summary-card-title" style={{ color: '#553c9a' }}>Expired Documents</span>
              <span className="summary-card-value" style={{ color: '#6b46c1' }}>{stats.expired}</span>
              <Link to="/user-rejected-requests" className="summary-card-link" style={{ color: '#805ad5' }}>View all</Link>
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
                    <Legend verticalAlign="top" height={60} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#4a5568' }} />
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
                        <div className="request-name">{request.type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '2px' }}>Request #{request.id}</div>
                      </div>
                      <div className={`request-status ${getStatusClass(request._resolvedStatus || request.status)}`}>
                        {getDisplayStatus(request)}
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

          {/* Resident Overview Charts Section */}
          <div className="dashboard-extra-charts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <div className="dashboard-panel">
              <h2 className="panel-title">Overall Distribution</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={displayPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {
                        displayPieData.map((entry, index) => {
                          const colors = {
                            'Doc Pending': '#ed8936',
                            'Doc Approved': '#3182ce',
                            'Doc Complete': '#10b981',
                            'Doc Reject': '#ef4444',
                            'Doc Expire': '#805ad5',
                            'No Requests': '#cbd5e0'
                          };
                          return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#a0aec0'} />;
                        })
                      }
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#4a5568' }} />
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
              <h2 className="panel-title">Rejected Overview</h2>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" name="Rejected" dataKey="rejected" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
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
        </>
        }
        </div>
      </main>
    </div>
  );
}
