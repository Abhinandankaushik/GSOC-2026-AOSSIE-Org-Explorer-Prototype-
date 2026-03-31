import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Settings } from 'lucide-react';
import { useAppStore } from '../store/app-store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function OrgManager() {
  const { orgs, selectedOrgs, mode, orgName, addOrg, removeOrg, setSelectedOrgs, setMode, loadMultipleOrgs } = useAppStore();
  const [newOrgInput, setNewOrgInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddOrg = async () => {
    if (!newOrgInput.trim()) return;
    
    addOrg(newOrgInput.trim());
    setNewOrgInput('');
    
    // Auto-select the newly added org if in multi mode
    if (mode === 'multi') {
      const updated = [...selectedOrgs, newOrgInput.trim()];
      setSelectedOrgs(updated);
      setIsLoading(true);
      try {
        await loadMultipleOrgs(updated);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveOrg = async (orgName: string) => {
    // Check if this org is selected in multi mode before removing
    const wasSelected = selectedOrgs.includes(orgName);
    
    removeOrg(orgName);
    
    // If we were in multi mode and the org was selected, reload data
    if (mode === 'multi' && wasSelected && selectedOrgs.length > 1) {
      // Remove the org from selected orgs
      const updated = selectedOrgs.filter(o => o !== orgName);
      setSelectedOrgs(updated);
      
      if (updated.length > 0) {
        setIsLoading(true);
        try {
          await loadMultipleOrgs(updated);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleToggleMode = async (newMode: 'single' | 'multi') => {
    setMode(newMode);
    
    if (newMode === 'multi') {
      // Auto-add current single org if nothing selected yet
      let orgsToLoad = selectedOrgs;
      if (orgsToLoad.length === 0) {
        // Prioritize: current orgName (single mode) > first available org
        if (orgName && orgs.some(o => o.name === orgName)) {
          orgsToLoad = [orgName];
        } else if (orgs.length > 0) {
          orgsToLoad = [orgs[0].name];
        }
        
        if (orgsToLoad.length > 0) {
          setSelectedOrgs(orgsToLoad);
        }
      }
      
      if (orgsToLoad.length > 0) {
        setIsLoading(true);
        try {
          await loadMultipleOrgs(orgsToLoad);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleOrgSelect = async (orgName: string, isSelected: boolean) => {
    const updated = isSelected
      ? [...selectedOrgs, orgName]
      : selectedOrgs.filter(o => o !== orgName);
    
    setSelectedOrgs(updated);
    
    if (mode === 'multi' && updated.length > 0) {
      setIsLoading(true);
      try {
        await loadMultipleOrgs(updated);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4 rounded-lg border border-border bg-surface-card"
    >
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Mode</h3>
          <p className="text-xs text-muted-foreground">Single or Multi-org view</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === 'single' ? 'default' : 'outline'}
            onClick={() => handleToggleMode('single')}
            className="text-xs"
          >
            Single
          </Button>
          <Button
            size="sm"
            variant={mode === 'multi' ? 'default' : 'outline'}
            onClick={() => handleToggleMode('multi')}
            className="text-xs"
          >
            Multi
          </Button>
        </div>
      </div>

      {/* Add Org */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Add Organization</h3>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., AOSSIE-Org"
            value={newOrgInput}
            onChange={(e) => setNewOrgInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOrg()}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddOrg}
            disabled={!newOrgInput.trim() || isLoading}
            className="px-3"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Saved Orgs */}
      {orgs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Saved Organizations</h3>
            {mode === 'multi' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 px-2">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Select Organizations</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {orgs.map((org) => (
                    <DropdownMenuCheckboxItem
                      key={org.name}
                      checked={selectedOrgs.includes(org.name)}
                      onCheckedChange={(checked) => handleOrgSelect(org.name, checked)}
                      disabled={isLoading}
                    >
                      {org.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {orgs.map((org) => (
              <motion.div
                key={org.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between p-2 rounded bg-surface-secondary border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{org.name}</p>
                  {mode === 'multi' && (
                    <p className="text-xs text-muted-foreground">
                      {selectedOrgs.includes(org.name) ? 'Selected' : 'Unselected'}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveOrg(org.name)}
                  disabled={isLoading}
                  className="h-6 px-2 text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>

          {mode === 'multi' && selectedOrgs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing data from {selectedOrgs.length} organization{selectedOrgs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
