import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  User,
  Settings,
  Lock,
  ShieldCheck,
  Save,
  Check,
  Globe,
  Bell,
  Mail,
  Phone,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Activity,
  Trash2,
  Key,
  Copy,
  Plus,
  Shield,
  ShieldAlert,
  Terminal,
  Eye,
  EyeOff,
  Camera,
  LogOut,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COUNTRIES, CURRENCIES, CURRENCY_INFO } from "../utils/currencyData";
import { getUserDisplayName, parsePhoneNumber, validatePhone } from "../utils/userUtils";
import {
  validatePasswordStrength,
  getSecurityLogs,
  clearSecurityLogs,
  addSecurityLog,
  generateApiKey,
} from "../utils/security";
import MobileBottomNav from "../components/MobileBottomNav";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";
import { CountryDropdown, DialCodeDropdown } from "../components/CountryDropdowns";
import { AVATARS } from "../Data/avatars.jsx";

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, logout, deleteAccount, apiKeys, is2FAEnabled, updateApiKeys, set2FAEnabled, clearConversions } = useAuth();

  const [activeTab, setActiveTab] = useState("personal");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logoutToastVisible, setLogoutToastVisible] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const parsedPhone = parsePhoneNumber(user?.phone);
  const [phoneDialCode, setPhoneDialCode] = useState(parsedPhone.dialCode);
  const [phoneLocal, setPhoneLocal] = useState(parsedPhone.localNumber);
  const [country, setCountry] = useState(user?.country || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "avatar1");
  const [errors, setErrors] = useState({});

  const [defaultFrom, setDefaultFrom] = useState(user?.preferences?.defaultFrom || "USD");
  const [defaultTo, setDefaultTo] = useState(user?.preferences?.defaultTo || "NGN");
  const [displayStyle, setDisplayStyle] = useState(user?.preferences?.displayStyle || "code");
  const [pushNotifications, setPushNotifications] = useState(
    user?.preferences?.pushNotifications !== undefined ? user?.preferences?.pushNotifications : true
  );
  const [emailReports, setEmailReports] = useState(
    user?.preferences?.emailReports !== undefined ? user?.preferences?.emailReports : false
  );

  const [decimalPlaces, setDecimalPlaces] = useState(
    user?.preferences?.decimalPlaces !== undefined ? user?.preferences?.decimalPlaces : 2
  );
  const [refreshRate, setRefreshRate] = useState(
    user?.preferences?.refreshRate !== undefined ? user?.preferences?.refreshRate : "manual"
  );
  const [volatilityAlert, setVolatilityAlert] = useState(
    user?.preferences?.volatilityAlert !== undefined ? user?.preferences?.volatilityAlert : 1.0
  );
  const [chartRange, setChartRange] = useState(
    user?.preferences?.chartRange !== undefined ? user?.preferences?.chartRange : 30
  );

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [securityLogs, setSecurityLogs] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    getSecurityLogs(user.email).then(setSecurityLogs);
  }, [user?.email]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newKeyScope, setNewKeyScope] = useState("rates:read");
  const [showCopyNotification, setShowCopyNotification] = useState("");
  const [visibleKeys, setVisibleKeys] = useState({});

  const clearNotifications = () => {
    setError("");
    setSuccess("");
  };

  const handleLogout = () => {
    if (logoutToastVisible) return;

    clearNotifications();
    setLogoutToastVisible(true);

    setTimeout(() => {
      setLogoutToastVisible(false);
      logout();
    }, 1300);
  };

  const handleCountryChange = (selectedCountryName) => {
    setCountry(selectedCountryName);
    setErrors(prev => ({ ...prev, country: "" }));
    const countryObj = COUNTRIES.find(c => c.name === selectedCountryName);
    if (countryObj) {
      setPhoneDialCode(countryObj.dialCode);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    clearNotifications();
    setErrors({});

    const formErrors = {};
    if (!name.trim()) {
      formErrors.name = "Full name is required.";
    }
    if (!country) {
      formErrors.country = "Please select your country.";
    }
    if (!phoneLocal.trim()) {
      formErrors.phone = "Phone number is required.";
    } else if (!validatePhone(phoneLocal)) {
      formErrors.phone = "Please enter a valid phone number (7-15 digits).";
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `${phoneDialCode} ${phoneLocal.trim()}`;
      await updateProfile({
        name,
        phone: fullPhone,
        country,
        bio,
        avatar
      });
      setSuccess("Personal details updated successfully!");
      getSecurityLogs(user?.email).then(setSecurityLogs);
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size exceeds the 2MB security limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target.result);
      addSecurityLog(user?.email, "Profile Image Uploaded", "Custom profile picture saved as Base64 format.", "SUCCESS");
      getSecurityLogs(user?.email).then(setSecurityLogs);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    clearNotifications();
    setLoading(true);

    try {
      await updateProfile({
        preferences: {
          defaultFrom,
          defaultTo,
          displayStyle,
          pushNotifications,
          emailReports,
          decimalPlaces: Number(decimalPlaces),
          refreshRate,
          volatilityAlert: parseFloat(volatilityAlert),
          chartRange: Number(chartRange)
        }
      });
      setSuccess("Application preferences saved!");
      getSecurityLogs(user?.email).then(setSecurityLogs);
    } catch (err) {
      setError(err.message || "Failed to save preferences.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    clearNotifications();

    const strength = validatePasswordStrength(newPassword);
    if (strength.score < 3) {
      setError("New password is too weak. Must meet at least 'Medium' criteria.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await changePassword(oldPassword, newPassword);
      setSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      getSecurityLogs(user?.email).then(setSecurityLogs);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApiKey = () => {
    clearNotifications();
    const token = generateApiKey();
    const newKey = {
      id: `key_${Date.now()}`,
      token,
      scope: newKeyScope,
      createdAt: new Date().toISOString()
    };
    updateApiKeys([...apiKeys, newKey]);
    addSecurityLog(user?.email, "API Key Generated", `New API key created with scope ${newKeyScope}.`, "SUCCESS");
    getSecurityLogs(user?.email).then(setSecurityLogs);
    setSuccess("New API key generated successfully!");
  };

  const handleRevokeApiKey = (keyId) => {
    clearNotifications();
    const filtered = apiKeys.filter((k) => k.id !== keyId);
    updateApiKeys(filtered);
    addSecurityLog(user?.email, "API Key Revoked", "API developer key was deleted.", "SUCCESS");
    getSecurityLogs(user?.email).then(setSecurityLogs);
    setSuccess("API developer token revoked successfully!");
  };

  const handleCopyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setShowCopyNotification(id);
    setTimeout(() => setShowCopyNotification(""), 2000);
  };

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const handleResetProfile = async () => {
    setLoading(true);
    try {
      const originalSignupName = user?.signupName || user?.name || "";
      await updateProfile({
        name: originalSignupName,
        phone: "",
        country: "",
        bio: "",
        avatar: "avatar1",
        preferences: {
          defaultFrom: "USD",
          defaultTo: "NGN",
          displayStyle: "code",
          decimalPlaces: 2,
          refreshRate: "manual",
          volatilityAlert: 1.0,
          chartRange: 30,
          pushNotifications: true,
          emailReports: false
        }
      });
      
      setName(originalSignupName);
      setPhoneDialCode("+1");
      setPhoneLocal("");
      setCountry("");
      setBio("");
      setAvatar("avatar1");
      setErrors({});
      setDefaultFrom("USD");
      setDefaultTo("NGN");
      setDisplayStyle("code");
      setDecimalPlaces(2);
      setRefreshRate("manual");
      setVolatilityAlert(1.0);
      setChartRange(30);
      setPushNotifications(true);
      setEmailReports(false);

      clearSecurityLogs(user?.email);
      setSecurityLogs([]);

      set2FAEnabled(false);

      updateApiKeys([]);

      clearConversions();
      
      setSuccess("Profile settings and credentials reset cleanly!");
      addSecurityLog(user?.email, "Profile Reset Completed", "All user settings, preferences, and keys were reset.", "SUCCESS");
      getSecurityLogs(user?.email).then(setSecurityLogs);
      setShowResetConfirm(false);
    } catch (err) {
      setError(err.message || "Failed to reset profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteAccount();
      setSuccess("Account deleted successfully. Redirecting to home...");
      setShowDeleteConfirm(false);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text transition-colors duration-300 flex flex-col relative overflow-hidden">
      <Navbar />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 flex flex-col gap-8">
        
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row items-center gap-6">
          <div className={`w-24 h-24 rounded-full border flex items-center justify-center overflow-hidden shrink-0 bg-surface-muted border-border`}>
            {avatar.startsWith("data:image/") ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              AVATARS[avatar]?.svg ? AVATARS[avatar].svg("w-full h-full") : null
            )}
          </div>

          <div className="text-center sm:text-left space-y-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-2xl font-black font-sans">{getUserDisplayName({ ...user, name })}</h2>
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <span className="bg-accent/10 text-accent px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                  {avatar.startsWith("data:image/") ? "Member" : AVATARS[avatar]?.label || "Member"}
                </span>
                {is2FAEnabled ? (
                  <span className="bg-success-soft text-success px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-success-border flex items-center gap-1">
                    <Shield className="w-3 h-3 text-positive animate-pulse" /> 2FA Active
                  </span>
                ) : (
                  <span className="bg-danger-soft text-danger px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-danger-border flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-negative" /> Standard Security
                  </span>
                )}
              </div>
            </div>
            <p className="text-text-muted text-sm font-medium flex items-center justify-center sm:justify-start gap-1.5 font-sans">
              <Mail className="w-4 h-4 text-text-muted" />
              {user?.email}
            </p>
            {bio ? (
              <p className="text-xs text-text-secondary max-w-xl italic mt-2 leading-relaxed">
                "{bio}"
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-2 italic font-sans">No biography added yet.</p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8 items-start">
          
          <div className="bg-surface border border-border rounded-3xl p-4 shadow-card space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted px-3.5 py-2 font-sans">Settings Sections</span>
            
            <button
              onClick={() => { setActiveTab("personal"); clearNotifications(); }}
              className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold transition cursor-pointer ${
                activeTab === "personal"
                  ? "bg-primary text-on-primary shadow-primary"
                  : "text-text-secondary hover:bg-surface-muted dark:hover:bg-white/5"
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Personal Details</span>
            </button>

            <button
              onClick={() => { setActiveTab("preferences"); clearNotifications(); }}
              className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold transition cursor-pointer ${
                activeTab === "preferences"
                  ? "bg-primary text-on-primary shadow-primary"
                  : "text-text-secondary hover:bg-surface-muted dark:hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Preferences & Rules</span>
            </button>

            <button
              onClick={() => { setActiveTab("security"); clearNotifications(); }}
              className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold transition cursor-pointer ${
                activeTab === "security"
                  ? "bg-primary text-on-primary shadow-primary"
                  : "text-text-secondary hover:bg-surface-muted dark:hover:bg-white/5"
              }`}
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>Account Security & 2FA</span>
            </button>

            <div className="border-t border-border my-2 pt-2" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-bold text-negative hover:bg-danger-soft transition cursor-pointer border-none bg-transparent"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out Session</span>
            </button>
          </div>

          <div className="lg:col-span-3 bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-card min-h-100 flex flex-col justify-between">
            
            <div>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 rounded-xl bg-danger-soft border border-danger-border text-negative text-xs font-medium flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 rounded-xl bg-success-soft border border-success-border text-positive text-xs font-bold flex items-center gap-2"
                  >
                    <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {activeTab === "personal" && (
                <>
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold">Personal Details</h3>
                    <p className="text-xs text-text-muted mt-0.5">Manage your identity, custom profile picture, and tagline.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Profile Picture</label>
                    <div className="flex items-center gap-5">
                      <div className="relative group w-20 h-20 rounded-full overflow-hidden border border-border bg-surface-muted flex items-center justify-center shrink-0 shadow-lg transition duration-300">
                        {avatar.startsWith("data:image/") ? (
                          <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          AVATARS[avatar]?.svg ? AVATARS[avatar].svg("w-full h-full") : null
                        )}
                        <input
                          type="file"
                          id="profile-picture-upload"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="profile-picture-upload"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition duration-200 cursor-pointer"
                        >
                          <Camera className="w-5 h-5 text-accent mb-0.5" />
                          <span>Change</span>
                        </label>
                      </div>
                      <div className="space-y-1">
                        <label
                          htmlFor="profile-picture-upload"
                          className="text-xs font-bold text-accent hover:underline cursor-pointer flex items-center gap-1"
                        >
                          Upload Custom Image
                        </label>
                        <p className="text-[9px] text-text-muted font-medium">Supports PNG, JPG, or JPEG. Max size 2MB. Hover over picture to update.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Or Choose System Icon</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {Object.keys(AVATARS).map((key) => {
                        const av = AVATARS[key];
                        const isSelected = avatar === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setAvatar(key)}
                            className={`w-16 h-16 p-0 rounded-full border flex items-center justify-center transition duration-200 relative cursor-pointer overflow-hidden ${
                              isSelected
                                ? "border-accent scale-105"
                                : "border-border hover:border-border-strong dark:hover:border-white/10"
                            }`}
                            title={av.label}
                          >
                            {av.svg ? av.svg("w-full h-full") : null}
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] z-10">
                                <Check className="w-3 h-3 stroke-3" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="profile-name" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="profile-name"
                          name="profile-name"
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setErrors(prev => ({ ...prev, name: "" }));
                          }}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl bg-surface-muted border ${
                            errors.name
                              ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger/30"
                              : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                          } text-text text-sm outline-none transition font-semibold`}
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-1 text-[11px] text-negative font-medium flex items-center gap-1 animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="profile-country" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Country</label>
                      <CountryDropdown
                        id="profile-country"
                        value={country}
                        onChange={handleCountryChange}
                        error={errors.country}
                      />
                      {errors.country && (
                        <p className="mt-1 text-[11px] text-negative font-medium flex items-center gap-1 animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.country}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="profile-phone" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Phone Number</label>
                    <div className="flex gap-2">
                      <DialCodeDropdown
                        id="profile-dial-code"
                        value={phoneDialCode}
                        onChange={setPhoneDialCode}
                      />

                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          id="profile-phone"
                          name="profile-phone"
                          type="tel"
                          value={phoneLocal}
                          onChange={(e) => {
                            setPhoneLocal(e.target.value);
                            setErrors(prev => ({ ...prev, phone: "" }));
                          }}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl bg-surface-muted border ${
                            errors.phone
                              ? "border-danger focus:border-danger focus:ring-1 focus:ring-danger/30"
                              : "border-border focus:border-accent focus:ring-1 focus:ring-accent"
                          } text-text text-sm outline-none transition`}
                          placeholder="555 000 0000"
                        />
                      </div>
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-[11px] text-negative font-medium flex items-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="profile-bio" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Biography / Tagline</label>
                    <div className="relative">
                      <div className="absolute top-3.5 left-3.5 flex items-center pointer-events-none text-text-muted">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <textarea
                        id="profile-bio"
                        name="profile-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-muted border border-border text-text text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
                        placeholder="Tell us a bit about yourself or business..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-hover active:scale-[0.98] transition duration-200 cursor-pointer disabled:opacity-50 font-sans shadow-primary"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <>
                        <Save className="w-4.5 h-4.5" /> Save Personal Details
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-danger-border space-y-4">
                  <div className="rounded-2xl border border-danger-border bg-danger-soft/60 p-5 shadow-sm lg:p-6">
                    <div className="flex flex-col gap-5 font-sans lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-danger-border bg-danger-soft text-danger sm:flex">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 max-w-3xl">
                          <h4 className="text-sm font-black text-negative flex items-center gap-2 tracking-tight">
                            <AlertCircle className="h-4.5 w-4.5 text-negative sm:hidden" /> Danger Zone - Reset Account Profile
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">
                            Resets all personal details, app preferences, developer API keys, and conversion transaction history back to defaults. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0 lg:items-center lg:justify-end">
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(true)}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-danger-border bg-danger-soft px-5 py-2.5 text-center text-xs font-black text-negative shadow-sm transition duration-200 hover:border-danger/40 hover:bg-danger/15 focus:outline-none focus:ring-2 focus:ring-danger/30 sm:w-auto lg:min-w-30"
                        >
                          Reset Profile Data
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-danger bg-danger px-5 py-2.5 text-center text-xs font-bold text-on-primary transition duration-200 hover:bg-danger/90 focus:outline-none focus:ring-2 focus:ring-danger/35 sm:w-auto lg:min-w-29"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

              {activeTab === "preferences" && (
                <form onSubmit={handleSavePreferences} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold">Converter Preferences & Rules</h3>
                    <p className="text-xs text-text-muted mt-0.5">Configure decimal rules, volatility thresholds, and engine parameters.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="pref-base" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Default Base Currency</label>
                      <select
                        id="pref-base"
                        name="pref-base"
                        value={defaultFrom}
                        onChange={(e) => setDefaultFrom(e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-surface-muted border border-border text-text font-bold outline-none cursor-pointer focus:border-accent focus:ring-1 focus:ring-accent transition select font-sans"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c} className="bg-surface border-border text-text font-semibold">
                            {c} — {CURRENCY_INFO[c]?.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pref-target" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Default Target Currency</label>
                      <select
                        id="pref-target"
                        name="pref-target"
                        value={defaultTo}
                        onChange={(e) => setDefaultTo(e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-surface-muted border border-border text-text font-bold outline-none cursor-pointer focus:border-accent focus:ring-1 focus:ring-accent transition select font-sans"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c} className="bg-surface border-border text-text font-semibold">
                            {c} — {CURRENCY_INFO[c]?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="space-y-1.5">
                      <label htmlFor="pref-display-style" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Local Currency Display Style</label>
                      <select
                        id="pref-display-style"
                        name="pref-display-style"
                        value={displayStyle}
                        onChange={(e) => setDisplayStyle(e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-surface-muted border border-border text-text font-bold outline-none cursor-pointer focus:border-accent transition select font-sans"
                      >
                        <option value="code" className="bg-surface border-border text-text font-semibold">ISO Currency Code (e.g., 100.00 USD)</option>
                        <option value="symbol" className="bg-surface border-border text-text font-semibold">Symbol Prefix (e.g., $100.00)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pref-decimals" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Decimal Places Precision</label>
                      <select
                        id="pref-decimals"
                        name="pref-decimals"
                        value={decimalPlaces}
                        onChange={(e) => setDecimalPlaces(Number(e.target.value))}
                        className="w-full p-3.5 rounded-xl bg-surface-muted border border-border text-text font-bold outline-none cursor-pointer focus:border-accent transition select font-sans"
                      >
                        <option value={2} className="bg-surface border-border text-text font-semibold">2 Decimals (Standard - $1.25)</option>
                        <option value={3} className="bg-surface border-border text-text font-semibold">3 Decimals (Interbank - $1.254)</option>
                        <option value={4} className="bg-surface border-border text-text font-semibold">4 Decimals (High Precision - $1.2541)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pref-refresh" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Auto-Refresh Exchange Engine</label>
                      <select
                        id="pref-refresh"
                        name="pref-refresh"
                        value={refreshRate}
                        onChange={(e) => setRefreshRate(e.target.value)}
                        className="w-full p-3.5 rounded-xl bg-surface-muted border border-border text-text font-bold outline-none cursor-pointer focus:border-accent transition select font-sans"
                      >
                        <option value="manual" className="bg-surface border-border text-text font-semibold">Manual Only (Save data quota)</option>
                        <option value="30" className="bg-surface border-border text-text font-semibold">Every 30 Seconds (High-frequency)</option>
                        <option value="60" className="bg-surface border-border text-text font-semibold">Every 1 Minute (Standard refresh)</option>
                        <option value="300" className="bg-surface border-border text-text font-semibold">Every 5 Minutes (Conservative refresh)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pref-volatility" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Volatility Alert Alarm Bounds</label>
                      <select
                        id="pref-volatility"
                        name="pref-volatility"
                        value={volatilityAlert}
                        onChange={(e) => setVolatilityAlert(parseFloat(e.target.value))}
                        className="w-full p-3.5 rounded-xl bg-surface-muted border border-border text-text font-bold outline-none cursor-pointer focus:border-accent transition select font-sans"
                      >
                        <option value={0.5} className="bg-surface border-border text-text font-semibold">Strict Bounds (Rate variation &gt; 0.5%)</option>
                        <option value={1.0} className="bg-surface border-border text-text font-semibold">Medium Bounds (Rate variation &gt; 1.0%)</option>
                        <option value={2.5} className="bg-surface border-border text-text font-semibold">Broad Bounds (Rate variation &gt; 2.5%)</option>
                        <option value={5.0} className="bg-surface border-border text-text font-semibold">Crisis Bounds (Rate variation &gt; 5.0%)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pref-chart-range" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Comparison Chart View Span</label>
                      <select
                        id="pref-chart-range"
                        name="pref-chart-range"
                        value={chartRange}
                        onChange={(e) => setChartRange(Number(e.target.value))}
                        className="w-full p-3.5 rounded-xl bg-surface-muted border border-border text-text font-bold outline-none cursor-pointer focus:border-accent transition select font-sans"
                      >
                        <option value={7} className="bg-surface border-border text-text font-semibold">7 Days (Short-term view)</option>
                        <option value={30} className="bg-surface border-border text-text font-semibold">30 Days (Standard monthly index)</option>
                        <option value={90} className="bg-surface border-border text-text font-semibold">90 Days (Quarterly index)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Notifications & Subscriptions</label>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted border border-border">
                      <div className="space-y-0.5 pr-4 font-sans">
                        <h4 className="text-sm font-bold flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-accent" /> Real-time Price Alerts
                        </h4>
                        <p className="text-xs text-text-muted">Notify me immediately of significant volatility swings in default pairings.</p>
                      </div>
                      <input
                        id="pref-push-notifications"
                        name="pref-push-notifications"
                        type="checkbox"
                        aria-label="Real-time price alerts"
                        checked={pushNotifications}
                        onChange={(e) => setPushNotifications(e.target.checked)}
                        className="w-10 h-6 shrink-0 rounded-full border-border bg-surface-sunken/15 text-accent focus:ring-accent cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted border border-border">
                      <div className="space-y-0.5 pr-4 font-sans">
                        <h4 className="text-sm font-bold flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-pink-500" /> Weekly Reserve Market Reports
                        </h4>
                        <p className="text-xs text-text-muted">Receive analysis reports tracking reserve indices and spread tracker metrics.</p>
                      </div>
                      <input
                        id="pref-email-reports"
                        name="pref-email-reports"
                        type="checkbox"
                        aria-label="Weekly reserve market reports"
                        checked={emailReports}
                        onChange={(e) => setEmailReports(e.target.checked)}
                        className="w-10 h-6 shrink-0 rounded-full border-border bg-surface-sunken/15 text-accent focus:ring-accent cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-hover active:scale-[0.98] transition duration-200 cursor-pointer disabled:opacity-50 font-sans shadow-primary"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <>
                        <Save className="w-4.5 h-4.5" /> Save Preferences & Settings
                      </>
                    )}
                  </button>
                </form>
              )}

              {activeTab === "security" && (
                <div className="space-y-8">
                  <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                    <div>
                      <h3 className="text-lg font-bold">Account Security</h3>
                      <p className="text-xs text-text-muted mt-0.5">Protect your account settings by updating your authentication password.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="current-password" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Current Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id="current-password"
                            name="current-password"
                            type={showOldPassword ? "text" : "password"}
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-muted border border-border text-text text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-secondary dark:hover:text-text-muted cursor-pointer transition animate-fade-in"
                          >
                            {showOldPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="new-password" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">New Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id="new-password"
                            name="new-password"
                            type={showNewPassword ? "text" : "password"}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-muted border border-border text-text text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
                            placeholder="Min. 8 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-secondary dark:hover:text-text-muted cursor-pointer transition animate-fade-in"
                          >
                            {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                          </button>
                        </div>

                        {newPassword && (
                          <div className="mt-2.5 space-y-1.5 ml-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-text-muted uppercase tracking-wider">Strength:</span>
                              <span
                                className={`px-1.5 py-0.5 rounded-sm font-extrabold uppercase text-[9px] ${
                                  validatePasswordStrength(newPassword).score <= 2
                                    ? "bg-danger-soft text-danger"
                                    : validatePasswordStrength(newPassword).score === 3
                                    ? "bg-warning-soft text-warning"
                                    : "bg-success-soft text-success"
                                }`}
                              >
                                {validatePasswordStrength(newPassword).label}
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-1 h-1">
                              {[1, 2, 3, 4, 5].map((idx) => (
                                <div
                                  key={idx}
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    idx <= validatePasswordStrength(newPassword).score
                                      ? validatePasswordStrength(newPassword).color
                                      : "bg-surface-sunken/15"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] text-text-muted leading-normal">
                              {validatePasswordStrength(newPassword).feedback}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="confirm-password" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Confirm New Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id="confirm-password"
                            name="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-muted border border-border text-text text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-secondary dark:hover:text-text-muted cursor-pointer transition animate-fade-in"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-hover active:scale-[0.98] transition duration-200 cursor-pointer disabled:opacity-50 font-sans shadow-primary"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4.5 h-4.5" /> Update Account Password
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-6 border-t border-border space-y-4 max-w-md">
                    <div className="p-4 rounded-2xl bg-surface-muted border border-border">
                      <div className="space-y-1 font-sans">
                        <h4 className="text-sm font-bold flex items-center gap-1.5">
                          <ShieldAlert className="w-4.5 h-4.5 text-warning" />
                          Two-Factor Authentication (2FA)
                        </h4>
                        <p className="text-xs text-text-muted">
                          Two-Factor Authentication adds an extra layer of security to your account. This feature will be implemented with server-side TOTP verification in a future update.
                        </p>
                        <p className="text-[10px] text-warning font-semibold mt-2">
                          Note: Firebase Authentication already provides strong security with email verification and server-side session management.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-border space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="font-sans">
                        <h4 className="text-base font-bold flex items-center gap-2">
                          <Activity className="w-5 h-5 text-accent" />
                          Security Audit Activity History
                        </h4>
                        <p className="text-xs text-text-muted mt-0.5">
                          Review recent security occurrences, access updates, and system integrity actions associated with your profile.
                        </p>
                      </div>
                      {securityLogs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            clearSecurityLogs(user?.email);
                            setSecurityLogs([]);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-danger-border hover:border-danger/50 bg-danger-soft/60 hover:bg-danger-soft text-danger text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center font-sans"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear History
                        </button>
                      )}
                    </div>

                    {securityLogs.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-surface-muted/60 text-text-muted text-xs font-semibold font-sans">
                        No security activity recorded yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-border rounded-2xl">
                        <table className="w-full border-collapse text-left text-xs font-sans">
                          <thead>
                            <tr className="bg-surface-muted text-text-secondary uppercase tracking-wider font-bold">
                              <th className="px-4 py-3">Event / Action</th>
                              <th className="px-4 py-3">Timestamp</th>
                              <th className="px-4 py-3">Client IP Address</th>
                              <th className="px-4 py-3">Web Browser</th>
                              <th className="px-4 py-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium">
                            {securityLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-surface-muted/60 dark:hover:bg-white/5 transition">
                                <td className="px-4 py-3.5">
                                  <div className="font-bold text-text">{log.eventType}</div>
                                  {log.details && (
                                    <div className="text-[10px] text-text-muted mt-0.5 font-normal">
                                      {log.details}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-text-secondary">
                                  {log.ip}
                                </td>
                                <td className="px-4 py-3.5 text-text-secondary">
                                  {log.browser}
                                </td>
                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                      log.status === "SUCCESS"
                                        ? "bg-success-soft text-success border border-success-border"
                                        : "bg-danger-soft text-danger border border-danger-border"
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "developer" && (
                <div className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8 items-start">
                    
                    <div className="space-y-6">
                      <div className="font-sans">
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Activity className="w-5 h-5 text-accent" />
                          Conversion Data Tools
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">Exchange-rate tools, profile settings, and developer access. ConvertX does not hold user money.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-5 rounded-2xl bg-surface-muted border border-border">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-sans">
                            <CheckCircle className="w-4 h-4 text-accent" /> What ConvertX stores
                          </h4>
                          <p className="text-sm leading-6 text-text-secondary mt-3">
                            Your account can save conversion history, profile preferences, security logs, and developer API tokens. It does not create a wallet, demo balance, deposit balance, or trading account.
                          </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-surface-muted border border-border">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-sans">
                            <ShieldCheck className="w-4 h-4 text-accent" /> Trading guidance boundary
                          </h4>
                          <p className="text-sm leading-6 text-text-secondary mt-3">
                            The market assistant only highlights high, low, and stable exchange-rate conditions. Users should place any real buy or sell action inside their own trusted trading platform.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="font-sans">
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Key className="w-5 h-5 text-accent" />
                          Developer API Key Tokens
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5">Integrate live ConvertX indices into your developer products.</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-surface-muted border border-border space-y-4">
                        <div className="space-y-1.5">
                          <label htmlFor="dev-key-scope" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Select Access Scopes</label>
                          <select
                            id="dev-key-scope"
                            name="dev-key-scope"
                            value={newKeyScope}
                            onChange={(e) => setNewKeyScope(e.target.value)}
                            className="w-full p-3 rounded-xl bg-surface-muted border border-border text-text text-xs font-bold outline-none cursor-pointer focus:border-accent transition select font-sans"
                          >
                            <option value="rates:read" className="bg-surface border-border text-text font-semibold">
                              rates:read (Read-only exchange feeds)
                            </option>
                            <option value="conversions:write" className="bg-surface border-border text-text font-semibold">
                              conversions:write (Rates + Math queries)
                            </option>
                            <option value="admin" className="bg-surface border-border text-text font-semibold">
                              admin (Unlimited Institutional Access)
                            </option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={handleGenerateApiKey}
                          className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-hover active:scale-[0.99] transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-primary font-sans"
                        >
                          <Plus className="w-4.5 h-4.5" /> Generate Active API Token
                        </button>
                      </div>

                      {apiKeys.length > 0 && (
                        <div className="space-y-3 font-sans">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">Active Credentials</label>
                          
                          <div className="space-y-3">
                            {apiKeys.map((key) => {
                              const isVisible = visibleKeys[key.id];
                              const truncated = `${key.token.slice(0, 12)}...${key.token.slice(-6)}`;
                              return (
                                <div
                                  key={key.id}
                                  className="p-4 rounded-2xl bg-surface-muted border border-border flex items-center justify-between gap-4 transition hover:border-accent/20"
                                >
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-black truncate block text-text select-all">
                                        {isVisible ? key.token : truncated}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => toggleKeyVisibility(key.id)}
                                        className="text-text-muted hover:text-text-secondary dark:hover:text-text-muted transition cursor-pointer"
                                        title={isVisible ? "Hide Token" : "Show Token"}
                                      >
                                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted uppercase tracking-wider">
                                      <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent border border-accent-border">{key.scope}</span>
                                      <span>Issued {new Date(key.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyToClipboard(key.token, key.id)}
                                      className="p-2 rounded-xl bg-surface-muted hover:bg-surface-sunken dark:hover:bg-white/10 border border-border text-text-muted hover:text-accent transition cursor-pointer relative"
                                    >
                                      {showCopyNotification === key.id ? (
                                        <Check className="w-3.5 h-3.5 text-positive" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeApiKey(key.id)}
                                      className="p-2 rounded-xl bg-danger-soft/60 hover:bg-danger-soft border border-danger-border text-negative transition cursor-pointer"
                                      title="Revoke Token"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {apiKeys.length > 0 && (
                    <div className="pt-6 border-t border-border space-y-3 font-sans">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-accent" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">cURL API Request Snippet</h4>
                      </div>

                      <div className="p-4 rounded-2xl bg-black border border-border font-mono text-[11px] text-positive/90 space-y-2 overflow-x-auto relative group">
                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(`curl -X GET "https://api.convertx.financial/v1/latest?base=USD" \\\n  -H "Authorization: Bearer ${apiKeys[0].token}"`, "curl")}
                          className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-white/5 hover:bg-accent-soft hover:border-accent-border opacity-0 group-hover:opacity-100 border border-white/10 text-text-muted hover:text-accent transition cursor-pointer"
                          title="Copy Snippet"
                        >
                          {showCopyNotification === "curl" ? (
                            <Check className="w-3.5 h-3.5 text-positive" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="text-text-secondary block"># Secure institutional rate check</span>
                        <span>
                          curl -X GET "https://api.convertx.financial/v1/latest?base=USD" \<br />
                          &nbsp;&nbsp;-H "Authorization: Bearer <span className="text-accent font-bold">{visibleKeys[apiKeys[0].id] ? apiKeys[0].token : `${apiKeys[0].token.slice(0, 12)}...`}</span>"
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </main>

      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-6 z-50 font-sans"
            >
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-warning-soft text-warning flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text">Reset Entire Profile?</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  This will completely clear your customized settings, API keys, and transaction history.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-xs font-bold hover:bg-surface-muted dark:hover:bg-white/5 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetProfile}
                  className="flex-1 py-3 rounded-xl bg-danger text-on-primary text-xs font-bold cursor-pointer hover:bg-danger/90 transition duration-200"
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-6 z-50 font-sans"
            >
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-danger-soft text-danger flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text">Delete Your Account?</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  This action will permanently remove your account, preferences, API keys, transaction history, and security audit logs. This cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-xs font-bold hover:bg-surface-muted dark:hover:bg-white/5 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-xl bg-danger text-on-primary text-xs font-bold cursor-pointer hover:bg-danger/90 transition duration-200"
                >
                  Yes, Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MobileBottomNav hideProfile={false} />
      <Toast
        show={logoutToastVisible}
        type="success"
        title="Signing You Out"
        message="Your secure session is closing now. See you next time."
        showConfirm={false}
        duration={1150}
        onClose={() => setLogoutToastVisible(false)}
      />
    </div>
  );
}
