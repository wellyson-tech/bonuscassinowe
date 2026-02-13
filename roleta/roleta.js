
(function() {
    // Configurações do Supabase (mesmas do lib/supabase.ts)
    const supabaseUrl = 'https://ufqhxtfsoxzrofjpvhpk.supabase.co';
    const supabaseAnonKey = 'sb_publishable_pfMYcQnDWH_Gk8uK8ftIMw_suSco3Vt';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

    const container = document.getElementById('links-container');

    async function loadRoletaLinks() {
        try {
            const { data, error } = await supabaseClient
                .from('links')
                .select('*')
                .eq('category', 'Roleta')
                .order('position', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="py-20 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">
                        Nenhuma mesa ativa no momento
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            data.forEach((link, index) => {
                const card = document.createElement('a');
                card.href = link.url;
                card.target = '_blank';
                card.className = 'roleta-link-card animate-in';
                card.style.animationDelay = `${index * 0.1}s`;
                
                // Registro de clique simplificado
                card.onclick = () => {
                    supabaseClient.from('links')
                        .update({ click_count: (link.click_count || 0) + 1 })
                        .eq('id', link.id);
                };

                card.innerHTML = `
                    <div class="roleta-icon-box">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
                        </svg>
                    </div>
                    <div class="flex-grow">
                        <h3 class="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            ${link.title}
                            ${link.is_verified ? '<span class="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg></span>' : ''}
                        </h3>
                        <p class="text-[10px] text-gray-500 font-bold uppercase truncate max-w-[200px]">${link.description || 'Clique para entrar na sala'}</p>
                    </div>
                    <div class="roleta-btn-enter">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                `;
                container.appendChild(card);
            });

        } catch (err) {
            console.error(err);
            container.innerHTML = '<div class="text-center text-red-500 text-[10px] font-black">ERRO AO CONECTAR COM SERVIDOR</div>';
        }
    }

    loadRoletaLinks();
})();
