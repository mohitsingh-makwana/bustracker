package com.bustrackr.dto.transportmember;

import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;

import java.time.LocalDateTime;

public record TransportMemberResponse(
        Long id,
        Long userId,
        Long transportSystemId,
        String name,
        String email,
        String phone,
        TransportMemberRole role,
        TransportMemberStatus status
       ) {
}