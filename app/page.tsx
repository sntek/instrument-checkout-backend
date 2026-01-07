"use client";

import React from 'react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { InstrumentCard } from '@/components/InstrumentCard';
import { CreateInstrumentDialog } from '@/components/CreateInstrumentDialog';
import { SignInRequired } from '@/components/SignInRequired';
import { instruments as staticInstruments } from '@/data/instruments';
import { useReservations } from '@/hooks/useReservations';
import { apiClient } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { Instrument } from '@/types';

export default function App() {
  const [openInstrument, setOpenInstrument] = React.useState<string | null>(null);
  const [instruments, setInstruments] = React.useState<Instrument[]>(staticInstruments);
  
  const { data: session, isPending } = authClient.useSession();

  const currentDisplayName = session?.user?.name || "Guest";
  const currentUserId = session?.user?.id || "guest-user";

  const { 
    reservations, 
    createReservation, 
    deleteReservation, 
    optimisticUpdates  } = useReservations({ pollingInterval: 30000, enablePolling: true });

  const fetchInstruments = React.useCallback(() => {
    apiClient.getInstruments().then(setInstruments).catch(console.error);
  }, []);

  React.useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  function isSlotReserved(instrumentName: string, slot: string, date: string) {
    return Boolean(reservations[instrumentName]?.[`${date}-${slot}`]);
  }

  function getReservationInfo(instrumentName: string, slot: string, date: string) {
    return reservations[instrumentName]?.[`${date}-${slot}`];
  }

  function isOptimisticallyUpdating(instrumentName: string, slot: string, date: string) {
    const slotKey = `${date}-${slot}`;
    const updateKey = `${instrumentName}-${slotKey}`;
    return optimisticUpdates.has(updateKey);
  }

  async function toggleSlot(instrumentName: string, slot: string, date: string) {
    const reservationInfo = getReservationInfo(instrumentName, slot, date);
    const isReserved = Boolean(reservationInfo);
    
    try {
      if (isReserved) {
        if (reservationInfo?.id) {
          await deleteReservation(reservationInfo.id, currentUserId, instrumentName, slot, date);
        }
      } else {
        await createReservation({
          instrumentName,
          slot,
          date,
          reserverName: currentDisplayName,
          reserverUserId: currentUserId
        });
      }
    } catch (error) {
      console.error('Error toggling slot:', error);
      if (error instanceof Error && error.message.includes('You can only delete your own reservations')) {
        toast.warning('Access Denied', {
          description: 'You can only delete your own reservations.',
        });
      } else {
        toast.error('Error', {
          description: 'Something went wrong. Please try again.',
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <section className="py-16 px-6 mx-auto w-full">
        {isPending ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        ) : !session ? (
          <SignInRequired />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {instruments.map((instrument) => (
              <InstrumentCard
                key={instrument.name}
                instrument={instrument}
                isOpen={openInstrument === instrument.name}
                onOpenChange={(open) => setOpenInstrument(open ? instrument.name : null)}
                reservationsByInstrument={reservations}
                currentDisplayName={currentDisplayName}
                currentUserId={currentUserId}
                onToggleSlot={toggleSlot}
                onIsSlotReserved={isSlotReserved}
                onIsOptimisticallyUpdating={isOptimisticallyUpdating}
                onUpdate={fetchInstruments}
              />
            ))}
          </div>
        )}
      </section>
      
      {session && (
        <div className="fixed bottom-6 right-6 z-40">
          <CreateInstrumentDialog onInstrumentCreated={fetchInstruments} />
        </div>
      )}
    </div>
  );
}
