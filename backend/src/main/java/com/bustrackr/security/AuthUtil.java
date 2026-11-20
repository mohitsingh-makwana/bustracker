package com.bustrackr.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
public class AuthUtil {

    private final SecretKey secretKey;
    private final SecretKey signingKey;
    private final long expirationMs;
    private static final Duration VERIFICATION_TOKEN_TTL = Duration.ofMinutes(2);
    private static final String TYPE_EMAIL_VERIFICATION = "EMAIL_VERIFICATION";


    public AuthUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs,
            @Value("${user.verification.secret}") String userSecret) {

        this.secretKey = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );

        this.expirationMs = expirationMs;
        this.signingKey=Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );
    }


    public String generateUserVerificationToken(String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email.trim().toLowerCase(Locale.ROOT))
                .claim("tokenType", TYPE_EMAIL_VERIFICATION)
                .id(UUID.randomUUID().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(VERIFICATION_TOKEN_TTL)))
                .signWith(signingKey)
                .compact();
    }

    public String validateVerificationToken(String token) {
        Claims claims = Jwts.parser().verifyWith(signingKey).build()
                .parseSignedClaims(token).getPayload();        // throws JwtException if invalid or expired
        if (!TYPE_EMAIL_VERIFICATION.equals(claims.get("tokenType", String.class))) {
            throw new JwtException("Wrong token type");
        }
        return claims.getSubject();
    }

    public String generateUserToken(String username) {
        return generateToken(
                Map.of("tokenType", "USER"),
                username
        );
    }

    public String generateMemberToken(
            Long userId,
            Long transportSystemId,
            Long memberId,
            String role) {

        return generateToken(
                Map.of(
                        "tokenType", "MEMBER",
                        "userId", userId,
                        "transportSystemId", transportSystemId,
                        "memberId", memberId,
                        "role", role
                ),
                String.valueOf(userId)
        );
    }

    private String generateToken(
            Map<String, Object> claims,
            String subject) {

        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractTokenType(String token) {
        return extractAllClaims(token).get("tokenType", String.class);
    }

    public Long extractUserId(String token) {
        return extractAllClaims(token).get("userId", Long.class);
    }

    public Long extractMemberId(String token) {
        return extractAllClaims(token).get("memberId", Long.class);
    }

    public Long extractTransportSystemId(String token) {
        return extractAllClaims(token)
                .get("transportSystemId", Long.class);
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public boolean isTokenExpired(String token) {
        Claims claims = extractAllClaims(token);

        Date expiration = claims.getExpiration();

        return expiration.before(new Date());
    }
}