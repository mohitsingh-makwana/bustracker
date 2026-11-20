package com.bustrackr.dto.transportmember;

import com.bustrackr.enums.AccessType;
import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;

public record MembershipCheckResponse(
        Long transportSystemId,
        AccessType accessType,                 // PUBLIC / PRIVATE
        boolean isMember,
        TransportMemberStatus status,          // PENDING / ACTIVE / REJECTED, null if not a member
        TransportMemberRole role,
        boolean isUserLoggedIn
) {
}
