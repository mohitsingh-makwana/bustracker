package com.bustrackr.dto.transportmember;

import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record CreateTransportMemberRequest(

        @NotNull(message = "User id is required")
        Long userId,

        @NotNull(message = "Transport system id is required")
        Long transportSystemId,

        TransportMemberRole role,
        TransportMemberStatus status
) {
}