export function calculatePasswordStrength(password) {
    let score = 0;
    if (!password) return { score: 0, text: "", width: "0%", color: "" };

    if (password.length > 5) score++;
    if (password.length > 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score < 2) return { score, text: "Weak", width: "25%", color: "var(--strength-weak)" };
    if (score < 4) return { score, text: "Fair", width: "50%", color: "var(--strength-fair)" };
    if (score < 5) return { score, text: "Good", width: "75%", color: "var(--strength-good)" };
    return { score, text: "Strong", width: "100%", color: "var(--strength-strong)" };
}

export function isValidEmail(email) {
    return /^[a-zA-Z0-9@._-]+$/.test(email);
}

export function getFaviconUrl(url) {
    try {
        let cleanDomain = url.toLowerCase().replace("https://", "").replace("http://", "").split("/")[0];
        if (!cleanDomain.includes(".")) return null;
        return `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;
    } catch { return null; }
}
