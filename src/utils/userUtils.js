import { COUNTRIES } from "./currencyData";

/**
 * Returns a clean display name for the user.
 * If the user's name is missing, empty, or literally "Anonymous" (case-insensitive),
 * it returns a fallback name derived from the prefix of the user's email address.
 * Otherwise, it defaults to "Trader".
 *
 * @param {Object} user - The user object from AuthContext
 * @returns {string} The display name
 */
export function getUserDisplayName(user) {
  if (!user) return "Trader";

  // Prefer dedicated firstName field
  if (user.firstName && user.firstName.trim()) {
    return user.firstName.trim();
  }
  
  const name = user.name || "";
  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  
  if (cleanName && lowerName !== "anonymous" && lowerName !== "anonymous user" && lowerName !== "anonymoususer") {
    // Return only the first word of the name (first name)
    return cleanName.split(" ")[0] || cleanName;
  }
  
  if (user.email) {
    const emailPrefix = user.email.split("@")[0];
    if (emailPrefix) {
      const words = emailPrefix.split(/[._-]/);
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }
  
  return "Trader";
}

/**
 * Parses a full phone number string into a dial code and local number.
 * It matches against the known COUNTRIES list.
 *
 * @param {string} phoneStr - The full phone number string (e.g. "+2348030000000")
 * @returns {Object} An object with { dialCode, localNumber }
 */
export function parsePhoneNumber(phoneStr) {
  if (!phoneStr) return { dialCode: "+1", localNumber: "" };
  
  // Sort COUNTRIES by dialCode length descending to match the longest code first (e.g. +971 before +9)
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const country of sortedCountries) {
    if (phoneStr.startsWith(country.dialCode)) {
      return {
        dialCode: country.dialCode,
        localNumber: phoneStr.slice(country.dialCode.length).trim()
      };
    }
  }
  
  // Try to split on space or format prefix
  if (phoneStr.startsWith("+")) {
    const spaceIndex = phoneStr.indexOf(" ");
    if (spaceIndex > 0) {
      return {
        dialCode: phoneStr.substring(0, spaceIndex),
        localNumber: phoneStr.substring(spaceIndex + 1).trim()
      };
    }
  }
  
  return { dialCode: "+1", localNumber: phoneStr };
}

/**
 * List of blocked disposable / clearly-fake email domains.
 * Expand as needed.
 */
const BLOCKED_EMAIL_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "throwam.com", "trashmail.com",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "spam4.me", "maildrop.cc", "tempmail.com",
  "temp-mail.org", "fakeinbox.com", "dispostable.com", "mailnull.com",
  "spamgourmet.com", "trashmail.me", "mailnesia.com", "mohmal.com",
  "anonbox.net", "getairmail.com", "discard.email", "tempinbox.com",
  "throwam.com", "spamhereplease.com", "test.com", "example.com",
  "fake.com", "notreal.com", "noemail.com", "nomail.com",
  "noname.com", "noreply.com", "none.com", "null.com",
  "abc.com", "xyz.com", "aaa.com", "bbb.com", "ccc.com",
  "asdf.com", "qwerty.com", "aaaa.com", "zzzz.com",
];

/**
 * Validates whether an email format is valid and not from a
 * known disposable / fake domain.
 *
 * Rules:
 * - Standard RFC 5322-ish format
 * - Must have a proper TLD of at least 2 characters
 * - Local part must be at least 2 characters
 * - Not from a blocked disposable domain
 * - No consecutive dots, no dot at start/end of local part
 *
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();

  // Must match proper email format with real TLD (2+ chars)
  const re = /^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]{0,62}[a-z0-9]@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;
  if (!re.test(trimmed)) return false;

  // No consecutive dots
  if (/\.{2,}/.test(trimmed)) return false;

  // Extract domain
  const atIdx = trimmed.lastIndexOf("@");
  const localPart = trimmed.substring(0, atIdx);
  const domain = trimmed.substring(atIdx + 1);

  // Local part must be at least 2 chars
  if (localPart.length < 2) return false;

  // Block disposable / fake domains
  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) return false;

  // Block obviously fake patterns in local part (e.g. aaaa, 1111, qwerty, asdf)
  const fakeParts = /^(aaa+|bbb+|ccc+|zzz+|xxx+|qqq+|111+|000+|1234|abcd|qwerty|asdfg?|test\d*|user\d*|fake|noemail|nomail|noreply|admin\d*|example)$/i;
  if (fakeParts.test(localPart)) return false;

  return true;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PHONE VALIDATION — Pattern-Based, Per-Country
   ─────────────────────────────────────────────────────────────────────────────
   Each entry is keyed by ISO 3166-1 alpha-2 country code (UPPERCASE).
   The pattern tests the LOCAL digits the user entered (everything AFTER the
   dial code, with spaces/dashes stripped).

   Pattern conventions
   ───────────────────
   • Many countries use a leading trunk digit 0 (e.g. Nigeria 080…, UK 07…).
     The pattern accepts both "with 0" and "without 0" where both are common.
   • US/Canada (NANP) numbers start with an area code digit 2-9, never 0 or 1.
   • Nigerian numbers start with 0[7-9][01] (e.g. 0802, 0803, 0703, 0905…).
   • Indian numbers start with 6, 7, 8, or 9 — never 0.
   • This ensures that entering a Nigerian number when the country is set to
     "United States" correctly shows an error (and vice versa).

   Sources: ITU-T E.164 national numbering plans, Wikipedia.
─────────────────────────────────────────────────────────────────────────────── */
const PHONE_RULES = {
  // ── Africa ──────────────────────────────────────────────────────────────
  // Nigeria: mobile prefixes 070/080/081/090/091 — 11 digits with trunk 0
  //          or 10 digits without the leading 0 (international style)
  NG: {
    pattern: /^0[789][01]\d{8}$/,
    hint:    "e.g. 08012345678 (11 digits, starts with 080/081/070/090/091)",
  },
  // Ghana: 0XX + 8 digits → 10 digits, prefix 02x, 03x, 05x
  GH: {
    pattern: /^0[2350]\d{8}$/,
    hint:    "e.g. 0241234567 (10 digits, starts with 024/023/050/053/055)",
  },
  // South Africa: 10 digits, starts with 06x/07x/08x
  ZA: {
    pattern: /^0[6-8]\d{8}$/,
    hint:    "e.g. 0821234567 (10 digits, starts with 06, 07, or 08)",
  },
  // Kenya: 10 digits, starts with 07x or 01x
  KE: {
    pattern: /^0[17]\d{8}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07 or 01)",
  },
  // Egypt: 11 digits, starts with 010/011/012/015
  EG: {
    pattern: /^01[0125]\d{8}$/,
    hint:    "e.g. 01012345678 (11 digits, starts with 010/011/012/015)",
  },
  // Ethiopia: 10 digits, starts with 09
  ET: {
    pattern: /^09\d{8}$/,
    hint:    "e.g. 0912345678 (10 digits, starts with 09)",
  },
  // Algeria: 10 digits, starts with 05x/06x/07x
  DZ: {
    pattern: /^0[567]\d{8}$/,
    hint:    "e.g. 0551234567 (10 digits, starts with 05, 06, or 07)",
  },
  // Morocco: 10 digits, starts with 06x/07x
  MA: {
    pattern: /^0[67]\d{8}$/,
    hint:    "e.g. 0612345678 (10 digits, starts with 06 or 07)",
  },
  // Tunisia: 8 digits, starts with 2, 5, or 9
  TN: {
    pattern: /^[259]\d{7}$/,
    hint:    "e.g. 20123456 (8 digits, starts with 2, 5, or 9)",
  },
  // Cameroon: 9 digits, starts with 6 or 7
  CM: {
    pattern: /^[67]\d{7,8}$/,
    hint:    "e.g. 612345678 (9 digits, starts with 6 or 7)",
  },
  // Senegal: 9 digits, starts with 7
  SN: {
    pattern: /^7[0-9]\d{7}$/,
    hint:    "e.g. 701234567 (9 digits, starts with 7)",
  },
  // Tanzania: 10 digits, starts with 06x/07x
  TZ: {
    pattern: /^0[67]\d{8}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 06 or 07)",
  },
  // Uganda: 10 digits, starts with 07x/03x/04x
  UG: {
    pattern: /^0[347]\d{8}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07, 03, or 04)",
  },
  // Rwanda: 10 digits, starts with 072–078
  RW: {
    pattern: /^07[2-8]\d{7}$/,
    hint:    "e.g. 0721234567 (10 digits, starts with 072–078)",
  },
  // Angola: 9 digits, starts with 9
  AO: {
    pattern: /^9\d{8}$/,
    hint:    "e.g. 912345678 (9 digits, starts with 9)",
  },
  // Mozambique: 9 digits, starts with 82–87
  MZ: {
    pattern: /^8[2-7]\d{7}$/,
    hint:    "e.g. 821234567 (9 digits, starts with 82–87)",
  },
  // Zambia: 10 digits, starts with 09x/07x
  ZM: {
    pattern: /^0[79]\d{8}$/,
    hint:    "e.g. 0971234567 (10 digits, starts with 09 or 07)",
  },
  // Zimbabwe: 10 digits, starts with 071–078
  ZW: {
    pattern: /^07[1-8]\d{7}$/,
    hint:    "e.g. 0711234567 (10 digits, starts with 071–078)",
  },
  // Sudan: 10 digits, starts with 09
  SD: {
    pattern: /^09\d{8}$/,
    hint:    "e.g. 0912345678 (10 digits, starts with 09)",
  },
  // Libya: 10 digits, starts with 091–096
  LY: {
    pattern: /^09[1-6]\d{7}$/,
    hint:    "e.g. 0911234567 (10 digits, starts with 091–096)",
  },
  // Mauritius: 8 digits, starts with 5
  MU: {
    pattern: /^5\d{7}$/,
    hint:    "e.g. 51234567 (8 digits, starts with 5)",
  },
  // Botswana: 8 digits, starts with 71–77
  BW: {
    pattern: /^7[1-7]\d{6}$/,
    hint:    "e.g. 71234567 (8 digits, starts with 71–77)",
  },
  // Benin: 8 digits, starts with 5, 6, or 9
  BJ: {
    pattern: /^[569]\d{7}$/,
    hint:    "e.g. 91234567 (8 digits, starts with 9, 6, or 5)",
  },
  // Burkina Faso: 8 digits, starts with 6 or 7
  BF: {
    pattern: /^[67]\d{7}$/,
    hint:    "e.g. 61234567 (8 digits, starts with 6 or 7)",
  },
  // Guinea: 9 digits, starts with 62–69
  GN: {
    pattern: /^6[2-9]\d{7}$/,
    hint:    "e.g. 621234567 (9 digits, starts with 62–69)",
  },
  // Namibia: 9 digits, starts with 81–85
  NA: {
    pattern: /^8[1-5]\d{7}$/,
    hint:    "e.g. 811234567 (9 digits, starts with 81–85)",
  },

  // ── Americas ─────────────────────────────────────────────────────────────
  // US / Canada (NANP): exactly 10 digits, area code first digit 2-9 (never 0 or 1)
  US: {
    pattern: /^[2-9]\d{9}$/,
    hint:    "e.g. 2025551234 (10 digits, first digit 2–9, no leading 0)",
  },
  CA: {
    pattern: /^[2-9]\d{9}$/,
    hint:    "e.g. 4165551234 (10 digits, first digit 2–9, no leading 0)",
  },
  // Mexico: 10 digits, no leading 0
  MX: {
    pattern: /^[1-9]\d{9}$/,
    hint:    "e.g. 5512345678 (10 digits, no leading 0)",
  },
  // Brazil: 10-11 digits — DDD(2) + number(8-9), area code 11-99
  BR: {
    pattern: /^[1-9]{2}\d{8,9}$/,
    hint:    "e.g. 11912345678 (11 digits) or 1132345678 (10 digits)",
  },
  // Argentina: 10 digits, starts with 9 or area code 1-9
  AR: {
    pattern: /^[1-9]\d{9}$/,
    hint:    "e.g. 1123456789 (10 digits, no leading 0)",
  },
  // Colombia: 10 digits, mobile starts with 3
  CO: {
    pattern: /^3\d{9}$/,
    hint:    "e.g. 3001234567 (10 digits, starts with 3)",
  },
  // Chile: 9 digits, mobile starts with 9
  CL: {
    pattern: /^9\d{8}$/,
    hint:    "e.g. 912345678 (9 digits, starts with 9)",
  },
  // Peru: 9 digits, mobile starts with 9
  PE: {
    pattern: /^9\d{8}$/,
    hint:    "e.g. 987654321 (9 digits, starts with 9)",
  },
  // Venezuela: 10 digits, starts with 04x or 02x
  VE: {
    pattern: /^0[24]\d{8}$/,
    hint:    "e.g. 0412345678 (10 digits, starts with 04 or 02)",
  },
  // Ecuador: 9 digits, mobile starts with 09
  EC: {
    pattern: /^09\d{7}$/,
    hint:    "e.g. 091234567 (9 digits, starts with 09)",
  },

  // ── Europe ────────────────────────────────────────────────────────────────
  // UK: 11 digits with trunk 0, mobile starts with 07
  GB: {
    pattern: /^0[1-9]\d{8,9}$/,
    hint:    "e.g. 07911123456 (11 digits, starts with 07 for mobile)",
  },
  // Germany: starts with 0, 10-12 digits (mobile 015x/016x/017x)
  DE: {
    pattern: /^0[1-9]\d{8,10}$/,
    hint:    "e.g. 01512345678 (11 digits, starts with 015/016/017 for mobile)",
  },
  // France: 10 digits, starts with 06 or 07 (mobile), trunk 0 included
  FR: {
    pattern: /^0[67]\d{8}$/,
    hint:    "e.g. 0612345678 (10 digits, starts with 06 or 07)",
  },
  // Italy: 10 digits, mobile starts with 3
  IT: {
    pattern: /^3\d{8,9}$/,
    hint:    "e.g. 3121234567 (10 digits, starts with 3)",
  },
  // Spain: 9 digits, mobile starts with 6 or 7
  ES: {
    pattern: /^[67]\d{8}$/,
    hint:    "e.g. 612345678 (9 digits, starts with 6 or 7)",
  },
  // Poland: 9 digits, mobile starts with 5, 6, 7, or 8
  PL: {
    pattern: /^[5-8]\d{8}$/,
    hint:    "e.g. 512345678 (9 digits, starts with 5, 6, 7, or 8)",
  },
  // Russia: 10 digits, starts with 9 (after +7, no trunk 0)
  RU: {
    pattern: /^9\d{9}$/,
    hint:    "e.g. 9161234567 (10 digits, starts with 9)",
  },
  // Ukraine: 9-10 digits, mobile starts with 09x or 9x
  UA: {
    pattern: /^0?9\d{8}$/,
    hint:    "e.g. 0991234567 (10 digits) or 991234567 (9 digits)",
  },
  // Netherlands: 10 digits, mobile starts with 06
  NL: {
    pattern: /^0?6\d{8}$/,
    hint:    "e.g. 0612345678 (10 digits, starts with 06)",
  },
  // Belgium: 10 digits, mobile starts with 04x
  BE: {
    pattern: /^0?4\d{8}$/,
    hint:    "e.g. 0412345678 (10 digits, starts with 04)",
  },
  // Sweden: 9-10 digits, mobile starts with 07x
  SE: {
    pattern: /^0?7\d{7,9}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07)",
  },
  // Norway: 8 digits, mobile starts with 4 or 9
  NO: {
    pattern: /^[49]\d{7}$/,
    hint:    "e.g. 41234567 (8 digits, starts with 4 or 9)",
  },
  // Denmark: 8 digits, starts with 2-9
  DK: {
    pattern: /^[2-9]\d{7}$/,
    hint:    "e.g. 21234567 (8 digits, starts with 2)",
  },
  // Switzerland: 10 digits, mobile starts with 075-079
  CH: {
    pattern: /^0?7[5-9]\d{7}$/,
    hint:    "e.g. 0751234567 (10 digits, starts with 075–079)",
  },
  // Portugal: 9 digits, mobile starts with 91/92/93/96
  PT: {
    pattern: /^9[1236]\d{7}$/,
    hint:    "e.g. 912345678 (9 digits, starts with 91, 92, 93, or 96)",
  },
  // Turkey: 11 digits, starts with 05
  TR: {
    pattern: /^05\d{9}$/,
    hint:    "e.g. 05321234567 (11 digits, starts with 05)",
  },
  // Greece: 10 digits, mobile starts with 69
  GR: {
    pattern: /^69\d{8}$/,
    hint:    "e.g. 6912345678 (10 digits, starts with 69)",
  },

  // ── Middle East ───────────────────────────────────────────────────────────
  // UAE: 9 digits after +971, mobile starts with 05x (or 10 digits with 0)
  AE: {
    pattern: /^0?5[024568]\d{7}$/,
    hint:    "e.g. 0501234567 (10 digits, starts with 050/052/054/055/056/058)",
  },
  // Saudi Arabia: mobile starts with 05x
  SA: {
    pattern: /^0?5[013-9]\d{7}$/,
    hint:    "e.g. 0512345678 (10 digits, starts with 05)",
  },
  // Kuwait: 8 digits, starts with 5, 6, or 9
  KW: {
    pattern: /^[569]\d{7}$/,
    hint:    "e.g. 51234567 (8 digits, starts with 5, 6, or 9)",
  },
  // Qatar: 8 digits, starts with 3, 5, 6, or 7
  QA: {
    pattern: /^[3567]\d{7}$/,
    hint:    "e.g. 51234567 (8 digits, starts with 3, 5, 6, or 7)",
  },
  // Bahrain: 8 digits, starts with 3 or 6
  BH: {
    pattern: /^[36]\d{7}$/,
    hint:    "e.g. 36123456 (8 digits, starts with 3 or 6)",
  },
  // Oman: 8 digits, starts with 7 or 9
  OM: {
    pattern: /^[79]\d{7}$/,
    hint:    "e.g. 91234567 (8 digits, starts with 7 or 9)",
  },
  // Iraq: 11 digits, starts with 07
  IQ: {
    pattern: /^07[5-9]\d{8}$/,
    hint:    "e.g. 07512345678 (11 digits, starts with 075–079)",
  },
  // Jordan: 10 digits, starts with 077/078/079
  JO: {
    pattern: /^07[7-9]\d{7}$/,
    hint:    "e.g. 0791234567 (10 digits, starts with 077/078/079)",
  },

  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  // Afghanistan: 9 digits, mobile starts with 07x
  AF: {
    pattern: /^07[2-9]\d{7}$/,
    hint:    "e.g. 0721234567 (10 digits, starts with 072–079)",
  },
  // India: 10 digits, starts with 6, 7, 8, or 9 (never 0)
  IN: {
    pattern: /^[6-9]\d{9}$/,
    hint:    "e.g. 9876543210 (10 digits, starts with 6, 7, 8, or 9)",
  },
  // China: 11 digits, mobile starts with 1[3-9]
  CN: {
    pattern: /^1[3-9]\d{9}$/,
    hint:    "e.g. 13812345678 (11 digits, starts with 13x–19x)",
  },
  // Japan: 11 digits, mobile starts with 070/080/090
  JP: {
    pattern: /^0[789]0\d{8}$/,
    hint:    "e.g. 09012345678 (11 digits, starts with 070/080/090)",
  },
  // South Korea: 11 digits, mobile starts with 010
  KR: {
    pattern: /^010\d{7,8}$/,
    hint:    "e.g. 01012345678 (11 digits, starts with 010)",
  },
  // Pakistan: 11 digits, mobile starts with 03
  PK: {
    pattern: /^03\d{9}$/,
    hint:    "e.g. 03001234567 (11 digits, starts with 03)",
  },
  // Bangladesh: 11 digits, starts with 013–019
  BD: {
    pattern: /^01[3-9]\d{8}$/,
    hint:    "e.g. 01712345678 (11 digits, starts with 013–019)",
  },
  // Philippines: 11 digits, starts with 09
  PH: {
    pattern: /^09\d{9}$/,
    hint:    "e.g. 09171234567 (11 digits, starts with 09)",
  },
  // Vietnam: 10 digits, starts with 03–09
  VN: {
    pattern: /^0[3-9]\d{8,9}$/,
    hint:    "e.g. 0912345678 (10 digits, starts with 09 or 03–08)",
  },
  // Indonesia: 10-13 digits, mobile starts with 08
  ID: {
    pattern: /^08\d{7,11}$/,
    hint:    "e.g. 08123456789 (11 digits, starts with 08)",
  },
  // Thailand: 10 digits, mobile starts with 06x/08x/09x
  TH: {
    pattern: /^0[689]\d{8}$/,
    hint:    "e.g. 0812345678 (10 digits, starts with 06, 08, or 09)",
  },
  // Malaysia: 10-11 digits, mobile starts with 01
  MY: {
    pattern: /^01\d{8,9}$/,
    hint:    "e.g. 0123456789 (10 digits, starts with 01)",
  },
  // Singapore: 8 digits, starts with 8 or 9 (mobile) or 6 (land)
  SG: {
    pattern: /^[689]\d{7}$/,
    hint:    "e.g. 81234567 (8 digits, starts with 8 or 9 for mobile)",
  },
  // Australia: 10 digits with trunk 0, mobile starts with 04
  AU: {
    pattern: /^0?4\d{8}$/,
    hint:    "e.g. 0412345678 (10 digits, starts with 04)",
  },
  // New Zealand: 9-11 digits, mobile starts with 02
  NZ: {
    pattern: /^02\d{7,9}$/,
    hint:    "e.g. 0212345678 (10 digits, starts with 02)",
  },
  // Sri Lanka: 10 digits, mobile starts with 07x
  LK: {
    pattern: /^0?7[01245678]\d{7}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07)",
  },
  // Nepal: 10 digits, mobile starts with 97/98
  NP: {
    pattern: /^0?9[6-8]\d{8}$/,
    hint:    "e.g. 9841234567 (10 digits, starts with 98 or 97)",
  },
  // Hong Kong: 8 digits, starts with 5, 6, or 9
  HK: {
    pattern: /^[569]\d{7}$/,
    hint:    "e.g. 91234567 (8 digits, starts with 5, 6, or 9)",
  },
  // Iran: 10-11 digits, mobile starts with 09
  IR: {
    pattern: /^09[0-3]\d{8}$/,
    hint:    "e.g. 09121234567 (11 digits, starts with 091/092/093)",
  },
  // Israel: 9-10 digits, mobile starts with 05
  IL: {
    pattern: /^0?5[02345689]\d{7}$/,
    hint:    "e.g. 0501234567 (10 digits, starts with 05)",
  },
  // Myanmar: 8-10 digits, starts with 09
  MM: {
    pattern: /^09\d{7,9}$/,
    hint:    "e.g. 09123456789 (11 digits, starts with 09)",
  },
  // Cambodia: 8-9 digits, starts with 09/01
  KH: {
    pattern: /^0[19]\d{7,8}$/,
    hint:    "e.g. 091234567 (9 digits, starts with 09 or 01)",
  },
};

const COUNTRY_NAME_BY_CODE = COUNTRIES.reduce((map, country) => {
  map[country.code.toUpperCase()] = country.name;
  return map;
}, {});

function normalisePhoneCountryCode(countryCode) {
  return typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
}

function getCountryNameFromCode(countryCode) {
  return COUNTRY_NAME_BY_CODE[countryCode] || "selected country";
}

function getConflictingCountryMatch(digits, selectedCode) {
  return Object.entries(PHONE_RULES).find(([code, rule]) => (
    code !== selectedCode && rule.pattern.test(digits)
  ));
}

/**
 * Validates a local phone number against the country-specific pattern.
 *
 * The "local number" is what the user types AFTER the dial code prefix.
 * Spaces, dashes, and parentheses are stripped before testing.
 *
 * A country-specific pattern is ALWAYS preferred over the generic fallback.
 * For countries not in the map, a general length check (4–15 digits) is applied.
 *
 * @param {string} localNumber  - User input, e.g. "08012345678" or "080 123 45678"
 * @param {string} countryCode  - ISO 3166-1 alpha-2, e.g. "NG" for Nigeria
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePhoneForCountry(localNumber, countryCode) {
  if (!localNumber || !localNumber.trim()) {
    return { valid: false, message: "Phone number is required." };
  }

  // Strip formatting — keep digits only
  const digits = localNumber.replace(/[\s\-().+]/g, "");

  if (!/^\d+$/.test(digits)) {
    return { valid: false, message: "Phone number must contain digits only." };
  }

  const selectedCode = normalisePhoneCountryCode(countryCode);
  const rule = selectedCode ? PHONE_RULES[selectedCode] : null;

  if (rule) {
    // Country has a defined pattern — test strictly
    if (!rule.pattern.test(digits)) {
      const conflictingMatch = getConflictingCountryMatch(digits, selectedCode);
      if (conflictingMatch) {
        return {
          valid: false,
          message: `Phone number does not match the selected country. Please enter a valid ${getCountryNameFromCode(selectedCode)} phone number.`,
        };
      }

      return {
        valid: false,
        message: `Invalid number for selected country. ${rule.hint}.`,
      };
    }
    return { valid: true, message: "" };
  }

  // Generic fallback for countries not yet mapped (ITU-T: 4–15 local digits)
  const conflictingMatch = getConflictingCountryMatch(digits, selectedCode);
  if (conflictingMatch) {
    return {
      valid: false,
      message: `Phone number does not match the selected country. Please enter a valid ${getCountryNameFromCode(selectedCode)} phone number.`,
    };
  }

  if (digits.length < 4 || digits.length > 15) {
    return { valid: false, message: "Phone number must be 4–15 digits." };
  }
  return { valid: true, message: "" };
}

/**
 * Validates a local phone number (generic, no country context).
 * Kept for backwards compatibility.
 *
 * @param {string} localNumber
 * @returns {boolean}
 */
export function validatePhone(localNumber) {
  return validatePhoneForCountry(localNumber, null).valid;
}
