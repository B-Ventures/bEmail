// Unsubscribe links: {{unsubscribeUrl}} in any email is replaced with a personal link.
// The token is derived from the list id + subscriber email, so a forged request
// (someone guessing ids) is ignored when the owner app / scheduler applies it.

export const APP_URL = 'https://b-ventures.github.io/bEmail/';

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

export const unsubscribeToken = async (audienceId: string, email: string): Promise<string> => {
    const data = new TextEncoder().encode(`${audienceId}:${email.trim().toLowerCase()}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest).slice(0, 16);
};

export const buildUnsubscribeUrl = async (audienceId: string, subscriberId: string, email: string, base: string = APP_URL) => {
    const t = await unsubscribeToken(audienceId, email);
    return `${base}?action=unsubscribe&listId=${encodeURIComponent(audienceId)}&sid=${encodeURIComponent(subscriberId)}&t=${t}`;
};
