import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

const firebaseConfig = {
  databaseURL: "https://sync-smart-u-turn-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function useSmartUturnTelemetry() {
  const [data, setData] = useState({
    logs: [],
    mode: 'LIVE',
    isConnected: false,
    error: null
  });

  useEffect(() => {
    const liveRef = ref(db, 'live');
    
    const unsubscribe = onValue(liveRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const timestampMs = val.timestamp ? val.timestamp : Date.now();
        const timeString = new Date(timestampMs).toLocaleTimeString();
        
        const logEntry = {
          "Log": timeString,
          "U-Turn Queue": val.q_uturn,
          "Main Queue": val.q_main,
          "Sensors Valid": val.sensors_valid,
          "FSM State": val.fsm_state
        };

        setData(prev => {
          const newLogs = [...prev.logs, logEntry].slice(-60);
          return {
            logs: newLogs,
            mode: 'LIVE',
            isConnected: true,
            error: null
          };
        });
      }
    }, (error) => {
      setData(prev => ({ ...prev, isConnected: false, error: error.message }));
    });

    return () => unsubscribe();
  }, []);

  return data;
}
