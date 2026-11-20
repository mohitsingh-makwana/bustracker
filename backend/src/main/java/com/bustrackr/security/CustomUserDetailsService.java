package com.bustrackr.security;

import com.bustrackr.entity.User;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username){

        log.info("Finding user with username={}",username);

        User user=userRepository.findUserByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username="+username));


        return new CustomUserDetails(user,null,null,null,null);
    }
}
