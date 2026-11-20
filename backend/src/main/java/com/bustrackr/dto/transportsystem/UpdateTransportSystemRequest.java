package com.bustrackr.dto.transportsystem;

import com.bustrackr.enums.AccessType;

public record UpdateTransportSystemRequest(

        String transportCode,

        String name,

        String description,

        AccessType accessType,

        String city,

        String area,

        Double latitude,

        Double longitude
) {
}