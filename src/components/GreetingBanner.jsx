import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../database/firebase';

export default function GreetingBanner({ pendingCount = 0 }) {
  const cachedName = sessionStorage.getItem('cachedResidentName') || 'Resident';
  const [name, setName] = useState(cachedName);
  const [greeting, setGreeting] = useState('Good Day');

  useEffect(() => {
    // Determine greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    let unsubscribeQuery = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, 'residents'), where("userId", "==", user.uid));
        unsubscribeQuery = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
             const data = snapshot.docs[0].data();
             let fullName = data.fullName || 'Resident';
             
             // Extract something like "BALUCA" if the name is "BALUCA, JOHNREY"
             let displayName = fullName;
             if (fullName.includes(',')) {
               displayName = fullName.split(',')[0].trim();
             } else {
               displayName = fullName.split(' ')[0].trim();
             }
             setName(displayName.toUpperCase());
             sessionStorage.setItem('cachedResidentName', displayName.toUpperCase());
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeQuery) unsubscribeQuery();
    };
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #7c3aed 0%, #312e81 100%)',
      borderRadius: '12px',
      padding: '24px 32px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)',
      marginBottom: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      color: 'white',
      minHeight: '100px'
    }}>
      {/* Decorative Waves/Blobs */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-5%',
        width: '300px',
        height: '300px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-60%',
        right: '5%',
        width: '400px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }}></div>

      <h2 style={{ 
        margin: '0 0 4px 0', 
        fontSize: '1.4rem', 
        fontWeight: 700, 
        letterSpacing: '0.5px',
        position: 'relative',
        zIndex: 1
      }}>
        {greeting}, {name}!
      </h2>
      <p style={{ 
        margin: 0, 
        fontSize: '0.95rem', 
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: 400,
        position: 'relative',
        zIndex: 1
      }}>
        You have {pendingCount} pending document request{pendingCount !== 1 ? 's' : ''}.
      </p>
    </div>
  );
}
