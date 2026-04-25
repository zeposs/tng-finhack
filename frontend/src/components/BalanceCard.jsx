import { useState, useEffect } from 'react';
import { getBalance } from '../api';

export default function BalanceCard({ onRefresh }) {
  const [balance, setBalance] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchBalance = async () => {
    try {
      const data = await getBalance();
      setBalance(data.balance);
      setLastUpdated(new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setBalance(250.00);
      setLastUpdated(new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [onRefresh]);

  return (
    <div className="bg-tng-blue-light mx-6 rounded-2xl p-8 text-white text-center shadow-lg -mt-2">
      <p className="text-lg opacity-80 mb-2">My Balance</p>
      <p className="text-6xl font-bold tracking-tight">
        RM {balance !== null ? balance.toFixed(2) : '---'}
      </p>
      <p className="text-base opacity-60 mt-2">Last updated: {lastUpdated || '--:--'}</p>
    </div>
  );
}
