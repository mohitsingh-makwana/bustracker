package com.bustrackr.service;

import com.bustrackr.dto.bus.BusFilterRequest;
import com.bustrackr.dto.bus.BusResponse;
import com.bustrackr.dto.bus.CreateBusRequest;
import com.bustrackr.dto.bus.UpdateBusRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public interface BusService {
    BusResponse create(@Valid CreateBusRequest request);

    BusResponse getById(Long id);

    Page<BusResponse> getAllTransportSystemBuses(Pageable pageable, BusFilterRequest request);

    void delete(Long id);

    BusResponse update(Long id, @Valid UpdateBusRequest request);

}
