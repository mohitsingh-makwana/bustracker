package com.bustrackr.service;

import com.bustrackr.dto.location.CreateLocationHistoryRequest;
import com.bustrackr.dto.location.LocationHistoryResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LocationHistoryService {
    LocationHistoryResponse create(@Valid CreateLocationHistoryRequest request);

    LocationHistoryResponse getById(Long id);

    Page<LocationHistoryResponse> getAll(int page, int size);

    Page<LocationHistoryResponse> getByTripId(Long tripId, Pageable pageable);
}
