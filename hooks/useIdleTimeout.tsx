import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { User } from '@/lib/types';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes

interface IdleTimeoutProps {
  user: User | null;
  signOut: () => void;
}

export const useIdleTimeout = ({ user, signOut }: IdleTimeoutProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const handleIdle = useCallback(() => {
    if (user) {
      signOut();
      router.push('/');
      toast({
        title: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
    }
  }, [user, signOut, router, toast]);

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(handleIdle, IDLE_TIMEOUT);
    };

    const handleActivity = () => {
      resetTimer();
    };

    if (user) {
      const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
      events.forEach(event => window.addEventListener(event, handleActivity));
      resetTimer();

      return () => {
        clearTimeout(idleTimer);
        events.forEach(event => window.removeEventListener(event, handleActivity));
      };
    }
  }, [user, handleIdle]);
};