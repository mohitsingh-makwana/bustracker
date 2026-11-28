package com.bustrackr.security;

import com.bustrackr.enums.TokenType;
import com.bustrackr.repository.TransportMemberRepository;
import com.bustrackr.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final UserDetailsService userDetailsService;
    private final MemberAuthenticationService memberAuthenticationService;

    private final AuthUtil authUtil;


    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader=request.getHeader("Authorization");

        if(authHeader!=null && authHeader.startsWith("Bearer ")){
            String token=authHeader.substring(7);

            String username=authUtil.extractUsername(token);
            String tokenType = authUtil.extractTokenType(token);


            if(username!=null && tokenType!=null && !authUtil.isTokenExpired(token)) {

                if (TokenType.USER.name().equals(tokenType)) {

                    CustomUserDetails userDetails =
                            (CustomUserDetails) userDetailsService
                                    .loadUserByUsername(username);

                          Authentication authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    SecurityContextHolder.getContext()
                            .setAuthentication(authentication);
                }
                else if (TokenType.MEMBER.name().equals(tokenType)) {

                    Long memberId = authUtil.extractMemberId(token);

                    CustomUserDetails memberDetails =
                            memberAuthenticationService
                                    .loadMember(memberId);

                    Authentication authentication =
                            new UsernamePasswordAuthenticationToken(
                                    memberDetails,
                                    null,
                                    memberDetails.getAuthorities()
                            );

                    SecurityContextHolder.getContext()
                            .setAuthentication(authentication);
                }
            }
        }
        doFilter(request,response,filterChain);
    }

}

