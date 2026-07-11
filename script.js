// ─── SMOOTH SCROLL ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ─── FUTURE: ANIMATE ON SCROLL ───
// (Add Intersection Observer if you want fade-in effects later)

console.log('🏛️ BlockSmith — Your AI Minecraft Architect');
console.log('📦 Built in 21 hours. Ready for the world.');