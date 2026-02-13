
const supabaseUrl = 'https://ufqhxtfsoxzrofjpvhpk.supabase.co';
const supabaseAnonKey = 'sb_publishable_pfMYcQnDWH_Gk8uK8ftIMw_suSco3Vt';
const _supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

async function init() {
    await loadBrand();
    await loadRoleta();
}

async function loadBrand() {
    try {
        const { data } = await _supabase.from('brand_settings').select('*').eq('id', 1).single();
        if (data && data.logo_url) {
            document.getElementById('brand-logo').src = data.logo_url;
            document.getElementById('brand-logo-container').classList.remove('hidden');
        }
    } catch (e) {}
}

async function loadRoleta() {
    const container = document.getElementById('roleta-links');
    
    try {
        const { data: links, error } = await _supabase
            .from('links')
            .select('*')
            .eq('category', 'Roleta')
            .order('position', { ascending: true });

        if (error) throw error;

        if (!links || links.length === 0) {
            container.innerHTML = `
                <div class="glass p-10 rounded-[2rem] text-center border-dashed border-white/10">
                    <p class="text-[10px] font-black text-gray-600 uppercase tracking-widest">Nenhuma mesa disponível agora</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        links.forEach(link => {
            const card = document.createElement('a');
            card.href = link.url;
            card.target = '_blank';
            card.className = 'glass roleta-item block p-5 rounded-[2.2rem] flex items-center gap-5 shadow-2xl';
            
            card.onclick = async (e) => {
                // Registro rápido de clique
                _supabase.from('links').update({ click_count: (link.click_count || 0) + 1 }).eq('id', link.id).then(() => {});
            };

            card.innerHTML = `
                <div class="w-12 h-12 bg-purple-500/20 rounded-2xl border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/><path d="m18.36 5.64-1.42 1.42M7.05 16.95l-1.42 1.42M18.36 18.36l-1.42-1.42M7.05 7.05l-1.42-1.42"/></svg>
                </div>
                <div class="flex-grow">
                    <div class="flex items-center gap-2">
                        <h3 class="font-black uppercase tracking-tight text-white text-sm">${link.title}</h3>
                        ${link.badge ? `<span class="bg-purple-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase animate-pulse">${link.badge}</span>` : ''}
                    </div>
                    <p class="text-[10px] font-bold text-gray-500 uppercase mt-0.5 truncate max-w-[180px]">${link.description || 'SINAIS EM TEMPO REAL'}</p>
                </div>
                <div class="opacity-20">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-center text-red-500 font-black uppercase text-[10px]">ERRO DE CONEXÃO MASTER</p>';
    }
}

window.onload = init;
