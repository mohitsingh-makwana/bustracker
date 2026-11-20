package com.bustrackr.dto.stop;

public record UpdateStopRequest(

        String stopCode,

        String name,

        String address,

        Double latitude,

        Double longitude

) {
}