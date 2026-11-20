package com.bustrackr.dto.stop;

import com.bustrackr.enums.StopStatus;

public record StopFilter(
        String name,
        String address,
        StopStatus status
) {
}
