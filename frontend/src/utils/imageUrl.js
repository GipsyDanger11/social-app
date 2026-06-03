/**
 * Resolve a possibly-relative image URL to a fully-qualified one.
 * @param {string} url Image URL (absolute, /uploads/..., or a blob URL)
 * @returns {string} A URL the browser can load
 */
export const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) {
        const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
        return `${base}${url}`;
    }
    return url;
};
