import { db, auth } from '../database/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

// Helper to get device and browser info
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.indexOf("Firefox") > -1) browser = "Firefox";
  else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
  else if (ua.indexOf("Trident") > -1) browser = "IE";
  else if (ua.indexOf("Edge") > -1) browser = "Edge";
  else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
  else if (ua.indexOf("Safari") > -1) browser = "Safari";

  let os = "Unknown OS";
  if (ua.indexOf("Win") > -1) os = "Windows";
  else if (ua.indexOf("Mac") > -1) os = "MacOS";
  else if (ua.indexOf("Linux") > -1) os = "Linux";
  else if (ua.indexOf("Android") > -1) os = "Android";
  else if (ua.indexOf("like Mac") > -1) os = "iOS";

  return { browser, os };
};

// Helper to get IP address
const getIpAddress = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (e) {
    return "Unknown";
  }
};

export const logAdminActivity = async (actionTitle, actionDetails, type, manualEmail = null, role = 'admin') => {
  try {
    const user = auth.currentUser;
    const uid = user ? user.uid : 'unauthenticated';
    const email = user ? user.email : manualEmail;

    if (!email && type !== 'failed_login') return; // Must have email for tracking unless it's a generic failed login

    const { browser, os } = getDeviceInfo();
    const ipAddress = await getIpAddress();

    const activityRef = collection(db, 'activity_logs');
    await addDoc(activityRef, {
      uid,
      email: email || 'Unknown',
      actionTitle,
      actionDetails,
      type, // 'login', 'logout', 'approve', 'delete', 'failed_login', 'other'
      device: os,
      browser,
      ipAddress,
      role,
      timestamp: serverTimestamp()
    });

    if (type === 'failed_login' && role === 'admin') {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      const settingsData = settingsDoc.exists() ? settingsDoc.data() : {};

      if (settingsData?.notificationSettings?.security_failed_login !== false) {
        const notifRef = collection(db, 'notifications');
        await addDoc(notifRef, {
          type: 'SECURITY_ALERT',
          title: 'Security Alert: Failed Login Attempt',
          message: `A failed login attempt was detected for email: ${email || 'Unknown'} from IP: ${ipAddress}.`,
          timestamp: serverTimestamp(),
          isRead: false
        });
      }
    }
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
