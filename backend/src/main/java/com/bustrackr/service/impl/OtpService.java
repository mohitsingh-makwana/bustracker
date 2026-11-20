package com.bustrackr.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class OtpService {


    private static final Duration OTP_TTL = Duration.ofMinutes(2);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;

    /** Generates a 6-digit OTP, keeping leading zeros (for example "004821"). */
    public String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    /** Stores the OTP in Redis with the email as the key, and expires it automatically. */
    public boolean storeOtp(String email, String otp) {
        if(getOtp(email)!=null){
            return false;
        }
        redisTemplate.opsForValue().set(normalize(email), otp, OTP_TTL);
        return true;
    }
    public String getOtp(String email) {
        return redisTemplate.opsForValue().get(normalize(email));
    }
    public String deleteOtp(String email) {
        return redisTemplate.opsForValue().getAndDelete(normalize(email));
    }

    public String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}