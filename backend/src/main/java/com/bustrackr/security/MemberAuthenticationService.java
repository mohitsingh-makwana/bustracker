package com.bustrackr.security;

import com.bustrackr.entity.TransportMember;
import com.bustrackr.entity.User;
import com.bustrackr.enums.TransportMemberStatus;
import com.bustrackr.exception.ResourceNotFoundException;
import com.bustrackr.exception.UsernameNotFoundException;
import com.bustrackr.repository.TransportMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class MemberAuthenticationService {

    private final TransportMemberRepository transportMemberRepository;

    @Transactional
    public CustomUserDetails loadMember(Long memberId) {

        TransportMember member =
                transportMemberRepository.findById(memberId)
                        .orElseThrow(() ->
                                new UsernameNotFoundException("Member not found"));

        if (member.getStatus() != TransportMemberStatus.ACTIVE) {
            throw new BadCredentialsException("Membership is not active");
        }
        User user=member.getUser();
        member.getUser().getEmail();
        String transportSystemName=member.getTransportSystem().getName();

        return new CustomUserDetails(user,member.getId(),member.getTransportSystem().getId(),transportSystemName,member.getRole());
    }
}
