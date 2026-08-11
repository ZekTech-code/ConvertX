import { COUNTRIES } from "./currencyData";

export function getUserDisplayName(user) {
  if (!user) return "Trader";

  if (user.firstName && user.firstName.trim()) {
    return user.firstName.trim();
  }
  
  const name = user.name || "";
  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  
  if (cleanName && lowerName !== "anonymous" && lowerName !== "anonymous user" && lowerName !== "anonymoususer") {
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

export function parsePhoneNumber(phoneStr) {
  if (!phoneStr) return { dialCode: "+1", localNumber: "" };
  
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const country of sortedCountries) {
    if (phoneStr.startsWith(country.dialCode)) {
      return {
        dialCode: country.dialCode,
        localNumber: phoneStr.slice(country.dialCode.length).trim()
      };
    }
  }
  
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

export function validateEmail(email) {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();

  const re = /^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]{0,62}[a-z0-9]@[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;
  if (!re.test(trimmed)) return false;

  if (/\.{2,}/.test(trimmed)) return false;

  const atIdx = trimmed.lastIndexOf("@");
  const localPart = trimmed.substring(0, atIdx);
  const domain = trimmed.substring(atIdx + 1);

  if (localPart.length < 2) return false;

  if (BLOCKED_EMAIL_DOMAINS.includes(domain)) return false;

  const fakeParts = /^(aaa+|bbb+|ccc+|zzz+|xxx+|qqq+|111+|000+|1234|abcd|qwerty|asdfg?|test\d*|user\d*|fake|noemail|nomail|noreply|admin\d*|example)$/i;
  if (fakeParts.test(localPart)) return false;

  return true;
}

const PHONE_RULES = {
  NG: {
    pattern: /^0[789][01]\d{8}$/,
    hint:    "e.g. 08012345678 (11 digits, starts with 080/081/070/090/091)",
  },
  GH: {
    pattern: /^0[2350]\d{8}$/,
    hint:    "e.g. 0241234567 (10 digits, starts with 024/023/050/053/055)",
  },
  ZA: {
    pattern: /^0[6-8]\d{8}$/,
    hint:    "e.g. 0821234567 (10 digits, starts with 06, 07, or 08)",
  },
  KE: {
    pattern: /^0[17]\d{8}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07 or 01)",
  },
  EG: {
    pattern: /^01[0125]\d{8}$/,
    hint:    "e.g. 01012345678 (11 digits, starts with 010/011/012/015)",
  },
  ET: {
    pattern: /^09\d{8}$/,
    hint:    "e.g. 0912345678 (10 digits, starts with 09)",
  },
  DZ: {
    pattern: /^0[567]\d{8}$/,
    hint:    "e.g. 0551234567 (10 digits, starts with 05, 06, or 07)",
  },
  MA: {
    pattern: /^0[67]\d{8}$/,
    hint:    "e.g. 0612345678 (10 digits, starts with 06 or 07)",
  },
  TN: {
    pattern: /^[259]\d{7}$/,
    hint:    "e.g. 20123456 (8 digits, starts with 2, 5, or 9)",
  },
  CM: {
    pattern: /^[67]\d{7,8}$/,
    hint:    "e.g. 612345678 (9 digits, starts with 6 or 7)",
  },
  SN: {
    pattern: /^7[0-9]\d{7}$/,
    hint:    "e.g. 701234567 (9 digits, starts with 7)",
  },
  TZ: {
    pattern: /^0[67]\d{8}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 06 or 07)",
  },
  UG: {
    pattern: /^0[347]\d{8}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07, 03, or 04)",
  },
  RW: {
    pattern: /^07[2-8]\d{7}$/,
    hint:    "e.g. 0721234567 (10 digits, starts with 072–078)",
  },
  AO: {
    pattern: /^9\d{8}$/,
    hint:    "e.g. 912345678 (9 digits, starts with 9)",
  },
  MZ: {
    pattern: /^8[2-7]\d{7}$/,
    hint:    "e.g. 821234567 (9 digits, starts with 82–87)",
  },
  ZM: {
    pattern: /^0[79]\d{8}$/,
    hint:    "e.g. 0971234567 (10 digits, starts with 09 or 07)",
  },
  ZW: {
    pattern: /^07[1-8]\d{7}$/,
    hint:    "e.g. 0711234567 (10 digits, starts with 071–078)",
  },
  SD: {
    pattern: /^09\d{8}$/,
    hint:    "e.g. 0912345678 (10 digits, starts with 09)",
  },
  LY: {
    pattern: /^09[1-6]\d{7}$/,
    hint:    "e.g. 0911234567 (10 digits, starts with 091–096)",
  },
  MU: {
    pattern: /^5\d{7}$/,
    hint:    "e.g. 51234567 (8 digits, starts with 5)",
  },
  BW: {
    pattern: /^7[1-7]\d{6}$/,
    hint:    "e.g. 71234567 (8 digits, starts with 71–77)",
  },
  BJ: {
    pattern: /^[569]\d{7}$/,
    hint:    "e.g. 91234567 (8 digits, starts with 9, 6, or 5)",
  },
  BF: {
    pattern: /^[67]\d{7}$/,
    hint:    "e.g. 61234567 (8 digits, starts with 6 or 7)",
  },
  GN: {
    pattern: /^6[2-9]\d{7}$/,
    hint:    "e.g. 621234567 (9 digits, starts with 62–69)",
  },
  NA: {
    pattern: /^8[1-5]\d{7}$/,
    hint:    "e.g. 811234567 (9 digits, starts with 81–85)",
  },

  US: {
    pattern: /^[2-9]\d{9}$/,
    hint:    "e.g. 2025551234 (10 digits, first digit 2–9, no leading 0)",
  },
  CA: {
    pattern: /^[2-9]\d{9}$/,
    hint:    "e.g. 4165551234 (10 digits, first digit 2–9, no leading 0)",
  },
  MX: {
    pattern: /^[1-9]\d{9}$/,
    hint:    "e.g. 5512345678 (10 digits, no leading 0)",
  },
  BR: {
    pattern: /^[1-9]{2}\d{8,9}$/,
    hint:    "e.g. 11912345678 (11 digits) or 1132345678 (10 digits)",
  },
  AR: {
    pattern: /^[1-9]\d{9}$/,
    hint:    "e.g. 1123456789 (10 digits, no leading 0)",
  },
  CO: {
    pattern: /^3\d{9}$/,
    hint:    "e.g. 3001234567 (10 digits, starts with 3)",
  },
  CL: {
    pattern: /^9\d{8}$/,
    hint:    "e.g. 912345678 (9 digits, starts with 9)",
  },
  PE: {
    pattern: /^9\d{8}$/,
    hint:    "e.g. 987654321 (9 digits, starts with 9)",
  },
  VE: {
    pattern: /^0[24]\d{8}$/,
    hint:    "e.g. 0412345678 (10 digits, starts with 04 or 02)",
  },
  EC: {
    pattern: /^09\d{7}$/,
    hint:    "e.g. 091234567 (9 digits, starts with 09)",
  },

  GB: {
    pattern: /^0[1-9]\d{8,9}$/,
    hint:    "e.g. 07911123456 (11 digits, starts with 07 for mobile)",
  },
  DE: {
    pattern: /^0[1-9]\d{8,10}$/,
    hint:    "e.g. 01512345678 (11 digits, starts with 015/016/017 for mobile)",
  },
  FR: {
    pattern: /^0[67]\d{8}$/,
    hint:    "e.g. 0612345678 (10 digits, starts with 06 or 07)",
  },
  IT: {
    pattern: /^3\d{8,9}$/,
    hint:    "e.g. 3121234567 (10 digits, starts with 3)",
  },
  ES: {
    pattern: /^[67]\d{8}$/,
    hint:    "e.g. 612345678 (9 digits, starts with 6 or 7)",
  },
  PL: {
    pattern: /^[5-8]\d{8}$/,
    hint:    "e.g. 512345678 (9 digits, starts with 5, 6, 7, or 8)",
  },
  RU: {
    pattern: /^9\d{9}$/,
    hint:    "e.g. 9161234567 (10 digits, starts with 9)",
  },
  UA: {
    pattern: /^0?9\d{8}$/,
    hint:    "e.g. 0991234567 (10 digits) or 991234567 (9 digits)",
  },
  NL: {
    pattern: /^0?6\d{8}$/,
    hint:    "e.g. 0612345678 (10 digits, starts with 06)",
  },
  BE: {
    pattern: /^0?4\d{8}$/,
    hint:    "e.g. 0412345678 (10 digits, starts with 04)",
  },
  SE: {
    pattern: /^0?7\d{7,9}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07)",
  },
  NO: {
    pattern: /^[49]\d{7}$/,
    hint:    "e.g. 41234567 (8 digits, starts with 4 or 9)",
  },
  DK: {
    pattern: /^[2-9]\d{7}$/,
    hint:    "e.g. 21234567 (8 digits, starts with 2)",
  },
  CH: {
    pattern: /^0?7[5-9]\d{7}$/,
    hint:    "e.g. 0751234567 (10 digits, starts with 075–079)",
  },
  PT: {
    pattern: /^9[1236]\d{7}$/,
    hint:    "e.g. 912345678 (9 digits, starts with 91, 92, 93, or 96)",
  },
  TR: {
    pattern: /^05\d{9}$/,
    hint:    "e.g. 05321234567 (11 digits, starts with 05)",
  },
  GR: {
    pattern: /^69\d{8}$/,
    hint:    "e.g. 6912345678 (10 digits, starts with 69)",
  },

  AE: {
    pattern: /^0?5[024568]\d{7}$/,
    hint:    "e.g. 0501234567 (10 digits, starts with 050/052/054/055/056/058)",
  },
  SA: {
    pattern: /^0?5[013-9]\d{7}$/,
    hint:    "e.g. 0512345678 (10 digits, starts with 05)",
  },
  KW: {
    pattern: /^[569]\d{7}$/,
    hint:    "e.g. 51234567 (8 digits, starts with 5, 6, or 9)",
  },
  QA: {
    pattern: /^[3567]\d{7}$/,
    hint:    "e.g. 51234567 (8 digits, starts with 3, 5, 6, or 7)",
  },
  BH: {
    pattern: /^[36]\d{7}$/,
    hint:    "e.g. 36123456 (8 digits, starts with 3 or 6)",
  },
  OM: {
    pattern: /^[79]\d{7}$/,
    hint:    "e.g. 91234567 (8 digits, starts with 7 or 9)",
  },
  IQ: {
    pattern: /^07[5-9]\d{8}$/,
    hint:    "e.g. 07512345678 (11 digits, starts with 075–079)",
  },
  JO: {
    pattern: /^07[7-9]\d{7}$/,
    hint:    "e.g. 0791234567 (10 digits, starts with 077/078/079)",
  },

  AF: {
    pattern: /^07[2-9]\d{7}$/,
    hint:    "e.g. 0721234567 (10 digits, starts with 072–079)",
  },
  IN: {
    pattern: /^[6-9]\d{9}$/,
    hint:    "e.g. 9876543210 (10 digits, starts with 6, 7, 8, or 9)",
  },
  CN: {
    pattern: /^1[3-9]\d{9}$/,
    hint:    "e.g. 13812345678 (11 digits, starts with 13x–19x)",
  },
  JP: {
    pattern: /^0[789]0\d{8}$/,
    hint:    "e.g. 09012345678 (11 digits, starts with 070/080/090)",
  },
  KR: {
    pattern: /^010\d{7,8}$/,
    hint:    "e.g. 01012345678 (11 digits, starts with 010)",
  },
  PK: {
    pattern: /^03\d{9}$/,
    hint:    "e.g. 03001234567 (11 digits, starts with 03)",
  },
  BD: {
    pattern: /^01[3-9]\d{8}$/,
    hint:    "e.g. 01712345678 (11 digits, starts with 013–019)",
  },
  PH: {
    pattern: /^09\d{9}$/,
    hint:    "e.g. 09171234567 (11 digits, starts with 09)",
  },
  VN: {
    pattern: /^0[3-9]\d{8,9}$/,
    hint:    "e.g. 0912345678 (10 digits, starts with 09 or 03–08)",
  },
  ID: {
    pattern: /^08\d{7,11}$/,
    hint:    "e.g. 08123456789 (11 digits, starts with 08)",
  },
  TH: {
    pattern: /^0[689]\d{8}$/,
    hint:    "e.g. 0812345678 (10 digits, starts with 06, 08, or 09)",
  },
  MY: {
    pattern: /^01\d{8,9}$/,
    hint:    "e.g. 0123456789 (10 digits, starts with 01)",
  },
  SG: {
    pattern: /^[689]\d{7}$/,
    hint:    "e.g. 81234567 (8 digits, starts with 8 or 9 for mobile)",
  },
  AU: {
    pattern: /^0?4\d{8}$/,
    hint:    "e.g. 0412345678 (10 digits, starts with 04)",
  },
  NZ: {
    pattern: /^02\d{7,9}$/,
    hint:    "e.g. 0212345678 (10 digits, starts with 02)",
  },
  LK: {
    pattern: /^0?7[01245678]\d{7}$/,
    hint:    "e.g. 0712345678 (10 digits, starts with 07)",
  },
  NP: {
    pattern: /^0?9[6-8]\d{8}$/,
    hint:    "e.g. 9841234567 (10 digits, starts with 98 or 97)",
  },
  HK: {
    pattern: /^[569]\d{7}$/,
    hint:    "e.g. 91234567 (8 digits, starts with 5, 6, or 9)",
  },
  IR: {
    pattern: /^09[0-3]\d{8}$/,
    hint:    "e.g. 09121234567 (11 digits, starts with 091/092/093)",
  },
  IL: {
    pattern: /^0?5[02345689]\d{7}$/,
    hint:    "e.g. 0501234567 (10 digits, starts with 05)",
  },
  MM: {
    pattern: /^09\d{7,9}$/,
    hint:    "e.g. 09123456789 (11 digits, starts with 09)",
  },
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

export function validatePhoneForCountry(localNumber, countryCode) {
  if (!localNumber || !localNumber.trim()) {
    return { valid: false, message: "Phone number is required." };
  }

  const digits = localNumber.replace(/[\s\-().+]/g, "");

  if (!/^\d+$/.test(digits)) {
    return { valid: false, message: "Phone number must contain digits only." };
  }

  const selectedCode = normalisePhoneCountryCode(countryCode);
  const rule = selectedCode ? PHONE_RULES[selectedCode] : null;

  if (rule) {
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

export function validatePhone(localNumber) {
  return validatePhoneForCountry(localNumber, null).valid;
}
