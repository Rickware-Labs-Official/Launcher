function updateClock() {
    const el = document.getElementById("authClock");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function setupScrollSpy() {
    const links = Array.from(document.querySelectorAll(".legal-toc a"));
    const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = "#" + entry.target.id;
            const link = links.find(l => l.getAttribute("href") === id);
            if (!link) return;
            if (entry.isIntersecting) {
                links.forEach(l => l.classList.remove("active"));
                link.classList.add("active");
            }
        });
    }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });

    sections.forEach(section => observer.observe(section));
}

function setupMobileToc() {
    const toggle = document.getElementById("mobileTocToggle");
    const toc = document.getElementById("legalToc");
    if (!toggle || !toc) return;
    toggle.addEventListener("click", () => {
        toc.classList.toggle("open");
    });
    toc.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => toc.classList.remove("open"));
    });
}

function setupBackToTop() {
    const btn = document.getElementById("backToTop");
    if (!btn) return;
    window.addEventListener("scroll", () => {
        if (window.scrollY > 500) {
            btn.classList.add("visible");
        } else {
            btn.classList.remove("visible");
        }
    });
    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateClock();
    setInterval(updateClock, 1000);
    setupScrollSpy();
    setupMobileToc();
    setupBackToTop();

    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});