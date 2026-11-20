package com.bustrackr.service;

import com.bustrackr.dto.user.CreateUserRequest;
import com.bustrackr.dto.user.UpdateUserRequest;
import com.bustrackr.dto.user.UserResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

@Service
public interface UserService {
    UserResponse create(@Valid CreateUserRequest request);

    UserResponse getById(Long id);

    Page<UserResponse> getAll(int page, int size);

    UserResponse update(Long id, UpdateUserRequest request);
}
