package com.bustrackr.security;

import com.bustrackr.enums.TokenType;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.stereotype.Component;

@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final AuthUtil authUtil;
    private final MemberAuthenticationService memberAuthenticationService;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String authorization = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);

        // No token: allow as anonymous (PUBLIC passengers). Their rules are permitAll anyway.
        if (authorization == null || authorization.isBlank()) {
            return message;
        }

        if (!authorization.startsWith("Bearer ")) {
            throw new BadCredentialsException("Invalid Authorization header");
        }

        String token = authorization.substring(7);

        if (authUtil.isTokenExpired(token)) {
            throw new BadCredentialsException("Token has expired");
        }
        if (!TokenType.MEMBER.name().equals(authUtil.extractTokenType(token))) {
            throw new BadCredentialsException("Invalid token type");
        }

        Long memberId = authUtil.extractMemberId(token);
        UserDetails userDetails = memberAuthenticationService.loadMember(memberId);

        accessor.setUser(new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities()));

        return message;   // the SAME message, not MessageBuilder.createMessage(...)
    }
}