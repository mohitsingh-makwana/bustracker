package com.bustrackr.security;

import com.bustrackr.entity.TransportMember;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.repository.TransportMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityService {
    private final TransportMemberRepository transportMemberRepository;

    //Not implemented completely
    public CustomUserDetails getLoggedInUser(){
        Authentication authentication= SecurityContextHolder.getContext().getAuthentication();

        if(authentication==null){
            throw new RuntimeException("No active user session");
        }

        return (CustomUserDetails)authentication.getPrincipal();
    }


    public boolean isCurrentMemberDriver(Long requestingDriver) {
        CustomUserDetails currentUser=getLoggedInUser();
        Long memberId=currentUser.getTransportMemberId();

        TransportMember transportMember=transportMemberRepository.findById(memberId)
                .orElseThrow(() ->new ResourceNotFoundException("Member not found with id="+memberId));

        return transportMember.getDriver().getId().equals(requestingDriver);
    }

    public boolean hasNoAuthentication(){
        Authentication authentication=SecurityContextHolder.getContext().getAuthentication();
        return authentication == null || !authentication.isAuthenticated() ||authentication instanceof AnonymousAuthenticationToken;
    }

    public Long getCurrentTransportSystemId(){
        return getLoggedInUser().getTransportSystemId();
    }

    public String getCurrentTransportSystemName(){
        return getLoggedInUser().getTransportSystemName();
    }

}
