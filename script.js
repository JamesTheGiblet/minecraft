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

const titleStyles = [
    'background: linear-gradient(to bottom, #3e3e3e, #222)',
    'color: #fff',
    'font-size: 1.5rem',
    'font-family: "Minecraftia", monospace, sans-serif',
    'padding: 15px 20px',
    'border: 2px solid #555',
    'border-radius: 8px',
    'text-shadow: 2px 2px 0px #000',
    'line-height: 1.2'
].join(';');

const subtitleStyles = [
    'color: #aaa',
    'font-size: 1rem',
    'font-family: "Minecraftia", monospace, sans-serif'
].join(';');

console.log('%c🏛️ BlockSmith — Your AI Architect', titleStyles);
console.log('%cBuilt in 21 hours. Ready for the world.', subtitleStyles);