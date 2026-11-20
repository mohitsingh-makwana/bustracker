package com.bustrackr.dto.transportmember;

import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;
import jakarta.validation.constraints.NotNull;

public record ApproveMemberRequest(
        @NotNull(message = "status is required!")
        TransportMemberStatus status,

        @NotNull(message = "Role is required")
        TransportMemberRole role
) {
}
