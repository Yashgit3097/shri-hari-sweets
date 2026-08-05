import React from 'react';
import { OrderProvider } from './controllers/OrderController';
import { useOrderController, STATUS } from './controllers/orderContext';
import TopBar from './views/TopBar';
import BottomNav from './views/BottomNav';
import OverviewPage from './views/OverviewPage';
import DataPage from './views/DataPage';
import CustomerModal from './views/CustomerModal';
import Toast from './views/Toast';
import ErrorState from './views/ui/ErrorState';
import { WifiOff } from 'lucide-react';

function AppContent() {
  const { activeTab, status, error, retry, connection } = useOrderController();

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <Toast />

      <OfflineBanner visible={connection === 'offline'} />

      {/* Bottom padding clears the floating nav on every screen size. */}
      <main className="flex-1 pb-32 sm:pb-36">
        {status === STATUS.ERROR ? (
          <ErrorState message={error} onRetry={retry} />
        ) : (
          /* Keying on the tab replays the enter animation on each switch. */
          <div key={activeTab} className="anim-fade-up">
            {activeTab === 'overview' ? <OverviewPage /> : <DataPage />}
          </div>
        )}
      </main>

      <BottomNav />
      <CustomerModal />
    </div>
  );
}

function OfflineBanner({ visible }) {
  if (!visible) return null;

  return (
    <div className="anim-fade-up border-b border-blush-200/70 bg-blush-100/80">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
        <WifiOff className="size-3.5 shrink-0 text-wine-700" strokeWidth={2.25} />
        <p className="text-[12px] font-medium text-wine-800">
          Offline — showing the last data we loaded. Reconnecting…
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <OrderProvider>
      <AppContent />
    </OrderProvider>
  );
}
