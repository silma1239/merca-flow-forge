import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_description: string;
  updated_at: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [systemName, setSystemName] = useState('Sistema de Checkout');
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar configurações do sistema:', error);
        return;
      }

      setSettings(data || []);
      
      // Load system name if exists
      const nameConfig = data?.find(s => s.setting_key === 'SYSTEM_NAME');
      if (nameConfig) {
        setSystemName(nameConfig.setting_value || 'Sistema de Checkout');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSystemName = (newName: string) => {
    setSystemName(newName);
  };

  useEffect(() => {
    loadSettings();

    // Real-time listener for system settings changes
    const channel = supabase
      .channel('system-settings-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_settings' },
        (payload) => {
          console.log('System settings changed:', payload);
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    settings,
    systemName,
    loading,
    updateSystemName,
    loadSettings
  };
}