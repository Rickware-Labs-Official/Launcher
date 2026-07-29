const faqData = [
    {
        id: "what-is-rickware-labs",
        question: "What is Rickware - Labs?",
        answer: "<p>Rickware - Labs is a digital storefront and licensing platform for software tools, Discord utilities, and other digital products. Every purchase is delivered and managed through our desktop Launcher, which also connects members to our Discord community, the Lab-Pass season system, and the Lab-Coins economy.</p>",
        links: { discord: "https://discord.gg/Wk7d8mJgyN", website: "", tiktok: "", github: "" }
    },
    {
        id: "why-cant-i-download-on-website",
        question: "Why can I do everything on the website except download the things I own?",
        answer: "<p>Downloads are handled exclusively through the Launcher, our desktop application, because it manages the download paths and configuration paths used for automatic setup and updates. The Launcher also runs several protection mechanisms that keep purchased projects from being reverse engineered, along with protections for the Launcher itself.</p><p>Beyond that, the Launcher works as the central start engine and hub for every tool you own, so everything you have purchased opens from one place.</p>",
        links: { discord: "", website: "", tiktok: "", github: "" }
    },
    {
        id: "how-do-i-get-support",
        question: "How do I get support?",
        answer: "<p>You can reach our team through our official <a href=\"https://discord.gg/Wk7d8mJgyN\" target=\"_blank\" rel=\"noopener noreferrer\">Rickware - Labs Discord Server</a>.</p><p>On the server, you first verify yourself by requesting a DM captcha from our server bot. To complete verification, simply reply to the bot's DM with the letters and numbers shown in the captcha. Once verification succeeds, you receive all necessary roles along with the ability to open support tickets.</p><p>Inside a ticket you get 24/7 support from the Owner and Developers, or you can choose 24/7 AI Support instead.</p><p>You can also reach the Owner and Developer directly by Discord DM: <strong>.rick.c137</strong> (User ID: 1329564018897326080).</p><p>Alternatively, you can contact us by email:</p><ul><li>rickware.labs@gmail.com</li><li>rickware-labs-support@protonmail.com</li></ul>",
        links: { discord: "https://discord.gg/Wk7d8mJgyN", website: "", tiktok: "", github: "" }
    },
    {
        id: "what-are-lab-coins",
        question: "What are Lab-Coins for?",
        answer: "<p>Lab-Coins are our own centralized payment currency. You can obtain them by purchasing them directly, through the Free Season Lab-Pass, through the Premium Season Lab-Pass, by buying products, through Discord giveaways or drops, and by converting Discord server XP into Lab-Coins.</p><p>Lab-Coins can then be spent to purchase licenses and products across the platform.</p>",
        links: { discord: "https://discord.gg/Wk7d8mJgyN", website: "", tiktok: "", github: "" }
    },
    {
        id: "how-to-earn-and-convert-xp",
        question: "How do you convert XP into Lab-Coins, and how do you earn XP?",
        answer: "<p>XP is earned through activity on our Discord server, including sending messages, adding reactions, writing reviews, inviting members, and playing minigames on Discord. XP can also be earned through giveaways or drops.</p><p>Earned XP can then be converted into Lab-Coins, which you can spend on licenses and products.</p>",
        links: { discord: "https://discord.gg/Wk7d8mJgyN", website: "", tiktok: "", github: "" }
    },
    {
        id: "is-github-software-safe",
        question: "Is the GitHub software safe to use?",
        answer: "<p>Yes. Every GitHub project linked on our platform has been fully reviewed and tested by our team. These are trusted authors, some of whom we also know personally.</p><p><strong>Disclaimer:</strong> repositories are generally reviewed and marked as safe and tested, but analysis and testing does not always happen immediately after a repository is updated. Continued use is therefore always at your own risk.</p>",
        links: { discord: "", website: "", tiktok: "", github: "" }
    },
    {
        id: "is-my-data-safe",
        question: "Is my data safe?",
        answer: "<p>Yes, your data is kept safe and stored in encrypted form.</p><p>When you use the website, we store your own account details as provided by you: username, password (stored encrypted), profile picture, phone number, and email address.</p><p>Simply by using the website, the following parameters are also stored: IPv4 address, browser header, browser fingerprint, browser timezone, and OS timezone.</p><p>If you use the Launcher application, the following additional parameters are stored: HWID, MAC address, OS username, system OS, system OS version, system language, and BIOS ID.</p><p>If you choose to link Discord, the following optional data is also stored: Discord username, Discord user ID, and related Discord account information.</p><p>All security and backend systems have been built in-house by our own team and have undergone a full-scope penetration test carried out by certified security professionals.</p><p><strong>Are my payment details stored? No.</strong> We never store sensitive information such as your geolocation, home address, or payment details. All payments and related processing run through a verified third-party payment provider to keep this kind of sensitive data secure at all times.</p>",
        links: { discord: "", website: "", tiktok: "", github: "" }
    },
    {
        id: "what-happens-if-banned-or-timed-out",
        question: "What happens if I get timed out or banned from Rickware - Labs?",
        answer: "<p>For minor violations, such as API spam or repeated incorrect password attempts, you first receive a timeout. Simply wait out the timeout timer and log back in as normal.</p><p>Please note that after 5 timeouts, a system ban is applied, which can only be lifted manually through support.</p><p>If you commit a serious violation, such as manipulating user data or searching for security vulnerabilities, our security system detects this automatically and issues a ban. Depending on the reason, some bans may never be lifted. If you are banned, a support ticket must always be opened.</p><p>Another reason for a login or account lock can be a hardware or system change. We use strict and deliberately aggressive detection that can flag even small hardware changes, which may temporarily prevent login.</p><p>This exists to prevent account sharing and account trading, since binding every account to its owner and device is the only reliable way to stop this. A website login works from any device and location, but the Launcher, which manages your downloads and products, will not allow login from an unrecognized setup, meaning purchased products would otherwise become unavailable.</p><p>If this happens, open a ticket on Discord and your account bindings will be reset and reassigned to your current or new setup. In special cases, such as a GPU, CPU, or motherboard swap, you may be asked to show proof of purchase for the new hardware.</p>",
        links: { discord: "https://discord.gg/Wk7d8mJgyN", website: "", tiktok: "", github: "" }
    },
    {
        id: "can-i-get-a-refund",
        question: "Is there a right to a refund?",
        answer: "<p>No. Once an item has been purchased, there is no refund, regardless of whether the item was bought by accident or the account was misused by someone else. A completed purchase is final.</p><p>In exceptional cases, a purchased item can be exchanged for a different license or for Lab-Coins. To request this, open a ticket on our Discord server.</p>",
        links: { discord: "https://discord.gg/Wk7d8mJgyN", website: "", tiktok: "", github: "" }
    }
];

function buildLinkButtons(links) {
    const icons = {
        discord: '<svg width="16" height="16" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.3087 23.0133 30.1353 26.2532 30.1067 30.1693C30.1067 34.1136 27.2801 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9006 23.0133 53.7272 26.2532 53.6986 30.1693C53.6986 34.1136 50.9006 37.3253 47.3178 37.3253Z"/></svg>',
        website: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
        tiktok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.31 1.38V7.3s-1.88.09-3.25-1.48z"/></svg>',
        github: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.67.42.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .3.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>'
    };
    const labels = { discord: "Discord", website: "Website", tiktok: "TikTok", github: "GitHub" };
    let html = "";
    Object.keys(icons).forEach(key => {
        const url = links && links[key];
        if (url && url.trim() !== "") {
            html += `<a class="faq-link-btn faq-link-${key}" href="${url}" target="_blank" rel="noopener noreferrer">${icons[key]}<span>${labels[key]}</span></a>`;
        }
    });
    return html;
}

function renderFaqs() {
    const list = document.getElementById("faqList");
    if (!list) return;
    list.innerHTML = "";
    faqData.forEach((item, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "faq-item";
        wrapper.setAttribute("data-index", index);

        const linkButtons = buildLinkButtons(item.links);

        wrapper.innerHTML = `
            <h2 class="faq-question-wrap">
                <button class="faq-question" id="faq-btn-${item.id}" aria-expanded="false" aria-controls="faq-panel-${item.id}">
                    <span>${item.question}</span>
                    <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </h2>
            <div class="faq-panel" id="faq-panel-${item.id}" role="region" aria-labelledby="faq-btn-${item.id}">
                <div class="faq-panel-inner">
                    <div class="faq-answer">${item.answer}</div>
                    ${linkButtons ? `<div class="faq-links">${linkButtons}</div>` : ""}
                </div>
            </div>
        `;
        list.appendChild(wrapper);
    });

    document.querySelectorAll(".faq-question").forEach(btn => {
        btn.addEventListener("click", () => {
            const panel = document.getElementById(btn.getAttribute("aria-controls"));
            const isOpen = btn.getAttribute("aria-expanded") === "true";
            btn.setAttribute("aria-expanded", String(!isOpen));
            if (!isOpen) {
                panel.style.maxHeight = panel.scrollHeight + "px";
                panel.classList.add("open");
            } else {
                panel.style.maxHeight = null;
                panel.classList.remove("open");
            }
        });
    });
}

function injectFaqSchema() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqData.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
            }
        }))
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

function setupSearch() {
    const input = document.getElementById("faqSearch");
    if (!input) return;
    input.addEventListener("input", () => {
        const term = input.value.toLowerCase().trim();
        document.querySelectorAll(".faq-item").forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? "" : "none";
        });
    });
}

function updateClock() {
    const el = document.getElementById("authClock");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

document.addEventListener("DOMContentLoaded", () => {
    renderFaqs();
    injectFaqSchema();
    setupSearch();
    updateClock();
    setInterval(updateClock, 1000);

    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const params = new URLSearchParams(window.location.search);
    const expandId = params.get("q");
    if (expandId) {
        const btn = document.getElementById("faq-btn-" + expandId);
        if (btn) {
            btn.click();
            setTimeout(() => btn.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
        }
    }
});