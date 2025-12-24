import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CasinoLink } from '../types';
import { Icons } from '../constants';

const AdminPanel: React.FC = () => {
  const [links, setLinks] = useState<CasinoLink[]>([]);
  const [editingLink, setEditingLink] = useState<Partial<CasinoLink> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  // ✅ FETCH CORRIGIDO (SEM FALSO POSITIVO)
  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .order('position', { ascending: true });

      if (error) {
        // ❌ Só tabela inexistente gera alerta
        if (error.code === '42P01') {
          setErrorStatus('TABLE_MISSING');
          return;
        }

        console.error('Erro Supabase:', error);
        setErrorStatus(null);
        return;
      }

      // ✅ Tabela existe (mesmo vazia)
      setErrorStatus(null);
      setLinks(data ?? []);
    } catch (err) {
      console.error('Erro inesperado:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    setLoading(true);

    try {
      const payload = {
        title: editingLink.title || 'Sem título',
        description: editingLink.description || '',
        url: editingLink.url || '',
        type: editingLink.type || 'glass',
        icon: editingLink.icon || 'chip',
        badge: editingLink.badge || '',
        is_highlighted: !!editingLink.is_highlighted,
      };

      let error;

      if (editingLink.id) {
        const result = await supabase
          .from('links')
          .update(payload)
          .eq('id', editingLink.id);

        error = result.error;
      } else {
        const result = await supabase
          .from('links')
          .insert([{ ...payload, position: links.length }]);

        error = result.error;
      }

      if (error) throw error;

      setEditingLink(null);
      await fetchLinks();
      alert('✅ Link salvo com sucesso!');
    } catch (err: any) {
      alert('❌ Erro ao salvar: ' + (err.message || 'Verifique permissões.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este link permanentemente?')) return;

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }

    fetchLinks();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#050505] min-h-screen text-white pb-24">
      <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold gold-gradient bg-clip-text text-transparent uppercase tracking-tight">
            Centro de Comando
          </h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Controle de Links & Ofertas
          </p>
        </div>
        <button
          onClick={() => {
            supabase.auth.signOut();
            window.location.reload();
          }}
          className="px-5 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 rounded-xl text-[10px] font-black transition-all uppercase"
        >
          Finalizar Sessão
        </button>
      </div>

      {errorStatus === 'TABLE_MISSING' && (
        <div className="mb-10 p-8 bg-red-950/20 border-2 border-red-500/40 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-red-500 font-black uppercase text-lg">
              Banco de Dados não configurado
            </h3>
          </div>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            A tabela <b>links</b> não existe neste projeto Supabase.
            Crie a tabela e recarregue esta página.
          </p>
        </div>
      )}

      {!errorStatus && (
        <>
          <button
            onClick={() =>
              setEditingLink({
                title: '',
                url: '',
                description: '',
                type: 'glass',
                icon: 'chip',
                is_highlighted: false,
                badge: '',
              })
            }
            className="mb-10 w-full py-6 gold-gradient text-black font-black rounded-2xl shadow-2xl uppercase tracking-tighter text-lg"
          >
            + Adicionar Nova Oferta VIP
          </button>

          <div className="grid gap-4">
            {links.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">
                  Nenhum link ativo encontrado
                </p>
              </div>
            ) : (
              links.map(link => (
                <div
                  key={link.id}
                  className="glass-card p-5 rounded-2xl flex items-center justify-between border border-white/5 shadow-xl"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500">
                      {Icons[link.icon as keyof typeof Icons] || Icons.chip}
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase">
                        {link.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate max-w-[200px]">
                        {link.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingLink(link)}
                      className="p-3 bg-white/5 rounded-xl"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(link.id!)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
