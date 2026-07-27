package com.restaurant.platform.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private final JavaMailSender mailSender;
    private final Map<String, OtpData> otpCache = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public OtpService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public static class OtpData {
        private final String code;
        private final String email;
        private final String mobileNumber;
        private final long expiryTime;

        public OtpData(String code, String email, String mobileNumber, long expiryTime) {
            this.code = code;
            this.email = email;
            this.mobileNumber = mobileNumber;
            this.expiryTime = expiryTime;
        }

        public String getCode() { return code; }
        public String getEmail() { return email; }
        public String getMobileNumber() { return mobileNumber; }
        public boolean isExpired() {
            return System.currentTimeMillis() > expiryTime;
        }
    }

    /**
     * Generates a 6-digit OTP, stores it in memory (5-minute expiration),
     * and sends it to both the user's email and mobile number (SMS simulator).
     */
    public String generateAndSendOtp(String email, String mobileNumber) {
        String otpCode = String.format("%06d", random.nextInt(1000000));
        long expiry = System.currentTimeMillis() + (5 * 60 * 1000); // 5 minutes

        OtpData data = new OtpData(otpCode, email, mobileNumber, expiry);
        
        // Cache by both email and mobile number for verification lookup
        otpCache.put(email, data);
        otpCache.put(mobileNumber, data);

        // 1. Send via Email (SMTP) Asynchronously with rich HTML template
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
                org.springframework.mail.javamail.MimeMessageHelper helper = 
                        new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
                
                helper.setTo(email);
                helper.setSubject("Kalpvant Restaurant-otp");
                
                String htmlContent = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>"
                        + "body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b1120; color: #e2e8f0; margin: 0; padding: 0; }"
                        + ".container { max-width: 600px; margin: 30px auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }"
                        + ".header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 30px 20px; text-align: center; border-bottom: 2px solid #312e81; }"
                        + ".header h1 { margin: 0; color: #06b6d4; font-size: 28px; font-weight: 700; letter-spacing: 1px; }"
                        + ".hero-image { width: 100%; height: 200px; object-fit: cover; display: block; }"
                        + ".content { padding: 40px 30px; text-align: center; }"
                        + ".welcome-text { font-size: 18px; color: #94a3b8; margin-bottom: 25px; }"
                        + ".otp-card { background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%); display: inline-block; padding: 15px 40px; border-radius: 10px; font-size: 36px; font-weight: 800; color: #ffffff; letter-spacing: 8px; margin: 20px 0; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4); }"
                        + ".expiry-note { font-size: 14px; color: #ef4444; margin-top: 15px; font-weight: 500; }"
                        + ".footer { background-color: #0b0f19; padding: 20px; text-align: center; font-size: 12px; color: #475569; border-top: 1px solid #1f2937; }"
                        + ".footer p { margin: 5px 0; }"
                        + "</style></head><body>"
                        + "<div class=\"container\">"
                        + "<div class=\"header\"><h1>KALAPAVANT</h1></div>"
                        + "<img class=\"hero-image\" src=\"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80\" alt=\"Kalapavant Restaurant\" />"
                        + "<div class=\"content\">"
                        + "<p class=\"welcome-text\">Your one-time verification passcode (OTP) for accessing your Kalapavant account is below:</p>"
                        + "<div class=\"otp-card\">" + otpCode + "</div>"
                        + "<p class=\"expiry-note\">This code is valid for 5 minutes. Please do not share it with anyone.</p>"
                        + "</div>"
                        + "<div class=\"footer\">"
                        + "<p>&copy; 2026 Kalapavant Restaurant. All rights reserved.</p>"
                        + "<p>If you did not request this verification, please secure your account credentials.</p>"
                        + "</div></div></body></html>";
                
                helper.setText(htmlContent, true);
                mailSender.send(mimeMessage);
                System.out.println("[OTP] Successfully sent HTML email to " + email);
            } catch (Exception e) {
                System.err.println("[OTP] Failed to send email to " + email + ": " + e.getMessage());
            }
        });

        // 2. Send via SMS Simulator (console logging)
        System.out.println("=================================================");
        System.out.println("[SMS SERVICE] Sending OTP to mobile: " + mobileNumber);
        System.out.println("[SMS SERVICE] Message: Your Kalapavant OTP is " + otpCode);
        System.out.println("=================================================");

        return otpCode;
    }

    /**
     * Verifies the OTP code for the given identifier (email or mobile).
     */
    public boolean verifyOtp(String identifier, String code) {
        if (identifier == null || code == null) {
            return false;
        }
        OtpData data = otpCache.get(identifier.trim());
        if (data == null) {
            return false;
        }
        if (data.isExpired()) {
            otpCache.remove(data.getEmail());
            otpCache.remove(data.getMobileNumber());
            return false;
        }
        if (data.getCode().equals(code.trim())) {
            // Remove after successful verification
            otpCache.remove(data.getEmail());
            otpCache.remove(data.getMobileNumber());
            return true;
        }
        return false;
    }
}
