-- Adicionar novas configurações do sistema para customização completa
INSERT INTO public.system_settings (setting_key, setting_value, setting_description) VALUES 
('STORE_NAME', 'Sua Loja', 'Nome da loja exibido no cabeçalho e logotipo'),
('CHECKOUT_PRIMARY_COLOR', '#3b82f6', 'Cor primária do checkout transparente'),
('CHECKOUT_SECONDARY_COLOR', '#f1f5f9', 'Cor secundária do checkout transparente'),
('CHECKOUT_ACCENT_COLOR', '#06b6d4', 'Cor de destaque do checkout transparente'),
('CHECKOUT_SUCCESS_COLOR', '#16a34a', 'Cor de sucesso do checkout transparente'),
('CHECKOUT_WARNING_COLOR', '#d97706', 'Cor de aviso do checkout transparente'),
('META_PIXEL_ID', '', 'ID do Pixel do Meta/Facebook para rastreamento do checkout'),
('SUPPORT_WHATSAPP', '+5574974008239', 'Número do WhatsApp para suporte aos clientes')
ON CONFLICT (setting_key) DO UPDATE SET 
setting_value = EXCLUDED.setting_value,
setting_description = EXCLUDED.setting_description;