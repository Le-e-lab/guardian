const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

    const gapInfo = await page.evaluate(() => {
        const allSections = Array.from(document.querySelectorAll('section'));
        const footer = document.querySelector('footer');
        const results = allSections.map((s, i) => ({
            i,
            text: s.innerText?.slice(0, 50) || '',
            top: Math.round(s.getBoundingClientRect().top + window.scrollY),
            height: Math.round(s.getBoundingClientRect().height),
            opacity: window.getComputedStyle(s).opacity,
            hasReveal: s.querySelector('.reveal') !== null,
        }));
        if (footer) {
            results.push({
                i: 'footer',
                text: 'FOOTER',
                top: Math.round(footer.getBoundingClientRect().top + window.scrollY),
                height: Math.round(footer.getBoundingClientRect().height),
                opacity: 1,
                hasReveal: false,
            });
        }
        return results;
    });

    console.log("=== SECTIONS (top, height, gap-to-next, opacity, hasReveal) ===");
    for (let i = 0; i < gapInfo.length; i++) {
        const s = gapInfo[i];
        const next = gapInfo[i + 1];
        const gap = next ? Math.round(next.top - (s.top + s.height)) : 0;
        console.log(`[${s.i}] h=${s.height}px top=${s.top}px gap=${gap}px opacity=${s.opacity} | "${s.text}"`);
    }

    // Check reveal elements
    const reveals = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.reveal')).map((el, i) => ({
            i,
            visible: el.classList.contains('visible'),
            opacity: window.getComputedStyle(el).opacity,
            text: el.innerText?.slice(0, 40) || '',
        }));
    });

    console.log("\n=== REVEAL ELEMENTS ===");
    for (const r of reveals) {
        console.log(`[${r.i}] visible=${r.visible} opacity=${r.opacity} | "${r.text}"`);
    }

    await browser.close();
})();
