package com.bustrackr.controller;

import com.bustrackr.dto.driver.DriverFilter;
import com.bustrackr.dto.driver.DriverResponse;
import com.bustrackr.dto.driver.UpdateDriverRequest;
import com.bustrackr.enums.UpdateDriverStatus;
import com.bustrackr.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @GetMapping("/{id}")
    public ResponseEntity<DriverResponse> getByDriverId(
            @PathVariable Long id) {

        return ResponseEntity.ok(driverService.getDriverById(id));
    }

    @GetMapping("/me")
    public ResponseEntity<DriverResponse> getLoggedInDriver() {
        return ResponseEntity.ok(driverService.getLoggedInDriverResponse());
    }

    @GetMapping
    public ResponseEntity<Page<DriverResponse>> getAllDrivers(@RequestParam(defaultValue = "0")int page,
                                                              @RequestParam(defaultValue = "10")int size,
                                                              DriverFilter filter) {

        return ResponseEntity.ok(driverService.getAllDrivers(page,size,filter));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DriverResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateDriverRequest request) {

        return ResponseEntity.ok(
                driverService.update(id, request)
        );
    }
    @PatchMapping("/{id}/update-status")
    public ResponseEntity<DriverResponse> updateStatus(@PathVariable Long id,
                                                       @PathVariable UpdateDriverStatus status){
        return ResponseEntity.ok(driverService.updateStatus(id,status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        driverService.delete(id);
        return ResponseEntity.noContent().build();
    }
}