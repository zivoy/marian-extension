// shared/allowed-patterns.js
const ALLOWED_PATTERNS = [
  /https:\/\/www\.amazon\.com\/gp\/product\/[A-Z0-9]{10}/,
  /https:\/\/www\.amazon\.com\/[^/]+\/dp\/[A-Z0-9]{10}/
];

function isAllowedUrl(url) {
    console.log(`Checking if URL is allowed: ${url}`);
  return ALLOWED_PATTERNS.some(pattern => pattern.test(url));
}
