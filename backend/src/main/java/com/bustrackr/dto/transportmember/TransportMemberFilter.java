package com.bustrackr.dto.transportmember;

import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;

public record TransportMemberFilter(
        TransportMemberRole role,
        TransportMemberStatus status
) {
}
