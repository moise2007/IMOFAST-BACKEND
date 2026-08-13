const axios = require("axios");

const API_KEY = process.env.API_KEY_TERMII;
const BASE_URL = "https://api.ng.termii.com/api";

// Stockage temporaire des OTP
const otpStore = new Map();

const sendOTP = async (phone) => {
  const response = await axios.post(`${BASE_URL}/sms/otp/send`, {
    api_key:          API_KEY,
    message_type:     "NUMERIC",
    to:               phone,
    from:             "imoFast",
    channel:          "generic",
    pin_attempts:     3,
    pin_time_to_live: 10,
    pin_length:       6,
    pin_placeholder:  "< 1234 >",   
    message_text:     "Votre code ImoFast est < 1234 >. Valable 10 minutes.",
    pin_type:         "NUMERIC",
  });

  otpStore.set(phone, {
    pinId: response.data.pinId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return response.data;
};

const verifyOTP = async (phone, pin) => {
  const stored = otpStore.get(phone);

  if (!stored) throw new Error("Aucun OTP envoyé pour ce numéro");
  if (Date.now() > stored.expiresAt) throw new Error("OTP expiré");

  const response = await axios.post(`${BASE_URL}/sms/otp/verify`, {
    api_key: API_KEY,
    pin_id:  stored.pinId,  
    pin: pin,
  });

  if (response.data.verified) {
    otpStore.delete(phone);
    return true;
  }

  return false;
};

module.exports = { sendOTP, verifyOTP };