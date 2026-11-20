package com.bustrackr.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter authenticationFilter;


    @Bean
    protected PasswordEncoder  getPasswordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Bean
    protected SecurityFilterChain filterChain(HttpSecurity http){
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth->auth
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/auth/**").permitAll()

                        .requestMatchers(HttpMethod.GET,"/users/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE,"/users/*").denyAll()
                        .requestMatchers("/users/**").permitAll()

                        .requestMatchers(HttpMethod.POST, "/transport-systems").authenticated()
                        .requestMatchers(HttpMethod.GET, "/transport-systems").hasAnyRole("PASSENGER","DRIVER","ADMIN")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/transport-systems/public/*", "/transport-systems/public",
                                "/transport-systems/route-count","/transport-systems/active-trip-count"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET,"/transport-systems/*/membership-check").permitAll()
                        .requestMatchers(HttpMethod.GET,"/transport-systems/my").authenticated()
                        .requestMatchers(HttpMethod.POST,"/transport-systems/*/membership-request","/transport-systems/*/access").authenticated()
                          .requestMatchers(HttpMethod.DELETE,"/transport-systems/*").denyAll()
                        .requestMatchers("/transport-systems/**").hasRole("ADMIN")

                        .requestMatchers("/transport-members/me").hasAnyRole("PASSENGER","DRIVER","ADMIN")
                        .requestMatchers("/transport-members/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET,"/drivers/me").hasRole("DRIVER")
                        .requestMatchers("/drivers/**").hasRole("ADMIN")

                        .requestMatchers("/buses/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET,"/routes/public").permitAll()
                        .requestMatchers(HttpMethod.GET,"/routes").hasAnyRole("PASSENGER","DRIVER","ADMIN")
                        .requestMatchers("/routes/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET,"/stops/public").permitAll()
                        .requestMatchers(HttpMethod.GET,"/stops").hasAnyRole("PASSENGER","DRIVER","ADMIN")
                        .requestMatchers("/stops/**").hasRole("ADMIN")

                        .requestMatchers("/route-patterns/**").hasRole("ADMIN")
                        .requestMatchers("/pattern-stops/**").hasRole("ADMIN")


                        .requestMatchers(HttpMethod.GET,"/trips/public/*","/trips/transport-system/public","/trips/*/stops/public","/trips/*/*/next-stop/public",
                                "/trips/passenger/filter-options/public").permitAll()
                        .requestMatchers("/trips/my/**").hasRole("DRIVER")
                        .requestMatchers(HttpMethod.POST,"/trips/*/locations").hasRole("DRIVER")
                        .requestMatchers(HttpMethod.GET,"/trips/*","/trips/*/stops","/trips/*/*/next-stops","/trips/*/live-location","/trips/transport-system","/trips/*/stops","/trips/*/*/next-stop","/trips/passenger/filter-options").hasAnyRole("PASSENGER","DRIVER","ADMIN")
                        .requestMatchers(HttpMethod.PATCH,"/trips/*/terminate").hasRole("DRIVER")
                        .requestMatchers("/trips/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET,"/trip-schedules/public/*","/trip-schedules/transport-system/public").permitAll()
                        .requestMatchers(HttpMethod.GET,"/trip-schedules/*","/trip-schedules/transport-system").hasAnyRole("PASSENGER","DRIVER","ADMIN")
                        .requestMatchers(HttpMethod.GET,"/trip-schedules/my/regular-upcoming").hasRole("DRIVER")
                        .requestMatchers(HttpMethod.POST,"/trip-schedules/my/*/start").hasRole("DRIVER")
                        .requestMatchers(HttpMethod.POST,"/trip-schedules/**").hasRole("ADMIN")

                        .requestMatchers("/location-history/**").hasRole("ADMIN")
                        .requestMatchers("/passengers/search").hasAnyRole("PASSENGER","DRIVER","ADMIN")
                        .requestMatchers("/passengers/public/search").permitAll()
                         .anyRequest().authenticated())
                .addFilterBefore(authenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .sessionManagement(session-> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }

    @Bean
    protected AuthenticationManager getAuthenticationManager(AuthenticationConfiguration configuration){
        return configuration.getAuthenticationManager();
    }

}
