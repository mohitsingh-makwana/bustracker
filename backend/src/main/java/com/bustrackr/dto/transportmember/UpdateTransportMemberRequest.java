package com.bustrackr.dto.transportmember;

import com.bustrackr.enums.TransportMemberRole;

public record UpdateTransportMemberRequest(

        TransportMemberRole role

) {
}