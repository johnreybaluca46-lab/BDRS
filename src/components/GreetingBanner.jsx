import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../database/firebase';

export default function GreetingBanner({ pendingCount = 0 }) {
  const [name, setName] = useState('Resident');
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
    <div className="greeting-banner">
      <h2 className="greeting-title">{greeting}, {name}!</h2>
      <p className="greeting-subtitle">
        You have <span className="greeting-count">{pendingCount}</span> pending document request{pendingCount !== 1 ? 's' : ''}.
      </p>
    </div>
  );
}
