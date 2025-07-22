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
  const [storeName, setStoreName] = useState('Sua Loja');
  const [checkoutColors, setCheckoutColors] = useState({
    primary: '#3b82f6',
    secondary: '#f1f5f9',
    accent: '#06b6d4',
    success: '#16a34a',
    warning: '#d97706'
  });
  const [metaPixelId, setMetaPixelId] = useState('');
  const [supportWhatsapp, setSupportWhatsapp] = useState('+5574974008239');
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
      
      // Load all system configurations
      const systemNameConfig = data?.find(s => s.setting_key === 'SYSTEM_NAME');
      if (systemNameConfig) {
        setSystemName(systemNameConfig.setting_value || 'Sistema de Checkout');
      }

      const storeNameConfig = data?.find(s => s.setting_key === 'STORE_NAME');
      if (storeNameConfig) {
        setStoreName(storeNameConfig.setting_value || 'Sua Loja');
      }

      const primaryColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_PRIMARY_COLOR');
      const secondaryColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_SECONDARY_COLOR');
      const accentColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_ACCENT_COLOR');
      const successColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_SUCCESS_COLOR');
      const warningColorConfig = data?.find(s => s.setting_key === 'CHECKOUT_WARNING_COLOR');

      if (primaryColorConfig || secondaryColorConfig || accentColorConfig || successColorConfig || warningColorConfig) {
        setCheckoutColors({
          primary: primaryColorConfig?.setting_value || '#3b82f6',
          secondary: secondaryColorConfig?.setting_value || '#f1f5f9',
          accent: accentColorConfig?.setting_value || '#06b6d4',
          success: successColorConfig?.setting_value || '#16a34a',
          warning: warningColorConfig?.setting_value || '#d97706'
        });
      }

      const metaPixelConfig = data?.find(s => s.setting_key === 'META_PIXEL_ID');
      if (metaPixelConfig) {
        setMetaPixelId(metaPixelConfig.setting_value || '');
      }

      const supportConfig = data?.find(s => s.setting_key === 'SUPPORT_WHATSAPP');
      if (supportConfig) {
        setSupportWhatsapp(supportConfig.setting_value || '+5574974008239');
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

  const updateStoreName = (newName: string) => {
    setStoreName(newName);
  };

  const updateCheckoutColors = (colors: typeof checkoutColors) => {
    setCheckoutColors(colors);
  };

  const updateMetaPixelId = (pixelId: string) => {
    setMetaPixelId(pixelId);
  };

  const updateSupportWhatsapp = (whatsapp: string) => {
    setSupportWhatsapp(whatsapp);
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
    storeName,
    checkoutColors,
    metaPixelId,
    supportWhatsapp,
    loading,
    updateSystemName,
    updateStoreName,
    updateCheckoutColors,
    updateMetaPixelId,
    updateSupportWhatsapp,
    loadSettings
  };
}