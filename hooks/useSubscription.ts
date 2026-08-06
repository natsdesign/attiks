import { useEffect, useState } from 'react';
import { getCustomerInfo, hasPremium } from '@/lib/purchases';

export function useSubscription() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerInfo().then(info => {
      setIsPremium(hasPremium(info));
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const info = await getCustomerInfo();
    setIsPremium(hasPremium(info));
  }

  return { isPremium, loading, refresh };
}
