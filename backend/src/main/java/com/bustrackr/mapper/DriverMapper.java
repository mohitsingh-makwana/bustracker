package com.bustrackr.mapper;

import com.bustrackr.dto.driver.CreateDriverRequest;
import com.bustrackr.dto.driver.DriverResponse;
import com.bustrackr.dto.driver.UpdateDriverRequest;
import com.bustrackr.entity.Driver;
import org.springframework.stereotype.Component;

@Component
public class DriverMapper {

    public Driver toEntity(CreateDriverRequest request) {
        return Driver.builder()
                .name(request.name())
                .address(request.address())
                .licenseNumber(request.licenseNumber())
                .licenseExpiryDate(request.licenseExpiryDate())
                .build();
    }

    public void updateEntity(UpdateDriverRequest request, Driver entity) {

        if (request.licenseNumber() != null) {
            entity.setLicenseNumber(request.licenseNumber());
        }

        if (request.licenseExpiryDate() != null) {
            entity.setLicenseExpiryDate(request.licenseExpiryDate());
        }

    }

    public DriverResponse toResponse(Driver entity) {
        return new DriverResponse(
                entity.getId(),
                entity.getTransportMember().getId(),
                entity.getName(),
                entity.getAddress(),
                entity.getLicenseNumber(),
                entity.getLicenseExpiryDate(),
                entity.getStatus()
        );
    }
}