
package com.bustrackr.config;

import com.bustrackr.security.WebSocketAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.web.socket.EnableWebSocketSecurity;
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;
import java.util.stream.Collectors;


@Configuration
@EnableWebSocketMessageBroker
@EnableWebSocketSecurity
@RequiredArgsConstructor
public class WebSocketConfig
        implements WebSocketMessageBrokerConfigurer {

    @Value("${ALLOWED_ORIGINS}")
    private List<String> allowedOrigins;

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void configureClientInboundChannel(
            ChannelRegistration registration
    ) {
        registration.interceptors(webSocketAuthInterceptor);
    }

    @Override
    public void configureMessageBroker(
            MessageBrokerRegistry config
    ) {

        // Topics where the backend publishes live updates
        config.enableSimpleBroker("/topic");

        // Prefix for messages sent from frontend to backend
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(
            StompEndpointRegistry registry
    ) {

        // WebSocket connection endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.toArray(String[]::new));
    }

    @Bean
    AuthorizationManager<Message<?>> messageAuthorizationManager(
            MessageMatcherDelegatingAuthorizationManager.Builder messages
    ) {

        messages
                .simpTypeMatchers(SimpMessageType.CONNECT)
                .permitAll()

                // Public passenger tracking
                .simpSubscribeDestMatchers(
                        "/topic/trips/*/location"
                ).permitAll()

                .simpSubscribeDestMatchers(
                        "/topic/trips/*/status"
                ).permitAll()

                // Authenticated driver publishing
                .simpDestMatchers(
                        "/app/trips/*/locations"
                ).hasRole("DRIVER")

                // Authenticated Admin subscription
                .simpSubscribeDestMatchers(
                        "/topic/transport-systems/*/live-buses"
                ).hasRole("ADMIN")

                .simpTypeMatchers(SimpMessageType.DISCONNECT)
                .permitAll()

                // All other messages
                .anyMessage().denyAll();

        return messages.build();
    }

    @Bean("csrfChannelInterceptor")
    ChannelInterceptor csrfChannelInterceptor() {
        return new ChannelInterceptor() {};  // no-op replaces the default
    }
}
