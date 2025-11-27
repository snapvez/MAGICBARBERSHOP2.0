import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Image as ImageIcon, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function BrandingManager() {
  const [siteName, setSiteName] = useState('Magic Barbershop');
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [brandingId, setBrandingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_branding')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBrandingId(data.id);
        setSiteName(data.site_name || 'Magic Barbershop');
        setCurrentLogoUrl(data.logo_url);
      }
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Tipo de ficheiro inválido. Use JPG, PNG, WebP ou SVG.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ficheiro muito grande. Máximo 5MB.' });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMessage(null);
  };

  const handleUploadLogo = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Selecione um ficheiro primeiro' });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('site-branding')
            .remove([`logos/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('site-branding')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-branding')
        .getPublicUrl(filePath);

      if (brandingId) {
        const { error: updateError } = await supabase
          .from('site_branding')
          .update({
            logo_url: publicUrl,
            logo_storage_path: filePath,
            site_name: siteName
          })
          .eq('id', brandingId);

        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('site_branding')
          .insert({
            logo_url: publicUrl,
            logo_storage_path: filePath,
            site_name: siteName
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (data) setBrandingId(data.id);
      }

      setCurrentLogoUrl(publicUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setMessage({ type: 'success', text: 'Logo atualizado com sucesso!' });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setMessage({ type: 'error', text: 'Erro ao fazer upload do logo' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!brandingId) {
      setMessage({ type: 'error', text: 'Nenhuma configuração encontrada' });
      return;
    }

    try {
      setUploading(true);
      const { error } = await supabase
        .from('site_branding')
        .update({ site_name: siteName })
        .eq('id', brandingId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Nome do site atualizado!' });
    } catch (error) {
      console.error('Erro ao salvar nome:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar nome do site' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">A carregar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Marca</h2>
        <p className="text-gray-600 mt-1">Personalize o logo e nome do seu site</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Site
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Nome do seu negócio"
            />
            <button
              onClick={handleSaveName}
              disabled={uploading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={20} />
              Salvar
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo Atual
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
            {currentLogoUrl ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={currentLogoUrl}
                  alt="Logo atual"
                  className="max-h-32 object-contain"
                />
                <p className="text-sm text-gray-600">Logo ativo no site</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon size={48} />
                <p className="text-sm">Nenhum logo configurado</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Novo Logo
          </label>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 hover:bg-gray-100 transition-colors">
              {previewUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-32 object-contain"
                  />
                  <p className="text-sm text-gray-600">Preview do novo logo</p>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload size={48} className="text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Clique para selecionar um ficheiro
                  </span>
                  <span className="text-xs text-gray-500">
                    JPG, PNG, WebP ou SVG (máx. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {selectedFile && (
              <div className="flex gap-2">
                <button
                  onClick={handleUploadLogo}
                  disabled={uploading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      A fazer upload...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Fazer Upload e Ativar
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={uploading}
                  className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Dica:</strong> Use uma imagem com fundo transparente (PNG ou SVG) para melhores resultados.
            O logo será exibido automaticamente em todas as páginas do site.
          </p>
        </div>
      </div>
    </div>
  );
}
