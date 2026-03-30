import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Key, ChevronDown, ChevronUp, ArrowRight, Shield, Zap, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';

export default function WelcomePage() {
  const { setPat, setOrgName, loadOrg } = useAppStore();
  const navigate = useNavigate();
  
  const [org, setOrg] = useState('');
  const [token, setToken] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateOrgName = (name: string) => /^[a-zA-Z0-9._-]+$/.test(name) && name.length <= 39;

  const handleExplore = async () => {
    if (!validateOrgName(org)) {
      setError('Invalid org name. Use only letters, numbers, hyphens, underscores, and dots.');
      return;
    }

    setLoading(true);
    setError('');
    setPat(token);
    setOrgName(org);
    
    try {
      await loadOrg();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at center, hsl(263 70% 66% / 0.08) 0%, hsl(var(--surface-base)) 70%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center glow-primary"
          >
            <Search className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-semibold text-foreground">Org Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            GitHub Organization Analytics Dashboard
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-lg">
          {/* Org Input */}
          <div className="space-y-2 mb-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Organization Name
            </label>
            <Input
              value={org}
              onChange={e => setOrg(e.target.value)}
              placeholder="e.g. AOSSIE-Org"
              className="bg-surface-page border-border focus:border-primary"
            />
          </div>

          {/* PAT Section */}
          <div className="mb-4">
            <button
              onClick={() => setShowPat(!showPat)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Key className="w-3 h-3" />
              <span>Personal Access Token (Optional)</span>
              {showPat ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            
            {showPat && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 space-y-3"
              >
                <Input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="ghp_xxxx..."
                  className="bg-surface-page border-border focus:border-primary font-mono text-xs"
                />
                
                {/* Rate limit comparison */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-surface-page rounded-lg p-3 border border-border">
                    <p className="text-destructive font-medium mb-1">Without PAT</p>
                    <p className="text-muted-foreground">60 requests/hour</p>
                    <p className="text-muted-foreground">Limited data</p>
                  </div>
                  <div className="bg-surface-page rounded-lg p-3 border border-primary/30">
                    <p className="text-success font-medium mb-1">With PAT</p>
                    <p className="text-muted-foreground">5,000 requests/hour</p>
                    <p className="text-muted-foreground">Full analytics</p>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1"><Shield className="w-3 h-3" /> Required scopes: <span className="font-mono">public_repo, read:org</span></p>
                  <p className="flex items-center gap-1"><Eye className="w-3 h-3" /> Token stored locally, sent only to api.github.com</p>
                </div>
              </motion.div>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive mb-3 bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            onClick={handleExplore}
            disabled={!org || loading}
            className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                Explore Organization
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Zap, label: 'Zero Backend' },
            { icon: Shield, label: 'Privacy First' },
            { icon: Eye, label: 'Offline Ready' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
