import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut } from 'lucide-react';

interface AppHeaderProps {
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  isLogout?: boolean;
}

const AppHeader = ({ subtitle, onBack, backLabel = 'Voltar', isLogout = false }: AppHeaderProps) => (
  <div className="sticky top-0 z-30 px-4 py-4 sm:px-6">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-gradient-to-r from-slate-950/92 via-slate-900/88 to-slate-950/92 px-4 py-3 shadow-[0_18px_48px_rgba(2,6,23,0.32)] backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-500/35 blur-xl" />
          <img
            src="/logo.jpg"
            alt="Brazilian Power Team"
            className="relative h-11 w-11 rounded-full object-cover ring-2 ring-amber-400/60"
          />
        </div>

        <div>
          <p className="font-display text-2xl font-bold uppercase tracking-[0.18em] text-white">
            Brazilian Power Team
          </p>
          {subtitle && (
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="rounded-full border border-white/12 bg-white/10 px-4 text-sm text-slate-100 hover:bg-white/15 hover:text-white"
        >
          {isLogout ? <LogOut className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {backLabel}
        </Button>
      )}
    </div>
  </div>
);

export default AppHeader;
