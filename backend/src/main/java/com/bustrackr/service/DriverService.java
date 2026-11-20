package com.bustrackr.service;

import com.bustrackr.dto.driver.CreateDriverRequest;
import com.bustrackr.dto.driver.DriverFilter;
import com.bustrackr.dto.driver.DriverResponse;
import com.bustrackr.dto.driver.UpdateDriverRequest;
import com.bustrackr.entity.Driver;
import com.bustrackr.enums.UpdateDriverStatus;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;

public interface DriverService {
    DriverResponse create(@Valid CreateDriverRequest request);

    DriverResponse getDriverById(Long id);

    Page<DriverResponse> getAllDrivers(int page, int size, DriverFilter filter);

    DriverResponse update(Long id, UpdateDriverRequest request);

    void delete(Long id);

    Driver getLoggedInDriver();

    DriverResponse getLoggedInDriverResponse();

    DriverResponse updateStatus(Long id, UpdateDriverStatus status);
}
