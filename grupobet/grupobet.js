
(function() {
    // Criação de partículas de fundo dinâmicas
    const container = document.getElementById('particles-container');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute bg-yellow-500/10 rounded-full pointer-events-none';
        
        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Animação CSS inline simples
        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * -20;
        
        particle.style.animation = `floatParticle ${duration}s linear infinite`;
        particle.style.animationDelay = `${delay}s`;
        
        container.appendChild(particle);
    }

    // Adiciona o keyframe de animação se não existir
    if (!document.getElementById('particle-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'particle-animation-styles';
        style.innerHTML = `
            @keyframes floatParticle {
                0% { transform: translateY(0) scale(1); opacity: 0; }
                50% { opacity: 0.5; }
                100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
})();
