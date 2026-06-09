import { useState, useCallback } from 'react';
import MandateDashboard from '../components/MandateDashboard';
import CreateMandate from '../components/CreateMandate';

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  return (
    <>
      <MandateDashboard key={`md-${refreshTrigger}`} />
      <CreateMandate onCreated={refresh} />
    </>
  );
}
