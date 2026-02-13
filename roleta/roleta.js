// Certifique-se de que no HTML da página exista:
// <div id="links-container"></div>

(async function() {
    // Inicializa Supabase
    const supabaseUrl = 'https://ufqhxtfsoxzrofjpvhpk.supabase.co';
    const supabaseAnonKey = 'sb_publishable_pfMYcQnDWH_Gk8uK8ftIMw_suSco3Vt';
    
    // Supabase precisa estar importado no HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

    const container = document.getElementById('links-container');

    if (!container) {
        console.error('Erro: elemento #links-container não encontrado na página.');
        return;
    }

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

                card.innerHTML = `
                    <div class="flex-grow">
                        <h3 class="text-sm font-black uppercase tracking-tight truncate">
                            ${link.title}
                        </h3>
                        <p class="text-[10px] text-gray-500 font-bold truncate max-w-[200px]">${link.description || 'Clique para entrar na sala'}</p>
                    </div>
                `;
                container.appendChild(card);
            });

        } catch (err) {
            console.error(err);
            container.innerHTML = '<div class="text-center text-red-500 text-[10px] font-black">ERRO AO CONECTAR COM SERVIDOR</div>';
        }
    }

    // Carrega os links
    loadRoletaLinks();
})();
