import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  Printer,
  Mail,
  Save,
  Database,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Clock,
  CalendarX,
  Coins
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, query, onSnapshot, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';

const COLORS = ['#3182ce', '#48bb78', '#ecc94b', '#e53e3e', '#805ad5', '#e53e3e'];

const formatCurrencyAbbreviated = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
};

const StatCard = ({ title, value, icon: Icon, colorTheme, trend, trendValue, trendText, linkText, linkTo, valuePrefix = '', style, className = '' }) => {
  return (
    <div className={`summary-card new-card-${colorTheme} ${className}`} style={style}>
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

const Reports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [residents, setResidents] = useState([]);
  const [savedReports, setSavedReports] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPaidTable, setShowPaidTable] = useState(true);
  // Filters
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  const [reportType, setReportType] = useState('All Reports');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // Format: YYYY-MM
  
  useEffect(() => {
    // Fetch all requests
    const qReq = query(collection(db, 'requests'));
    const unsubReq = onSnapshot(qReq, (snapshot) => {
      const reqs = [];
      snapshot.forEach(docSnap => {
        reqs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRequests(reqs);
    });

    // Fetch saved monthly reports
    const qSaved = collection(db, 'monthly_reports');
    const unsubSaved = onSnapshot(qSaved, (snapshot) => {
      const savedMap = {};
      snapshot.forEach(docSnap => {
        savedMap[docSnap.id] = docSnap.data();
      });
      setSavedReports(savedMap);
    });



    // Fetch all residents
    const qRes = query(collection(db, 'residents'));
    const unsubRes = onSnapshot(qRes, (snapshot) => {
      const res = [];
      snapshot.forEach(docSnap => {
        res.push({ id: docSnap.id, ...docSnap.data() });
      });
      setResidents(res);
    });

    return () => { unsubReq(); unsubSaved(); unsubRes(); };
  }, []);

  const formatMonthLabel = (yyyyMm) => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const saveMonthlyReport = async (monthStr) => {
    if (!monthStr) return false;
    try {
      const [year, month] = monthStr.split('-');
      const mRequests = requests.filter(r => {
        if (!r.timestamp) return false;
        const date = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp.seconds * 1000);
        return date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
      });

      let total = 0, pending = 0, approved = 0, completed = 0, expired = 0, trash = 0, earned = 0;
      const docCounts = {};
      const stCounts = {};
      const earningsByDocCounts = {};

      mRequests.forEach(r => {
        const status = r.status || 'Pending';
        const type = r.type || r.documentType || 'Other';
        total++;
        docCounts[type] = (docCounts[type] || 0) + 1;

        if (status === 'Pending' || status === 'Processing' || status === 'Processing Payment' || status === 'Approved') pending++;
        else if (status === 'Completed') {
          completed++;
          earned += parseFloat(r.totalFee || 0) || 0;
          earningsByDocCounts[type] = (earningsByDocCounts[type] || 0) + (parseFloat(r.totalFee || 0) || 0);
        }
        else if (status === 'Trash' || status === 'Rejected') trash++;
      });

      mRequests.forEach(r => {
        let status = r.status || 'Pending';
        if (status === 'Completed') status = 'Approved';
        if (status === 'Trash') status = 'Rejected';
        stCounts[status] = (stCounts[status] || 0) + 1;
      });

      const mResidents = residents.filter(res => {
        const timeField = res.registeredAt || res.timestamp;
        if (!timeField) return false;
        const date = timeField.toDate ? timeField.toDate() : new Date(timeField.seconds * 1000);
        return date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
      });

      const reportData = {
        month: monthStr,
        monthLabel: formatMonthLabel(monthStr),
        stats: { total, pending, approved, completed, expired, trash, earned },
        documentTypeCounts: docCounts,
        statusCounts: stCounts,
        earningsByDocumentTypeCounts: earningsByDocCounts,
        registeredResidents: mResidents.length,
        savedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'monthly_reports', monthStr), reportData, { merge: true });
      return true;
    } catch (err) {
      console.error("Error saving monthly report:", err);
      return false;
    }
  };

  // Automatic saving of current month report whenever data updates
  useEffect(() => {
    if (requests.length > 0 && selectedMonth) {
      saveMonthlyReport(selectedMonth);
    }
  }, [requests, residents, selectedMonth]);

  const handleSaveReport = async () => {
    setIsSaving(true);
    const success = await saveMonthlyReport(selectedMonth);
    setIsSaving(false);
    if (success) {
      Swal.fire({
        title: 'Report Data Saved!',
        text: `Report data for ${formatMonthLabel(selectedMonth)} has been saved permanently to the database.`,
        icon: 'success',
        confirmButtonColor: '#3182ce'
      });
    } else {
      Swal.fire({
        title: 'Save Failed',
        text: 'Failed to save monthly report data. Please try again.',
        icon: 'error'
      });
    }
  };

  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    
    // Always include current month
    const current = new Date();
    const currentMonthStr = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);
    
    requests.forEach(r => {
      if (r.timestamp) {
        const date = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp.seconds * 1000);
        monthsSet.add(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
      }
    });

    Object.keys(savedReports).forEach(monthKey => {
      monthsSet.add(monthKey);
    });
    


    residents.forEach(r => {
      const timeField = r.registeredAt || r.timestamp;
      if (timeField) {
        const date = timeField.toDate ? timeField.toDate() : new Date(timeField.seconds * 1000);
        monthsSet.add(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
      }
    });
    
    return Array.from(monthsSet).sort().reverse();
  }, [requests, savedReports, residents]);

  const handlePrint = () => {
    window.print();
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter(r => {
        if (!r.timestamp) return false;
        const date = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp.seconds * 1000);
        return date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
      });
    }

    if (reportType !== 'Request Reports' && reportType !== 'All Reports' && reportType !== 'Resident Reports') {
      filtered = filtered.filter(r => (r.type || r.documentType) === reportType || (reportType === 'Business Permit' && (r.type || r.documentType) === 'Business Clearance'));
    }
    
    return filtered;
  }, [requests, selectedMonth, reportType]);



  const filteredResidents = useMemo(() => {
    let filtered = residents;
    
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      filtered = filtered.filter(r => {
        const timeField = r.registeredAt || r.timestamp;
        if (!timeField) return false;
        const date = timeField.toDate ? timeField.toDate() : new Date(timeField.seconds * 1000);
        return date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
      });
    }
    return filtered;
  }, [residents, selectedMonth]);

  const savedCurrentMonthData = savedReports[selectedMonth];

  const stats = useMemo(() => {
    if (selectedMonth !== currentMonth && filteredRequests.length === 0 && savedCurrentMonthData && savedCurrentMonthData.stats) {
      return savedCurrentMonthData.stats;
    }

    let total = 0;
    let pending = 0;
    let approved = 0;
    let completed = 0;
    let expired = 0;
    let trash = 0;
    let earned = 0;
    
    filteredRequests.forEach(r => {
      const status = r.status || 'Pending';
      total++;
      
      if (status === 'Pending' || status === 'Processing' || status === 'Processing Payment' || status === 'Approved') pending++;
      else if (status === 'Completed') {
        completed++;
        earned += parseFloat(r.totalFee || 0) || 0;
      }
      else if (status === 'Trash' || status === 'Rejected') trash++;
    });
    
    return { total, pending, approved, completed, expired, trash, earned };
  }, [filteredRequests, savedCurrentMonthData, selectedMonth]);
  
  const resStats = useMemo(() => {
    if (selectedMonth !== currentMonth && filteredResidents.length === 0 && savedCurrentMonthData && savedCurrentMonthData.registeredResidents !== undefined) {
      return { registered: savedCurrentMonthData.registeredResidents };
    }
    return { registered: filteredResidents.length };
  }, [filteredResidents, savedCurrentMonthData, selectedMonth]);
  
  const documentTypeChartData = useMemo(() => {
    if (selectedMonth !== currentMonth && filteredRequests.length === 0 && savedCurrentMonthData && savedCurrentMonthData.documentTypeCounts) {
      return Object.keys(savedCurrentMonthData.documentTypeCounts).map(key => ({
        name: key,
        value: savedCurrentMonthData.documentTypeCounts[key]
      }));
    }

    const counts = {};
    filteredRequests.forEach(r => {
      const type = r.type || r.documentType || 'Other';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [filteredRequests, savedCurrentMonthData, selectedMonth]);

  const statusChartData = useMemo(() => {
    if (selectedMonth !== currentMonth && filteredRequests.length === 0 && savedCurrentMonthData && savedCurrentMonthData.statusCounts) {
      return Object.keys(savedCurrentMonthData.statusCounts).map(key => ({
        name: key,
        value: savedCurrentMonthData.statusCounts[key]
      }));
    }

    const counts = {};
    filteredRequests.forEach(r => {
      let status = r.status || 'Pending';
      if (status === 'Completed') status = 'Approved';
      if (status === 'Trash') status = 'Rejected';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [filteredRequests, savedCurrentMonthData, selectedMonth]);

  const chartData = (reportType === 'Request Reports' || reportType === 'All Reports') ? documentTypeChartData : statusChartData;

  const earningsByDocumentTypeData = useMemo(() => {
    if (selectedMonth !== currentMonth && filteredRequests.length === 0 && savedCurrentMonthData && savedCurrentMonthData.earningsByDocumentTypeCounts) {
      return Object.keys(savedCurrentMonthData.earningsByDocumentTypeCounts).map(key => ({
        name: key,
        earned: savedCurrentMonthData.earningsByDocumentTypeCounts[key]
      })).filter(item => item.earned > 0);
    }

    const counts = {};
    filteredRequests.forEach(r => {
      const status = r.status || 'Pending';
      if (status === 'Completed') {
        const type = r.type || r.documentType || 'Other';
        counts[type] = (counts[type] || 0) + (parseFloat(r.totalFee || 0) || 0);
      }
    });
    return Object.keys(counts).map(key => ({
      name: key,
      earned: counts[key]
    })).filter(item => item.earned > 0);
  }, [filteredRequests]);

  const residentChartData = useMemo(() => {
    return [
      { name: 'Registered', value: resStats.registered }
    ].filter(d => d.value > 0);
  }, [resStats]);



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

  const renderResidentReports = () => (
    <div style={{ display: 'grid', gridTemplateColumns: reportType === 'All Reports' ? '1fr 1fr' : '1fr 2fr', gap: '24px' }}>
      {/* Summary Section */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>Resident Registration Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
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
        </div>
      </div>

      {/* Chart Section */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>Resident Status Overview</h3>
        <div style={{ height: '300px', width: '100%' }}>
          {residentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={residentChartData}
                  cx="45%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {residentChartData.map((entry, index) => {
                    let fillColor = '#4fd1c5';
                    if (entry.name === 'Pending') fillColor = '#f6ad55';
                    else if (entry.name === 'Rejected') fillColor = '#f56565';
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Pie>
                <Tooltip formatter={(value, name) => {
                  const total = residentChartData.reduce((acc, curr) => acc + curr.value, 0);
                  const percent = ((value / total) * 100).toFixed(0);
                  return [`${value} residents (${percent}%)`, name];
                }} />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical" 
                  iconType="circle" 
                  wrapperStyle={{ paddingLeft: '20px' }}
                  itemStyle={{ paddingBottom: '12px' }}
                  formatter={(value, entry) => {
                    const total = residentChartData.reduce((acc, curr) => acc + curr.value, 0);
                    const percent = ((entry.payload.value / total) * 100).toFixed(0);
                    return <span style={{ color: '#4a5568', fontWeight: 500 }}>{value} <span style={{ float: 'right', marginLeft: '15px' }}>{percent}%</span></span>;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>
              No resident data available
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDocumentReports = () => (
    <div style={{ display: 'grid', gridTemplateColumns: reportType === 'All Reports' ? '1fr' : '1fr 2fr', gap: '24px' }}>
      {/* Summary Section */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: reportType === 'All Reports' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: '16px' }}>
          <StatCard 
            title="Total Earned" 
            value={formatCurrencyAbbreviated(stats.earned || 0)} 
            valuePrefix="₱"
            icon={Coins} 
            colorTheme="gold" 
            trend="neutral" 
            trendValue="--" 
            trendText="no change" 
            linkText="View details" 
            linkTo="/admin/completed" 
          />
          <StatCard 
            title="Total Requests" 
            value={stats.total} 
            icon={FileText} 
            colorTheme="blue" 
            trend="neutral" 
            trendValue="--" 
            trendText="no change" 
            linkText="View all" 
            linkTo="/admin/document-requests" 
          />
          <StatCard 
            title="Paid" 
            value={stats.completed} 
            icon={CheckCircle} 
            colorTheme="green" 
            trend="neutral" 
            trendValue="--" 
            trendText="no change" 
            linkText="View all" 
            linkTo="/admin/completed" 
          />
          <StatCard 
            title="Approved" 
            value={stats.approved} 
            icon={CheckCircle} 
            colorTheme="teal" 
            trend="neutral" 
            trendValue="--" 
            trendText="no change" 
            linkText="View all" 
            linkTo="/admin/completed" 
          />
          <StatCard 
            title="Pending" 
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
            title="Expired" 
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
            title="Rejected" 
            value={stats.trash} 
            icon={Trash2} 
            colorTheme="red" 
            trend="neutral" 
            trendValue="--" 
            trendText="no change" 
            linkText="View all" 
            linkTo="/admin/trash" 
          />
        </div>
      </div>

      {reportType === 'All Reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Document Type Chart */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>Requests by Document Type</h3>
            <div style={{ height: '300px', width: '100%' }}>
              {documentTypeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={documentTypeChartData} cx="45%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value">
                      {documentTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => {
                      const total = documentTypeChartData.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = ((value / total) * 100).toFixed(0);
                      return [`${value} requests (${percent}%)`, name];
                    }} />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ paddingLeft: '20px' }} itemStyle={{ paddingBottom: '12px' }} formatter={(value, entry) => {
                        const total = documentTypeChartData.reduce((acc, curr) => acc + curr.value, 0);
                        const percent = ((entry.payload.value / total) * 100).toFixed(0);
                        return <span style={{ color: '#4a5568', fontWeight: 500 }}>{value} <span style={{ float: 'right', marginLeft: '15px' }}>{percent}%</span></span>;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>No data available</div>
              )}
            </div>
          </div>

          {/* Status Chart */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>Requests by Status</h3>
            <div style={{ height: '300px', width: '100%' }}>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusChartData} cx="45%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value">
                      {statusChartData.map((entry, index) => {
                        let fillColor = COLORS[index % COLORS.length];
                        if (entry.name === 'Approved') fillColor = '#48bb78';
                        else if (entry.name === 'Pending') fillColor = '#ed8936';
                        else if (entry.name === 'Rejected') fillColor = '#e53e3e';
                        return <Cell key={`cell-${index}`} fill={fillColor} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(value, name) => {
                      const total = statusChartData.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = ((value / total) * 100).toFixed(0);
                      return [`${value} requests (${percent}%)`, name];
                    }} />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ paddingLeft: '20px' }} itemStyle={{ paddingBottom: '12px' }} formatter={(value, entry) => {
                        const total = statusChartData.reduce((acc, curr) => acc + curr.value, 0);
                        const percent = ((entry.payload.value / total) * 100).toFixed(0);
                        return <span style={{ color: '#4a5568', fontWeight: 500 }}>{value} <span style={{ float: 'right', marginLeft: '15px' }}>{percent}%</span></span>;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>No data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {reportType === 'All Reports' && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>Earnings by Document Type</h3>
          <div style={{ height: '350px', width: '100%' }}>
            {earningsByDocumentTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsByDocumentTypeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} tickFormatter={(value) => `₱${value}`} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} formatter={(value) => `₱${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
                  <Bar dataKey="earned" name="Revenue" fill="#ecc94b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>No earnings data available for this month</div>
            )}
          </div>
        </div>
      )}

      {reportType !== 'All Reports' && (
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', marginBottom: '20px' }}>
          {(reportType === 'Request Reports' || reportType === 'All Reports') ? 'Requests by Document Type' : 'Requests by Status'}
        </h3>
        <div style={{ height: '300px', width: '100%' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="45%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => {
                    let fillColor = COLORS[index % COLORS.length];
                    if (reportType !== 'Request Reports') {
                      if (entry.name === 'Approved') fillColor = '#48bb78'; // Green
                      else if (entry.name === 'Pending') fillColor = '#ed8936'; // Orange
                      else if (entry.name === 'Rejected') fillColor = '#e53e3e'; // Red
                    }
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Pie>
                <Tooltip formatter={(value, name) => {
                  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                  const percent = ((value / total) * 100).toFixed(0);
                  return [`${value} requests (${percent}%)`, name];
                }} />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical" 
                  iconType="circle" 
                  wrapperStyle={{ paddingLeft: '20px' }}
                  itemStyle={{ paddingBottom: '12px' }}
                  formatter={(value, entry) => {
                    const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                    const percent = ((entry.payload.value / total) * 100).toFixed(0);
                    return <span style={{ color: '#4a5568', fontWeight: 500 }}>{value} <span style={{ float: 'right', marginLeft: '15px' }}>{percent}%</span></span>;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0aec0' }}>
              No data available for the selected period
            </div>
          )}
        </div>
      </div>
      )}
      
      {/* Paid Requests Breakdown Table */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: '24px', gridColumn: reportType === 'All Reports' ? '1' : '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3748', margin: 0 }}>Paid Requests Breakdown</h3>
          <button onClick={() => setShowPaidTable(!showPaidTable)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#4a5568', border: 'none', cursor: 'pointer', padding: '4px' }} title={showPaidTable ? "Collapse Table" : "Expand Table"}>
            {showPaidTable ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
        {showPaidTable && (
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#4a5568' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem' }}>Request Id</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem' }}>Document Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem' }}>Payment Method</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem' }}>Date Request</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.9rem' }}>Fees</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.filter(r => r.status === 'Completed').length > 0 ? (
                filteredRequests.filter(r => r.status === 'Completed').map((req, idx) => (
                  <tr key={req.id || idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: '12px 16px', color: '#2d3748', fontSize: '0.9rem' }}>{req.id || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', color: '#2d3748', fontSize: '0.9rem' }}>{req.type || req.documentType || 'Other'}</td>
                    <td style={{ padding: '12px 16px', color: '#2d3748', fontSize: '0.9rem' }}>{req.deliveryMethod || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', color: '#2d3748', fontSize: '0.9rem' }}>
                      {req.timestamp ? (req.timestamp.toDate ? req.timestamp.toDate().toLocaleDateString() : new Date(req.timestamp.seconds * 1000).toLocaleDateString()) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#38a169', fontWeight: 600, fontSize: '0.9rem' }}>
                      ₱{(parseFloat(req.totalFee || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#a0aec0' }}>No paid requests found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <AdminSidebar className="hide-on-print" />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header hide-on-print">
          <h1>Reports</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-content print-full-width">
          
          <div className="print-only" style={{ display: 'none', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <img src={Logo} alt="Logo" style={{ width: '60px', height: '60px' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1a202c' }}>Barangay Buluan</h1>
                <p style={{ margin: 0, color: '#4a5568' }}>Official Admin Report</p>
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              {reportType}
              {selectedMonth && <span style={{ fontSize: '1.1rem', color: '#718096', marginLeft: '15px' }}>({formatMonthLabel(selectedMonth)})</span>}
            </h2>
          </div>

          {/* Reports Filter Bar */}
          <div className="hide-on-print" style={{ background: 'white', padding: '20px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ flex: '0 0 300px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '8px' }}>Select Report</label>
              <select className="form-input form-select" value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ width: '100%', margin: 0, padding: '10px 12px' }}>
                <option>All Reports</option>
                <option>Request Reports</option>
                <option>Resident Reports</option>
                <option>Barangay Clearance</option>
                <option>Certificate of Residency</option>
                <option>Business Permit</option>
                <option>Certificate of Indigency</option>
              </select>
            </div>
            <div style={{ flex: '0 0 250px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: '8px' }}>Month</label>
              <select 
                className="form-input form-select" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                style={{ width: '100%', margin: 0, padding: '10px 12px' }}
              >
                {availableMonths.map(monthStr => (
                  <option key={monthStr} value={monthStr}>
                    {formatMonthLabel(monthStr)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '62px', marginLeft: 'auto' }}>
              <button className="btn-save" onClick={handlePrint} style={{ padding: '10px 24px', height: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} /> Print
              </button>
            </div>
          </div>

          {reportType === 'All Reports' ? (
            <>
              {renderDocumentReports()}
              <div style={{ marginTop: '40px' }}>
                {renderResidentReports()}
              </div>
            </>
          ) : reportType === 'Resident Reports' ? renderResidentReports() : renderDocumentReports()}

        </div>
      </main>
    </div>
  );
};

export default Reports;
